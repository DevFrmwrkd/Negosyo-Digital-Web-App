/**
 * themeOverride — CLIENT copy of the astro build's scheme/font → CSS override.
 *
 * ⚠️ SOURCE OF TRUTH: astro-site-template/src/lib/genericThemeOverrides.ts.
 * That file runs at build time to bake the admin's Color Scheme / Font Pairing
 * into every generated site. This is a byte-faithful port of its PURE parts
 * (no astro/DOM/server deps) so the v2 editor can inject the SAME override live
 * into the preview iframe for an instant, save-less recolour/refont. If you
 * change the palettes or token mapping there, mirror the change here (and vice
 * versa) or the live preview will drift from what Save actually renders.
 *
 * Only the pure subset is copied: buildOverrideCss + its palette/font tables +
 * the auto-scheme resolver. resolveTheme/buildFontHref (build-only) are omitted.
 */


// The palettes, pairings and colour helpers moved to lib/site-theme.ts so the
// offline holding page — rendered by a Next route AND a Convex action — can
// read them too. This file keeps its exports and its behaviour; it just no
// longer owns a second copy of the tables.
import {
    SCHEMES,
    FONT_PAIRINGS,
    pickOn,
    resolveAutoScheme,
} from '@/lib/site-theme';

export { resolveAutoScheme };

/**
 * Google Fonts URL for a pairing (mirror of the build's buildFontHref) so the
 * live preview can load the webfont it is switching to. null for unknown pairing.
 */
export function buildFontHref(pairing: string): string | null {
    const p = FONT_PAIRINGS[pairing];
    if (!p?.gfontFamily) return null;
    const families = p.gfontFamily.map((f) => `family=${f}`).join('&');
    return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
/**
 * Build the override CSS block. Returns '' when scheme is unset / unknown AND
 * pairing is unset / unknown (template default). Mirror of the build-time fn.
 */
export function buildOverrideCss(scheme: string, pairing: string): string {
    const palette = SCHEMES[scheme];
    const font = FONT_PAIRINGS[pairing];
    if (!palette && !font) return '';

    const lines: string[] = [];
    lines.push('html:root {');
    if (palette) {
        lines.push(`  --paper: ${palette.paper} !important;`);
        lines.push(`  --paper-2: ${palette.paper2} !important;`);
        lines.push(`  --card: ${palette.card} !important;`);
        lines.push(`  --ink: ${palette.ink} !important;`);
        lines.push(`  --ink-soft: ${palette.inkSoft} !important;`);
        lines.push(`  --line: ${palette.line} !important;`);
        lines.push(`  --paper-rgb: ${palette.paperRgb} !important;`);
        lines.push(`  --ink-rgb: ${palette.inkRgb} !important;`);
        lines.push(`  --accent-rgb: ${palette.accentRgb} !important;`);
        lines.push(`  --gold: ${palette.primary} !important;`);
        lines.push(`  --gold-deep: ${palette.primaryDeep} !important;`);
        lines.push(`  --peach: ${palette.primary} !important;`);
        lines.push(`  --peach-soft: ${palette.accent} !important;`);
        lines.push(`  --amber: ${palette.primary} !important;`);
        lines.push(`  --amber-2: ${palette.accent} !important;`);
        lines.push(`  --lime: ${palette.primary} !important;`);
        lines.push(`  --lime-2: ${palette.accent} !important;`);
        lines.push(`  --blue: ${palette.primary} !important;`);
        lines.push(`  --blue-deep: ${palette.primaryDeep} !important;`);
        lines.push(`  --blue-soft: ${palette.accent} !important;`);
        lines.push(`  --mint: ${palette.accent} !important;`);
        lines.push(`  --mint-soft: ${palette.accent} !important;`);
        lines.push(`  --yellow: ${palette.accent} !important;`);
        lines.push(`  --yellow-soft: ${palette.accent} !important;`);
        lines.push(`  --teal: ${palette.primary} !important;`);
        lines.push(`  --teal-deep: ${palette.primaryDeep} !important;`);
        lines.push(`  --teal-soft: ${palette.accent} !important;`);
        lines.push(`  --forest: ${palette.primaryDeep} !important;`);
        lines.push(`  --forest-2: ${palette.primary} !important;`);
        lines.push(`  --brass: ${palette.primary} !important;`);
        lines.push(`  --brass-bright: ${palette.accent} !important;`);
        lines.push(`  --brass-rgb: ${palette.accentRgb} !important;`);
        lines.push(`  --accent: ${palette.primary} !important;`);
        lines.push(`  --accent-rgb: ${palette.accentRgb} !important;`);
        lines.push(`  --accent-light: ${palette.accent} !important;`);
        lines.push(`  --accent-soft: ${palette.accent} !important;`);
        lines.push(`  --accent-deep: ${palette.primaryDeep} !important;`);
        lines.push(`  --olive: ${palette.ink} !important;`);
        lines.push(`  --olive-2: ${palette.primary} !important;`);
        lines.push(`  --olive-rgb: ${palette.inkRgb} !important;`);
        lines.push(`  --bg: ${palette.paper} !important;`);
        lines.push(`  --bg-2: ${palette.paper2} !important;`);
        lines.push(`  --bg-rgb: ${palette.paperRgb} !important;`);
        lines.push(`  --panel: ${palette.card} !important;`);
        lines.push(`  --panel-2: ${palette.card} !important;`);
        lines.push(`  --muted: ${palette.inkSoft} !important;`);
        lines.push(`  --stone: ${palette.line} !important;`);
        lines.push(`  --clay: ${palette.primary} !important;`);
        lines.push(`  --clay-deep: ${palette.primaryDeep} !important;`);
        lines.push(`  --ember: ${palette.accent} !important;`);
        lines.push(`  --nude: ${palette.primary} !important;`);
        lines.push(`  --nude-deep: ${palette.primaryDeep} !important;`);
        lines.push(`  --red: ${palette.primary} !important;`);
        lines.push(`  --red-d: ${palette.primaryDeep} !important;`);
        lines.push(`  --teal-d: ${palette.primaryDeep} !important;`);
        lines.push(`  --coral: ${palette.accent} !important;`);
    }
    if (palette) {
        const onPrimary = pickOn(palette.primary);
        const onInk = pickOn(palette.ink);
        const onPaper = pickOn(palette.paper);
        const onAccent = pickOn(palette.accent);
        lines.push(`  --on-primary: ${onPrimary} !important;`);
        lines.push(`  --on-ink: ${onInk} !important;`);
        lines.push(`  --on-paper: ${onPaper} !important;`);
        lines.push(`  --on-accent: ${onAccent} !important;`);
        lines.push(`  --on-brass: ${onPrimary} !important;`);
    }
    if (font) {
        const heading = `"${font.heading}", system-ui, sans-serif`;
        const body = `"${font.body}", system-ui, sans-serif`;
        const mono = font.mono ? `"${font.mono}", monospace` : `"${font.body}", system-ui, sans-serif`;
        lines.push(`  --disp: ${heading} !important;`);
        lines.push(`  --sans: ${body} !important;`);
        lines.push(`  --serif: ${heading} !important;`);
        lines.push(`  --mono: ${mono} !important;`);
        lines.push(`  --display: ${heading} !important;`);
        lines.push(`  --body: ${body} !important;`);
        lines.push(`  --cond: ${heading} !important;`);
    }
    lines.push('}');
    if (palette) {
        const onPrimary = pickOn(palette.primary);
        const onInk = pickOn(palette.ink);
        lines.push('html, body { background: var(--paper) !important; color: var(--ink) !important; }');
        lines.push(`.btn-primary, .btn-yellow, .nav-cta, button.btn-primary, a.btn-primary { color: ${onPrimary} !important; }`);
        lines.push(`.testi .btn, .cta-band .btn, footer .btn { color: ${onInk} !important; }`);
        lines.push(`.nav-right .btn, .nav-right .nav-cta { color: ${onPrimary} !important; }`);
        lines.push(`.trust, .trust .num, .trust .lbl, .testi, .testi p { color: ${onInk} !important; }`);
        lines.push(`.btn[class~="btn-primary"] { color: ${onPrimary} !important; }`);
        lines.push('.hero .btn-ghost, .hero a.btn-ghost { color: #FFFFFF !important; border-color: rgba(255,255,255,0.55) !important; background: transparent !important; }');
        lines.push('.hero .btn-ghost:hover, .hero a.btn-ghost:hover { background: transparent !important; color: #FFFFFF !important; border-color: rgba(255,255,255,0.55) !important; }');
        lines.push('.hero .btn-primary:hover, .hero a.btn-primary:hover, .hero .btn-light:hover, .hero a.btn-light:hover, .hero .btn-yellow:hover, .hero a.btn-yellow:hover { color: ' + onPrimary + ' !important; }');
    }
    if (font) {
        lines.push('html, body, .wrap, section, p, h1, h2, h3, h4, h5, h6, span, div, a, li, button, input, textarea, select { font-family: inherit; }');
        lines.push('html, body { font-family: var(--sans) !important; }');
        lines.push('h1, h2, h3, h4, h5, h6, .htitle, .giant, .brand { font-family: var(--disp) !important; }');
    }
    return lines.join('\n');
}

