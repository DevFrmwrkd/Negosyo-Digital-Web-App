/**
 * roleColors — per-ROLE colour overrides for the website editor.
 *
 * The v3 editor lets an admin click an element on the canvas and recolour its
 * whole ROLE (all primary buttons, all headings, …) rather than one element.
 * Because every template shares the same `data-field` contract (see
 * TEMPLATE-FAMILY-PLAYBOOK / [[filipino-template-family]]), a role maps to a
 * fixed set of `[data-field]` selectors, so one colour recolours that role
 * consistently across ANY template family — no per-template code.
 *
 * Storage:  customizations.roleColors = { "<role>:<prop>": "#rrggbb" }
 *   prop = 'bg' (background) | 'fg' (text colour)
 *
 * `buildRoleColorCss()` turns that map into a CSS string, injected live into
 * the preview iframe (SandboxEditorV3) AND appended to the built HTML in
 * app/api/generate-website (so the colours persist on Save + Publish).
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

/** Storage key for a role+property. */
export function roleColorKey(role: ColorRole, prop: ColorProp): string {
    return `${role}:${prop}`;
}

/**
 * Build a CSS string from a roleColors map. Returns '' when there is nothing
 * to emit. `bg` sets background + border-color (so filled buttons recolour
 * cleanly); `fg` sets the text colour. All rules are `!important` to beat the
 * template's own token-driven styling.
 */

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

export function buildRoleColorCss(roleColors: Record<string, string> | undefined | null): string {
    if (!roleColors || typeof roleColors !== 'object') return '';
    const rules: string[] = [];
    // Which roles carry an admin-chosen label colour, so a background pick for
    // that role does not overwrite it.
    const hasExplicitFg = new Set<string>();
    for (const [key, color] of Object.entries(roleColors)) {
        if (!color || typeof color !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(color)) continue;
        const [r, p] = key.split(':');
        if (p === 'fg' && r) hasExplicitFg.add(r);
    }
    for (const [key, color] of Object.entries(roleColors)) {
        if (!color || typeof color !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(color)) continue;
        const [role, prop] = key.split(':') as [ColorRole, ColorProp];
        const def = COLOR_ROLES[role];
        if (!def || (prop !== 'bg' && prop !== 'fg')) continue;
        // Apply to base + :hover + :focus (per selector) so the picked colour
        // holds across states instead of reverting to the template's hover
        // colour. Appending states to the JOINED string would be wrong — each
        // selector needs its own suffix.
        const sel = [
            ...def.selectors,
            ...def.selectors.map((s) => `${s}:hover`),
            ...def.selectors.map((s) => `${s}:focus`),
        ].join(',');
        if (prop === 'bg') {
            rules.push(`${sel}{background:${color} !important;border-color:${color} !important;}`);
            // A background pick with no matching label pick used to leave the
            // label at whatever the TEMPLATE chose, pinned by nothing and
            // checked by nobody — so recolouring a button's fill toward its own
            // label colour made the label vanish. 'bg' is the DEFAULT prop for
            // buttons, so that was one click away at all times.
            //
            // Only when the admin has not chosen a label colour themselves: an
            // explicit fg always wins, even a bad one. It is their call, and
            // they can see the result.
            if (!hasExplicitFg.has(role)) {
                rules.push(`${sel}{color:${labelFor(color)} !important;}`);
            }
        } else {
            rules.push(`${sel}{color:${color} !important;}`);
        }
    }
    return rules.join('\n');
}
