import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { buildAstroSite } from '@/lib/astro-builder'
import { buildRoleColorCss } from '@/lib/roleColors'
import {
    groqService,
    delimitTranscript,
    hasSuppliedTestimonials,
    stripFabricatedTestimonials,
} from '@/lib/services/groq.service'

/**
 * Used when overriding a `contentWithContact` key that has two coexisting
 * shapes — the legacy primitive form (e.g. `about` = string paragraph,
 * `services` = flat array of {name, description}) and the wrapped object
 * form branded families (Barbershop F–J, SalonSpa K–O) use (e.g.
 * `about` = { tag, headline, paragraphs[], image }). Returns true only
 * for the wrapped form, so the conditional spread above can override the
 * legacy fallback without clobbering Generic A–E sites that still rely on
 * the primitive shape.
 */
function isWrappedObject(v: any): boolean {
    return v != null && typeof v === 'object' && !Array.isArray(v)
}

/**
 * The key on saved content that records which transcript the copy was
 * extracted from. Nested inside `extractedContent` (`v.any()` — see
 * convex/schema.ts:247), so it needs no schema change and no migration.
 */
const EXTRACTION_MARKER_KEY = 'extractedFrom'

/**
 * Fingerprint of the transcript a page's copy was written from.
 *
 * Not a security boundary and never compared against anything an attacker
 * chooses — it only has to change when the transcript does, which is what
 * separates "the owner re-did the interview" from "the admin edited a
 * headline". Length is prefixed so two transcripts would have to collide in
 * both to read as the same source.
 *
 * A missing transcript gets its own stable value rather than being skipped.
 * "We extracted with nothing to go on" is a real state that has to converge
 * like any other, and it has to differ from the interview the owner records a
 * week later — otherwise the one submission that most needs re-extracting is
 * the one that never gets it.
 */
function fingerprintTranscript(transcript?: string): string {
    const text = (transcript || '').trim()
    if (!text) return 'no-transcript'
    return `${text.length}:${createHash('sha256').update(text).digest('hex').slice(0, 16)}`
}

/**
 * ── What survives a re-extraction ───────────────────────────────────────────
 *
 * Re-extraction replaces `extractedContent` WHOLESALE, so anything not named
 * here is destroyed. The loss is also deferred and invisible: the trigger is a
 * changed transcript fingerprint, and the "regenerate transcription" button in
 * app/admin/submissions/[id]/page.tsx re-runs Whisper — which is
 * non-deterministic, so re-transcribing the same audio moves the fingerprint on
 * its own. Nothing regenerates at that moment; the wipe lands later, on the
 * admin's next Save, with no visible connection to the button they pressed.
 *
 * THE LINE, so whoever extends this has the rule rather than the list: a key
 * belongs here when the ADMIN is the only thing that can write it, and it is
 * therefore unrecoverable once dropped. A key any GENERATOR also writes stays
 * OUT — its stored value may be model output about the very interview we are
 * re-reading, and carrying that across would preserve stale fabrication instead
 * of human work, which is this branch's own bug wearing a different hat. When
 * the two cannot be told apart, the answer is out: losing a field the model
 * rewrites from the new transcript costs one regenerate, keeping an invented
 * one costs a real business its credibility.
 *
 * Every key a generator can emit, so the test is checkable rather than
 * remembered: the extraction prompt below (business_name, tagline, about,
 * services, unique_selling_points, tone, featured_headline,
 * featured_subheadline, featured_products); generateConversionBlocks (trust,
 * why, how, testimonials, faq, credentials, ctaBand); generateGenericSections
 * (marquee, hero, about, services, gallery, area, location, footer,
 * navbar_links, navCtaText, navCtaHref). None of them is in the list below.
 */
const ADMIN_ONLY_CONTENT_KEYS = [
    // FACTS, never copy — the same rule the contact merge inside POST states at
    // length. They come from the submission or from what the admin typed, and no
    // prompt in lib/services/groq.service.ts asks a model for any of them.
    'contact',
    'googleMapsUrl',
    'serviceArea',
    'messaging',

    // CHROME the admin switched off. Nothing generates `visibility`; it is
    // written by the editor's Blocks tab and defaulted further down this file.
    // Dropping it turns every section the admin deliberately hid back on, on a
    // site that is already live.
    'visibility',

    // IMAGE PICKS — which photo sits in which slot. These hold storage refs and
    // URLs, never words: the only writers are the editor's picker and this
    // route's own resolution of the business's OWN photos, so nothing here can
    // be a model's invention. (The picks nested inside the wrapped sections —
    // gallery.items[].image, hero.image — are not here; see the counter-list.)
    'images',
    'about_images',
    'featured_images',
    'services_image',

    // TYPED COPY for the A–O template families. Every one of these flat fields
    // is editor-only: the extraction prompt writes `featured_*` and the flat
    // `about`/`services`, generateGenericSections writes the NESTED
    // `about.headline` / `services.headline`, and neither ever writes the
    // snake_case field beside it. A value sitting on one of these keys was put
    // there by a person.
    'hero_badge_text',
    'hero_cta',
    'hero_cta_secondary',
    'about_headline',
    'about_description',
    'about_tagline',
    'about_tags',
    'services_headline',
    'services_subheadline',
    'services_cta',
    'methodology',
    'featured_cta_text',
    'featured_cta_link',
    'navbar_cta_text',
    'navbar_cta_link',
    'navbar_headline',
] as const

/**
 * Deliberately NOT preserved, and why. The counter-list carries as much weight
 * as the list — each entry is a field somebody will reasonably want to add:
 *
 *  • `footer`, `navbar_links`, `navCtaText`/`navCtaHref`, `location`, and every
 *    wrapped section (`hero`, `about`, `services`, `gallery`, `area`,
 *    `marquee`) — generateGenericSections writes exactly these keys. The admin
 *    edits leaves INSIDE the same objects the model wrote, and nothing in the
 *    payload records which leaf came from whom. Preserving the key would carry
 *    the model's sentences about the OLD interview onto a page rebuilt from the
 *    new one. (These keys also answer the `hasGenericSections` gate below, so
 *    adding one here would silently switch generic-section generation off.)
 *
 *  • `trust`, `why`, `how`, `faq`, `credentials`, `ctaBand` — same reason, from
 *    generateConversionBlocks.
 *
 *  • `featured_products` — model-written projects. An admin's image pick inside
 *    one is genuine work and it is lost here; there is no way to keep the pick
 *    without keeping the invented project it hangs on.
 *
 *  • `hero_testimonial` — a quoted customer carried as a bare value with NO
 *    provenance marker. `testimonials` can be split item by item because the
 *    editor stamps ADMIN_ATTRIBUTION_KEY on anything a human touched; this
 *    field has no such mark, so it is all-or-nothing and it is left out.
 *
 *    Be honest about what that buys, because it is not what it looks like: no
 *    generator writes this key — the editor is its only writer — and
 *    stripFabricatedTestimonials does not read it either. So excluding it does
 *    NOT stop a fabricated hero quote republishing; an ordinary regenerate
 *    republishes whatever is stored, untouched. What the exclusion actually
 *    costs is an admin's typed hero quote on a transcript change, and what it
 *    buys is only that a transcript change does not carry one forward blind.
 *    By the rule above this key arguably qualifies for the list. It is out
 *    because dropping it is recoverable by retyping and the wrong call here is
 *    cheap, not because keeping it would resurrect anything.
 */

/**
 * The admin's typed quotes, and nothing else.
 *
 * `testimonials` is the one key that is BOTH generated and typed into, so it can
 * be neither preserved nor dropped wholesale. It is carried item by item, on the
 * same provenance the assembly pass uses and THROUGH THE SAME FUNCTION — there
 * is no second implementation of "did a human write this" here to drift from
 * stripFabricatedTestimonials. Whatever the guard would strip on the way out is
 * never carried across on the way in, so preservation cannot resurrect anything.
 *
 * Undefined when nothing provably human is left, so the caller carries no key at
 * all: an empty array or wrapper would preserve nothing while still answering
 * the conversion-block gate, blocking the regeneration meant to replace it.
 */
function preserveAdminTestimonials(stored: any): unknown | undefined {
    if (stored?.testimonials == null) return undefined
    const { content } = stripFabricatedTestimonials(
        { testimonials: stored.testimonials },
        { keepAdminAuthored: true },
    )
    const kept = (content as any).testimonials
    if (Array.isArray(kept)) return kept.length > 0 ? kept : undefined
    if (kept && typeof kept === 'object') {
        return Array.isArray(kept.items) && kept.items.length > 0 ? kept : undefined
    }
    return undefined
}

export async function POST(request: NextRequest) {
    try {
        // Check Clerk authentication
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin using Convex
        const creator = await fetchQuery(api.creators.getByClerkId, { clerkId: userId })
        if (!creator || creator.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Rate limit: expensive operation (5/min)
        const { checkRateLimit, RATE_LIMITS } = await import('@/lib/security')
        const { allowed } = checkRateLimit(`generate:${userId}`, RATE_LIMITS.expensive.maxRequests, RATE_LIMITS.expensive.windowMs)
        if (!allowed) {
            return NextResponse.json({ error: 'Too many generation requests. Please wait a moment.' }, { status: 429 })
        }

        const body = await request.json()
        // `preview` + `content` power the editor's "Preview my site" — build the
        // admin's UNSAVED draft into HTML and return it WITHOUT persisting (see the
        // early return after buildAstroSite below). Everything else is identical to
        // a real generate, so the preview matches exactly what Save would produce.
        const { submissionId, templateName, customizations, content: draftContent, preview } = body

        if (!submissionId) {
            return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 })
        }

        // Get submission from Convex
        const submissionData = await fetchQuery(api.submissions.getById, { id: submissionId as any })

        if (!submissionData) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
        }

        // Map Convex data to expected format
        const submission = {
            id: submissionData._id,
            business_name: submissionData.businessName,
            business_type: submissionData.businessType,
            owner_name: submissionData.ownerName,
            owner_phone: submissionData.ownerPhone,
            owner_email: submissionData.ownerEmail,
            address: submissionData.address,
            city: submissionData.city,
            photos: submissionData.photos,
            transcript: submissionData.transcript,
            status: submissionData.status,
            website_content: (submissionData as any).websiteContent,
        }

        // Check if submission is rejected
        if (submission.status === 'rejected') {
            return NextResponse.json({ error: 'Cannot generate website for rejected submission' }, { status: 400 })
        }

        // ── Fabricated-testimonial gate ───────────────────────────────
        // Read from the SUBMISSION, never from generator output: whether a
        // quoted customer is allowed on this page is a fact about what the
        // business told us, and no model gets a vote. See
        // hasSuppliedTestimonials for how each funnel is answered.
        const testimonialsAreSourced = hasSuppliedTestimonials({
            contentSource: (submissionData as any).contentSource,
            interviewQa: (submissionData as any).interviewQa,
        })

        // Everything the guard dropped this run, split by where it came from.
        // A server log tells the admin nothing: on the creator funnel a
        // recording FULL of real customer quotes strips to an empty band, and
        // unless the response says so the admin never learns there was anything
        // quotable to type back in. See the JSON response at the end.
        const guardRemoved = { generated: 0, stored: 0 }

        // Wrap GENERATED output — every piece of model JSON this run produces.
        // (It used to wrap a hardcoded default-products block too; that block is
        // gone, because stripping invented quotes off invented projects still left
        // the invented projects.) Stored content goes through the assembly pass
        // further down instead, which keeps what an admin typed.
        const guardGenerated = <T>(label: string, generated: T): T => {
            if (testimonialsAreSourced) return generated
            const { content, removed } = stripFabricatedTestimonials(generated)
            const total = removed.testimonials + removed.productTestimonials
            if (total > 0) {
                guardRemoved.generated += total
                // Loud on purpose. Dropping invented praise is correct, but a
                // silent drop leaves nobody able to tell how often the models
                // reach for it.
                console.warn(
                    `[TESTIMONIAL-GUARD] ${label}: dropped ${removed.testimonials} testimonial(s) + ` +
                    `${removed.productTestimonials} product testimonial(s) — submission ${submissionData._id} ` +
                    `supplied no testimonial text (contentSource=${(submissionData as any).contentSource || 'creator'})`
                )
            }
            return content
        }

        // Check if there's an existing generated website with edited content (from Convex)
        const existingWebsite = await fetchQuery(api.generatedWebsites.getBySubmissionId, {
            submissionId: submissionData._id
        })

        // Get or extract content - prioritization:
        // 0. In PREVIEW mode, the admin's UNSAVED draft (from the request body) — so
        //    the preview reflects edits that haven't been saved to Convex yet.
        // 1. Edited content from generated_websites (if exists)
        // 2. Previously extracted content from submissions
        // 3. Fresh extraction via Groq
        let extractedContent = (preview && draftContent)
            ? draftContent
            : (existingWebsite?.extractedContent || submission.website_content)

        // When regenerating with existing content, override with fresh submission data
        // so admin edits to business info are reflected in the regenerated website
        if (extractedContent) {
            extractedContent = {
                ...extractedContent,
                business_name: submission.business_name,
                // Contact details are facts, never copy: they come from the
                // submission or from what the admin typed, and from nowhere
                // else. The placeholders that used to sit on the end of these
                // chains (contact@example.com, +63 900 000 0000) shipped a
                // phone number that reaches nobody onto a paying customer's
                // live site. Missing is recoverable; wrong is not.
                contact: {
                    ...((extractedContent as any)?.contact || {}),
                    email: submission.owner_email || (extractedContent as any)?.contact?.email,
                    phone: submission.owner_phone || (extractedContent as any)?.contact?.phone,
                    address: submission.address ? `${submission.address}, ${submission.city}` : (extractedContent as any)?.contact?.address || submission.city
                }
            }
        }

        // ── When does extraction run? ─────────────────────────────────
        // On whether it has ALREADY RUN for this transcript — never on what it
        // returned. Every version of this gate that inspected the output looped,
        // and had to: GROUNDING now tells the model that an empty tagline and an
        // omitted services list are correct answers, so "re-extract when services
        // are missing" (and the `tagline && about` check that sat beside it)
        // asks a business that genuinely named no services to keep failing the
        // same test forever. It burns a Groq call on every regenerate and can
        // never succeed, because succeeding would mean the model inventing the
        // thing the interview does not contain.
        //
        // The second edge is worse. Re-extraction REPLACES extractedContent
        // wholesale, so the admin who deletes a fabricated services list — the
        // exact cleanup the fabrication incident requires — drops the count to
        // zero and has the list written back on the next save. An output-shaped
        // gate cannot tell that deletion apart from a gap.
        //
        // So we record what we did instead of grading what came back.
        const transcriptFingerprint = fingerprintTranscript(submission.transcript)

        // Read the marker off what is STORED, not off `extractedContent`: in
        // preview mode that variable holds the admin's unsaved draft, and the
        // editor round-trip (/api/save-content writes the draft verbatim, then
        // calls this route) can drop a key the editor knows nothing about.
        // Either would otherwise read as "never extracted".
        const storedContent = (existingWebsite?.extractedContent || submission.website_content) as any
        const lastExtraction =
            storedContent?.[EXTRACTION_MARKER_KEY] ?? (extractedContent as any)?.[EXTRACTION_MARKER_KEY]

        // Structural, not semantic: "a content object exists" is a fact about the
        // database. "The content object has a tagline" is a fact about what a
        // model chose to write, and we are done gating on those.
        const hasStoredContent = !!extractedContent && Object.keys(extractedContent).length > 0

        // A missing marker NEVER means "extract". Every row written before this
        // marker existed has none, as does any draft that lost the key on the way
        // through the editor, and re-extracting over either is precisely the wipe
        // this is here to stop. Absent marker = adopt what is stored (stamped
        // below), so the row converges on the next save and a LATER transcript
        // change is still caught.
        const transcriptChanged = !!lastExtraction && lastExtraction.transcript !== transcriptFingerprint

        // Stamped onto the saved content further down. Starts as the most this
        // run can honestly claim, and is upgraded if extraction actually runs.
        let extractionMarker = lastExtraction ?? {
            transcript: transcriptFingerprint,
            at: Date.now(),
            // 'adopted' — this content predates the marker (or lost it in the
            // editor round-trip). We did not write it and cannot claim we did;
            // what we can record is which transcript it now corresponds to,
            // which is the whole of what makes the next change detectable.
            source: 'adopted' as const,
        }

        // Everything the admin has that the wholesale replacement below would
        // otherwise destroy. Contact was the first member of this list and is
        // still the only one needing a merge rather than a straight carry (see
        // the restore inside the branch); the rule that decides membership, and
        // the fields deliberately left out of it, are on ADMIN_ONLY_CONTENT_KEYS.
        const preservedAdminWork: Record<string, any> = {}
        for (const key of ADMIN_ONLY_CONTENT_KEYS) {
            const value = (extractedContent as any)?.[key]
            if (value !== undefined) preservedAdminWork[key] = value
        }
        // Split off, because this is the one key that is both generated and typed
        // into: only the items a human provably wrote come across.
        const preservedTestimonials = preserveAdminTestimonials(extractedContent)
        if (preservedTestimonials !== undefined) preservedAdminWork.testimonials = preservedTestimonials

        // What was ACTUALLY carried across — empty on every run that did not
        // re-extract, which is nearly all of them. Two things below have to know
        // the difference: the conversion-block gate (a key we just restored is
        // not evidence this transcript's blocks have been written) and the merge
        // under it (admin work outranks anything generated this run).
        let restoredAdminWork: Record<string, any> = {}

        // Nothing stored yet → first extraction. Transcript genuinely different
        // from the one the copy was written from → the source of truth changed
        // and re-extracting the COPY is the right answer: it was written about a
        // different interview. It is not the right answer for the rest of the
        // admin's work, which was never about the transcript at all — hence the
        // preserve-list above.
        if (!hasStoredContent || transcriptChanged) {

            // Build context from submission data
            const context = `
Business Name: ${submission.business_name}
Business Type: ${submission.business_type}
Owner: ${submission.owner_name}
Location: ${submission.city}, ${submission.address}
Phone: ${submission.owner_phone}
${submission.owner_email ? `Email: ${submission.owner_email}` : ''}

${submission.transcript ? delimitTranscript(submission.transcript, 'Business Interview Transcript') : ''}
            `.trim()

            // Extract structured content using Groq
            const Groq = (await import('groq-sdk')).default
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

            // Count photos for featured projects generation.
            // REAL photos, not array slots: the owner-intake path deliberately
            // stores an empty string at index 0 when the owner skips the optional
            // portrait, so the purely positional role mapping at
            // convex/hyperagent.ts:85-88 keeps every other photo on its own index
            // (see ownerIntake.normalizePhotos). Counting slots would tell Groq a
            // photo exists that it can't write copy for.
            const photoCount = (submission.photos || []).filter(Boolean).length

            // Salon-aware service count — the Lumière + Maison Élite designs
            // both feature 6-service grids, so we ask for more depth when the
            // business type is in the beauty cluster.
            const businessTypeLower = (submission.business_type || '').toLowerCase()
            const isBeauty = /salon|spa|beauty|barber|nail|hair|lash|brow|aesthetic/.test(businessTypeLower)
            const isYmyl = /clinic|dental|medical|doctor|aesthetic/.test(businessTypeLower)
            const targetServices = isBeauty ? 6 : 4

            const prompt = `You are a professional website content writer. Based on the following business information, create compelling website content.

${context}

Number of photos available: ${photoCount}
Business category cues: ${isBeauty ? 'BEAUTY/SALON — high-touch personal service. Write to women + men who care about how they are treated, not just the result. Aspirational, intimate, never gimmicky.' : 'GENERAL — concrete, founder-voiced, no SaaS clichés.'}

Generate a JSON response with the following structure:
{
  "business_name": "${submission.business_name}",
  "tagline": "A catchy, memorable tagline (max 10 words)",
  "about": "A compelling 2-3 sentence description of the business that highlights what makes it special",
  "services": [
    {"name": "2-3 WORDS MAX", "description": "ONE single sentence, 12-20 words, no clauses, no semicolons"}
  ],
  "unique_selling_points": ["one short phrase per difference the owner actually claimed"],
  "tone": "${isBeauty ? 'warm, refined, aspirational' : 'professional-friendly'}",
  "featured_headline": "Featured Products",
  "featured_subheadline": "A brief description of the work shown below — omit this field alongside featured_products when the interview describes no specific job",
  "featured_products": [
    {
      "title": "a job or piece of work the owner actually described",
      "description": "2-3 sentences using only details the owner gave about it",
      "tags": ["Tag1", "Duration"],
      "testimonial": {
        "quote": "the customer's words as the owner reported them (2-3 sentences)"
      }
    }
  ]
}

IMPORTANT:
- SOURCE: every fact — services, prices, hours, years in business, guarantees, past work — comes from the interview above. Rephrase it, infer from it ("we open at 5am and close at 11pm" is opening hours), write it well. Never add one that isn't there. If the interview doesn't support a field, omit that field: an absent field is correct output, a plausible invention is not.
- Make the tagline creative and memorable. For beauty: short, italic-ready, ends without a period.
- Services: only the ones the owner said they offer, around ${targetServices} for a business like this. That number is a ceiling on padding, not a quota to reach: fewer is right when fewer were named, omit "services" entirely when none were, and when the owner rattled off more real ones than that — nine services named in one breath is a real menu — list every one of them. Cutting a service the shop actually sells is the same mistake as inventing one, made in the direction nobody checks. Never round the list out to fill a grid.
- SERVICE NAMES: 2-3 words MAX, editorial rather than descriptive — the owner's own word for the thing, sharpened, or two of them joined by "&". Build every name out of what THIS owner said: their plainest word is still the right name when it is the word they used ("Labada", "Dry cleaning") — an ordinary trade has ordinary vocabulary and does not need a cleverer one. What belongs to somebody else's shop is a service they never mentioned, added because businesses of this type usually have it. NEVER full sentences or descriptions in the name.
- SERVICE DESCRIPTIONS: ONE sentence only, 12-20 words. No clauses joined by semicolons. No "we offer" / "we provide" filler. Concrete and specific.
- USPs: only differences the owner actually claimed. Omit when none were.
- Keep descriptions concise and compelling
- featured_products: only work the owner actually described, at most ${Math.min(photoCount, 3) || 3}. Omit the array when the interview describes no specific job — and omit "featured_subheadline" with it, since there is then no work for it to describe.
- Each featured project should have a unique title, description and tags
- TESTIMONIALS: only what the owner reported customers saying, in the transcript. If it isn't there, omit "testimonial" entirely. Never invent a customer or a quote — and never output a name: nobody is ever asked who said it, so a name can only be made up.
- Tags: the kind of work, plus how long it took only when the owner said so
${isBeauty ? '- For beauty businesses, lean into ritual + intimacy + the "regular client" relationship. Avoid generic "we offer..." phrasing.' : ''}
${isYmyl ? '- This is a YMYL business (medical/dental/aesthetic). Be precise; no medical claims; no specific outcomes promised.' : ''}
- Return ONLY valid JSON, no markdown or additional text`

            try {
                const completion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.7,
                    max_tokens: 2000,
                })

                const content = completion.choices[0]?.message?.content || '{}'

                // Clean up markdown code blocks if present
                const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                const freshExtraction = guardGenerated('main extraction', JSON.parse(cleanContent))

                // Put the admin's work back on top of the fresh copy. The
                // transcript changed, so the model's SENTENCES change with it —
                // but a hidden section, an image pick, a typed quote or an owner's
                // phone number was never a statement about the interview, and
                // re-reading the interview is no reason to throw them away.
                //
                // Contact keeps the merge it has always had rather than a straight
                // overwrite: fresh fields fill gaps, admin/submission values win.
                restoredAdminWork = { ...preservedAdminWork }
                if (restoredAdminWork.contact) {
                    restoredAdminWork.contact = {
                        ...(freshExtraction.contact || {}),
                        ...restoredAdminWork.contact,
                    }
                }
                extractedContent = { ...freshExtraction, ...restoredAdminWork }

                // Claim only what just happened. The fingerprint is the
                // transcript this copy was actually written from, so the next
                // regenerate can see there is nothing new to read.
                extractionMarker = {
                    transcript: transcriptFingerprint,
                    at: Date.now(),
                    source: 'extracted' as const,
                }

            } catch (error) {
                console.error('Groq extraction error:', error)
                return NextResponse.json({
                    error: 'Failed to extract website content. Please try again.'
                }, { status: 500 })
            }
        }

        // Conversion-block AI generation — runs once per submission, then cached
        // into extractedContent so subsequent regenerations skip the LLM call.
        // If transcript is missing or generation fails, per-business-type
        // defaults from lib/block-defaults.ts kick in at build time.
        const ec = extractedContent as any
        // A key RESTORED a moment ago is not evidence this submission's blocks
        // have been written. `testimonials` is the only key that is ever both
        // restored and a conversion block, and letting the admin's carried-over
        // quotes answer this question would skip generating the other six for a
        // transcript nothing has read yet — the admin would keep their words and
        // lose the whole rest of the page's conversion content instead.
        const hasAnyConversionBlock = ['trust', 'why', 'how', 'testimonials', 'faq', 'credentials', 'ctaBand']
            .some((key) => !(key in restoredAdminWork) && !!ec?.[key])
        if (!hasAnyConversionBlock && submission.transcript) {
            try {
                const blocks = await groqService.generateConversionBlocks(
                    submission.transcript,
                    {
                        name: submission.business_name,
                        type: submission.business_type,
                        owner: submission.owner_name,
                        location: `${submission.address || ''}${submission.address ? ', ' : ''}${submission.city || ''}`.trim(),
                    }
                )
                if (blocks) {
                    // Restored admin work goes on last. The model has just written
                    // testimonials from the new transcript; the quotes a human
                    // typed outrank them, the same order the generic-section merge
                    // below keeps. Without this the preservation above would be
                    // undone one call later, on the only path that triggers it.
                    extractedContent = {
                        ...extractedContent,
                        ...guardGenerated('conversion blocks', blocks),
                        ...restoredAdminWork,
                    }
                }
            } catch (err) {
                console.error('Conversion-block generation failed (using defaults):', err)
            }
        }

        // ── Generic-section AI generation ─────────────────────────────
        // When the selected template is one of the generic landing pages
        // (PageA…PageE), produce the section-level content (hero, about,
        // services items, gallery captions, area, location, footer copy,
        // marquee, navbar). One Groq call per submission; result cached
        // into extractedContent so subsequent regenerations are free.
        //
        // Existing admin-edited fields win — we MERGE-FILL, never overwrite.
        const ec2 = extractedContent as any
        // finalCustomizations is declared further down — read the incoming
        // customizations / persisted customizations directly so we don't
        // hoist-trap on the const declaration.
        const incomingHeroStyle = String(
            (customizations as any)?.heroStyle ??
            (existingWebsite?.customizations as any)?.heroStyle ??
            ''
        )
        const isGenericRender = /^generic:[A-E]$/.test(incomingHeroStyle)
        const hasGenericSections = !!(
            ec2?.hero?.headlineLines || ec2?.services?.items ||
            ec2?.about?.paragraphs || ec2?.gallery?.items ||
            ec2?.area?.places || ec2?.marquee?.text
        )
        if (isGenericRender && !hasGenericSections && submission.transcript) {
            try {
                let sections = await groqService.generateGenericSections(
                    submission.transcript,
                    {
                        name: submission.business_name,
                        type: submission.business_type,
                        owner: submission.owner_name,
                        location: `${submission.address || ''}${submission.address ? ', ' : ''}${submission.city || ''}`.trim(),
                    }
                )
                if (sections) {
                    // Guarded like every other generator output, though the key
                    // whitelist below in generateGenericSections cannot emit
                    // testimonials today — so the invariant is "generated
                    // content is always guarded", with no per-callsite exception
                    // to remember when that whitelist grows.
                    sections = guardGenerated('generic sections', sections)
                    // Shallow merge — admin edits already in extractedContent
                    // win on each leaf because they were set first. We only
                    // fill keys that didn't already exist.
                    const merged: any = { ...extractedContent }
                    for (const [k, v] of Object.entries(sections)) {
                        if (merged[k] == null) merged[k] = v
                    }
                    extractedContent = merged
                }
            } catch (err) {
                console.error('Generic-section generation failed (using fallbacks):', err)
            }
        }

        // ── Stored content faces the same gate ────────────────────────
        // Every guard above only fires on something GENERATED this run, and a
        // regenerate generates nothing: the extraction gate is satisfied because
        // this transcript has already been read, and `hasAnyConversionBlock` is
        // true because the testimonials already exist. So the incident row's three
        // invented customers skip every generator call site and republish verbatim —
        // and would on every future publish, forever. The strip has to run on
        // what we READ as well as on what we write.
        //
        // The tension that kept this pass out until now is real: an admin types
        // real testimonials into the editor, and every editor Save round-trips
        // through here (/api/save-content persists the draft, then calls this
        // route to rebuild), so a blanket strip would delete the admin's words a
        // second after they typed them — and with them the escape hatch the
        // creator-funnel rule in hasSuppliedTestimonials depends on.
        //
        // Resolved per item rather than wholesale, using provenance that already
        // exists in the data and needs no new schema field: the editor stamps an
        // attribution key on every quote a human adds or edits, and nothing a
        // generator writes carries one (see ADMIN_ATTRIBUTION_KEY). Typed quotes
        // survive; machine-written ones do not — including on the row that
        // stored them before this guard existed.
        if (!testimonialsAreSourced && extractedContent) {
            const { content, removed } = stripFabricatedTestimonials(extractedContent, {
                keepAdminAuthored: true,
            })
            const total = removed.testimonials + removed.productTestimonials
            if (total > 0) {
                guardRemoved.stored += total
                console.warn(
                    `[TESTIMONIAL-GUARD] stored content: dropped ${removed.testimonials} testimonial(s) + ` +
                    `${removed.productTestimonials} product testimonial(s) — submission ${submissionData._id} ` +
                    `supplied no testimonial text (contentSource=${(submissionData as any).contentSource || 'creator'})`
                )
            }
            extractedContent = content
        }

        // Template name kept for backward compat in database records
        const selectedTemplate = templateName || 'astro'

        // Fetch enhancedImages — check all possible locations:
        // 1. generatedWebsites top-level (mobile branch patches directly)
        // 2. generatedWebsites.extractedContent.enhancedImages (nested in extractedContent)
        // 3. websiteContent via generatedWebsites chain (by websiteId)
        // 4. websiteContent directly by submissionId (fallback for records without generatedWebsites link)
        let enhancedImageUrls: string[] = []
        let enhancedImagesByCategory: Record<string, string[]> = {}
        try {
            // Source 1: generatedWebsites top-level
            let enhancedImages = (existingWebsite as any)?.enhancedImages || null
            let enhancedSource = enhancedImages ? 'generatedWebsites.enhancedImages' : null

            // Source 2: nested in extractedContent
            if (!enhancedImages) {
                enhancedImages = (existingWebsite?.extractedContent as any)?.enhancedImages || null
                enhancedSource = enhancedImages ? 'generatedWebsites.extractedContent.enhancedImages' : null
            }

            // Source 3: websiteContent via generatedWebsites chain
            if (!enhancedImages) {
                const wcViaChain = await fetchQuery(api.websiteContent.getBySubmissionId, {
                    submissionId: submissionData._id
                })
                enhancedImages = wcViaChain?.enhancedImages || null
                enhancedSource = enhancedImages ? 'websiteContent (via websiteId chain)' : null
            }

            // Source 4: websiteContent directly by submissionId (fallback)
            if (!enhancedImages) {
                const wcDirect = await fetchQuery(api.websiteContent.getDirectBySubmissionId, {
                    submissionId: submissionData._id
                })
                enhancedImages = wcDirect?.enhancedImages || null
                enhancedSource = enhancedImages ? 'websiteContent (direct by submissionId)' : null
            }


            if (enhancedImages && typeof enhancedImages === 'object') {
                // Extract URLs from enhancedImages object
                // Structure: { 
                //   enhanced_headshot: { url, storageId }, 
                //   enhanced_headshot_v1: { url, storageId },
                //   enhanced_headshot_v2: { url, storageId },
                //   interior_1: { url, storageId }, 
                //   ... 
                // }
                // First pass: collect storage IDs that need resolution
                const enhancedEntries: Array<{ key: string; storageId?: string; url?: string }> = []
                for (const [key, img] of Object.entries(enhancedImages)) {
                    const imgData = img as any
                    if (imgData && (imgData.url || imgData.storageId)) {
                        enhancedEntries.push({ key, storageId: imgData.storageId, url: imgData.url })
                    }
                }

                // Batch-resolve all storage IDs at once
                const storageIdsToResolve = enhancedEntries
                    .map(e => e.storageId)
                    .filter((id): id is string => !!id && !id.startsWith('http'))
                let resolvedStorageUrls: (string | null)[] = []
                if (storageIdsToResolve.length > 0) {
                    try {
                        resolvedStorageUrls = await fetchQuery(api.files.getMultipleUrls, {
                            storageIds: storageIdsToResolve
                        })
                        console.log(`[IMAGES] Resolved ${resolvedStorageUrls.filter(Boolean).length}/${storageIdsToResolve.length} enhanced image storage IDs`)
                    } catch (error) {
                        console.error('[IMAGES] Failed to resolve enhanced image storage IDs:', error)
                    }
                }

                // Build resolved URL map: storageId → resolved URL
                const storageUrlMap: Record<string, string> = {}
                storageIdsToResolve.forEach((id, i) => {
                    if (resolvedStorageUrls[i]) storageUrlMap[id] = resolvedStorageUrls[i]!
                })

                // Second pass: categorize with resolved URLs
                for (const entry of enhancedEntries) {
                    // Priority: resolved storageId URL → direct HTTP url (if not expired Airtable)
                    let resolvedUrl = ''
                    if (entry.storageId && storageUrlMap[entry.storageId]) {
                        resolvedUrl = storageUrlMap[entry.storageId]
                    } else if (entry.url && entry.url.startsWith('http') && !entry.url.includes('airtableusercontent.com')) {
                        // Only use direct URL if it's NOT an Airtable URL (which expire)
                        resolvedUrl = entry.url
                    }

                    if (!resolvedUrl) {
                        console.warn(`[IMAGES] Skipping ${entry.key}: no resolved URL (storageId=${entry.storageId ? 'yes' : 'no'}, url=${entry.url ? 'airtable' : 'none'})`)
                        continue
                    }

                    const url = resolvedUrl
                    enhancedImageUrls.push(url)

                    // Extract base field name, removing "enhanced_" prefix and version suffix (_v1, _v2, etc.)
                    let baseKey = entry.key.replace(/^enhanced_/, '').replace(/_v\d+$/, '')

                    // Categorize for section-specific mapping.
                    // Two key families are supported:
                    //  - Legacy role keys: headshot, interior_*, exterior, product_*
                    //  - Tendso Studio v0.2 placement keys: hero, portrait, gallery_<N>
                    //    (a 6-12 image "photoshoot" set keyed by where they go, not source role)

                    // about: people + interiors + portrait + the gallery pool
                    if (baseKey.startsWith('interior') || baseKey === 'headshot' || baseKey === 'portrait' || baseKey.startsWith('gallery')) {
                        ;(enhancedImagesByCategory.about ??= []).push(url)
                    }
                    // featured: products + the gallery pool (gallery is the general set)
                    if (baseKey.startsWith('product') || baseKey.startsWith('gallery')) {
                        ;(enhancedImagesByCategory.featured ??= []).push(url)
                    }
                    // hero: the lead image (placement 'hero'), else exterior/headshot/portrait
                    if (baseKey === 'hero' || baseKey === 'exterior' || baseKey === 'headshot' || baseKey === 'portrait') {
                        ;(enhancedImagesByCategory.hero ??= []).push(url)
                    }
                    // services: interiors, exterior, and the gallery pool
                    if (baseKey.startsWith('interior') || baseKey === 'exterior' || baseKey.startsWith('gallery')) {
                        ;(enhancedImagesByCategory.services ??= []).push(url)
                    }

                    console.log(`[IMAGES] ${entry.key} (${baseKey}) → ${url.substring(0, 50)}...`)
                }
            }
        } catch (error) {
            console.error('Error fetching websiteContent enhancedImages:', error)
        }

        const hasEnhancedImages = enhancedImageUrls.length > 0

        // Helper: filter out expired Airtable URLs (they return 410 Gone)
        const isValidImageUrl = (url: string) => url && url.startsWith('http') && !url.includes('airtableusercontent.com')

        // Helper: accept either a usable HTTP URL OR a Convex storage reference
        // (`convex:<id>` / raw storage ID). Newly uploaded images from VisualEditor
        // arrive as `convex:<id>` strings and must survive the user-edit filter so
        // they can be resolved to a URL further down.
        const isUsableImageRef = (s: string) => {
            if (!s) return false
            if (s.startsWith('http')) return !s.includes('airtableusercontent.com')
            return true
        }

        // Get photos priority:
        // 1. User-edited images from content editor (saved in extractedContent.images) — but filter out expired Airtable URLs
        // 2. Freshly-resolved enhanced images from Airtable (storageIds already resolved above)
        // 3. Original submission photos
        const userEditedImages = ((extractedContent as any)?.images || [])
            .filter((img: string) => isUsableImageRef(img))
        const hasValidUserEditedImages = userEditedImages.length > 0

        const photoStorageIds = hasValidUserEditedImages
            ? userEditedImages
            : (hasEnhancedImages ? enhancedImageUrls : (submission.photos || []))

        console.log(`[IMAGES] Source: ${hasValidUserEditedImages ? 'user-edited' : hasEnhancedImages ? 'enhanced' : 'submission'}`)
        let photos: string[] = []

        console.log(`[IMAGES] photoStorageIds (${photoStorageIds.length}):`, photoStorageIds.map((id: string) => id?.startsWith('http') ? (id.includes('airtable') ? 'AIRTABLE_EXPIRED' : 'HTTP') : 'STORAGE_ID'))

        if (photoStorageIds.length > 0) {
            try {
                // Split into valid HTTP URLs and storage IDs that need resolution
                const validHttpUrls = photoStorageIds.filter((id: string) => isValidImageUrl(id))
                const storageIds = photoStorageIds.filter((id: string) => id && !id.startsWith('http'))

                let resolvedFromStorage: string[] = []
                if (storageIds.length > 0) {
                    const resolvedUrls = await fetchQuery(api.files.getMultipleUrls, {
                        storageIds: storageIds
                    })
                    resolvedFromStorage = resolvedUrls.filter((url: any): url is string => url !== null)
                    console.log(`[IMAGES] Resolved ${resolvedFromStorage.length}/${storageIds.length} storage IDs`)
                }

                photos = [...validHttpUrls, ...resolvedFromStorage]
            } catch (error) {
                console.error('Error resolving photo URLs:', error)
                photos = photoStorageIds.filter((url: string) => isValidImageUrl(url))
            }
        }

        // Fallback: if no photos resolved from enhanced images, use original submission photos
        if (photos.length === 0 && (submission.photos?.length ?? 0) > 0) {
            console.log(`[IMAGES] No enhanced images resolved, falling back to submission.photos`)
            try {
                const subPhotos = submission.photos || []
                const httpPhotos = subPhotos.filter((p: string) => isValidImageUrl(p))
                const storagePhotos = subPhotos.filter((p: string) => p && !p.startsWith('http'))
                let resolved: string[] = []
                if (storagePhotos.length > 0) {
                    const urls = await fetchQuery(api.files.getMultipleUrls, { storageIds: storagePhotos })
                    resolved = urls.filter((u: any): u is string => u !== null)
                }
                photos = [...httpPhotos, ...resolved]
            } catch (error) {
                console.error('Error resolving submission photos:', error)
            }
        }
        console.log(`[IMAGES] Final photos array: ${photos.length} URLs`)

        // Resolve about_images: prefer user-edited, then enhanced, then extractedContent
        const userEditedAboutImages = ((extractedContent as any)?.about_images || [])
            .filter((img: string) => isUsableImageRef(img))
        const rawAboutImages = userEditedAboutImages.length > 0
            ? userEditedAboutImages
            : ((hasEnhancedImages && enhancedImagesByCategory.about?.length)
                ? enhancedImagesByCategory.about
                : ((extractedContent as any)?.about_images || []))
        // Filter out expired Airtable URLs from any source
        const aboutImageStorageIds = rawAboutImages.filter((img: string) =>
            img && (!img.startsWith('http') || isValidImageUrl(img))
        )
        let resolvedAboutImages: string[] = []

        if (aboutImageStorageIds.length > 0) {
            try {
                // Filter out already-resolved URLs and only resolve storage IDs
                const storageIdsToResolve = aboutImageStorageIds.filter(
                    (img: string) => img && !img.startsWith('http')
                )
                const alreadyResolvedUrls = aboutImageStorageIds.filter(
                    (img: string) => img && img.startsWith('http')
                )

                if (storageIdsToResolve.length > 0) {
                    const resolvedUrls = await fetchQuery(api.files.getMultipleUrls, {
                        storageIds: storageIdsToResolve
                    })

                    // Map back to original order
                    resolvedAboutImages = aboutImageStorageIds.map((img: string) => {
                        if (img.startsWith('http')) {
                            return img
                        }
                        const idx = storageIdsToResolve.indexOf(img)
                        return resolvedUrls[idx] || img
                    }).filter((url: string | null): url is string => url !== null)
                } else {
                    resolvedAboutImages = alreadyResolvedUrls
                }
            } catch (error) {
                console.error('Error resolving about image URLs:', error)
                // Fallback to original array if resolution fails
                resolvedAboutImages = aboutImageStorageIds
            }
        }

        // Resolve services_image: prefer user-edited, then enhanced, then extractedContent
        const userEditedServicesImage = (extractedContent as any)?.services_image
        const rawServicesImage = (userEditedServicesImage && isUsableImageRef(userEditedServicesImage))
            ? userEditedServicesImage
            : ((hasEnhancedImages && enhancedImagesByCategory.services?.length)
                ? enhancedImagesByCategory.services[0]
                : (extractedContent as any)?.services_image)
        const servicesImageStorageId = rawServicesImage && (!rawServicesImage.startsWith('http') || isValidImageUrl(rawServicesImage))
            ? rawServicesImage : undefined
        let resolvedServicesImage: string | undefined = undefined

        if (servicesImageStorageId && !servicesImageStorageId.startsWith('http')) {
            try {
                const resolvedUrls = await fetchQuery(api.files.getMultipleUrls, {
                    storageIds: [servicesImageStorageId]
                })
                if (resolvedUrls[0]) {
                    resolvedServicesImage = resolvedUrls[0]
                }
            } catch (error) {
                console.error('Error resolving services image URL:', error)
            }
        } else if (servicesImageStorageId?.startsWith('http')) {
            resolvedServicesImage = servicesImageStorageId
        }

        // Resolve featured_images: prefer user-edited, then enhanced, then extractedContent
        const userEditedFeaturedImages = ((extractedContent as any)?.featured_images || [])
            .filter((img: string) => isUsableImageRef(img))
        const rawFeaturedImages = userEditedFeaturedImages.length > 0
            ? userEditedFeaturedImages
            : ((hasEnhancedImages && enhancedImagesByCategory.featured?.length)
                ? enhancedImagesByCategory.featured
                : ((extractedContent as any)?.featured_images || []))
        const featuredImageStorageIds = rawFeaturedImages.filter((img: string) =>
            img && (!img.startsWith('http') || isValidImageUrl(img))
        )
        let resolvedFeaturedImages: string[] = []

        if (featuredImageStorageIds.length > 0) {
            try {
                // Filter out already-resolved URLs and only resolve storage IDs
                const storageIdsToResolve = featuredImageStorageIds.filter(
                    (img: string) => img && !img.startsWith('http')
                )
                const alreadyResolvedUrls = featuredImageStorageIds.filter(
                    (img: string) => img && img.startsWith('http')
                )

                if (storageIdsToResolve.length > 0) {
                    const resolvedUrls = await fetchQuery(api.files.getMultipleUrls, {
                        storageIds: storageIdsToResolve
                    })

                    // Map back to original order
                    resolvedFeaturedImages = featuredImageStorageIds.map((img: string) => {
                        if (img.startsWith('http')) {
                            return img
                        }
                        const idx = storageIdsToResolve.indexOf(img)
                        return resolvedUrls[idx] || img
                    }).filter((url: string | null): url is string => url !== null)
                } else {
                    resolvedFeaturedImages = alreadyResolvedUrls
                }
            } catch (error) {
                console.error('Error resolving featured image URLs:', error)
                // Fallback to original array if resolution fails
                resolvedFeaturedImages = featuredImageStorageIds
            }
        }

        // Resolve product images inside featured_products (convex:storageId → URL)
        const rawProducts = (extractedContent as any)?.featured_products || []
        let resolvedProducts = rawProducts
        if (rawProducts.length > 0) {
            const productImageIds = rawProducts
                .map((p: any) => p.image)
                .filter((img: string | undefined) => img && !img.startsWith('http'))
                .map((img: string) => img.replace(/^convex:/, ''))

            if (productImageIds.length > 0) {
                try {
                    const resolvedUrls = await fetchQuery(api.files.getMultipleUrls, {
                        storageIds: productImageIds
                    })
                    resolvedProducts = rawProducts.map((p: any) => {
                        if (!p.image || p.image.startsWith('http')) return p
                        const cleanId = p.image.replace(/^convex:/, '')
                        const idx = productImageIds.indexOf(cleanId)
                        const resolvedUrl = idx !== -1 ? resolvedUrls[idx] : null
                        return { ...p, image: resolvedUrl || p.image }
                    })
                } catch (error) {
                    console.error('Error resolving product image URLs:', error)
                }
            }
        }

        const defaultCustomizations = {
            heroStyle: 'A',
            aboutStyle: 'A',
            servicesStyle: 'A',
            galleryStyle: 'A',
            contactStyle: 'A',
            // Legacy fields
            navbarStyle: '1',
            featuredStyle: '1',
            footerStyle: '1',
            colorScheme: 'auto',
            colorSchemeId: 'auto',
            fontPairing: 'modern',
            fontPairingId: 'modern'
        }
        const finalCustomizations = customizations && Object.keys(customizations).length > 0
            ? { ...defaultCustomizations, ...customizations }
            : defaultCustomizations

        // Ensure all required fields are present with fallbacks from submission data
        const contentWithContact = {
            // Core required fields with fallbacks.
            //
            // These three fallbacks stay, and the line they sit on the right side
            // of is the whole point of this file: they are assembled ONLY out of
            // what the business itself put on the submission form — its name, its
            // category, its city. They assert no capability, no promise and no
            // quality. Nothing below may be restored on the same reasoning: the
            // moment a default names a service, a turnaround, a rating or a
            // customer, it is speaking for a business that never said it.
            //
            // The tagline default now carries real weight. It used to be nearly
            // dead, because a missing tagline forced a re-extraction until one
            // appeared; that check is gone (it could not converge), so an
            // interview that yields no tagline keeps its blank one and this is
            // the only thing standing between it and a headless hero.
            business_name: extractedContent?.business_name || submission.business_name,
            tagline: extractedContent?.tagline || `Welcome to ${submission.business_name}`,
            about: extractedContent?.about || `${submission.business_name} is a ${submission.business_type} located in ${submission.city}.`,
            // No invented menu, and no invented virtues. If the interview never
            // named a service, this business has no service list on its site and
            // the section self-hides — the same rule the conversion blocks already
            // follow (lib/astro-builder.ts:439). "Customer satisfaction
            // guaranteed" is a promise nobody here made.
            //
            // `?? []` rather than leaving these undefined: an empty array is
            // truthy, so it holds the line against the `|| [...]` fallbacks that
            // still sit downstream instead of handing them back the fabrication.
            services: extractedContent?.services ?? [],
            unique_selling_points: extractedContent?.unique_selling_points ?? [],
            tone: extractedContent?.tone || 'professional-friendly',
            // Optional fields
            hero_cta: extractedContent?.hero_cta,
            hero_cta_secondary: extractedContent?.hero_cta_secondary,
            services_cta: extractedContent?.services_cta,
            methodology: extractedContent?.methodology,
            // Hero section fields
            hero_badge_text: extractedContent?.hero_badge_text,
            hero_testimonial: extractedContent?.hero_testimonial,
            // Visibility toggles
            visibility: extractedContent?.visibility || {
                navbar: true,
                hero_section: true,
                hero_headline: true,
                hero_tagline: true,
                hero_description: true,
                hero_testimonial: true,
                hero_button: true,
                hero_image: true,
                // About section visibility
                about_section: true,
                about_badge: true,
                about_headline: true,
                about_description: true,
                about_images: true,
                about_tagline: true,
                about_tags: true,
                // Services section visibility
                services_section: true,
                services_badge: true,
                services_headline: true,
                services_subheadline: true,
                services_image: true,
                services_list: true,
                // Featured section visibility
                featured_section: true,
                featured_headline: true,
                featured_subheadline: true,
                featured_products: true,
                // Footer section visibility
                footer_section: true,
                footer_badge: true,
                footer_headline: true,
                footer_description: true,
                footer_contact: true,
                footer_social: true
            },
            // About section fields
            about_headline: extractedContent?.about_headline,
            about_description: (extractedContent as any)?.about_description,
            about_tagline: (extractedContent as any)?.about_tagline,
            about_tags: (extractedContent as any)?.about_tags,
            about_images: resolvedAboutImages.length > 0 ? resolvedAboutImages : undefined,
            // Services section fields
            services_headline: (extractedContent as any)?.services_headline,
            services_subheadline: (extractedContent as any)?.services_subheadline,
            services_image: resolvedServicesImage,
            // Featured section fields. The headline is a band LABEL, not a claim,
            // so it keeps its default the way services_headline / about_headline
            // do in the builder; everything under it must be real or absent.
            featured_headline: (extractedContent as any)?.featured_headline || 'Featured Products',
            // "Take a look at some of our recent work" is a claim that recent
            // work exists and that we know what it was. Left blank, the band
            // renders its heading over the business's own photos and says
            // nothing it can't back.
            featured_subheadline: (extractedContent as any)?.featured_subheadline,
            // Real work or nothing. The removed fallback invented entire
            // projects ("Complete Kitchen Renovation", "We transformed the heart
            // of X") and attributed praise for them to five recycled names. The
            // testimonial guard stripped the quotes, but only the quotes — the
            // invented projects shipped regardless, and on a business that DID
            // supply testimonials the guard stood down and the names shipped too.
            // `resolvedProducts` derives from extractedContent, which the
            // stored-content pass above has already filtered.
            featured_products: resolvedProducts,
            featured_images: resolvedFeaturedImages.length > 0 ? resolvedFeaturedImages : undefined,
            // Featured CTA fields for style 4
            featured_cta_text: (extractedContent as any)?.featured_cta_text,
            featured_cta_link: (extractedContent as any)?.featured_cta_link,
            // Navbar links
            navbar_links: extractedContent?.navbar_links || [
                { label: 'About', href: '#about' },
                { label: 'Services', href: '#services' },
                { label: 'Featured', href: '#featured' },
                { label: 'Contacts', href: '#contact' }
            ],
            navbar_cta_text: (extractedContent as any)?.navbar_cta_text,
            navbar_cta_link: (extractedContent as any)?.navbar_cta_link,
            navbar_headline: (extractedContent as any)?.navbar_headline,
            // Images: preserve user's per-slot image selections if valid, otherwise use resolved photos
            // This keeps the user's content editor choices (slot 1 = X, slot 2 = Y) intact
            // while filtering out expired Airtable URLs
            images: hasValidUserEditedImages ? userEditedImages : photos,
            // Contact info from submission (or from existing extracted content if
            // edited). Every field here is the submission's own — no placeholder
            // tail, for the same reason as the merge near the top of this file: a
            // live site is better missing a phone number than showing one that
            // rings nowhere.
            contact: (extractedContent as any)?.contact || {
                email: submission.owner_email,
                phone: submission.owner_phone,
                address: submission.address ? `${submission.address}, ${submission.city}` : submission.city
            },
            // Footer section fields — whatever the admin wrote, or nothing. The
            // removed default ("explore your vision further… our professional
            // team") was agency copy for a business we know nothing about, and it
            // rendered as the footer blurb on every site that never set one.
            footer: (extractedContent as any)?.footer,
            // ── New v01-spec block content (feeds Location/ServiceArea/ClickToMessage) ──
            // Coordinates: submitter-set wins; else falls back to whatever the
            // editor may have stored under extractedContent.location.
            location: (extractedContent as any)?.location ?? ((submission as any).coordinates ? {
                lat: (submission as any).coordinates.lat,
                lng: (submission as any).coordinates.lng,
            } : undefined),
            // Google Business Profile link — owner edits hours in Google, the
            // LocationBlock renders this as the "See latest hours on Google"
            // deeplink. Builder auto-falls-back to a Maps search-by-address
            // query when this is unset, so the button always works.
            googleMapsUrl:
                (extractedContent as any)?.googleMapsUrl ??
                (submissionData as any).googleMapsUrl ??
                (submissionData as any).googleBusinessUrl ??
                undefined,
            // Service area: editor-set wins; else build pipeline auto-seeds from
            // the city name via SERVICE_AREA_SEEDS adjacency table.
            serviceArea: (extractedContent as any)?.serviceArea,
            // Click-to-message: editor-set wins; else build pipeline auto-derives
            // whatsapp from contact.phone (PH 0917... → 63917...).
            messaging: (extractedContent as any)?.messaging,
            // Hint for the build pipeline's serviceArea seeder.
            business_city: submission.city,
            // Hint for the build pipeline's per-business-type defaults
            // (Trust/WhyUs/HowItWorks/Testimonials/FAQ/Credentials/CtaBand).
            business_type: submission.business_type,
            // Conversion-cluster overrides — admin edits in /admin/submissions
            // override the per-category defaults from lib/block-defaults.ts.
            trust: (extractedContent as any)?.trust,
            why: (extractedContent as any)?.why,
            how: (extractedContent as any)?.how,
            testimonials: (extractedContent as any)?.testimonials,
            faq: (extractedContent as any)?.faq,
            credentials: (extractedContent as any)?.credentials,
            ctaBand: (extractedContent as any)?.ctaBand,
            // Branded-family nested-section content (Barbershop F–J, SalonSpa
            // K–O). These wrappers consume `content.gallery.items[i].image`,
            // `content.hero.image`, `content.about.image`, etc. — distinct
            // from the legacy flat fields above (about_images, featured_images,
            // hero_image_url). Without this pass-through, admin edits made
            // through the click-to-edit / image picker UI land in Convex's
            // extractedContent but never reach the builder — so the next
            // regen falls back to derived defaults and admin's choice is
            // silently discarded. Specifically discovered for gallery image
            // picks; symptom applies to every wrapped section.
            // See TEMPLATE-FAMILY-PLAYBOOK.md §"Common gotchas" for the
            // schema mismatch detail.
            // Each of these is a wrapped section object for branded families
            // (e.g. content.about = { tag, headline, paragraphs[], image }
            // for SalonSpa AboutK). Override the legacy flat field above
            // ONLY when the admin draft stores the wrapped object shape —
            // otherwise we'd clobber the string-shaped `about` / array-shaped
            // `services` paths that Generic A–E still uses.
            ...(isWrappedObject((extractedContent as any)?.about)
                ? { about: (extractedContent as any).about } : {}),
            ...(isWrappedObject((extractedContent as any)?.services)
                ? { services: (extractedContent as any).services } : {}),
            ...(isWrappedObject((extractedContent as any)?.hero)
                ? { hero: (extractedContent as any).hero } : {}),
            ...(isWrappedObject((extractedContent as any)?.gallery)
                ? { gallery: (extractedContent as any).gallery } : {}),
            ...(isWrappedObject((extractedContent as any)?.area)
                ? { area: (extractedContent as any).area } : {}),
            ...(isWrappedObject((extractedContent as any)?.marquee)
                ? { marquee: (extractedContent as any).marquee } : {}),
            navCtaText: (extractedContent as any)?.navCtaText,
            navCtaHref: (extractedContent as any)?.navCtaHref,
            // Not content — provenance, and the only reason the extraction gate
            // above can converge. Nothing renders it; it rides along inside
            // extractedContent because that is the object that survives the
            // editor round-trip, and it has to come back to us on the next
            // regenerate to answer "have we already read this transcript?".
            //
            // It lives here rather than being spread in from extractedContent
            // because this literal is a whitelist: a key that is not named here
            // does not reach Convex.
            [EXTRACTION_MARKER_KEY]: extractionMarker,
        }

        let generatedHtml = await buildAstroSite(contentWithContact, finalCustomizations, photos)

        // Bake per-role colour overrides (click-to-recolour) into the built HTML
        // so they persist on Save + Publish (the live editor injects the same CSS
        // client-side). Template-agnostic — keyed by the shared data-field
        // selectors. See lib/roleColors.ts.
        const __roleColorCss = buildRoleColorCss((finalCustomizations as any)?.roleColors)
        if (__roleColorCss) {
            const __styleTag = `<style id="role-colors">${__roleColorCss}</style>`
            generatedHtml = generatedHtml.includes('</head>')
                ? generatedHtml.replace('</head>', `${__styleTag}</head>`)
                : (generatedHtml.includes('</body>')
                    ? generatedHtml.replace('</body>', `${__styleTag}</body>`)
                    : generatedHtml + __styleTag)
        }

        // ── What the admin is told about the guard ────────────────────
        // The count is the whole point of this block. A creator-funnel
        // recording can be full of genuine customer quotes and every one of
        // them is stripped (nothing on that path can verify a quote), leaving a
        // page with no testimonials band and — until this — no hint that the
        // recording had anything quotable in it. An admin who doesn't know
        // can't type the real words back in.
        //
        // The message ships from here rather than from the UI because the route
        // is the only place that knows WHICH strip fired and therefore what the
        // admin should do next. The caller renders `message` verbatim.
        const testimonialGuard = {
            /** false → this business supplied no testimonial words, so the guard was live. */
            sourced: testimonialsAreSourced,
            removed: guardRemoved.generated + guardRemoved.stored,
            removedFromGenerated: guardRemoved.generated,
            removedFromStored: guardRemoved.stored,
            message: [
                guardRemoved.generated > 0
                    ? `${guardRemoved.generated} customer quote${guardRemoved.generated === 1 ? '' : 's'} written from the interview ${guardRemoved.generated === 1 ? 'was' : 'were'} removed — nothing in this submission records who said ${guardRemoved.generated === 1 ? 'it' : 'them'}. If the recording has real quotes, type them into the Testimonials block and save; typed quotes are kept.`
                    : '',
                guardRemoved.stored > 0
                    ? `${guardRemoved.stored} stored customer quote${guardRemoved.stored === 1 ? '' : 's'} ${guardRemoved.stored === 1 ? 'was' : 'were'} removed from the saved content — machine-written, not supplied by the business.`
                    : '',
            ].filter(Boolean).join(' ') || undefined,
        }

        // PREVIEW mode: hand the built HTML back to the editor's "Preview my site"
        // WITHOUT persisting anything — no generatedWebsites / websiteContent upsert,
        // no publish, no touch to the live site. Same assembly + build as a real
        // save, so what the admin previews is exactly what Save will produce.
        if (preview) {
            return NextResponse.json({ success: true, html: generatedHtml, testimonialGuard })
        }

        // Save to Convex using mutations
        const { fetchMutation, fetchAction } = await import('convex/nextjs')

        // Store the built HTML in Convex file storage (it can exceed the 1 MiB
        // per-document limit, which was throwing "Value is too large" on upsert)
        // and keep only the reference on the row. Readers resolve it via the
        // htmlUrl the getBySubmission* queries return — see lib/website-html.ts.
        const htmlStorageId = await fetchAction(api.generatedWebsites.storeHtml, {
            html: generatedHtml,
        })

        // Save generated website to Convex (legacy table - kept for backward compatibility)
        const websiteId = await fetchMutation(api.generatedWebsites.upsert, {
            submissionId: submissionData._id,
            templateName: selectedTemplate,
            extractedContent: contentWithContact,
            customizations: finalCustomizations,
            htmlStorageId,
            status: 'draft',
        })

        // Also save to the new websiteContent table (normalized content storage)
        await fetchMutation(api.websiteContent.upsert, {
            websiteId: websiteId,
            // Business info
            businessName: contentWithContact.business_name,
            tagline: contentWithContact.tagline,
            // `content.about` can arrive as a wrapped object on branded/bespoke
            // families (e.g. after an admin edits the About image, which writes
            // `about.image` and turns `about` into `{ image, ... }`). The
            // websiteContent.aboutText column is `v.string()`, so coerce — mirror
            // transformToAstroData's description coercion (lead > description >
            // body > joined paragraphs > ''). Without this the mutation throws
            // ArgumentValidationError on any About-image edit.
            aboutText: (() => {
                const a = contentWithContact.about as any;
                if (typeof a === 'string') return a;
                return a?.lead ?? a?.description ?? a?.body
                    ?? (Array.isArray(a?.paragraphs) ? a.paragraphs.join('\n\n') : '');
            })(),
            tone: contentWithContact.tone,
            // Hero section
            heroBadgeText: contentWithContact.hero_badge_text,
            heroTestimonial: contentWithContact.hero_testimonial,
            heroCtaLabel: (contentWithContact.hero_cta as any)?.label,
            heroCtaLink: (contentWithContact.hero_cta as any)?.link,
            // About section
            aboutHeadline: contentWithContact.about_headline,
            aboutDescription: contentWithContact.about_description,
            aboutTagline: contentWithContact.about_tagline,
            aboutTags: contentWithContact.about_tags,
            uniqueSellingPoints: contentWithContact.unique_selling_points,
            // Services section
            servicesHeadline: contentWithContact.services_headline,
            servicesSubheadline: contentWithContact.services_subheadline,
            // The same two shapes the builder now reads (lib/astro-builder.ts
            // servicesSection / hero.services): flat `{name, description}` from
            // extraction, wrapped `{ tag, headline, items[] }` from
            // generateGenericSections and the generic editor. `?.map` guards
            // only a nullish value, so the wrapped object threw here too — and
            // this call sits after the HTML is already stored, so the failure
            // would have surfaced as a 500 on an otherwise successful build.
            // The `title`/`desc` aliases are the wrapped item's own key names;
            // dropping them would file the owner's real menu as blank rows.
            services: (() => {
                const s: any = contentWithContact.services
                const list = Array.isArray(s)
                    ? s
                    : Array.isArray(s?.items) ? s.items : undefined
                return list?.map((it: any) => ({
                    name: it.name || it.title || '',
                    description: it.description || it.desc || '',
                    icon: it.icon,
                }))
            })(),
            // Featured section
            featuredHeadline: contentWithContact.featured_headline,
            featuredSubheadline: contentWithContact.featured_subheadline,
            featuredProducts: contentWithContact.featured_products?.map((p: any) => ({
                title: p.title || '',
                description: p.description || '',
                image: p.image,
                tags: p.tags,
                testimonial: p.testimonial ? {
                    quote: p.testimonial.quote || '',
                    author: p.testimonial.author || '',
                    avatar: p.testimonial.avatar,
                } : undefined,
            })),
            featuredImages: contentWithContact.featured_images,
            // Contact info
            contact: contentWithContact.contact ? {
                email: contentWithContact.contact.email || '',
                phone: contentWithContact.contact.phone || '',
                address: contentWithContact.contact.address,
                whatsapp: contentWithContact.contact.whatsapp,
                messenger: contentWithContact.contact.messenger,
            } : undefined,
            // Footer
            footerDescription: contentWithContact.footer?.brand_blurb,
            socialLinks: contentWithContact.footer?.social_links?.map((l: any) => ({
                platform: l.platform || '',
                url: l.url || '',
            })),
            // Navigation
            navbarLinks: contentWithContact.navbar_links?.map((l: any) => ({
                label: l.label || '',
                href: l.href || '',
            })),
            navbarCtaText: contentWithContact.navbar_cta_text,
            navbarCtaLink: contentWithContact.navbar_cta_link,
            navbarHeadline: contentWithContact.navbar_headline,
            // Images
            images: {
                hero: Array.isArray(contentWithContact.images) ? contentWithContact.images : undefined,
                about: contentWithContact.about_images,
                services: contentWithContact.services_image ? [contentWithContact.services_image] : undefined,
            },
            // Visibility settings — both legacy snake_case keys (kept for the
            // A–O templates) AND the new generic-template block keys are
            // forwarded so a toggle in the Blocks tab actually takes effect.
            visibility: contentWithContact.visibility ? {
                navbar: contentWithContact.visibility.navbar,
                navbarHeadline: contentWithContact.visibility.navbar_headline,
                heroSection: contentWithContact.visibility.hero_section,
                heroHeadline: contentWithContact.visibility.hero_headline,
                heroTagline: contentWithContact.visibility.hero_tagline,
                heroDescription: contentWithContact.visibility.hero_description,
                heroTestimonial: contentWithContact.visibility.hero_testimonial,
                heroButton: contentWithContact.visibility.hero_button,
                heroImage: contentWithContact.visibility.hero_image,
                aboutSection: contentWithContact.visibility.about_section,
                aboutBadge: contentWithContact.visibility.about_badge,
                aboutHeadline: contentWithContact.visibility.about_headline,
                aboutDescription: contentWithContact.visibility.about_description,
                aboutImages: contentWithContact.visibility.about_images,
                aboutTagline: contentWithContact.visibility.about_tagline,
                aboutTags: contentWithContact.visibility.about_tags,
                servicesSection: contentWithContact.visibility.services_section,
                servicesBadge: contentWithContact.visibility.services_badge,
                servicesHeadline: contentWithContact.visibility.services_headline,
                servicesSubheadline: contentWithContact.visibility.services_subheadline,
                servicesImage: contentWithContact.visibility.services_image,
                servicesList: contentWithContact.visibility.services_list,
                featuredSection: contentWithContact.visibility.featured_section,
                featuredHeadline: contentWithContact.visibility.featured_headline,
                featuredSubheadline: contentWithContact.visibility.featured_subheadline,
                featuredProducts: contentWithContact.visibility.featured_products,
                featuredImages: contentWithContact.visibility.featured_images,
                gallerySection: contentWithContact.visibility.gallery_section ?? contentWithContact.visibility.featured_section,
                footerSection: contentWithContact.visibility.footer_section,
                footerBadge: contentWithContact.visibility.footer_badge,
                footerHeadline: contentWithContact.visibility.footer_headline,
                footerDescription: contentWithContact.visibility.footer_description,
                footerContact: contentWithContact.visibility.footer_contact,
                footerSocial: contentWithContact.visibility.footer_social,
                contactSection: contentWithContact.visibility.contact_section ?? contentWithContact.visibility.footer_section,
                // New generic-template block keys. These are the ones the
                // Blocks tab actually toggles; the Astro PageA…PageE wrappers
                // read camelCase block keys (visibility.trustBlock etc.).
                trustBlock: contentWithContact.visibility.trust_block,
                whyUsBlock: contentWithContact.visibility.why_us_block,
                howItWorksBlock: contentWithContact.visibility.how_it_works_block,
                testimonialsBlock: contentWithContact.visibility.testimonials_block,
                faqBlock: contentWithContact.visibility.faq_block,
                serviceAreaBlock: contentWithContact.visibility.service_area_block,
                credentialsBlock: contentWithContact.visibility.credentials_block,
                locationBlock: contentWithContact.visibility.location_block,
                ctaBandBlock: contentWithContact.visibility.cta_band_block,
                clickToMessage: contentWithContact.visibility.click_to_message,
                scrollTopButton: contentWithContact.visibility.scroll_top_button,
            } : undefined,
            // Customizations
            customizations: {
                heroStyle: finalCustomizations.heroStyle,
                aboutStyle: finalCustomizations.aboutStyle,
                servicesStyle: finalCustomizations.servicesStyle,
                galleryStyle: finalCustomizations.galleryStyle || finalCustomizations.featuredStyle,
                contactStyle: finalCustomizations.contactStyle || finalCustomizations.footerStyle,
                // Legacy fields
                navbarStyle: finalCustomizations.navbarStyle,
                featuredStyle: finalCustomizations.featuredStyle,
                footerStyle: finalCustomizations.footerStyle,
                colorScheme: finalCustomizations.colorScheme || finalCustomizations.colorSchemeId,
                fontPairing: finalCustomizations.fontPairing || finalCustomizations.fontPairingId,
            },
        })

        // Update submission status to website_generated (but don't regress if already deployed+)
        const keepStatuses = ['deployed', 'pending_payment', 'paid']
        if (!keepStatuses.includes(submissionData.status)) {
            await fetchMutation(api.submissions.updateStatus, {
                id: submissionId as any,
                status: 'website_generated',
            })
        }

        return NextResponse.json({
            success: true,
            websiteId: websiteId,
            htmlContent: generatedHtml, // For iframe srcdoc preview
            website: {
                extracted_content: contentWithContact,
                customizations: finalCustomizations
            },
            testimonialGuard,
            message: 'Website generated successfully'
        })

    } catch (error: any) {
        console.error('Website generation error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate website' },
            { status: 500 }
        )
    }
}
