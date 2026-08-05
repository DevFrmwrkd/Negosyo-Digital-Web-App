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
export function buildRoleColorCss(roleColors: Record<string, string> | undefined | null): string {
    if (!roleColors || typeof roleColors !== 'object') return '';
    const rules: string[] = [];
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
        } else {
            rules.push(`${sel}{color:${color} !important;}`);
        }
    }
    return rules.join('\n');
}
