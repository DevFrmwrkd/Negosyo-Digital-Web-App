import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { defaultsFor, type WhyItem, type HowStep, type Testimonial, type FaqItem, type CredItem, type TrustData, type CtaBand } from './block-defaults'

interface ExtractedContent {
    business_name: string
    tagline: string
    about: string
    services?: Array<{ name: string; description: string; icon?: string }>
    unique_selling_points?: string[]
    tone?: string
    contact?: {
        phone?: string
        email?: string
        address?: string
        whatsapp?: string
        messenger?: string
    }
    hero_cta?: { label: string; link: string }
    hero_cta_secondary?: { label: string; link: string }
    hero_badge_text?: string
    hero_testimonial?: string
    visibility?: Record<string, boolean>
    // Style G extra fields
    footer_badge?: string
    footer_headline?: string
    footer_hours?: string
    footer_days?: string
    about_signature_name?: string
    about_signature_role?: string
    about_headline?: string
    about_description?: string
    about_tagline?: string
    about_tags?: string[]
    about_images?: string[]
    services_headline?: string
    services_subheadline?: string
    services_image?: string
    services_cta?: { label: string; link: string }
    featured_headline?: string
    featured_subheadline?: string
    featured_products?: Array<{
        title: string
        description: string
        image?: string
        tags?: string[]
        testimonial?: { quote: string; author: string; avatar?: string }
    }>
    featured_images?: string[]
    featured_cta_text?: string
    featured_cta_link?: string
    navbar_links?: Array<{ label: string; href: string }>
    navbar_cta_text?: string
    navbar_cta_link?: string
    navbar_headline?: string
    footer?: {
        brand_blurb?: string
        social_links?: Array<{ platform: string; url: string }>
    }
    images?: string[]
    // ── New v01-spec block content (all optional; auto-seeded by build pipeline) ──
    location?: {
        lat?: number
        lng?: number
    }
    serviceArea?: {
        heading?: string
        places?: string[]
    }
    messaging?: {
        whatsapp?: string  // raw phone-like string; sanitized into wa.me URL at render
        messenger?: string // full messenger.com / m.me URL
    }
    business_city?: string  // used to seed serviceArea.places
    business_type?: string  // used to pick per-category content defaults
    googleMapsUrl?: string  // GBP / google.com/maps link — renders "Hours on Google" deeplink
    favicon?: string        // URL for the browser-tab icon (rel="icon")
    ogImage?: string        // URL for og:image / twitter:image link previews
    // ── Conversion-cluster blocks (admin overrides; else per-business-type defaults) ──
    trust?: TrustData
    why?: WhyItem[]
    how?: HowStep[]
    testimonials?: Testimonial[]
    faq?: FaqItem[]
    credentials?: CredItem[]
    ctaBand?: CtaBand
}

interface Customizations {
    navbarStyle?: string
    heroStyle?: string
    aboutStyle?: string
    servicesStyle?: string
    featuredStyle?: string
    footerStyle?: string
    galleryStyle?: string
    contactStyle?: string
    colorScheme?: string
    colorSchemeId?: string
    fontPairing?: string
    fontPairingId?: string
}

/**
 * Map numeric style (1-4) to letter (A-D) for backward compatibility
 */
function mapStyleToLetter(numericStyle: string | undefined, fallback: string = 'A'): string {
    if (!numericStyle) return fallback
    const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H', '9': 'I', '10': 'J' }
    return map[numericStyle] || numericStyle // Pass through if already a letter
}

/**
 * Normalize Why / How / Testimonials / FAQ / Credentials block shape so
 * downstream Astro components can rely on a single consistent contract:
 *   { tag?, headline?, items: [...] }
 *
 * The codebase has three historical shapes for these blocks, all of which
 * land in `extractedContent` depending on origin:
 *
 *   A) Flat array straight from the AI / mobile pipeline:
 *        [{ title, body }, ...]
 *      OR
 *        [{ quote, name, context }, ...]
 *
 *   B) Wrapped shape from admin edits via the Content tab:
 *        { tag, headline, items: [{ title, body }, ...] }
 *
 *   C) `null` / `undefined` when no AI extraction + no admin edits.
 *
 * Components only read `(block).items` (or `.steps`). Shape A meant
 * `.items` was undefined → empty array → `items.length > 0` gate hides
 * the section entirely. That's why Why-Us, How-It-Works, and Testimonials
 * had their visibility toggle ON but didn't render — the gate inside the
 * component itself failed.
 *
 * `itemAliases` rewrites field names from the AI's naming (e.g. `name`)
 * to the canonical name components consume (e.g. `who`). Only renames
 * the alias key if it exists AND the canonical key doesn't — never
 * destroys admin-edited data.
 *
 * `opts.itemsKey` lets the How block keep its `steps` array name.
 */
function normalizeBlock(
    input: any,
    itemsKey: 'items' | 'steps' = 'items',
    itemAliases: Record<string, string> = {},
    opts: { altItemsKey?: string } = {},
): { tag?: string; headline?: string; items?: any[]; steps?: any[] } | undefined {
    if (input == null) return undefined
    // Find the array of items wherever it lives.
    let arr: any[] | null = null
    let wrapper: Record<string, any> = {}
    if (Array.isArray(input)) {
        arr = input
    } else if (typeof input === 'object') {
        wrapper = { ...input }
        if (Array.isArray(input[itemsKey])) {
            arr = input[itemsKey]
        } else if (opts.altItemsKey && Array.isArray(input[opts.altItemsKey])) {
            arr = input[opts.altItemsKey]
        }
    }
    if (!arr) return undefined
    // Apply field aliases per item. Never overwrite an existing canonical key.
    const mappedItems = arr.map((it: any) => {
        if (!it || typeof it !== 'object') return it
        const out: Record<string, any> = { ...it }
        for (const [from, to] of Object.entries(itemAliases)) {
            if (out[from] != null && out[to] == null) {
                out[to] = out[from]
            }
        }
        return out
    })
    // Strip the original itemsKey from wrapper to avoid double-emit.
    delete wrapper[itemsKey]
    if (opts.altItemsKey) delete wrapper[opts.altItemsKey]
    return { ...wrapper, [itemsKey]: mappedItems }
}

// Variant-code → category routing was removed when the template library was
// wiped. `submission.business_type` is still passed through for whatever new
// designs do with it (e.g. picking a default color palette).

// ─── Derived defaults for generic templates ────────────────────────────
// Shared, browser-safe helpers live in ./derive-content-defaults so the
// editor sidebar (ContentFieldsAuto) can mirror what we render here.
import {
    deriveContentDefaults,
    normalizeBusinessType,
} from './derive-content-defaults'

function deriveDefaultsFor(content: ExtractedContent, photos: string[]) {
    return deriveContentDefaults(content as any, photos)
}

/**
 * Maps business_type → color scheme id for the `auto` palette. Used by
 * the generic-template theme override when admin leaves Color Scheme on
 * "auto". Empty string means "keep the template's native palette".
 */
export const AUTO_SCHEME_BY_BUSINESS_TYPE: Record<string, string> = {
    barber:    'brown',
    salon:     'pink',
    spa:       'pink',
    // Autoshop family (P–T) default = Foundry hazard orange.
    auto:      'orange',
    autoshop:  'orange',
    automotive:'orange',
    // Restaurant family (U–Y) default = Harvest rustic warm.
    restaurant:'orange',
    food:      'orange',
    cafe:      'orange',
    // Shirtstore family (Z, AA–AD) default = Editorial warm earthy.
    retail:    'brown',
    store:     'brown',
    apparel:   'brown',
    clothing:  'brown',
    clinic:    'green',
    fitness:   'red',
    education: 'purple',
    services:  'maroon',
}

export function autoSchemeFor(businessType: string | undefined | null): string {
    const k = normalizeBusinessType(businessType)
    return AUTO_SCHEME_BY_BUSINESS_TYPE[k] || ''
}

// The PH city-adjacency seed table that used to live here is gone. It mapped
// a business city to 3-4 neighbouring districts/towns ('cebu city' →
// Mandaue, Lapu-Lapu, Talisay …) and published them as the business's own
// service area so "the block reads finished cold". Those are separate
// cities: a barbershop that serves one street was advertising four
// municipalities it has never delivered to. A coverage area is a claim, and
// the owner is the only person who can make it — the block now renders only
// the places they typed, and stays out of the document when they typed none.
// Auto-derive a WhatsApp deeplink-safe phone string from a typed phone.
// Strips non-digits. If the result starts with "0" and looks like a PH local
// number, prepend "63". Empty string when input is unusable.
function derivePhoneDigits(phone: string | undefined | null): string {
    if (!phone) return ''
    const digits = phone.replace(/[^0-9]/g, '')
    if (!digits) return ''
    if (digits.startsWith('0') && digits.length === 11) return '63' + digits.slice(1)
    if (digits.startsWith('9') && digits.length === 10) return '63' + digits
    return digits
}

/**
 * Format a phone for display: forces a `+63` PH country prefix when the
 * input is a local PH mobile number (10 digits starting `9`, or 11
 * digits starting `09`). Numbers already in international form are left
 * alone. Empty input returns empty string so callers can fall through.
 */
function formatPhoneDisplay(phone: string | undefined | null): string {
    if (!phone) return ''
    const trimmed = String(phone).trim()
    if (!trimmed) return ''
    // Already international (+countrycode) — return as-is.
    if (trimmed.startsWith('+')) return trimmed
    const digits = trimmed.replace(/[^0-9]/g, '')
    if (!digits) return trimmed
    // PH local mobile patterns.
    if (digits.startsWith('09') && digits.length === 11) return '+63' + digits.slice(1)
    if (digits.startsWith('9') && digits.length === 10)  return '+63' + digits
    if (digits.startsWith('63') && digits.length >= 12)  return '+' + digits
    // Fallback — leave whatever the admin typed.
    return trimmed
}

/**
 * Transform existing ExtractedContent + Customizations into the Astro site-data.json format.
 *
 * Async because we geocode the business address at build time when no
 * lat/lng was provided — otherwise the Leaflet map points at a per-template
 * fallback city (Mission St / Linden Ave / etc).
 */
async function transformToAstroData(
    content: ExtractedContent,
    customizations: Customizations,
    photos: string[]
) {
    // ── Geocode address if no coords known ─────────────────────────────
    // Resolution order: admin-typed coords > submission.coordinates >
    // content.location > Nominatim lookup of contact.address. Cached into
    // content.location so subsequent regens skip the network call.
    const haveLatLng = (
        typeof content.location?.lat === 'number' &&
        typeof content.location?.lng === 'number'
    );
    if (!haveLatLng && content.contact?.address) {
        try {
            const { geocodeAddress } = await import('./geocode')
            const coords = await geocodeAddress(content.contact.address)
            if (coords) {
                content = {
                    ...content,
                    location: { ...(content.location || {}), lat: coords.lat, lng: coords.lng },
                }
            }
        } catch {
            // Geocoding failure is non-fatal — components fall back to
            // rendering the map at a coarse center if no coords.
        }
    }

    const heroStyle = mapStyleToLetter(customizations.heroStyle)
    const aboutStyle = mapStyleToLetter(customizations.aboutStyle)
    const servicesStyle = mapStyleToLetter(customizations.servicesStyle)
    const galleryStyle = mapStyleToLetter(customizations.galleryStyle || customizations.featuredStyle)
    const contactStyle = mapStyleToLetter(customizations.contactStyle || customizations.footerStyle)

    // Map visibility from snake_case to camelCase
    const vis = content.visibility || {}

    // Format the phone with +63 prefix for PH local mobiles so the header,
    // nav, footer, location card, and CTAs all show "+639278147733"
    // instead of "9278147733". Original raw value still available on the
    // submission if some component needs the local form.
    const formattedContact = content.contact
        ? { ...content.contact, phone: formatPhoneDisplay(content.contact.phone) || content.contact.phone }
        : content.contact

    // ── Shared inputs, hoisted out of the payload literal ───────────────
    // `d` / `derived` / `c` / mergeShallow used to be declared twice, inside
    // the two IIFEs at the bottom. They are needed a third time now — by the
    // anchor-liveness block below, which runs BEFORE `layout.navLinks` — and
    // three copies of "what would this section contain" is exactly the
    // duplication that lets two answers drift apart. One declaration, read by
    // everything downstream.
    const c = content as any
    const d = defaultsFor(content.business_type)
    const derived = deriveDefaultsFor(content, photos)

    // ⚠ This is the merge that makes lib/derive-content-defaults.ts
    // authoritative over the templates. It starts from the DERIVED
    // object and only lets an owner value overwrite a key when it is
    // not undefined/null/'' — so:
    //   • a key the derived layer omits is absent from the result, the
    //     component's `{value && …}` guard fires, and the element is
    //     never emitted. This is how a claim gets removed.
    //   • a key the derived layer sets to '' is still PRESENT, and
    //     because the loop below skips '' on the owner side, an admin
    //     who blanks that input cannot clear it — the derived '' (or
    //     any derived string) wins forever. That asymmetry is why
    //     removals in the derived layer must be absent, never ''.
    // A stock sentence left in the derived layer therefore ships on
    // every site whose owner left the field blank, no matter what the
    // .astro fallback says: the template is never consulted.
    const mergeShallow = <T extends object>(src: T | undefined, fb: T): T => {
        if (!src || typeof src !== 'object') return fb
        const out: any = { ...fb }
        for (const [k, v] of Object.entries(src)) {
            if (v !== undefined && v !== null && v !== '') out[k] = v
        }
        return out as T
    }

    // Merged section payloads that BOTH the liveness tests below and the
    // `content` payload at the bottom read. Computed once so the nav can
    // never disagree with the section it points at.
    const aboutMerged = mergeShallow<any>(c.about, derived.about)
    const whyBlock = normalizeBlock(c.why ?? derived.why, 'items', { description: 'body' })
    const locationMerged: any = { ...derived.location, ...(content.location || {}) }

    // ── Anchor liveness: which in-page targets this build actually has ──
    // Sections auto-hide when the business supplied nothing — services,
    // gallery, why, about and location each gate on their own content. The
    // links that point AT them did not: lib/derive-content-defaults.ts emits
    // the same five nav entries and the same '#services' / '#visit' CTA
    // targets for every submission, so on a sparse site four of five nav
    // links, the hero's secondary button and the closing band all scrolled
    // nowhere. A link to a section that isn't on the page is the visible
    // cost of the auto-hide work, and it is fixed here rather than at either
    // end of the pipeline because this is the only place that knows both
    // halves:
    //   • lib/derive-content-defaults.ts can't — it is the browser-safe
    //     tier-3 layer, and it never sees the AI's services/why/gallery
    //     items or the admin's visibility toggles. Its nav list stays
    //     complete on purpose (see the note above it): it is the canonical
    //     menu the editor sidebar lists and edits.
    //   • the .astro components can't — a header's own `onPage()` guard
    //     knows which ids THIS DESIGN renders (PageA calls its services
    //     section id="menu", PageB calls it id="classes"), not whether THIS
    //     BUSINESS filled it.
    // Two different truths, and they compose: the builder drops a target the
    // DATA leaves empty, the component remaps or drops a target the DESIGN
    // does not render.
    //
    // DIRECTION OF ERROR. Every predicate below proves a section is EMPTY;
    // none of them tries to prove one is full. An anchor we don't model, a
    // storage shape we don't recognise, a signal we don't read — all leave
    // the link alone. Dropping a link to a section the business DID fill is
    // the failure nobody would ever notice, so each test takes the UNION of
    // the signals any design counts as content (a photo alone renders an
    // About on AboutC/E; a phone alone renders a Location on LocationA–E),
    // never the strictest gate.
    //
    // NOTE these are NOT the `visibility.*` flags below, and must not be
    // folded into them. `visibility.aboutSection` / `whyUsBlock` /
    // `locationBlock` stay pure admin toggles because that is what the editor
    // reads back: the flag means "the admin chose to hide this", and an empty
    // section means "there is nothing to show yet". Collapsing the two would
    // write emptiness into the admin's own setting, so a section that was
    // merely bare would come back OFF after the admin filled it in — and they
    // would have no way to tell why. The components already gate themselves on
    // content (AboutAV–AZ, WhyP and WhyBA all open with a `paragraphs.length`,
    // `items.length` or `hasContent` test), so an empty band does not draw
    // regardless. Nothing here changes what renders — only what may point at it.
    const servicesSectionVisible = vis.services_section === false
        ? false
        : (
            Array.isArray(c.services)
                ? c.services.length > 0
                : Array.isArray(c.services?.items)
                    ? c.services.items.length > 0
                    : false
        )
    const gallerySectionVisible = vis.gallery_section === false || vis.featured_section === false
        ? false
        : (Array.isArray(c.gallery?.items) && c.gallery.items.length > 0)
            || photos.length > 0
    // About: every design's `hasAbout` gate is some subset of {lead,
    // description, signature, quote, note, tagline, paragraphs, image,
    // tags} — so the union of all of them is the safe test. `headline` and
    // `tag` are deliberately excluded, for the reason AboutA writes out in
    // full: the derived layer sets `About ${name}` for every named business,
    // so counting it would make this always-true and the test useless. The
    // raw `content.about` string counts too — it does not currently reach
    // the nested About section (that mapping is a known, separately-owned
    // gap), but a business that typed an About paragraph must keep its nav
    // link the moment that gap closes.
    const aboutHasContent = Boolean(
        aboutMerged.lead || aboutMerged.description || aboutMerged.signature ||
        aboutMerged.quote || aboutMerged.note || aboutMerged.tagline ||
        (typeof content.about === 'string' && content.about.trim()) ||
        (Array.isArray(aboutMerged.paragraphs) && aboutMerged.paragraphs.length > 0) ||
        (content.about_images?.length ?? 0) > 0 ||
        (content.about_tags?.length ?? 0) > 0 ||
        photos.length > 0,
    )
    const aboutSectionVisible = vis.about_section === false ? false : aboutHasContent
    const whyBlockVisible = vis.why_us_block === false
        ? false
        : (whyBlock?.items?.length ?? 0) > 0
    // Location: LocationA–E hide on `address || phone || hours || coords`;
    // the filipino family also counts an email. Union again, and it is the
    // reason the '#visit' target is usually alive whatever else is empty —
    // contact comes from the submission form, not from the interview.
    const locationBlockVisible = vis.location_block === false
        ? false
        : Boolean(
            locationMerged.address || formattedContact?.address ||
            locationMerged.phone || formattedContact?.phone ||
            locationMerged.hours || content.footer_hours ||
            formattedContact?.email ||
            (typeof locationMerged.lat === 'number' && typeof locationMerged.lng === 'number'),
        )

    // Anchors we can PROVE have no section on this build. Aliases are
    // included where a link and a section id use different names for the
    // same content ('#gallery' is the legacy nav's name for the gallery
    // '#work' renders under; '#location' is what several designs call
    // '#visit') — the same two pairs each header's own ANCHOR_ALIAS maps.
    // Design-local ids ('#menu', '#classes', '#reviews') are NOT listed:
    // they are a design's private naming and resolving them is the
    // component's job, not ours.
    const deadAnchors = new Set<string>()
    if (!servicesSectionVisible) deadAnchors.add('services')
    if (!gallerySectionVisible) { deadAnchors.add('work'); deadAnchors.add('gallery') }
    if (!aboutSectionVisible) deadAnchors.add('about')
    if (!whyBlockVisible) deadAnchors.add('why')
    if (!locationBlockVisible) { deadAnchors.add('visit'); deadAnchors.add('location') }
    const isDeadAnchor = (href: unknown): boolean =>
        typeof href === 'string' && href.startsWith('#') && deadAnchors.has(href.slice(1))

    // A nav entry is pure navigation: its label promises a section, and with
    // the section gone the promise is the fabrication and the link is the
    // dead end. Drop it — there is nowhere honest to send it, and the label
    // can't be reused for somewhere else.
    //
    // Dropping (rather than blanking the href) is safe for the editor: the
    // headers assign each link's data-field index BEFORE their own filter,
    // so indices are positional in whatever list we hand them — but
    // navbar_links is edited from the sidebar list widget, never inline
    // (SandboxEditorV2/V3 both put `navbar_links.*` in their inline-edit SKIP
    // set precisely because array indices are a data-loss trap), so no field
    // path is bound to these positions. Blanking instead would render
    // `<a href="">` in the filipino footers' Explore column, which reloads
    // the page — strictly worse than the anchor we're removing.
    const filterLiveNav = (links: any): Array<{ label: string; href: string }> =>
        (Array.isArray(links) ? links : []).filter((l: any) => l && !isDeadAnchor(l.href))

    // The one contact target every "Get in touch" button aims at. When the
    // Location section IS on the page, nothing changes (the early return in
    // resolveContactHref keeps the original href). When it isn't, the button
    // falls back to a channel the owner actually gave us rather than
    // disappearing: a conversion surface with somewhere real to go beats a
    // dead anchor, and tel:/mailto: work on every design. If they gave us
    // neither, the href is left exactly as it was — each component's own
    // fallback ('#book', '#location', its own tel: link) is a better guess
    // than anything we could invent from here.
    // Test the STRIPPED value, not the raw field. A phone can hold junk that is
    // perfectly truthy — 'N/A', 'wala', '-' — and the strip reduces it to '' or
    // a bare '+', leaving `tel:` behind: a button that dials nothing. That
    // matters more here than it used to, because this href is now the fallback
    // for every CTA whose own anchor went dead, so one dud value lands on the
    // hero, the nav button and the CTA band at once. No digit, no phone.
    const dialableDigits = String(formattedContact?.phone ?? '').replace(/[^0-9+]/g, '')
    const contactChannelHref = /[0-9]/.test(dialableDigits)
        ? `tel:${dialableDigits}`
        : (formattedContact?.email ? `mailto:${String(formattedContact.email).trim()}` : '')
    const CONTACT_ANCHORS = new Set(['visit', 'location'])
    const resolveContactHref = (href: string | undefined): string | undefined => {
        // Off-page (tel:, mailto:, https:) and non-contact anchors pass
        // through untouched — retargeting '#services' at the phone would
        // leave a button labelled "See services" dialling a number.
        if (!href || !href.startsWith('#')) return href
        const id = href.slice(1)
        if (!CONTACT_ANCHORS.has(id) || !deadAnchors.has(id)) return href
        return contactChannelHref || href
    }

    // The hero's SECONDARY CTA is the one button whose label names a section
    // ("See services"). Text and href move together or not at all: retarget
    // it and keep the old label and you have swapped a dead button for a
    // lying one. So the fallback chain carries its own label, in
    // browse-intent order, and only the primary's target is excluded — a
    // second button pointing where the first one already goes is not a
    // second conversion surface. If nothing is left to browse the key is
    // dropped and the hero keeps its one working button; every hero renders
    // this as `{cta2Text && …}`.
    const BROWSE_CTA_TARGETS: Array<{ href: string; text: string }> = [
        { href: '#services', text: 'See services' },
        { href: '#work', text: 'See our work' },
        { href: '#about', text: 'About us' },
        { href: '#visit', text: 'Get in touch' },
    ]
    const resolveSecondaryCta = (cta: any, primaryHref: string | undefined): any => {
        if (!cta || typeof cta !== 'object' || !isDeadAnchor(cta.href)) return cta
        const dest = BROWSE_CTA_TARGETS.find(
            (t) => !deadAnchors.has(t.href.slice(1)) && t.href !== primaryHref,
        )
        return dest ? { ...cta, ...dest } : undefined
    }

    return {
        layout: {
            businessName: content.business_name,
            tagline: content.tagline,
            // Every header — and the filipino footers' Explore column —
            // renders the nav from here, so this is where the dead entries
            // have to go. The fallback list is left exactly as it was: an
            // admin who deletes every nav link leaves `content.navbar_links`
            // as [], and [] must stay an empty nav rather than resurrecting a
            // menu they removed (which is why this doesn't share the
            // `|| derived.navbar_links` fallback the copy below uses).
            navLinks: filterLiveNav(content.navbar_links || [
                { label: 'About', href: '#about' },
                { label: 'Services', href: '#services' },
                { label: 'Gallery', href: '#gallery' },
                { label: 'Contact', href: '#contact' },
            ]),
            socialLinks: content.footer?.social_links || [],
            colorScheme: customizations.colorSchemeId || customizations.colorScheme || 'auto',
            fontPairing: customizations.fontPairingId || customizations.fontPairing || 'modern',
            contact: formattedContact || {},
            navbarStyle: heroStyle,
            // Favicon — admin uploads via the Images tab "Website tab image"
            // slot; flows through to BaseLayout's <link rel="icon">.
            favicon: (content as any).favicon || undefined,
            ogImage: (content as any).ogImage || (content as any).favicon || undefined,
        },
        customizations: {
            heroStyle,
            aboutStyle,
            servicesStyle,
            galleryStyle,
            contactStyle,
            // v01 extras — each block picks its own variant from the
            // Template tab. Pass through verbatim so the .astro block can
            // read variantStyle and switch between M1 / M2 layouts.
            trustStyle: (customizations as any).trustStyle ?? 'M1',
            whyUsStyle: (customizations as any).whyUsStyle ?? 'M1',
            howItWorksStyle: (customizations as any).howItWorksStyle ?? 'M1',
            testimonialsStyle: (customizations as any).testimonialsStyle ?? 'M1',
            faqStyle: (customizations as any).faqStyle ?? 'M1',
            serviceAreaStyle: (customizations as any).serviceAreaStyle ?? 'M1',
            credentialsStyle: (customizations as any).credentialsStyle ?? 'M1',
            ctaBandStyle: (customizations as any).ctaBandStyle ?? 'M1',
            clickToMessageStyle: (customizations as any).clickToMessageStyle ?? 'M1',
        },
        visibility: {
            heroSection: vis.hero_section !== false,
            heroHeadline: vis.hero_headline !== false,
            heroTagline: vis.hero_tagline !== false,
            heroDescription: vis.hero_description !== false,
            heroTestimonial: vis.hero_testimonial !== false,
            heroButton: vis.hero_button !== false,
            heroImage: vis.hero_image !== false,
            aboutSection: vis.about_section !== false,
            aboutBadge: vis.about_badge !== false,
            aboutHeadline: vis.about_headline !== false,
            aboutDescription: vis.about_description !== false,
            aboutImages: vis.about_images !== false,
            aboutTagline: vis.about_tagline !== false,
            aboutTags: vis.about_tags !== false,
            // (servicesSection moved below — auto-hides when empty)
            servicesBadge: vis.services_badge !== false,
            servicesHeadline: vis.services_headline !== false,
            servicesSubheadline: vis.services_subheadline !== false,
            servicesImage: vis.services_image !== false,
            servicesList: vis.services_list !== false,
            // (gallerySection moved below — auto-hides when empty)
            galleryHeadline: vis.featured_headline !== false,
            gallerySubheadline: vis.featured_subheadline !== false,
            galleryItems: vis.featured_products !== false,
            galleryImages: vis.featured_images !== false,
            galleryCta: vis.featured_cta !== false,
            contactSection: vis.footer_section !== false,
            contactBadge: vis.footer_badge !== false,
            contactHeadline: vis.footer_headline !== false,
            contactDescription: vis.footer_description !== false,
            contactInfo: vis.footer_contact !== false,
            contactSocial: vis.footer_social !== false,
            // New v01-spec blocks — render on every variant unless explicitly hidden.
            locationBlock: vis.location_block !== false,
            serviceAreaBlock: vis.service_area_block !== false,
            // Default off — floating WhatsApp/Messenger FAB is opt-in.
            // Admins can flip it on from the Blocks tab if the business
            // actually wants chat. Most don't, and the FAB clutters layout.
            clickToMessage: vis.click_to_message === true,
            // Scroll-to-top button — default ON. Themed via --primary so it
            // picks up the admin's color scheme automatically.
            scrollTopButton: vis.scroll_top_button !== false,
            // Trust/Testimonials/Credentials auto-hide when the admin
            // hasn't supplied content AND no AI extracted any. Avoids
            // fake-looking empty bands. Admin can re-enable explicitly
            // from the Blocks tab.
            trustBlock: vis.trust_block === false
                ? false
                : Array.isArray((content as any).trust?.cells)
                    ? (content as any).trust.cells.length > 0
                    : false,
            whyUsBlock: vis.why_us_block !== false,
            howItWorksBlock: vis.how_it_works_block !== false,
            // testimonials is an object `{ tag, headline, items[] }` on
            // generic templates; legacy A-O stored a plain array. Accept
            // either: section renders when admin disabled is explicitly
            // false OR there are zero quotes in either shape.
            testimonialsBlock: vis.testimonials_block === false
                ? false
                : (
                    Array.isArray((content as any).testimonials)
                        ? (content as any).testimonials.length > 0
                        : Array.isArray((content as any).testimonials?.items)
                            ? (content as any).testimonials.items.length > 0
                            : false
                ),
            faqBlock: vis.faq_block !== false,
            // Credentials auto-hides when no items exist. Like testimonials
            // the new shape is `{ tag, headline, items[] }` while legacy
            // stored a plain array. Accept either.
            credentialsBlock: vis.credentials_block === false
                ? false
                : (
                    Array.isArray((content as any).credentials)
                        ? (content as any).credentials.length > 0
                        : Array.isArray((content as any).credentials?.items)
                            ? (content as any).credentials.items.length > 0
                            : false
                ),
            // Services auto-hides on an empty menu. An empty menu is now a
            // reachable, correct outcome — the extraction prompt no longer
            // pads the list to fill a grid and the route no longer re-extracts
            // until it does — so leaving this unconditional trades a
            // fabricated service list for an "Our Services" heading over
            // nothing, which is the same page defect one step later.
            //
            // Two storage shapes, both counted: Generic A–E keep the flat
            // array extraction returns, the branded families keep
            // `{ tag, headline, items[] }` (the split isWrappedObject handles
            // in app/api/generate-website/route.ts). Counting only the flat
            // one would read every branded site as having zero services and
            // delete a section the owner filled in.
            //
            // Computed above, with the rest of the section-emptiness tests,
            // because the nav filter has to reach the same verdict: a
            // "Services" link that survives a hidden Services section is the
            // same defect one step later.
            servicesSection: servicesSectionVisible,
            // Gallery auto-hides when there's nothing to show (no admin
            // gallery items AND no submission photos). Also computed above.
            gallerySection: gallerySectionVisible,
            ctaBandBlock: vis.cta_band_block !== false,
        },
        hero: {
            businessName: content.business_name,
            headline: content.tagline,
            description: content.about,
            badgeText: content.hero_badge_text,
            testimonial: content.hero_testimonial,
            ctaLabel: content.hero_cta?.label,
            ctaLink: content.hero_cta?.link,
            ctaSecondaryLabel: content.hero_cta_secondary?.label,
            ctaSecondaryLink: content.hero_cta_secondary?.link,
            photos,
            // Both storage shapes, same reason as servicesSection above — and
            // here it is not defensive, it is a crash. `?.slice` guards only a
            // NULLISH services; on the wrapped `{ tag, headline, items[] }`
            // object it resolves `.slice` to undefined and calls it, throwing
            // before a single section is built. That object became reachable
            // the moment extraction was allowed to omit `services`: the
            // generic-section merge in app/api/generate-website/route.ts fills
            // the now-null key with its own wrapped shape, so an interview that
            // names no services took the whole build down with a TypeError.
            services: Array.isArray(content.services)
                ? content.services.slice(0, 3)
                : Array.isArray((content as any).services?.items)
                    ? (content as any).services.items.slice(0, 3)
                    : undefined,
            visibility: {
                heroHeadline: vis.hero_headline !== false,
                heroTagline: vis.hero_tagline !== false,
                heroDescription: vis.hero_description !== false,
                heroTestimonial: vis.hero_testimonial !== false,
                heroButton: vis.hero_button !== false,
                heroImage: vis.hero_image !== false,
            },
        },
        about: {
            businessName: content.business_name,
            description: content.about_description || content.about,
            headline: content.about_headline || 'About Us',
            tagline: content.about_tagline,
            tags: content.about_tags,
            usps: content.unique_selling_points,
            signatureName: content.about_signature_name,
            signatureRole: content.about_signature_role,
            photos: content.about_images?.length ? content.about_images : photos,
            visibility: {
                aboutBadge: vis.about_badge !== false,
                aboutHeadline: vis.about_headline !== false,
                aboutDescription: vis.about_description !== false,
                aboutImages: vis.about_images !== false,
                aboutTagline: vis.about_tagline !== false,
                aboutTags: vis.about_tags !== false,
            },
        },
        services: {
            headline: content.services_headline || 'Our Services',
            subheadline: content.services_subheadline,
            // No invented service menu. This used to fall back to three stock
            // rows — 'Service 1'/'Quality service', 'Service 2'/'Professional
            // service', 'Service 3'/'Reliable service' — i.e. a service list
            // AND a quality claim published on behalf of an owner who listed
            // no services at all. Exactly the same offence as the per-trade
            // BUSINESS_TYPE_SERVICES table that was deleted from
            // lib/derive-content-defaults.ts (see the note above
            // BUSINESS_TYPE_KEYS there); this copy survived because it lives
            // in the legacy `siteData.services` payload rather than the
            // nested `siteData.content.services` one the current templates
            // read. Deleting stock services from the .astro files and from
            // the derived layer achieved nothing while this line stood.
            //
            // Empty array, not a fabricated one and not `undefined`: every
            // Services component gates on `items.length` / `services.length`
            // and keeps the whole section out of the document, so a business
            // that listed nothing advertises nothing — while consumers that
            // do `services.map(...)` without a guard still get an array — a
            // promise `content.services || []` stopped keeping once the
            // wrapped `{ tag, headline, items[] }` shape could reach here, an
            // object being truthy. The wrapped menu is not translated into
            // this legacy `{name, description}` payload: it already reaches
            // the templates intact as `siteData.content.services`, and only
            // that one is read.
            services: Array.isArray(content.services) ? content.services : [],
            photos: content.services_image ? [content.services_image] : (photos.length > 0 ? [photos[0]] : []),
            ctaLabel: content.services_cta?.label,
            ctaLink: content.services_cta?.link,
            visibility: {
                servicesBadge: vis.services_badge !== false,
                servicesHeadline: vis.services_headline !== false,
                servicesSubheadline: vis.services_subheadline !== false,
                servicesImage: vis.services_image !== false,
                servicesList: vis.services_list !== false,
                servicesButton: vis.services_button !== false,
            },
        },
        gallery: {
            headline: content.featured_headline || 'Featured Work',
            subheadline: content.featured_subheadline,
            items: (content.featured_products || []).map((p, i) => ({
                title: p.title,
                description: p.description,
                image: p.image || photos[i],
                tags: p.tags,
                testimonial: p.testimonial,
            })),
            images: content.featured_images,
            ctaText: content.featured_cta_text,
            ctaLink: content.featured_cta_link,
            photos,
            visibility: {
                galleryHeadline: vis.featured_headline !== false,
                gallerySubheadline: vis.featured_subheadline !== false,
                galleryItems: vis.featured_products !== false,
                galleryImages: vis.featured_images !== false,
                galleryCta: vis.featured_cta !== false,
            },
        },
        contact: {
            businessName: content.business_name,
            // No placeholder email or phone. These used to fall back to
            // 'contact@example.com' and '+63 900 000 0000' — a dead address
            // and a number that belongs to nobody, printed as the business's
            // own contact details. LocationA/CtaBandA dropped exactly these
            // strings from their own fallbacks; leaving them here would put
            // them straight back. Every consumer reads them as
            // `layout.contact?.phone || ''` and renders behind `{phone && …}`,
            // so undefined simply omits the row.
            email: content.contact?.email || undefined,
            phone: content.contact?.phone || undefined,
            address: content.contact?.address,
            whatsapp: content.contact?.whatsapp,
            messenger: content.contact?.messenger,
            description: content.footer?.brand_blurb,
            badgeText: content.footer_badge,
            headline: content.footer_headline,
            days: content.footer_days,
            hours: content.footer_hours,
            socialLinks: content.footer?.social_links,
            photos,
            visibility: {
                contactBadge: vis.footer_badge !== false,
                contactHeadline: vis.footer_headline !== false,
                contactDescription: vis.footer_description !== false,
                contactInfo: vis.footer_contact !== false,
                contactSocial: vis.footer_social !== false,
            },
        },
        // ── New v01-spec block payloads (auto-derived when admin hasn't set them) ──
        location: {
            lat: content.location?.lat,
            lng: content.location?.lng,
            // Owner edits hours in Google. If we have a GBP / maps link, we
            // surface it as the "Hours on Google" button. If not present,
            // fall back to a search-by-address Maps query so the button still
            // takes visitors to a Google surface that has live hours.
            googleMapsUrl:
                content.googleMapsUrl ||
                (content.contact?.address
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.contact.address)}`
                    : undefined),
        },
        serviceArea: (() => {
            const explicit = content.serviceArea?.places ?? []
            if (explicit.length > 0) {
                return {
                    heading: content.serviceArea?.heading ?? 'Service area',
                    places: explicit,
                }
            }
            // The owner's own city is the only place we can honestly list —
            // it is a fact they typed. Everything beyond it was invented; see
            // the note where the adjacency table used to be. No city, no block.
            const city = (content.business_city ?? '').trim()
            if (!city) return undefined
            return {
                heading: content.serviceArea?.heading ?? 'Service area',
                places: [city],
            }
        })(),
        messaging: {
            // Admin-typed value wins; otherwise derive from contact.phone so
            // the WhatsApp FAB just-works for any business that gave us a phone.
            whatsapp:
                content.messaging?.whatsapp ||
                derivePhoneDigits(content.contact?.phone) ||
                undefined,
            messenger: content.messaging?.messenger,
        },
        // ── Conversion-cluster blocks (neutral fallback after template wipe) ──
        // Resolution order: admin-typed → generic neutral fallback.
        ...(() => {
            return {
                trust: content.trust ?? d.trust,
                why: content.why ?? d.why,
                how: content.how ?? d.how,
                testimonials: content.testimonials ?? d.testimonials,
                faq: content.faq ?? d.faq,
                credentials: content.credentials ?? d.credentials,
                ctaBand: content.ctaBand ?? d.ctaBand,
            }
        })(),
        // ── Generic landing-page nested content ─────────────────────────
        // The Astro PageA…PageE wrappers read `siteData.content.hero.*`,
        // `siteData.content.about.*`, etc. — pass through the nested shape
        // produced by groq.service.generateGenericSections() / admin edits.
        // Existing legacy-template flows ignore this field, so it's
        // additive and doesn't affect A-O variants.
        content: (() => {
            // `d` / `derived` / `c` / mergeShallow are declared once, above
            // the payload literal, because the anchor-liveness block needs
            // the same merged sections this one emits.

            // `content.services` is "array of {name, description}" in the
            // legacy shape, "object with .items[]" in the new shape. Detect.
            const servicesNested = (
                typeof c.services === 'object' &&
                !Array.isArray(c.services) &&
                c.services !== null
            ) ? c.services : undefined

            // Per-section "did admin/AI supply anything?" — if no, use the
            // derived defaults so the section renders coherently. Each leaf
            // still falls back individually inside the section component.
            // (mergeShallow and its ⚠ note live above the payload literal.)

            // Copy before touching anything, for the reason spelled out in
            // the ctaBand block below: mergeShallow RETURNS THE FALLBACK
            // OBJECT ITSELF when the owner side is absent, so the headline
            // backfill and the CTA resolution underneath would otherwise
            // write straight into `derived.hero`.
            const heroMerged: any = { ...mergeShallow<any>(c.hero, derived.hero) }
            // Headline backfills: if neither admin nor AI gave a
            // single-line headline, use derived.headline. If neither gave
            // headlineLines, fall back to splitting headline on newlines.
            if (!heroMerged.headlineLines || (Array.isArray(heroMerged.headlineLines) && heroMerged.headlineLines.length === 0)) {
                if (typeof heroMerged.headline === 'string') {
                    heroMerged.headlineLines = heroMerged.headline.split('\n').filter(Boolean)
                }
                if (!heroMerged.headlineLines || heroMerged.headlineLines.length === 0) {
                    heroMerged.headlineLines = derived.hero.headlineLines
                }
            }
            // Hero CTAs against the sections this build actually has. cta1 is
            // the primary "Get in touch" and only ever moves between contact
            // targets; cta2 names a section, so it moves label-and-href
            // together or is dropped. Both are no-ops on a site whose
            // sections are all present.
            const heroPrimaryHref = resolveContactHref(heroMerged.cta1?.href)
            if (heroMerged.cta1 && heroPrimaryHref !== heroMerged.cta1.href) {
                heroMerged.cta1 = { ...heroMerged.cta1, href: heroPrimaryHref }
            }
            const heroSecondary = resolveSecondaryCta(heroMerged.cta2, heroPrimaryHref)
            if (heroSecondary === undefined) {
                delete heroMerged.cta2
            } else {
                heroMerged.cta2 = heroSecondary
            }

            return {
                // Coerce to a string: an inline About edit can upgrade
                // content.about from a string to a {lead,headline,...} object;
                // this field feeds <meta name="description"> so it must stay text.
                //
                // This was the last '' left in the merged payload. Checked
                // against the mergeShallow trap and it does NOT apply: only
                // marquee / hero / about / services / gallery / area / ctaBand
                // / footer go through mergeShallow, and `description` is a
                // direct key of this object literal, so no derived '' can
                // shadow an owner value here — the value IS the owner's about
                // text. It is now `undefined` rather than '' anyway, so the
                // key is dropped by JSON.stringify entirely: every consumer
                // renders it as `{content.description && <meta … />}`, and an
                // absent meta description is correct where an empty
                // `content=""` one is just noise. Absent, never ''.
                description: (typeof content.about === "string"
                    ? content.about
                    : ((content.about as any)?.lead ?? (content.about as any)?.description)) || undefined,
                photos,
                contact: formattedContact,
                marquee: mergeShallow<any>(c.marquee, derived.marquee),
                hero: heroMerged,
                about: aboutMerged,
                services: servicesNested
                    ? mergeShallow<any>(servicesNested, derived.services)
                    : derived.services,
                gallery: (() => {
                    const g = mergeShallow<any>(c.gallery, derived.gallery)
                    // Fill empty image slots with submission photos so the
                    // gallery is never an empty grid on first build.
                    if (Array.isArray(g.items)) {
                        g.items = g.items.map((it: any, i: number) => ({
                            ...it,
                            image: it?.image || photos[i] || '',
                        }))
                    } else if (photos.length) {
                        // No caption key at all: the derived layer no longer
                        // invents 'Our space' / 'Behind the scenes' for a photo
                        // nobody described, and every gallery guards
                        // `{it.caption && …}`, so an absent caption is a photo
                        // with no label rather than an empty one.
                        g.items = photos.slice(0, 6).map((image) => ({ image }))
                    }
                    return g
                })(),
                area: mergeShallow<any>(c.area, derived.area),
                location: locationMerged,
                // ── The ctaBand CTA-key contract ────────────────────────
                // One closing CTA, emitted under every key name the ctaBand
                // designs actually read.
                //
                // The derived layer (and CtaBandA–F) name the button
                // `ctaBand.cta`. Most of the other designs read
                // `ctaBand.cta1`, and CtaBandP / CtaBandZ read
                // `ctaBand.primary`, with NO fallback to `.cta` — so on those
                // pages the closing band rendered a full-width headline and
                // no button at all. Only the filipino family, CtaBandAW and
                // CtaBandAY carry the `cta1 || cta` chain themselves.
                // Aliasing here fixes every one of them from one place
                // instead of editing dozens of components.
                ctaBand: (() => {
                    // Copy before touching anything: mergeShallow RETURNS THE
                    // FALLBACK OBJECT ITSELF when the owner side is absent
                    // (`if (!src …) return fb`), so assigning to a key of the
                    // merged result would mutate `derived.ctaBand` in place —
                    // and the derived href read below would already be gone.
                    const band: any = { ...mergeShallow<any>(c.ctaBand, derived.ctaBand) }
                    // Both hrefs go through the contact resolver: '#visit' is
                    // the derived target and it is the one anchor that can be
                    // missing for a reason the owner did not choose (no
                    // address, no phone, no hours, no coords => LocationA–E
                    // keep themselves out of the document). Dead => the
                    // owner's own tel:/mailto: takes over. Alive => both are
                    // returned untouched and the contract below is unchanged.
                    const derivedHref: string | undefined = resolveContactHref(derived.ctaBand.cta?.href)
                    const ownerBand: any =
                        c.ctaBand && typeof c.ctaBand === 'object' ? c.ctaBand : {}
                    // Whichever name the OWNER typed their CTA under wins over
                    // the derived one, under all three names.
                    const ownerPrimary =
                        [ownerBand.cta1, ownerBand.primary, ownerBand.cta].find((x: any) => x?.text)
                    const text =
                        ownerPrimary?.text || band.cta?.text || band.cta1?.text || band.primary?.text
                    // TRAP — do not "tidy" this into `{ ...primary }` in a
                    // later round: the TEXT is aliased, the HREF is not,
                    // unless the owner actually typed one. The derived href is
                    // '#visit' and most of these designs render no id="visit"
                    // — CtaBandAW/AY and the filipino family ship an explicit
                    // onPage() anchor guard precisely because of that. Copying
                    // '#visit' into cta1/primary would out-rank each
                    // component's own design-correct fallback ('#book',
                    // '#location', a tel: link) and hand all of them a button
                    // that scrolls nowhere — trading a missing button for a
                    // dead one. Absent href => the component's fallback fires,
                    // which is the intended contract.
                    const ownerHref = resolveContactHref(
                        ownerBand.cta1?.href || ownerBand.primary?.href || ownerBand.cta?.href || undefined,
                    )
                    // …with one exception to the TRAP, and only one: an
                    // OFF-PAGE derived href (the tel:/mailto: the resolver
                    // hands back when '#visit' has no section) has none of the
                    // problem the trap describes — it is not an anchor, so it
                    // cannot miss. Every design can dial a phone. It is safe
                    // to alias under all three names, and it is the difference
                    // between the closing CTA working and the closing CTA
                    // being a decoration on a page with no Location section.
                    const derivedOffPageHref =
                        derivedHref && !derivedHref.startsWith('#') ? derivedHref : undefined
                    if (text) {
                        for (const key of ['cta', 'cta1', 'primary'] as const) {
                            // Never clobber a key the owner set themselves —
                            // `ctaBand.cta1.text` is the data-field these
                            // designs expose to the admin editor.
                            if (ownerBand[key]?.text) continue
                            const href = ownerHref || derivedOffPageHref
                            band[key] = href ? { text, href } : { text }
                        }
                        // `cta` is the only name that keeps a derived href, so
                        // restore it when the owner supplied none — CtaBandA–F
                        // read `band.cta.href` and '#visit' is their own anchor.
                        if (!ownerHref && derivedHref && !ownerBand.cta?.text) {
                            band.cta = { text, href: derivedHref }
                        }
                    }
                    // Deliberately NO cta2 / secondary alias: those slots are
                    // the SECOND button and there is only ever one derived
                    // CTA. Filling them would invent an extra action (and the
                    // designs already build their own "Call …" from the
                    // owner's real phone when there is one).
                    return band
                })(),
                footer: mergeShallow<any>(c.footer, derived.footer),
                navCtaText: c.navCtaText || 'Get in touch',
                // The header's own CTA is a contact button like the hero's
                // primary — same resolver, same no-op when Location renders.
                navCtaHref: resolveContactHref(c.navCtaHref || '#visit'),
                // No .astro reads this copy — `layout.navLinks` is the one
                // every header and the filipino footers' Explore column
                // render from — but it ships in site-data.json, so it gets
                // the same filter rather than sitting there as a second,
                // stale answer for the next consumer to find. The editor
                // sidebar is unaffected either way: it lists the nav from the
                // draft and from deriveContentDefaults(), so admin still sees
                // and edits all five entries.
                navbar_links: filterLiveNav(
                    Array.isArray(c.navbar_links) && c.navbar_links.length
                        ? c.navbar_links
                        : derived.navbar_links,
                ),
                // Why / How / Testimonials / FAQ / Credentials — same 3-tier
                // resolution (admin > AI > derived) PLUS a shape normalizer
                // because the AI / legacy paths emit flat arrays
                // ([{title, body}]) while Astro components read the wrapped
                // shape ({tag, headline, items: [...]}). Without this every
                // first-build site rendered empty Why/How/Testimonials
                // sections — block toggle says ON but items.length === 0.
                // See docs/changes/TEMPLATES-SALONSPA-PLAN.md for full
                // context. Also remaps field aliases so components can
                // read a single canonical name (body / who / role).
                why:          normalizeBlock(c.why ?? derived.why, 'items', { description: 'body' }),
                how:          normalizeBlock(c.how ?? derived.how, 'steps', { description: 'body' }, { altItemsKey: 'items' }),
                trust:        c.trust ?? d.trust,
                testimonials: normalizeBlock(c.testimonials ?? undefined, 'items', { name: 'who', author: 'who', context: 'role' }),
                faq:          normalizeBlock(c.faq ?? derived.faq, 'items', { question: 'q', answer: 'a' }),
                credentials:  normalizeBlock(c.credentials ?? undefined, 'items', { description: 'desc', body: 'desc' }),
                // Carry over enhancedImages so the image picker modal can
                // surface them from inside the iframe-rendered Astro output.
                enhancedImages: c.enhancedImages,
                business_name: content.business_name,
                business_type: c.business_type,
                business_city: content.business_city,
            }
        })(),
    }
}

/**
 * Recursively copy a directory, skipping specified folder names.
 */
async function copyDir(src: string, dest: string, skip: Set<string> = new Set()): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })
    for (const entry of entries) {
        if (skip.has(entry.name)) continue
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath, skip)
        } else {
            await fs.copyFile(srcPath, destPath)
        }
    }
}

/**
 * Build an Astro site from extracted content and customizations.
 * Writes site-data.json, runs astro build, and returns the generated HTML.
 *
 * On Vercel (read-only filesystem), copies the template to /tmp/ and builds there.
 */
export async function buildAstroSite(
    content: ExtractedContent,
    customizations: Customizations,
    photos: string[]
): Promise<string> {
    const sourceDir = path.join(process.cwd(), 'astro-site-template')

    // Detect read-only filesystem (Vercel) by checking if we can write to the source dir
    const isReadOnly = await fs.writeFile(
        path.join(sourceDir, '.write-test'), ''
    ).then(() => {
        fs.unlink(path.join(sourceDir, '.write-test')).catch(() => {})
        return false
    }).catch(() => true)

    let astroDir: string
    if (isReadOnly) {
        // Copy template source to /tmp/ (Vercel filesystem is read-only)
        // Skip node_modules/dist/.astro — we symlink node_modules from the deployed copy
        astroDir = path.join(os.tmpdir(), `astro-build-${Date.now()}`)
        console.log(`[ASTRO] Read-only filesystem detected, building in ${astroDir}`)
        await copyDir(sourceDir, astroDir, new Set(['node_modules', 'dist', '.astro']))
        // Symlink to the subdirectory's own node_modules (deployed via outputFileTracingIncludes)
        // This has astro + all transitive deps installed by the build script
        const sourceNM = path.join(sourceDir, 'node_modules')
        try {
            await fs.symlink(sourceNM, path.join(astroDir, 'node_modules'), 'dir')
            console.log(`[ASTRO] Symlinked node_modules → ${sourceNM}`)
        } catch (e) {
            console.warn(`[ASTRO] Symlink failed:`, e)
        }
    } else {
        astroDir = sourceDir
    }

    const dataPath = path.join(astroDir, 'src', 'data', 'site-data.json')
    const outputPath = path.join(astroDir, 'dist', 'index.html')

    // 1. Transform data to Astro format
    const siteData = await transformToAstroData(content, customizations, photos)

    // 2. Write site-data.json + ensure .astro cache dir exists
    await fs.writeFile(dataPath, JSON.stringify(siteData, null, 2), 'utf-8')
    await fs.mkdir(path.join(astroDir, '.astro'), { recursive: true })

    // 3. Run astro build via worker script (child process with cwd = astroDir)
    //    - Worker runs with cwd set to the build dir, so Astro's .astro/ cache resolves correctly
    //    - astro-site-template has its own node_modules (installed during Vercel build step)
    //    - outputFileTracingIncludes deploys them to /var/task/astro-site-template/node_modules/
    //    - Symlinked into /tmp/ build dir so the worker's imports resolve
    // Worker lives inside astro-site-template/ so it resolves astro from the subdirectory's
    // own node_modules — not from the root (which doesn't have astro)
    const workerScript = path.join(sourceDir, 'build-worker.mjs')
    console.log(`[ASTRO] Building site from ${astroDir} via worker`)
    try {
        const output = execSync(`node "${workerScript}" "${astroDir}"`, {
            cwd: astroDir,
            stdio: 'pipe',
            timeout: 60000,
            env: {
                ...process.env,
                NODE_ENV: 'production',
                // Astro telemetry tries to mkdir ~/.config/astro — Vercel sandbox has no writable home dir
                HOME: os.tmpdir(),
                ASTRO_TELEMETRY_DISABLED: '1',
            },
        })
        const stdout = output.toString()
        if (!stdout.includes('ASTRO_BUILD_SUCCESS')) {
            throw new Error(stdout)
        }
    } catch (error: any) {
        const stderr = error.stderr?.toString() || ''
        const stdout = error.stdout?.toString() || ''
        throw new Error(`Astro build failed: ${stderr || stdout || error.message}`)
    }

    // 4. Read output HTML
    let html: string
    try {
        html = await fs.readFile(outputPath, 'utf-8')
    } catch {
        throw new Error('Astro build completed but output file not found at ' + outputPath)
    }

    // 5. Clean up temp directory if we created one
    if (astroDir !== sourceDir) {
        fs.rm(astroDir, { recursive: true, force: true }).catch(() => {})
    }

    console.log(`[ASTRO] Build complete: ${(html.length / 1024).toFixed(0)}KB HTML`)
    return html
}

export { transformToAstroData, mapStyleToLetter }
export type { ExtractedContent, Customizations }
