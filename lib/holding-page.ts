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

/**
 * The page a visitor sees while a site is offline.
 *
 * Deliberately plain and self-contained: no external CSS, fonts or images, so
 * it cannot break, and nothing about it depends on the site it replaces beyond
 * the business name.
 */
export function holdingPageHtml(businessName: string): string {
    const name = escapeHtml((businessName || '').trim()) || 'This website';
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${name} — temporarily unavailable</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    background: #F8F5EE; color: #1B1C24;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card {
    max-width: 460px; width: 100%; text-align: center;
    background: #FCFAF5; border: 1px solid #E0D8C9; border-radius: 24px;
    padding: 40px 28px;
  }
  h1 { margin: 0 0 12px; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
  p  { margin: 0; font-size: 15px; line-height: 1.55; color: #3C3F4A; }
  .mark { margin-top: 28px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #7A7E8A; }
</style>
</head>
<body>
  <main class="card">
    <h1>${name} is temporarily unavailable</h1>
    <p>This website is offline for the moment. Please check back soon.</p>
    <div class="mark">Tendso</div>
  </main>
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
): Promise<void> {
    const html = escapeForTemplateLiteral(holdingPageHtml(businessName));

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
