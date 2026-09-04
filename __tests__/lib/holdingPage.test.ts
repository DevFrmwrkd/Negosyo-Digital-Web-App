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
import { deployHoldingPage, holdingPageHtml } from "@/lib/holding-page";

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
    it("names the business", () => {
        expect(holdingPageHtml("Kubo Stays")).toContain("Kubo Stays is temporarily unavailable");
    });

    it("falls back to a neutral phrase rather than rendering an empty sentence", () => {
        expect(holdingPageHtml("")).toContain("This website is temporarily unavailable");
        expect(holdingPageHtml("   ")).toContain("This website is temporarily unavailable");
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
        expect(html).not.toMatch(/<img/i);
        expect(html).not.toMatch(/https?:\/\//);
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
