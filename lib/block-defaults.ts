/**
 * Block defaults — neutral fallback only.
 *
 * The per-business-type content overrides (barber, restaurant, salon, auto,
 * clinic, etc.) were removed when the template library was wiped for a
 * clean-slate redesign. `defaultsFor()` now returns the same neutral
 * placeholder regardless of `businessType`. The signature is preserved so
 * `lib/astro-builder.ts` and any future call sites keep working unchanged.
 *
 * When the new templates land, either:
 *   • re-add a per-type lookup table here, or
 *   • move per-design defaults next to the template that consumes them.
 */

export type WhyItem = { title: string; body: string }
export type HowStep = { step: string; title: string; body: string }
export type Testimonial = { quote: string; name: string; context?: string }
export type FaqItem = { q: string; a: string }
export type CredItem = { label: string; detail: string }
export type CtaBand = {
    heading?: string
    body?: string
    primaryLabel?: string
    primaryLink?: string
    secondaryLabel?: string
    secondaryLink?: string
}
export type TrustData = {
    years?: string
    licenses?: string[]
    memberships?: string[]
}

export interface BlockDefaults {
    trust?: TrustData
    why?: WhyItem[]
    how?: HowStep[]
    testimonials?: Testimonial[]
    faq?: FaqItem[]
    credentials?: CredItem[]
    ctaBand?: CtaBand
}

// Neutral fallback. "Neutral" now means *makes no claim*, not "generic
// enough to read on any business" — the previous copy read fine on any
// business precisely because it promised things on behalf of all of them.
//
// This object is the last layer before the page: lib/astro-builder.ts
// resolves each block as `content.X ?? d.X`, so anything left here is
// published for every owner who supplied nothing, and it lands after the
// templates' own fallbacks were cleaned — deleting a claim from a .astro
// file achieves nothing while a copy survives here. Same rule as
// lib/derive-content-defaults.ts: if the sentence would be false for some
// business using this template, it must not render.
//
// Removed and why:
//   why[]  — 'We answer when you call' / 'same-day reply', 'clear scope and
//            one point of contact', 'we come back and fix it': response-time,
//            process and warranty promises for a business we have never met.
//   how[]  — 'Phone, WhatsApp, or the form' asserts channels that may not
//            exist; 'Quick reply'; 'On the agreed date and on time'.
//   faq[]  — 'Phone, message, or walk in. We reply the same day.' asserts
//            walk-in trading and a response time. The location answer was
//            only a pointer to a section and worthless on its own.
//   ctaBand.body — 'we will get back to you the same day', same guarantee.
//
// What stays is the CTA frame: a heading that promises nothing and a button
// label. Empty arrays are deliberate — every consuming component checks
// `items.length` and drops the whole section, so an owner who supplied
// nothing advertises nothing. Admin-typed values still win over all of it.
const NEUTRAL: BlockDefaults = {
    why: [],
    how: [],
    testimonials: [],
    faq: [],
    credentials: [],
    ctaBand: {
        heading: 'Ready when you are.',
        primaryLabel: 'Get in touch',
        primaryLink: '#contact',
    },
}

export function defaultsFor(_businessType: string | undefined | null): BlockDefaults {
    // Per-business-type lookup was removed with the template wipe. Every
    // business gets the same neutral fallback until new designs land.
    return NEUTRAL
}
