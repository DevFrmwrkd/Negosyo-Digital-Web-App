/**
 * A block stored as a BARE ARRAY used to lose its heading.
 *
 * normalizeBlock() accepts either shape — the wrapper {tag, headline, items[]}
 * or the legacy bare array — but an array has no wrapper to preserve, so it
 * returned {items:[…]} and nothing else. Paired with `c.faq ?? derived.faq`,
 * every site whose FAQ was stored unwrapped rendered its questions under no
 * eyebrow and no headline, on every template.
 *
 * These tests pin the fix AND the line it must not cross: a missing heading is
 * filled from the derived layer, missing ITEMS never are.
 */
import { transformToAstroData } from "@/lib/astro-builder";

/**
 * The smallest content the transform accepts, plus whatever is under test.
 * lat/lng are supplied so the geocoder never reaches the network.
 */
const base = (content: Record<string, unknown>) => ({
    business_name: "Villa Marindu",
    business_type: "hospitality",
    business_city: "El Nido",
    location: { lat: 11.1949, lng: 119.4013 },
    ...content,
});

const build = async (content: Record<string, unknown>) => {
    const out: any = await transformToAstroData(base(content) as never, {} as never, []);
    return out?.content ?? {};
};

describe("a block stored as a bare array keeps its heading", () => {
    it("FAQ: questions survive AND the derived eyebrow/headline are restored", async () => {
        const c = await build({
            faq: [
                { q: "How do I book the villa?", a: "Tap any contact button." },
                { q: "Do I pay through this site?", a: "No — enquiries only." },
            ],
        });
        expect(Array.isArray(c.faq?.items)).toBe(true);
        expect(c.faq.items).toHaveLength(2);
        expect(c.faq.items[0].q).toBe("How do I book the villa?");
        // The regression: these were both undefined.
        expect(c.faq.tag).toBeTruthy();
        expect(c.faq.headline).toBeTruthy();
    });

    it("the owner's own heading always wins over the derived one", async () => {
        const c = await build({
            faq: { tag: "Good to know", headline: "Often asked", items: [{ q: "Q", a: "A" }] },
        });
        expect(c.faq.tag).toBe("Good to know");
        expect(c.faq.headline).toBe("Often asked");
    });

    it("why and how keep their headings when stored unwrapped", async () => {
        const c = await build({
            why: [{ title: "One price, said once", body: "The rate is the rate." }],
            how: [{ title: "Message me", body: "Send your dates." }],
        });
        expect(c.why.tag || c.why.headline).toBeTruthy();
        expect(c.why.items).toHaveLength(1);
        expect(c.how.tag || c.how.headline).toBeTruthy();
        expect((c.how.steps ?? c.how.items)).toHaveLength(1);
    });
});

describe("keepHead never invents content", () => {
    it("a block the owner never supplied stays absent — no heading over nothing", async () => {
        const c = await build({});
        // testimonials and credentials have no derived items by design: quotes
        // and licences are claims only the business may make.
        expect(c.testimonials == null || (c.testimonials.items ?? []).length === 0).toBe(true);
        expect(c.credentials == null || (c.credentials.items ?? []).length === 0).toBe(true);
    });

    it("an emptied list is not refilled from the derived layer", async () => {
        const c = await build({ faq: { tag: "Good to know", headline: "Often asked", items: [] } });
        // The owner deleted their questions. They must stay deleted — restoring
        // the derived ones would put words in the business's mouth.
        expect(c.faq.items).toEqual([]);
        expect(c.faq.tag).toBe("Good to know");
    });

    it("testimonials with real quotes keep them and gain no invented ones", async () => {
        const c = await build({
            testimonials: [{ quote: "Four families, one villa.", who: "Denise R." }],
        });
        expect(c.testimonials.items).toHaveLength(1);
        expect(c.testimonials.items[0].quote).toBe("Four families, one villa.");
    });
});
