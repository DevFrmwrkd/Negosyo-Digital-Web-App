/**
 * Unpublishing never took a site down.
 *
 * Sites are published as Cloudflare Workers — `PUT /accounts/{id}/workers/
 * scripts/{name}` (app/api/publish-website/route.ts). Every takedown path
 * deleted a Cloudflare *Pages project* instead — `DELETE /accounts/{id}/pages/
 * projects/{name}` — which 404s for a Worker. All four call sites treated 404
 * as "already gone, fine", updated the database and reported success, so the
 * admin button, the three-day non-payment cron and the delete flow all left the
 * site serving indefinitely.
 *
 * The first two tests below are the ones that matter: they pin the endpoint and
 * the method. If someone reaches for the Pages API again, they fail here rather
 * than in production, silently, months later.
 *
 * The rest pin the escaping. The holding page is embedded in a Worker script as
 * a template literal, so a business name carrying a backtick or `${` would
 * otherwise break the deploy or execute — and every business name on this
 * platform is typed in by a stranger.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { deployHoldingPage, holdingPageHtml, resolveHoldingTheme } from "@/lib/holding-page";
import { SCHEMES, contrastRatio } from "@/lib/site-theme";

const TOKEN = "cf-token";
const ACCOUNT = "acct-123";

type FetchCall = { url: string; init: RequestInit };

function mockFetch(response: Partial<Response> = {}) {
    const calls: FetchCall[] = [];
    const impl = jest.fn(async (url: unknown, init: unknown) => {
        calls.push({ url: String(url), init: (init || {}) as RequestInit });
        return {
            ok: true,
            status: 200,
            text: async () => "",
            ...response,
        } as Response;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = impl;
    return calls;
}

afterEach(() => {
    jest.restoreAllMocks();
});

describe("the endpoint the takedown must hit", () => {
    it("PUTs the Workers script API, because that is what publish deployed", async () => {
        const calls = mockFetch();

        await deployHoldingPage(TOKEN, ACCOUNT, "kubo-stays", "Kubo Stays");

        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/kubo-stays`
        );
        expect(calls[0].init.method).toBe("PUT");
    });

    it("never touches the Pages API — the call that silently did nothing", async () => {
        const calls = mockFetch();

        await deployHoldingPage(TOKEN, ACCOUNT, "kubo-stays", "Kubo Stays");

        expect(calls[0].url).not.toContain("/pages/projects/");
    });

    it("throws on a Cloudflare refusal, so nothing gets marked offline while it is still live", async () => {
        mockFetch({ ok: false, status: 403, text: async () => "Authentication error" });

        await expect(
            deployHoldingPage(TOKEN, ACCOUNT, "kubo-stays", "Kubo Stays")
        ).rejects.toThrow(/403/);
    });

    it("sends the script as multipart with a matching boundary", async () => {
        const calls = mockFetch();

        await deployHoldingPage(TOKEN, ACCOUNT, "kubo-stays", "Kubo Stays");

        const contentType = (calls[0].init.headers as Record<string, string>)["Content-Type"];
        const boundary = contentType.split("boundary=")[1];
        expect(boundary).toBeTruthy();
        expect(String(calls[0].init.body)).toContain(`--${boundary}`);
        expect(String(calls[0].init.body)).toContain(`--${boundary}--`);
    });

    it("serves 503, not 200 — the outage is temporary and the ranking should survive it", async () => {
        const calls = mockFetch();

        await deployHoldingPage(TOKEN, ACCOUNT, "kubo-stays", "Kubo Stays");

        expect(String(calls[0].init.body)).toContain("status: 503");
        expect(String(calls[0].init.body)).toContain("retry-after");
    });
});

describe("the holding page itself", () => {
    it("names the business above the headline", () => {
        const html = holdingPageHtml("Kubo Stays");
        expect(html).toContain('<p class="biz">Kubo Stays</p>');
        expect(html).toContain("This website is <em>temporarily</em> unavailable");
    });

    it("drops the business line entirely when there is no name, rather than printing an empty one", () => {
        for (const blank of ["", "   "]) {
            const html = holdingPageHtml(blank);
            expect(html).not.toContain('class="biz"');
            expect(html).toContain("This website is <em>temporarily</em> unavailable");
            expect(html).toContain("<title>Temporarily unavailable</title>");
        }
    });

    it("keeps itself out of the index", () => {
        expect(holdingPageHtml("Kubo Stays")).toContain('name="robots" content="noindex"');
    });

    it("escapes a business name that carries markup", () => {
        const html = holdingPageHtml('<script>alert("x")</script>');
        expect(html).not.toContain("<script>alert");
        expect(html).toContain("&lt;script&gt;");
    });

    it("has no external dependencies — it must render with the network hostile", () => {
        const html = holdingPageHtml("Kubo Stays");
        expect(html).not.toMatch(/<link[^>]+href=/i);
        expect(html).not.toMatch(/https?:\/\//);

        // An image is allowed only if the page carries it. The Worker serving
        // this has no /public, and it answers on a domain that is not this
        // app's, so `src="/tendso-logo.png"` would be a broken image.
        const srcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
        expect(srcs).toHaveLength(1);
        expect(srcs[0].startsWith("data:image/")).toBe(true);
    });

    /** The wordmark is the brand asset, not a letterspaced imitation of it. If
     *  the logo is ever redrawn, this fails until the inlined copy is regenerated
     *  — otherwise the offline page would quietly keep serving the old mark. */
    it("carries the same wordmark the landing page uses, byte for byte", () => {
        const html = holdingPageHtml("Kubo Stays");
        const base64 = html.match(/<img[^>]+src="data:image\/png;base64,([^"]+)"/)?.[1];
        expect(base64).toBeTruthy();

        const inlined = Buffer.from(base64 as string, "base64");
        const onDisk = readFileSync(join(__dirname, "..", "..", "public", "tendso-logo.png"));
        expect(inlined.equals(onDisk)).toBe(true);
    });

    it("offers no contact action — this page outlives the contact details the site carried", () => {
        const html = holdingPageHtml("Kubo Stays");
        expect(html).not.toMatch(/<a\b/i);
        expect(html).not.toMatch(/<button\b/i);
        expect(html).not.toMatch(/mailto:|tel:/i);
    });
});

describe("fitting the viewport", () => {
    /** It replaces a whole website with one statement. A scrollbar on it reads
     *  as a broken page, and on a phone it would hide the ticker entirely. */
    it("is pinned to one screen and cannot scroll", () => {
        const html = holdingPageHtml("Kubo Stays");
        expect(html).toMatch(/height:\s*100dvh/);
        expect(html).toMatch(/overflow:\s*hidden/);
    });

    it("caps the headline against height as well as width, so a short window shrinks it instead of clipping", () => {
        const html = holdingPageHtml("Kubo Stays");
        expect(html).toMatch(/font-size:\s*max\([^)]*min\([^)]*vh[^)]*\)/);
    });
});

describe("wearing the site's own colours", () => {
    /** The whole point of theming it: an offline site should still look like
     *  itself. Every curated palette has to survive the trip. */
    it.each(Object.keys(SCHEMES))("keeps the italic word legible on the %s palette", (scheme) => {
        const theme = resolveHoldingTheme({ colorSchemeId: scheme });
        const palette = SCHEMES[scheme];

        expect(theme.bg).toBe(palette.paper);
        expect(theme.ink).toBe(palette.ink);
        // Display-sized text, so WCAG's large-text floor is the bar.
        expect(contrastRatio(theme.accent, theme.bg)).toBeGreaterThanOrEqual(3);
    });

    /** The curated orange is 2.9:1 on its own paper. The tempting fix — drop
     *  back to the ink when a colour misses — silently strips the accent from
     *  every warm palette, which is most of them. It gets deepened instead. */
    it("deepens a colour that misses the floor instead of discarding it", () => {
        const theme = resolveHoldingTheme({ colorSchemeId: "orange" });
        expect(theme.accent).not.toBe(SCHEMES.orange.ink);
        expect(theme.accent).not.toBe(SCHEMES.orange.primary);
        expect(contrastRatio(theme.accent, theme.bg)).toBeGreaterThanOrEqual(3);
    });

    /** A monochrome scheme's "primary" IS its ink. Taking it would render the
     *  emphasised word in the same colour as the sentence around it. */
    it("skips an accent that is indistinguishable from the ink", () => {
        const theme = resolveHoldingTheme({ colorSchemeId: "black" });
        expect(theme.accent).not.toBe(theme.ink);
        expect(contrastRatio(theme.accent, theme.bg)).toBeGreaterThanOrEqual(3);
    });

    /** The wordmark asset is white. On a light palette it would simply vanish. */
    it("inverts the wordmark on a light ground and leaves it alone on a dark one", () => {
        expect(resolveHoldingTheme({ colorSchemeId: "whitegold" }).markFilter).toBe("brightness(0)");
        expect(resolveHoldingTheme({ colorSchemeId: "black" }).markFilter).toBe("none");
    });

    it("resolves an 'auto' scheme from the business type, the way the build does", () => {
        const auto = resolveHoldingTheme({ colorSchemeId: "auto" }, "barbershop");
        expect(auto.bg).toBe(SCHEMES.brown.paper);
    });

    it("falls back to its own look when the scheme is unknown", () => {
        const unknown = resolveHoldingTheme({ colorSchemeId: "not-a-scheme" }, "not-a-business");
        expect(unknown.bg).toBe("#1B1B1B");
    });

    /** The real faces are Google-hosted and this page fetches nothing, so what
     *  carries over is serif-ness, not the exact font. */
    it("inherits the character of the font pairing without fetching it", () => {
        const serifSite = resolveHoldingTheme({ colorSchemeId: "gold", fontPairingId: "classic" });
        const sansSite = resolveHoldingTheme({ colorSchemeId: "gold", fontPairingId: "modern" });

        expect(serifSite.display).toMatch(/serif/);
        expect(sansSite.display).not.toMatch(/Georgia/);

        const html = holdingPageHtml("Kubo Stays", serifSite);
        expect(html).not.toMatch(/https?:\/\//);
    });
});

describe("where the line measure lives", () => {
    /** `ch` resolves against the element's OWN font-size. Put the measure on the
     *  flex container — which inherits the 16px body sans — and a 22ch cap is
     *  ~190px wide while the headline inside runs at 96px, so the heading breaks
     *  one word per line. The measure belongs on the text itself. */
    it("measures the headline on the headline, not on its container", () => {
        const html = holdingPageHtml("Kubo Stays");

        const mainBlock = html.match(/\.main\s*\{([^}]*)\}/)?.[1] ?? "";
        expect(mainBlock).toContain("max-width");
        expect(mainBlock).not.toMatch(/max-width:[^;]*\bch\b/);

        const h1Block = html.match(/\n\s*h1\s*\{([^}]*)\}/)?.[1] ?? "";
        expect(h1Block).toMatch(/max-width:\s*\d+ch/);
    });
});

describe("the ticker", () => {
    /** The track is translated -50%, so it only loops seamlessly if the run it
     *  holds appears exactly twice. Halve the repeats and the strip visibly
     *  snaps back every cycle. */
    it("repeats its run twice, which is what -50% relies on", () => {
        const html = holdingPageHtml("Kubo Stays");
        const runs = html.match(/Maintenance in progress/g) || [];
        expect(runs.length).toBeGreaterThanOrEqual(2);
        expect(runs.length % 2).toBe(0);
        expect(html).toContain("translate3d(-50%, 0, 0)");
    });

    it("scrolls", () => {
        const html = holdingPageHtml("Kubo Stays");
        expect(html).toMatch(/animation:\s*marquee\s+[\d.]+s\s+linear\s+infinite/);
        expect(html).toContain("@keyframes marquee");
    });

    it("holds still for a visitor who asked for less motion", () => {
        const html = holdingPageHtml("Kubo Stays");
        expect(html).toContain("prefers-reduced-motion: reduce");
        expect(html).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*\.ticker-track\s*\{\s*animation:\s*none/);
    });

    it("is hidden from screen readers — it is decoration, and it repeats", () => {
        expect(holdingPageHtml("Kubo Stays")).toContain('class="ticker" aria-hidden="true"');
    });
});

describe("a business name that would break the Worker script", () => {
    it("escapes backticks, so the template literal holding the HTML cannot be closed early", async () => {
        const calls = mockFetch();

        await deployHoldingPage(TOKEN, ACCOUNT, "worker", "Kubo `Stays`");

        const body = String(calls[0].init.body);
        // Every backtick from the business name arrives escaped; the only bare
        // backticks left are the two the script itself opens and closes with.
        expect(body).toContain("Kubo \\`Stays\\`");
    });

    it("escapes ${, so a name cannot interpolate into the deployed script", async () => {
        const calls = mockFetch();

        await deployHoldingPage(TOKEN, ACCOUNT, "worker", "Kubo ${process.env} Stays");

        expect(String(calls[0].init.body)).toContain("\\${process.env}");
    });
});
