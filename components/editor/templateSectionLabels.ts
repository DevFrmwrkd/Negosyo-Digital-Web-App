/**
 * WHAT EACH TEMPLATE CALLS ITS SECTIONS.
 *
 * "SERVICES", "WHY-US", "CTA-BAND" are OUR vocabulary. They are what the
 * visibility keys are named after and they are meaningless to the person
 * looking at the page. Kubo Stays does not have a "services section" — it has
 * The rooms. It does not have "WHY-US" — it has The house. An admin deciding
 * whether to switch something off needs the name that is on the page and a line
 * saying what disappears with it.
 *
 * MEMBERSHIP AND ORDER DO NOT LIVE HERE. They are generated from the wrappers
 * into templateSectionOrder.generated.ts, so this file cannot make the panel
 * offer a section a template does not render, or hide one it does — the worst a
 * wrong entry here can do is mislabel something. scripts/check-template-blocks.mjs
 * fails on any label keyed to a block its template never renders.
 *
 * A template with no entry, or a block with no entry inside one, falls back to
 * DEFAULT_SECTION_LABELS. A plain generic label is the correct answer whenever a
 * template has no distinctive name of its own for a section — inventing flavour
 * that is not on the page is worse than being plain.
 */

export interface SectionLabel {
    /** 1–3 words, sentence case, as the section reads on the page. */
    label: string;
    /** At most ~9 words. What is inside it, in concrete nouns. */
    blurb: string;
}

/** Used whenever a template has nothing more specific to say. */
export const DEFAULT_SECTION_LABELS: Record<string, SectionLabel> = {
    "HERO":          { label: "Hero",          blurb: "Opening headline, intro line, buttons and lead photo" },
    "MARQUEE":       { label: "Marquee",       blurb: "The scrolling band of short phrases" },
    "TRUST":         { label: "Trust strip",   blurb: "Short proof figures under the hero" },
    "ABOUT":         { label: "About",         blurb: "The owner's story, portrait and signature" },
    "SERVICES":      { label: "Services",      blurb: "What the business sells, as cards" },
    "WHY-US":        { label: "Why us",        blurb: "Reasons to choose this business" },
    "HOW-IT-WORKS":  { label: "How it works",  blurb: "The numbered steps to getting started" },
    "TESTIMONIALS":  { label: "Reviews",       blurb: "Customer quotes and who said them" },
    "GALLERY":       { label: "Gallery",       blurb: "The photo grid" },
    "FAQ":           { label: "FAQ",           blurb: "Questions and answers" },
    "SERVICE-AREA":  { label: "Service area",  blurb: "The places this business covers" },
    "CREDENTIALS":   { label: "Credentials",   blurb: "Licences, memberships and promises" },
    "LOCATION":      { label: "Location",      blurb: "Map, address, hours and directions" },
    "CTA-BAND":      { label: "Closing band",  blurb: "The last call to action before the footer" },
    "FOOTER":        { label: "Footer",        blurb: "Contact details, links and the message pill" },
};

/**
 * Per-template overrides, keyed by template code then by block name.
 * Only the sections a template really renames need an entry.
 */
export const TEMPLATE_SECTION_LABELS: Record<string, Record<string, SectionLabel>> = {
    // ── Kubo Stays. Names taken from the design this template was built from
    //    ("Kubo Stays Landing.dc.html"), which is also what the page prints.
    "hospitality:BJ": {
        "HERO":         { label: "Hero",           blurb: "Headline, intro, both buttons and the house photo" },
        "TRUST":        { label: "Proof strip",    blurb: "Four figures in one bordered band" },
        "SERVICES":     { label: "The rooms",      blurb: "Room cards, rates, and the whole-house band" },
        "WHY-US":       { label: "The house",      blurb: "House photo and the two-column amenity list" },
        "GALLERY":      { label: "Photo grid",     blurb: "The five-tile bento of house photos" },
        "ABOUT":        { label: "Your host",      blurb: "Host copy, portrait, name and contact button" },
        "CREDENTIALS":  { label: "The promises",   blurb: "Numbered cards beside the host copy" },
        "HOW-IT-WORKS": { label: "How it works",   blurb: "Three steps on the green band" },
        "TESTIMONIALS": { label: "In their words", blurb: "Guest quotes, three cards" },
        "SERVICE-AREA": { label: "Nearby",         blurb: "What is around the house — not in the original design" },
        "LOCATION":     { label: "Getting here",   blurb: "Map, address and the house-rules table" },
        "FAQ":          { label: "Good to know",   blurb: "Questions and answers, two columns" },
        "CTA-BAND":     { label: "Send your dates", blurb: "The green closing slab and its two buttons" },
        "FOOTER":       { label: "Footer",         blurb: "Brand, blurb, link columns and contact rows" },
    },
};
