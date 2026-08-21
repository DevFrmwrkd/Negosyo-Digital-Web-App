/**
 * roleColors — per-ROLE, per-SECTION colour overrides for the website editor.
 *
 * The v3 editor lets an admin click an element on the canvas and recolour its
 * ROLE (primary buttons, headings, …) rather than one element. Because every
 * template shares the same `data-field` contract (see TEMPLATE-FAMILY-PLAYBOOK
 * / [[filipino-template-family]]), a role maps to a fixed set of `[data-field]`
 * selectors and one colour recolours that role across ANY template family with
 * no per-template code.
 *
 * SCOPE. A role on its own was too blunt. `primaryCta` covers both
 * `hero.cta1.text` and `ctaBand.cta.text`, so recolouring the hero's button
 * also recoloured the closing band's — two controls that sit on different
 * grounds and often want opposite treatments. A colour is therefore scoped to a
 * SECTION by default, and the section does not need storing: it is already the
 * leading segment of the hook path the admin clicked.
 *
 * Storage:  customizations.roleColors = {
 *     "<section>:<role>:<prop>": "#rrggbb",   // this section only
 *     "<role>:<prop>":           "#rrggbb",   // every section (legacy)
 * }
 *   prop = 'bg' (background) | 'fg' (text colour)
 *
 * The two-part form is what shipped first and is still honoured, unchanged, so
 * a site coloured before this existed keeps rendering exactly as it did. New
 * writes use the three-part form. Where both could apply to one element the
 * section-scoped one wins — see the emission order in buildRoleColorCss.
 *
 * `buildRoleColorCss()` turns the map into a CSS string, injected live into the
 * preview iframe (SandboxEditorV3) AND appended to the built HTML in
 * app/api/generate-website, so the colours persist on Save + Publish.
 */

export type ColorRole = 'primaryCta' | 'secondaryCta' | 'heading' | 'eyebrow' | 'link';
export type ColorProp = 'bg' | 'fg';

export interface RoleDef {
    role: ColorRole;
    label: string;
    /** CSS selectors — data-field based, so they hit every template family. */
    selectors: string[];
    /** The property a click edits by default (the "smart default"). */
    defaultProp: ColorProp;
    /** Which properties the picker offers (default first). */
    props: ColorProp[];
}

export const COLOR_ROLES: Record<ColorRole, RoleDef> = {
    primaryCta: {
        role: 'primaryCta', label: 'Primary buttons', defaultProp: 'bg', props: ['bg', 'fg'],
        selectors: [
            '[data-field="hero.cta1.text"]',
            '[data-field="ctaBand.cta1.text"]',
            '[data-field="ctaBand.cta.text"]',
        ],
    },
    secondaryCta: {
        role: 'secondaryCta', label: 'Secondary buttons', defaultProp: 'bg', props: ['bg', 'fg'],
        selectors: [
            '[data-field="hero.cta2.text"]',
            '[data-field="hero.cta3.text"]',
            '[data-field="ctaBand.cta2.text"]',
            '[data-field="ctaBand.cta3.text"]',
        ],
    },
    heading: {
        role: 'heading', label: 'Headings', defaultProp: 'fg', props: ['fg'],
        selectors: ['[data-field$=".headline"]', '[data-field^="hero.headlineLines"]'],
    },
    eyebrow: {
        role: 'eyebrow', label: 'Eyebrows / tags', defaultProp: 'fg', props: ['fg'],
        selectors: ['[data-field$=".tag"]', '[data-field="hero.kicker"]'],
    },
    link: {
        role: 'link', label: 'Links', defaultProp: 'fg', props: ['fg'],
        selectors: ['a[data-href-field]:not(.btn)'],
    },
};

/** Map a clicked element (its data-field + whether it looks like a button) to a role. */
export function roleForField(field: string, isButton: boolean): ColorRole {
    const f = field || '';
    if (isButton) {
        if (/cta2\.text$|cta3\.text$/.test(f)) return 'secondaryCta';
        return 'primaryCta'; // cta1 / cta.text / any other button
    }
    if (/\.headline$/.test(f) || /^hero\.headlineLines/.test(f)) return 'heading';
    if (/\.tag$/.test(f) || f === 'hero.kicker') return 'eyebrow';
    return 'link'; // plain <a> / fallback text
}

/**
 * The section a hook belongs to: the leading segment of its path.
 * `hero.cta1.text` → `hero`, `ctaBand.cta.text` → `ctaBand`,
 * `nav.cta.href` → `nav`, `navbar_links.0.label` → `navbar_links`.
 *
 * A DOTLESS hook has no section, and returning one would be a lie. Scoping
 * works by prefix — `[data-field^="hero."]` — so a section is only usable if
 * the hooks inside it actually start with it and a dot. `navCtaText` and
 * `navCtaHref` are the whole of the dotless set; there is no prefix that
 * reaches them, so they report no section and the caller falls back to
 * every-section, which is what the product did before scoping existed.
 *
 * An earlier draft aliased the nav hooks to a section called `header`. No
 * template emits a single `header.*` hook — the real namespace is `nav` — so
 * every header colour was written under a key whose selector could never match
 * anything, and the pick silently did nothing. A section name has to be one the
 * markup actually uses.
 */
export function sectionForField(field: string): string {
    const f = String(field || '').trim();
    if (!f) return '';
    const dot = f.indexOf('.');
    if (dot <= 0) return '';
    return f.slice(0, dot);
}

/**
 * Storage key. Omit `section` for the legacy every-section form.
 */
export function roleColorKey(role: ColorRole, prop: ColorProp, section?: string | null): string {
    return section ? `${section}:${role}:${prop}` : `${role}:${prop}`;
}

/**
 * Split a stored key back into its parts, accepting both forms. Returns null
 * for anything that is not a key we wrote — a stray entry must be skipped, not
 * guessed at.
 */
export function parseRoleColorKey(
    key: string,
): { section: string | null; role: ColorRole; prop: ColorProp } | null {
    const parts = String(key || '').split(':');
    let section: string | null = null;
    let role: string | undefined;
    let prop: string | undefined;
    if (parts.length === 2) {
        [role, prop] = parts;
    } else if (parts.length === 3) {
        [section, role, prop] = parts as [string, string, string];
        if (!section) return null;
    } else {
        return null;
    }
    // hasOwnProperty, not `in`: `'constructor' in COLOR_ROLES` is true via the
    // prototype chain, and the truthy non-RoleDef it yields makes
    // buildRoleColorCss read .selectors off a function — a throw on the path
    // that runs during publish. A stray key is not a key we wrote.
    if (!role || !Object.prototype.hasOwnProperty.call(COLOR_ROLES, role)) return null;
    if (prop !== 'bg' && prop !== 'fg') return null;
    return { section, role: role as ColorRole, prop };
}

/**
 * Narrow one of a role's selectors to a single section, or return null when
 * that selector can never match inside it.
 *
 * The role selectors come in two shapes and they need opposite treatment:
 *   · pinned to a path — `[data-field="hero.cta1.text"]`, `[data-field^="hero.
 *     headlineLines"]`. The section is already in the value, so this is a
 *     filter: keep it for `hero`, drop it for every other section. Dropping is
 *     the important half — without it, scoping the closing band's button would
 *     have silently recoloured the hero's too.
 *   · open-ended — `[data-field$=".headline"]`, `a[data-href-field]`. These
 *     match a role across every section, so they gain a prefix test.
 */
export function scopeSelector(selector: string, section: string): string | null {
    if (!section) return selector;
    const open = selector.indexOf('[');
    const close = selector.indexOf(']', open);
    if (open === -1 || close === -1) return selector;

    const inner = selector.slice(open + 1, close);
    const before = selector.slice(0, open);
    const after = selector.slice(close + 1);

    const eq = inner.indexOf('=');
    if (eq === -1) {
        // presence test: [data-href-field] → [data-href-field^="section."]
        return `${before}[${inner}^="${section}."]${after}`;
    }

    const opChar = inner[eq - 1];
    const attr = inner.slice(0, opChar === '^' || opChar === '$' || opChar === '*' ? eq - 1 : eq);
    const value = inner.slice(eq + 1).replace(/^"|"$/g, '');

    if (opChar === '$' || opChar === '*') {
        // suffix/substring test: keep it and add the section prefix alongside
        return `${before}[${inner}][${attr}^="${section}."]${after}`;
    }

    // '=' or '^=' — the value carries its own section, so this is a filter
    return sectionForField(value) === section ? selector : null;
}

/**
 * Relative luminance (WCAG 2.x) of a #rgb / #rrggbb / #rrggbbaa colour.
 * Alpha is ignored: a translucent pick composites over something we cannot see
 * from here, and guessing would be worse than treating it as opaque.
 */
function luminance(hex: string): number {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 8) h = h.slice(0, 6);
    if (h.length !== 6) return 0.5;
    const lin = [0, 2, 4].map((i) => {
        const s = parseInt(h.slice(i, i + 2), 16) / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

function contrast(a: string, b: string): number {
    const x = luminance(a);
    const y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * The legible label for a picked background.
 *
 * NOT `luminance(bg) > 0.5 ? black : white`. That threshold is wrong — white
 * only beats black below luminance ~0.179 — and it is why several schemes ship
 * sub-AA button labels. Measure both and take the winner; there is no case
 * where the losing one is preferable.
 */
export function labelFor(bg: string): string {
    const DARK = '#0B0B0F';
    const LIGHT = '#FFFFFF';
    return contrast(LIGHT, bg) >= contrast(DARK, bg) ? LIGHT : DARK;
}

/**
 * Only the lengths luminance() can actually read. The old gate was {3,8},
 * which admits #rgba: luminance() saw a 4-char string, fell through to its 0.5
 * default, and labelFor() then returned black for every one of them — black on
 * a black fill for exactly the case this file exists to prevent.
 */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Build a CSS string from a roleColors map. Returns '' when there is nothing
 * to emit. `bg` sets background + border-color (so filled buttons recolour
 * cleanly); `fg` sets the text colour. All rules are `!important` to beat the
 * template's own token-driven styling.
 */
export function buildRoleColorCss(roleColors: Record<string, string> | undefined | null): string {
    if (!roleColors || typeof roleColors !== 'object') return '';

    const entries: Array<{ section: string | null; role: ColorRole; prop: ColorProp; color: string }> = [];
    for (const [key, color] of Object.entries(roleColors)) {
        if (!color || typeof color !== 'string' || !HEX.test(color)) continue;
        const parsed = parseRoleColorKey(key);
        if (!parsed) continue;
        entries.push({ ...parsed, color });
    }
    if (!entries.length) return '';

    // Which (scope, role) pairs carry an admin-chosen label colour, so a
    // background pick does not overwrite one.
    const hasExplicitFg = new Set<string>();
    for (const e of entries) if (e.prop === 'fg') hasExplicitFg.add(`${e.section ?? '*'}:${e.role}`);

    // EVERY-SECTION entries first, SECTION-SCOPED second. A pinned selector
    // like [data-field="hero.cta1.text"] is identical in both forms, so the two
    // rules tie on specificity and source order is what decides — the narrower
    // choice has to come last or a legacy every-section colour would silently
    // outrank the section the admin just picked.
    entries.sort((a, b) => Number(!!a.section) - Number(!!b.section));

    const rules: string[] = [];
    for (const { section, role, prop, color } of entries) {
        const def = COLOR_ROLES[role];
        if (!def) continue;

        const base = section
            ? def.selectors.map((s) => scopeSelector(s, section)).filter((s): s is string => !!s)
            : def.selectors;
        if (!base.length) continue;

        // Apply to base + :hover + :focus (per selector) so the picked colour
        // holds across states instead of reverting to the template's hover
        // colour. Appending states to the JOINED string would be wrong — each
        // selector needs its own suffix.
        const sel = [
            ...base,
            ...base.map((s) => `${s}:hover`),
            ...base.map((s) => `${s}:focus`),
        ].join(',');

        if (prop === 'bg') {
            rules.push(`${sel}{background:${color} !important;border-color:${color} !important;}`);
            // A background pick with no matching label pick used to leave the
            // label at whatever the TEMPLATE chose, pinned by nothing and
            // checked by nobody — so recolouring a button's fill toward its own
            // label colour made the label vanish. 'bg' is the DEFAULT prop for
            // buttons, so that was one click away at all times.
            //
            // Only when the admin has not chosen a label colour at this scope:
            // an explicit fg always wins, even a bad one. It is their call, and
            // they can see the result.
            if (!hasExplicitFg.has(`${section ?? '*'}:${role}`)) {
                rules.push(`${sel}{color:${labelFor(color)} !important;}`);
            }
        } else {
            rules.push(`${sel}{color:${color} !important;}`);
        }
    }
    return rules.join('\n');
}
