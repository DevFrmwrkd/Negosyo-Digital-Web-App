/**
 * The favicon has to survive TWO hops to reach a published page, and it was
 * being dropped at the first one.
 *
 *   1. app/api/generate-website builds `contentWithContact` — an explicit
 *      WHITELIST of keys, not a spread — and passes it to buildAstroSite.
 *   2. lib/astro-builder maps content.favicon → layout.favicon, which every
 *      template guards its <link rel="icon"> and its og:image on.
 *
 * Hop 2 always worked. Hop 1 never listed `favicon`, so layout.favicon was
 * undefined on every build of every template: an admin set a favicon, watched
 * it save with a thumbnail in the Media card, published, and got the browser's
 * default globe. Confirmed on a live workers.dev page, whose head carried
 * title, description and og:title/og:description — and neither of these two.
 *
 * Hop 2 is testable directly. Hop 1 lives inside a Next route handler, so it is
 * asserted at the source level: cheap, and it catches exactly the failure that
 * happened — a key quietly missing from a hand-maintained whitelist.
 */
import fs from "node:fs";
import path from "node:path";
import { transformToAstroData } from "@/lib/astro-builder";

const FAV = "https://pub-x.r2.dev/favicon.png";

describe("hop 2 — the builder maps the favicon onto layout", () => {
    const build = async (extra: Record<string, unknown>) => {
        const out: any = await transformToAstroData(
            {
                business_name: "Aurora Villa",
                business_type: "hospitality",
                business_city: "Iloilo",
                location: { lat: 10.7, lng: 122.5 },
                ...extra,
            } as never,
            {} as never,
            [],
        );
        return out?.layout ?? {};
    };

    it("carries content.favicon through to layout.favicon", async () => {
        expect((await build({ favicon: FAV })).favicon).toBe(FAV);
    });

    it("falls back to the favicon for the social card when no ogImage is set", async () => {
        expect((await build({ favicon: FAV })).ogImage).toBe(FAV);
    });

    it("leaves both undefined when the owner set neither — no invented icon", async () => {
        const layout = await build({});
        expect(layout.favicon).toBeUndefined();
        expect(layout.ogImage).toBeUndefined();
    });
});

describe("hop 1 — the generate-website whitelist", () => {
    const source = fs.readFileSync(
        path.join(process.cwd(), "app/api/generate-website/route.ts"),
        "utf8",
    );

    it("copies favicon and ogImage onto the object it builds from", () => {
        // The regression: neither name appeared anywhere in the file, so both
        // were dropped between a successful save and the build.
        expect(source).toContain("favicon: (extractedContent as any)?.favicon");
        expect(source).toContain("ogImage: (extractedContent as any)?.ogImage");
    });
});
