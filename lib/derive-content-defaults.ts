/**
 * Browser-safe derivation of "tier-3" content defaults for the generic
 * landing-page templates. Lives outside lib/astro-builder.ts (which
 * imports Node-only modules) so the editor sidebar can import this
 * directly and mirror the resolution logic the build pipeline uses.
 *
 * Tier order (handled in lib/astro-builder.ts:transformToAstroData()):
 *   tier 1 — admin override (`extractedContent.*` values admin typed)
 *   tier 2 — AI extraction  (`extractedContent.hero.headlineLines`, etc.)
 *   tier 3 — derived from submission (this function)
 *
 * The editor sidebar (ContentFieldsAuto) treats the same tier-3 result
 * as a "final fallback" so inputs show whatever the iframe is rendering
 * — admin never sees an empty input where the website has content.
 *
 * ─── WHAT MAY LIVE IN THIS FILE ────────────────────────────────────────
 * This tier is the LAST one standing between a submission and the live
 * page, and lib/astro-builder.ts merges it into every section with
 * mergeShallow(c.X, derived.X) — which starts from the derived object and
 * only lets an owner value win when it is not undefined/null/''. So a
 * string written here is published on behalf of every owner who left that
 * field blank, and it overrides the template's own fallback: the template
 * never gets asked. Deleting a claim from a .astro file does nothing while
 * a copy of it survives here.
 *
 * The rule, therefore: IF THE SENTENCE WOULD BE FALSE FOR SOME BUSINESS
 * USING THIS TEMPLATE, IT MUST NOT BE IN THIS FILE.
 *
 *   allowed — the owner's own facts (name, city, business type, phone,
 *             address, tagline), section labels and UI affordances
 *             ('About', 'Get in touch'), and layout scaffolding.
 *   banned  — anything asserting hours, speed, price, quality, reach,
 *             credentials, reputation or a service the owner never listed.
 *             'Trusted', 'open daily', 'same day', 'free estimates', an
 *             invented service menu: all of it.
 *
 * Two corollaries, both learned the hard way:
 *
 *   1. A PLACEHOLDER IS A CLAIM. 'Your Business' asserts the business is
 *      called that, and it renders as the wordmark, the H1, the footer brand
 *      and the © line. A stand-in for a missing owner fact is banned on
 *      exactly the same grounds as an invented rating. No derived value may
 *      stand in for a fact the submission does not carry — missing name,
 *      missing city, missing trade: compose around the gap and omit every
 *      line that cannot be said without it. Three separate passes have now
 *      each found one more instance of the same mistake here ('★★★★★ rated
 *      on Google', the per-trade service menu, then the name itself), so
 *      the generalisation is written down rather than the special case.
 *   2. DON'T POINT AT CONTENT THAT MAY NOT EXIST. Sentences like "see the
 *      Location section below" or "send us a message" describe parts of a
 *      page that only render when the owner supplied the data behind them.
 *      An answer may only promise what the same submission guarantees.
 *
 * When a claim is removed the key must be ABSENT, never ''. Absent means
 * the merged section has no such key and the component's `{value && …}`
 * guard drops the element; '' would still be a key, and — because
 * mergeShallow skips '' on the OWNER side — a derived '' can never be
 * cleared by an admin who blanks the input. Empty arrays are the array
 * equivalent: every list-rendering component checks `items.length` and
 * hides the whole section, so [] is the honest "nothing to say" value.
 */

export interface DeriveContentInput {
    business_name?: string;
    business_city?: string;
    business_type?: string;
    tagline?: string;
    about?: string;
    contact?: { phone?: string; email?: string; address?: string };
}

/**
 * Every field that can only be filled from owner data is optional: when the
 * submission doesn't carry the fact, the key is left off entirely rather
 * than filled with an invented one. See the "absent, never ''" note above.
 */
export interface DerivedSection {
    marquee: { text?: string };
    hero: {
        kicker?: string;
        /** Name-derived: absent when the submission carries no business name. */
        headline?: string;
        headlineLines: string[];
        sub?: string;
        cta1: { text: string; href: string };
        cta2: { text: string; href: string };
        /** Optional and deliberately unset — see the comment where the derived
         *  hero is built. There is no honest default for either meta line. */
        meta1?: string;
        meta2?: string;
    };
    about: {
        tag: string;
        /** All three are name-derived — absent when there is no name. */
        headline?: string;
        lead?: string;
        signature?: string;
        paragraphs: string[];
    };
    services: {
        tag: string;
        headline: string;
        sub?: string;
        items: Array<{ title: string; desc: string; note?: string }>;
    };
    why: { tag: string; headline?: string; items: Array<{ title: string; body: string }> };
    how: { tag: string; headline?: string; steps: Array<{ title: string; body: string }> };
    gallery: { tag: string; headline: string; items: Array<{ caption?: string; image?: string }> };
    faq: { tag: string; headline: string; items: Array<{ q: string; a: string }> };
    area: { tag: string; headline?: string; body?: string; places: string[] };
    location: { tag: string; headline: string };
    ctaBand: { headline: string; sub?: string; cta: { text: string; href: string } };
    footer: { brand?: string; blurb?: string; notes: string[] };
    navbar_links: Array<{ label: string; href: string }>;
    navCtaText: string;
    navCtaHref: string;
}

/**
 * Canonical business-type keys. Routing only — they pick a palette
 * (AUTO_SCHEME_BY_BUSINESS_TYPE in lib/astro-builder.ts) and nothing else.
 *
 * This used to be BUSINESS_TYPE_SERVICES: the same keys mapped to a
 * three-item service menu per trade, complete with descriptions and notes
 * ('estimates free', 'same-day', 'no contracts', 'trained colourists',
 * 'Free local delivery', 'reservations open'). Every one of those was a
 * price, hours, credential or capability claim published on behalf of an
 * owner who listed no services at all — the barber who only cuts hair
 * advertised beard work, the shop with no delivery advertised delivery.
 * A service the owner never mentioned is an invented service, and it
 * reached the page even after the templates dropped their own stock lists,
 * because mergeShallow(c.services, derived.services) in lib/astro-builder.ts
 * fills any key the owner left unset. The table is gone; do not bring it
 * back. Services come from the owner or the section hides.
 */
const BUSINESS_TYPE_KEYS = new Set([
    'barber', 'salon', 'auto', 'restaurant', 'cafe',
    'retail', 'clinic', 'fitness', 'education', 'services',
]);

export function normalizeBusinessType(bt: string | undefined | null): string {
    if (!bt) return '';
    const k = bt.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (BUSINESS_TYPE_KEYS.has(k)) return k;
    if (/(barber|barbershop)/.test(k))          return 'barber';
    if (/(salon|beauty|spa|nail|hair|aesthet)/.test(k)) return 'salon';
    if (/(auto|mechanic|carshop|carrepair|tire|garage)/.test(k)) return 'auto';
    if (/(restaurant|diner|eatery|bistro|food)/.test(k)) return 'restaurant';
    if (/(cafe|coffee|roaster|tea)/.test(k))    return 'cafe';
    if (/(retail|store|shop|boutique)/.test(k)) return 'retail';
    if (/(clinic|dental|dentist|medical|doctor|veterinary|vet)/.test(k)) return 'clinic';
    if (/(fitness|gym|yoga|pilates|crossfit|martial)/.test(k))  return 'fitness';
    if (/(school|tutor|workshop|academy|education|learning)/.test(k))   return 'education';
    if (/(trade|service|plumb|electric|hvac|landscap|clean|laundry)/.test(k)) return 'services';
    return '';
}

/**
 * Produce a complete content fallback object from a submission's form
 * data. Mirrors what lib/astro-builder.ts uses on the server.
 */
export function deriveContentDefaults(
    content: DeriveContentInput,
    photos: string[] = [],
): DerivedSection {
    // No placeholder wordmark. This used to be `|| 'Your Business'`, and
    // because mergeShallow(c.X, derived.X) in lib/astro-builder.ts starts from
    // the derived object, that string WAS the business name everywhere the
    // page quotes it: the header mark, the H1, the marquee, the About heading
    // and signature, the footer brand and the © line. HeaderA/HeroA/FooterA
    // had already been stripped of their own copies and given `{brand && …}`
    // guards — but the guards never fired, because this layer handed them a
    // non-empty string. Deleting the fallback from 47 components did nothing
    // while it survived here. Same trap as meta1's '★★★★★ rated on Google',
    // one field over; see corollary 1 at the top of this file.
    //
    // Should the pipeline refuse a nameless submission instead? It should —
    // but not from here. deriveContentDefaults() runs synchronously inside the
    // admin editor's render (components/editor/SandboxEditor.tsx), where the
    // name is legitimately absent for a moment while a draft loads, so
    // throwing would take down the editor rather than the bad build.
    // ExtractedContent.business_name is already typed non-optional, which
    // makes "no name" a broken submission by contract; the gate belongs at
    // intake / publish, upstream of this file.
    //
    // So this layer degrades instead, and treats a missing name exactly like a
    // missing city or trade: every line that cannot be written without it is
    // omitted. A nameless submission renders no wordmark, no hero headline, no
    // About section, no footer brand and no © line — a visibly unfinished page
    // that reads as missing data, which is the honest signal, instead of a
    // finished-looking site for a business called 'Your Business'.
    const name = content.business_name?.trim() || '';
    const city = content.business_city?.trim() || '';
    const bt = content.business_type?.trim() || '';
    // Title-cased trade, or '' when the owner never told us. The old fallback
    // was the literal string 'Local business', which then read out as "your
    // local Local business in …" and, worse, asserted locality for a business
    // that may be online-only or nationwide. No type supplied => say nothing
    // about the type; every line below composes around an empty value.
    const niceType = bt
        ? bt.replace(/[_-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : '';
    const lowerType = niceType.toLowerCase();
    // "Barbershop in Cebu City" / "Barbershop" / "based in Cebu City" / '' —
    // built only from what the owner actually typed. The city-only form needs
    // its own wording: joining a bare `in ${city}` onto the sentence below
    // produced "Welcome to X — in Cebu City." for every submission that gave a
    // city but no trade.
    const descriptor = niceType && city
        ? `${niceType} in ${city}`
        : niceType || (city ? `based in ${city}` : '');
    // Sentence-case a descriptor that has to stand on its own.
    const asSentence = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
    const phone = content.contact?.phone?.trim() || '';
    const email = content.contact?.email?.trim() || '';
    const address = content.contact?.address?.trim() || '';
    // The contact channels we can actually promise, in the words of the FAQ
    // answer below ('call +63…', 'email hi@…'). A channel the owner never
    // supplied is not offered.
    const contactChannels = [
        phone ? `call ${phone}` : '',
        email ? `email ${email}` : '',
    ].filter(Boolean);
    return {
        // Marquee text is the owner's own name, city and trade. The default
        // used to be 'Quality ◆ Trusted ◆ Local ◆ Reliable' — four unearned
        // claims scrolling across the top of a site for a business that opened
        // yesterday. MarqueeA already dropped its own copy of that string, but
        // this layer put it back on every site: mergeShallow(c.marquee,
        // derived.marquee) in lib/astro-builder.ts fills any key the owner
        // left unset. Facts only; the band hides (`{text && …}`) if we have
        // none.
        marquee: { text: [name, city, niceType].filter(Boolean).join(' ◆ ') || undefined },
        hero: {
            kicker: [city, niceType].filter(Boolean).join(' · ') || undefined,
            headline: name || undefined,
            // One line, and only when there is a name to put on it. The old
            // [name, '', ''] padding also emitted two empty headline rows in
            // every hero that maps over this array — and one of them picks up
            // the accent style by index (HeroF), so the pad was visible.
            headlineLines: name ? [name] : [],
            // 'your local …' dropped: locality is a claim, the name/type/city
            // around it are the owner's facts. With no name there is nobody to
            // welcome anyone to, so the trade and city stand alone
            // ('Barbershop in Cebu City.') and an empty submission gets no
            // sub-line at all — every hero reads it as `{sub && …}`.
            sub: content.tagline?.trim()
                || (name
                    ? (descriptor ? `Welcome to ${name} — ${descriptor}.` : `Welcome to ${name}.`)
                    : (descriptor ? asSentence(descriptor) : undefined)),
            // Both targets are resolved against the sections this build
            // actually renders, in lib/astro-builder.ts — see the note on
            // navbar_links below. cta1 keeps its label and moves to the
            // owner's own tel:/mailto: if the Location section isn't there;
            // cta2 names a section, so label and href move together to the
            // next live one and the button is only dropped when there is
            // nowhere left to browse.
            cta1: { text: 'Get in touch', href: '#visit' },
            cta2: { text: 'See services', href: '#services' },
            // No meta1 default. It used to be '★★★★★ rated on Google' — a
            // five-star review score asserted, above the fold, for a business
            // that may have no Google reviews at all. Same class as an invented
            // testimonial and just as unrecoverable once the site is live, and
            // the derived value defeats the template fix: HeroA/C/D/E dropped
            // their own copy of that string, but mergeShallow(c.hero,
            // derived.hero) in lib/astro-builder.ts fills any key the content
            // leaves unset, so this line put it straight back on every generic
            // site. Every hero renders the line as `{meta1 && …}`, so leaving it
            // out simply omits it. Owner data or nothing.
            //
            // meta2 was `${city} · open daily` (and a bare 'Open daily' when we
            // didn't even know the city) — a trading schedule nobody verified,
            // welded onto a real fact. The city survives; the schedule does not.
            // Same `{meta2 && …}` guard, so no city means no line.
            meta2: city || undefined,
        },
        about: {
            tag: 'About',
            // 'About ' with nothing after it is not a heading, and the derived
            // value is what the editor sidebar shows admin as the current
            // content — so a name-less headline would also teach admin that
            // the site says something it doesn't. Absent when we have no name.
            headline: name ? `About ${name}` : undefined,
            // Owner facts only, and only the ones we have. 'local' removed for
            // the same reason as above. Every clause here is a sentence ABOUT
            // the named business, so no name means no lead — AboutA guards
            // `{lead && …}` and drops the whole section when headline, lead,
            // signature and paragraphs are all empty.
            lead: !name
                ? undefined
                : city && niceType
                    ? `${name} is a ${lowerType} based in ${city}.`
                    : niceType
                        ? `${name} is a ${lowerType}.`
                        : city
                            ? `${name} is based in ${city}.`
                            : undefined,
            signature: name || undefined,
            // No stock About prose. The two paragraphs here were "We focus on
            // quality work, honest pricing, and customers who come back" and an
            // offer to walk the customer through the job — a quality claim, a
            // pricing claim and a retention claim, written in the owner's voice
            // about a business we know nothing about. There is no honest
            // generic About paragraph; every About component maps over this
            // array, so [] simply renders no body copy.
            paragraphs: [],
        },
        services: {
            tag: 'What we offer',
            headline: 'Services we provide',
            sub: name ? `A quick look at what ${name} can help you with.` : undefined,
            // Empty by design — see BUSINESS_TYPE_KEYS above for what used to
            // be here. Every Services component checks `items.length` and keeps
            // the whole section out of the document when it is 0, so a business
            // that listed no services advertises none.
            items: [],
        },
        why: {
            tag: 'Why us',
            headline: name ? `Why choose ${name}` : undefined,
            // The three stock reasons — 'Local & reliable' ("consistent,
            // dependable work"), 'Honest pricing' ("no surprise charges") and
            // 'Real people' ("reach a real human who knows your job") — are
            // reach, price and service-level promises made for a business we
            // have never spoken to. Nothing here is derivable from a
            // submission. The section hides on `items.length === 0`.
            items: [],
        },
        how: {
            tag: 'How it works',
            // 'Three easy steps' also went: it fixes a step count the owner's
            // real process may not match, and it renders above nothing now.
            // The steps themselves promised a "quick reply", a quote, and work
            // delivered "on time and on quote" — speed, price and punctuality.
            steps: [],
        },
        gallery: {
            tag: 'Inside',
            headline: 'A look at our work',
            // Photos are the owner's; the captions were ours. 'Our space' /
            // 'Our work' / 'Behind the scenes' describe what is in an image
            // nobody looked at. Omit the key entirely — every gallery renders
            // `{it.caption && …}`, so an uncaptioned photo is just a photo.
            items: photos.slice(0, 6).map((image) => ({ image })),
        },
        faq: {
            tag: 'Good to know',
            headline: 'Questions, answered',
            // Each Q&A is emitted only when the submission actually answers it.
            // Dropped outright: 'What hours are you open?' — the stock answer
            // pointed at "our Google Business profile", a profile most of these
            // businesses do not have, to cover hours we were never given.
            // Also dropped: the "we reply the same day" tail on the contact
            // answer, and the phone-less variant that invited people to "stop
            // by our location" we may not know.
            //
            // An answer may only promise what this same submission
            // guarantees — see corollary 2 at the top of the file. Both items
            // below used to break that rule in the same way.
            items: [
                // 'or send us a message' offered a channel that may not exist:
                // these pages render a phone, an address and a map, and
                // nothing that takes a message — no form, no inbox, and the
                // messenger FAB is opt-in and off by default. The answer now
                // names only the channels the owner actually gave us, and the
                // question is skipped when they gave none.
                ...(contactChannels.length
                    ? [{ q: 'How do I get in touch?', a: `You can ${contactChannels.join(' or ')}.` }]
                    : []),
                ...(address
                    ? [{ q: 'Where are you located?', a: address }]
                    // City but no address. The old answer here was 'Located in
                    // ${city}. See the Location section below for full
                    // details.' — and this branch fires *because* the owner
                    // gave no address, so there are no full details to see.
                    // Worse, LocationA/B/C/D/E keep themselves out of the
                    // document entirely unless there is an address, phone,
                    // hours or map coords, so on a submission with only a city
                    // the sentence pointed at a section that isn't on the page
                    // at all. Answer with the one fact we have; promise
                    // nothing beyond it.
                    : city
                        ? [{ q: 'Where are you located?', a: `We're based in ${city}.` }]
                        : []),
            ],
        },
        area: {
            tag: 'Service area',
            // 'and nearby' / "customers across the surrounding area" claimed a
            // coverage radius nobody defined, and the city-less variant claimed
            // one for a business whose location we don't even know. What is
            // left is the city the owner typed. AreaA hides the column when
            // headline, body and places are all empty.
            headline: city ? `Serving ${city}` : undefined,
            places: city ? [city] : [],
        },
        location: {
            tag: 'Visit',
            headline: 'Where to find us',
        },
        ctaBand: {
            headline: `Ready when you are.`,
            // No sub-line: "we'll get back to you the same day" is a response-
            // time guarantee. CtaBandA/B fall back to joining the real address
            // and phone when this key is absent, which is the honest version of
            // the same line.
            //
            // '#visit' is resolved in lib/astro-builder.ts like the hero's
            // primary CTA: it survives untouched while the Location section
            // renders, and becomes the owner's tel:/mailto: when it doesn't.
            cta: { text: 'Get in touch', href: '#visit' },
        },
        footer: {
            // FooterA…E guard `{brand && …}`; with no name the mark is simply
            // not drawn rather than reading 'Your Business'.
            brand: name || undefined,
            // Every variant of the blurb is '<name> — <fact>', so it needs the
            // name as much as the About lead does.
            blurb: !name
                ? undefined
                : city && niceType
                    ? `${name} — ${lowerType} serving ${city}.`
                    : niceType
                        ? `${name} — ${lowerType}.`
                        : city
                            ? `${name} — ${city}.`
                            : undefined,
            // Copyright only. 'Quality work · trusted locally' was a quality
            // claim plus a reputation claim, sitting in the footer of every
            // site we shipped. And a © line needs somebody to assert the
            // copyright for: with no name it would print a bare '© 2026',
            // so the note is dropped instead (the footer maps over this array,
            // so [] renders no note row).
            notes: name ? [`© ${new Date().getFullYear()} ${name}`] : [],
        },
        // The CANONICAL menu, complete on purpose — not the menu that ships.
        //
        // Corollary 2 at the top of this file says an answer may only promise
        // what the same submission guarantees, and a nav link is a promise
        // like any other: every entry here names a section that auto-hides
        // when the business supplied nothing for it, so on a sparse site four
        // of these five scrolled nowhere. They are filtered — together with
        // `hero.cta2`'s '#services' and `ctaBand.cta`'s '#visit' — in
        // lib/astro-builder.ts (see the anchor-liveness block in
        // transformToAstroData), which is the only layer that can: this
        // function is browser-safe tier 3 and never sees the AI's services /
        // why / gallery items or the admin's visibility toggles.
        //
        // So the list stays whole HERE, and that is deliberate twice over:
        // it is what the editor sidebar lists and lets admin edit (the
        // sidebar reads this function directly), and a business that fills
        // its sections in gets every link back with no further edit. Adding
        // a sixth entry means teaching the builder's `deadAnchors` set about
        // its target too, or it can only ever be dropped by the design guard.
        navbar_links: [
            { label: 'About',    href: '#about' },
            { label: 'Services', href: '#services' },
            { label: 'Why us',   href: '#why'   },
            { label: 'Gallery',  href: '#work'  },
            { label: 'Visit',    href: '#visit' },
        ],
        navCtaText: 'Get in touch',
        navCtaHref: '#visit',
    };
}

/**
 * Resolve a single dotted-path field from the derived content. Returns
 * `undefined` if the path doesn't exist in the derived shape. Used by
 * the editor as the FINAL fallback when admin draft + schema fallback
 * paths are all empty.
 */
export function getDerivedAt(derived: DerivedSection, path: string): any {
    const parts = path.split('.');
    let cur: any = derived;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}
