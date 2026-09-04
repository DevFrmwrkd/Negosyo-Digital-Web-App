/**
 * ════════════════════════════════════════════════════════════════════════════
 *  HOLDING PAGE — taking a site offline without destroying it
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  Unpublishing used to mean deleting the deployment. It never actually did:
 *  every takedown path deleted a Cloudflare *Pages project*, while publish
 *  deploys a *Worker* (app/api/publish-website/route.ts), so the DELETE 404'd,
 *  the 404 was treated as success, and the site kept serving.
 *
 *  Rather than fix the delete, this replaces it. Unpublishing now redeploys the
 *  SAME Worker with the holding page below. That means:
 *
 *    • The site goes genuinely dark — the content stops being served.
 *    • The Worker name, its workers.dev URL and any custom domain attached to
 *      it (convex/domains.ts attaches domains to the Worker) all survive, so
 *      nothing has to be re-wired to bring the site back.
 *    • Restoring is one publish: the route already reuses
 *      `website.cfPagesProjectName` and redeploys the saved HTML, so the site
 *      returns byte-identical at the same address.
 *
 *  The design was never at risk either way — it lives in Convex
 *  (generatedWebsites.htmlContent / htmlStorageId / websiteContent), never
 *  only in Cloudflare.
 *
 *  Runtime note: this module is imported by BOTH a Next route (Node) and a
 *  Convex action (V8), the way lib/pricing.ts already is. So it uses nothing
 *  but fetch, TextEncoder and strings — no Buffer, no FormData, no node:*.
 */

import { TENDSO_WORDMARK_DATA_URI } from './tendso-wordmark';
import {
    contrastRatio,
    getFontPairing,
    getSchemePalette,
    isDarkColor,
    mixHex,
    resolvePairingId,
    resolveSchemeId,
} from './site-theme';

/** The handful of values the holding page needs to look like the site it replaces. */
export type HoldingTheme = {
    bg: string;
    bg2: string;
    ink: string;
    ink2: string;
    ink3: string;
    rule: string;
    accent: string;
    /** Filter applied to the white wordmark — it is invisible on a light ground. */
    markFilter: string;
    display: string;
    body: string;
};

/** The page's own look, used when a site has no resolvable scheme. */
const DEFAULT_THEME: HoldingTheme = {
    bg: '#1B1B1B',
    bg2: '#161616',
    ink: '#F4F1EA',
    ink2: '#ADA79B',
    ink3: '#6F6B64',
    rule: 'rgba(244, 241, 234, 0.10)',
    accent: '#A6ADEC',
    markFilter: 'none',
    display: 'Georgia, "Iowan Old Style", "Times New Roman", Times, serif',
    body: 'Georgia, "Iowan Old Style", "Times New Roman", Times, serif',
};

const SERIF_STACK = 'Georgia, "Iowan Old Style", "Times New Roman", Times, serif';
const SANS_STACK = 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
const DISPLAY_STACK = '"Arial Narrow", "Helvetica Neue", system-ui, -apple-system, sans-serif';

/**
 * The generated sites load their real faces from Google Fonts. This page cannot:
 * it has to render when the site is gone, so it fetches nothing, and a webfont
 * request would hand the visitor's IP to a third party from a page the owner
 * never asked for. What carries over instead is the CHARACTER of the pairing —
 * a site set in Playfair gets a serif holding page, one set in Space Grotesk
 * gets a sans one — which is the part a visitor actually recognises.
 */
const HEADING_KIND: Record<string, string> = {
    'Playfair Display': SERIF_STACK,
    'Cormorant Garamond': SERIF_STACK,
    Cinzel: SERIF_STACK,
    'Bebas Neue': DISPLAY_STACK,
    Orbitron: DISPLAY_STACK,
    Righteous: DISPLAY_STACK,
};

/** The floor for the one italic word. It is display-sized, so WCAG's large-text
 *  ratio applies rather than the 4.5:1 body-copy one. */
const ACCENT_MIN_CONTRAST = 3;

/**
 * The colour of the italic word.
 *
 * Two failure modes to avoid, and the naive rule hits both. Taking the brand
 * primary on faith fails on the light schemes — the curated orange is 2.9:1 on
 * its own paper, which is a pale word in a 96px headline. Falling back to the
 * ink when it misses is worse: the sites that HAVE a colour are exactly the ones
 * that would lose it, and the emphasis disappears.
 *
 * So the hue is kept and walked toward the ink until it clears the floor — a
 * deeper orange is still recognisably the site's orange. A candidate that is
 * already indistinguishable from the ink is skipped, which is what stops a
 * monochrome scheme from rendering its accent word in the same white as the
 * rest of the sentence.
 */
function pickAccent(primary: string, accent: string, ink: string, bg: string): string {
    for (const candidate of [primary, accent]) {
        if (contrastRatio(candidate, ink) < 1.3) continue; // it IS the ink
        if (contrastRatio(candidate, bg) >= ACCENT_MIN_CONTRAST) return candidate;
        // Walk it toward the ink in tenths, keeping as much of the hue as the
        // contrast floor allows.
        for (let keep = 0.9; keep > 0; keep -= 0.1) {
            const mixed = mixHex(candidate, ink, keep);
            if (contrastRatio(mixed, bg) >= ACCENT_MIN_CONTRAST) return mixed;
        }
    }
    return ink;
}

/**
 * Work out what the site looked like, from what the site was built with.
 *
 * Reads the same two fields the astro build reads (lib/astro-builder.ts:356-357)
 * and resolves them through the same tables, so the holding page and the site it
 * replaces agree about the palette. Returns the page's own dark look when the
 * scheme is unknown — which is what 'auto' means for an unrecognised business
 * type, and what every pre-scheme site has.
 */
export function resolveHoldingTheme(
    customizations: Record<string, unknown> | null | undefined,
    businessType?: string | null,
): HoldingTheme {
    const custom = (customizations || {}) as {
        colorSchemeId?: string;
        colorScheme?: string;
        fontPairingId?: string;
        fontPairing?: string;
    };
    const palette = getSchemePalette(resolveSchemeId(custom, businessType));
    const pairing = getFontPairing(resolvePairingId(custom));

    const display = pairing ? HEADING_KIND[pairing.heading] || SANS_STACK : DEFAULT_THEME.display;
    const body = pairing ? SANS_STACK : DEFAULT_THEME.body;

    if (!palette) return { ...DEFAULT_THEME, display, body };

    const bg = palette.paper;
    const onLight = !isDarkColor(bg);

    const accent = pickAccent(palette.primary, palette.accent, palette.ink, bg);

    return {
        bg,
        bg2: palette.card,
        ink: palette.ink,
        ink2: palette.inkSoft,
        ink3: mixHex(palette.inkSoft, bg, 0.55),
        rule: palette.line,
        accent,
        // The wordmark asset is white. On a light ground brightness(0) turns it
        // solid black; on a dark one it is already right.
        markFilter: onLight ? 'brightness(0)' : 'none',
        display,
        body,
    };
}

/** Escape a string for safe embedding inside a JS template literal. */
function escapeForTemplateLiteral(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/** Escape a string for safe embedding in HTML text/attribute content. */
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** One run of the ticker, repeated to fill the strip. */
const TICKER_PHRASE = 'Maintenance in progress';

/** Half of the ticker track. The track holds this twice, which is what makes a
 *  -50% translation loop seamlessly instead of snapping. */
const TICKER_RUN = Array.from(
    { length: 8 },
    () => `<span class="tick">${TICKER_PHRASE}</span><span class="dot-sep">&middot;</span>`,
).join('');

/**
 * The page a visitor sees while a site is offline.
 *
 * Self-contained by rule: nothing here is FETCHED. This page has to render when
 * everything else about the site is gone, so it cannot hold a reference that
 * could 404, and a webfont request would leak the visit to a third party from a
 * page the owner did not ask for. The display face is therefore a system serif
 * stack, and the wordmark is inlined as a data URI rather than linked — the
 * Worker serving this has no /public, and it answers on a domain that is not
 * this app's.
 *
 * Nothing here is specific to the site it replaces beyond the business name,
 * and there is deliberately no contact affordance: the owner's phone and email
 * are the site's, and this page outlives the site's own contact details.
 */
export function holdingPageHtml(businessName: string, theme: HoldingTheme = DEFAULT_THEME): string {
    const name = escapeHtml((businessName || '').trim());
    const title = name ? `${name} — temporarily unavailable` : 'Temporarily unavailable';
    const t = theme;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  :root {
    color-scheme: ${isDarkColor(t.bg) ? 'dark' : 'light'};
    --bg: ${t.bg};
    --bg-2: ${t.bg2};
    --ink: ${t.ink};
    --ink-2: ${t.ink2};
    --ink-3: ${t.ink3};
    --accent: ${t.accent};
    --rule: ${t.rule};
    --serif: ${t.display};
    --sans: ${t.body};
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    --mark-filter: ${t.markFilter};
  }
  * { box-sizing: border-box; }
  html { height: 100%; }
  /* One screen, never a scroll. The page is pinned to the viewport and every
     size below is capped in vh as well as vw, so on a short window the type
     shrinks instead of pushing the ticker off the bottom. dvh keeps that true
     on mobile, where the browser chrome slides away and 100vh overshoots. */
  body {
    margin: 0;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--sans);
    -webkit-font-smoothing: antialiased;
  }
  .wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: clamp(20px, 4vh, 52px) clamp(24px, 6vw, 72px);
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  /* The wordmark is the real asset, not letterspaced type pretending to be it.
     Height-driven so it scales with the rest of the page; width follows the
     298x70 aspect on its own. */
  .mark {
    display: block;
    height: max(18px, min(2.6vw, 3.2vh, 26px));
    width: auto;
    filter: var(--mark-filter);
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .status .led {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--ink-2);
    animation: pulse 2.4s ease-in-out infinite;
  }
  /* No ch measure on this container. The ch unit resolves against the
     element's OWN font-size, and this one inherits the 16px body sans — so a
     22ch cap here was ~190px wide while the headline inside it ran at 96px,
     and the heading came out one word per line. Each block sets its own
     measure below, where ch means what it looks like it means. */
  .main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: min(92vw, 1120px);
    padding: clamp(16px, 4vh, 72px) 0;
  }
  /* This is the one line a visitor actually needs — it tells them they reached
     the right place. It used to cap at 12px, which meant it was the only thing
     on the page that stopped growing while the headline ran on to 96px, and it
     read as a caption on somebody else's page. It scales with everything else
     now, still an eyebrow, no longer a footnote. */
  .biz {
    margin: 0 0 clamp(12px, 2.4vh, 30px);
    font-family: var(--mono);
    font-size: max(11px, min(1.05vw, 2vh, 16px));
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    margin: 0;
    font-family: var(--serif);
    font-weight: 400;
    /* vh is in the min() on purpose: a laptop in a short window is the case
       that used to overflow, and there the height is the binding constraint,
       not the width. */
    font-size: max(1.9rem, min(8.5vw, 10.5vh, 6rem));
    line-height: 0.98;
    letter-spacing: -0.02em;
    /* Measured against the headline's own size, so it holds at every scale:
       "This website is" fills the first line, then the two long words take
       theirs. Deliberately NOT text-wrap: balance — balancing evens the line
       lengths out and steals "is" down to the second line. */
    max-width: 15ch;
  }
  h1 em {
    font-style: italic;
    color: var(--accent);
  }
  .lede {
    margin: clamp(14px, 3vh, 38px) 0 0;
    max-width: 46ch;
    font-family: var(--serif);
    font-size: max(0.9rem, min(2.2vw, 2.6vh, 1.2rem));
    line-height: 1.5;
    color: var(--ink-2);
  }
  .ticker {
    flex: none;
    overflow: hidden;
    border-top: 1px solid var(--rule);
    background: var(--bg-2);
    padding: clamp(10px, 1.8vh, 18px) 0;
  }
  .ticker-track {
    display: flex;
    width: max-content;
    white-space: nowrap;
    animation: marquee 34s linear infinite;
    will-change: transform;
  }
  .tick, .dot-sep {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .tick { padding: 0 18px; }
  .dot-sep { opacity: 0.5; }
  @keyframes marquee {
    from { transform: translate3d(0, 0, 0); }
    to   { transform: translate3d(-50%, 0, 0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.25; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ticker-track { animation: none; }
    .status .led  { animation: none; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <img class="mark" src="${TENDSO_WORDMARK_DATA_URI}" alt="Tendso" width="298" height="70">

      <span class="status"><span class="led"></span>Maintenance</span>
    </header>
    <main class="main">
      ${name ? `<p class="biz">${name}</p>` : ''}
      <h1>This website is <em>temporarily</em> unavailable</h1>
      <p class="lede">It is offline for the moment while work is carried out. Please check back soon.</p>
    </main>
  </div>
  <div class="ticker" aria-hidden="true">
    <div class="ticker-track">${TICKER_RUN}${TICKER_RUN}</div>
  </div>
</body>
</html>`;
}

/**
 * Deploy the holding page over an existing Worker, keeping its name and URL.
 *
 * Serves HTTP 503 with Retry-After so search engines treat the outage as
 * temporary and keep the real page's ranking instead of indexing this one.
 *
 * Throws on any non-2xx from Cloudflare. Callers MUST let that propagate:
 * marking a site offline in the database when the deploy failed is exactly the
 * lie this whole change exists to remove.
 */
export async function deployHoldingPage(
    apiToken: string,
    accountId: string,
    workerName: string,
    businessName: string,
    theme?: HoldingTheme,
): Promise<void> {
    const html = escapeForTemplateLiteral(holdingPageHtml(businessName, theme));

    const workerScript = `
export default {
  async fetch() {
    return new Response(\`${html}\`, {
      status: 503,
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "cache-control": "no-store",
        "retry-after": "86400",
        "x-robots-tag": "noindex",
      },
    });
  },
};
`;

    const metadata = JSON.stringify({
        main_module: 'worker.js',
        compatibility_date: '2024-01-01',
    });

    // Hand-rolled multipart: every part is text, so the whole body is one
    // string and no Buffer/Blob is needed on either runtime. The boundary is
    // fixed rather than timestamped because Convex forbids Date.now() at the
    // module level and a constant is just as valid — it only has to not appear
    // in the payload.
    const boundary = '----TendsoHoldingPageDeploy';
    const body =
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="metadata"; filename="metadata.json"\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n` +
        `Content-Type: application/javascript+module\r\n\r\n` +
        `${workerScript}\r\n` +
        `--${boundary}--\r\n`;

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body,
        },
    );

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(
            `Cloudflare refused the holding-page deploy for "${workerName}" (HTTP ${response.status})${detail ? `: ${detail.slice(0, 400)}` : ''}`,
        );
    }
}
