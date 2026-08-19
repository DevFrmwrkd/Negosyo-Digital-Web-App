/**
 * The editor's Sections panel used to describe every template with the same
 * fourteen internal block names in ALL_BLOCKS declaration order. It is now
 * driven by sectionsForTemplate(), which reads membership and order from the
 * generated manifest and names from the per-template label table.
 *
 * scripts/check-template-blocks.mjs guards the manifest against the .astro
 * wrappers. These tests guard the FUNCTION — that it returns page order, uses
 * the template's own names, falls back sanely, and never invents a toggle.
 */
import {
    sectionsForTemplate,
    blocksForTemplate,
} from "@/components/editor/templateCatalog";
import { TEMPLATE_SECTION_ORDER } from "@/components/editor/templateSectionOrder.generated";
import {
    TEMPLATE_SECTION_LABELS,
    DEFAULT_SECTION_LABELS,
} from "@/components/editor/templateSectionLabels";
import {
    ALL_BLOCKS,
    CURATED,
    CURATED_BY_TEMPLATE,
    schemesForTemplate,
} from "@/components/editor/editorConstants";
import {
    GENERIC_CONTENT_SCHEMA,
    GROUP_BLOCK,
} from "@/components/editor/genericContentSchema";

describe("sectionsForTemplate", () => {
    it("returns the template's sections in the order the page renders them", () => {
        // Kubo Stays leads with the rooms and puts the promises straight after
        // the host — nothing like ALL_BLOCKS order, which is the whole point.
        expect(sectionsForTemplate("hospitality:BJ").map((s) => s.block)).toEqual([
            "HERO", "TRUST", "SERVICES", "WHY-US", "GALLERY", "ABOUT", "CREDENTIALS",
            "HOW-IT-WORKS", "TESTIMONIALS", "SERVICE-AREA", "LOCATION", "FAQ",
            "CTA-BAND", "FOOTER",
        ]);
    });

    it("differs between templates — the panel is not one fixed list", () => {
        const bj = sectionsForTemplate("hospitality:BJ").map((s) => s.block);
        const a = sectionsForTemplate("generic:A").map((s) => s.block);
        expect(a).not.toEqual(bj);
        // generic:A opens with a marquee and has no credentials section at all.
        expect(a).toContain("MARQUEE");
        expect(a).not.toContain("CREDENTIALS");
        expect(bj).not.toContain("MARQUEE");
        expect(bj).toContain("CREDENTIALS");
    });

    it("uses the template's own name for a section, not the internal one", () => {
        const byBlock = Object.fromEntries(
            sectionsForTemplate("hospitality:BJ").map((s) => [s.block, s.label]),
        );
        expect(byBlock["SERVICES"]).toBe("The rooms");
        expect(byBlock["WHY-US"]).toBe("The house");
        expect(byBlock["ABOUT"]).toBe("Your host");
        expect(byBlock["CREDENTIALS"]).toBe("The promises");
        expect(byBlock["LOCATION"]).toBe("Getting here");
        expect(byBlock["FAQ"]).toBe("Good to know");
    });

    it("lists Villa Marindu in the order its design draws, under its own names", () => {
        const rows = sectionsForTemplate("hospitality:BK");
        expect(rows.map((s) => s.block)).toEqual([
            "HERO", "TRUST", "ABOUT", "SERVICES", "WHY-US", "GALLERY", "HOW-IT-WORKS",
            "TESTIMONIALS", "CREDENTIALS", "LOCATION", "SERVICE-AREA", "FAQ",
            "CTA-BAND", "FOOTER",
        ]);
        const byBlock = Object.fromEntries(rows.map((s) => [s.block, s.label]));
        expect(byBlock["ABOUT"]).toBe("The villa");
        expect(byBlock["SERVICES"]).toBe("What's included");
        expect(byBlock["WHY-US"]).toBe("Why book direct");
        expect(byBlock["SERVICE-AREA"]).toBe("What's nearby");
    });

    it("falls back to the generic label for a template with no entry of its own", () => {
        const some = Object.keys(TEMPLATE_SECTION_ORDER).find(
            (c) => !TEMPLATE_SECTION_LABELS[c],
        );
        expect(some).toBeDefined();
        const rows = sectionsForTemplate(some!);
        expect(rows.length).toBeGreaterThan(0);
        for (const r of rows) {
            expect(r.label).toBe(DEFAULT_SECTION_LABELS[r.block]?.label);
            expect(r.blurb.length).toBeGreaterThan(0);
        }
    });

    it("every section it returns has a real toggle behind it", () => {
        const visKeys = new Set(ALL_BLOCKS.map((b) => b.name));
        for (const code of Object.keys(TEMPLATE_SECTION_ORDER))
            for (const s of sectionsForTemplate(code))
                expect(visKeys.has(s.block)).toBe(true);
    });

    it("never returns an empty label or a bare internal name as the label", () => {
        for (const code of Object.keys(TEMPLATE_SECTION_ORDER))
            for (const s of sectionsForTemplate(code)) {
                expect(s.label.trim()).not.toBe("");
                // A hyphenated internal name reaching the panel ("WHY-US",
                // "CTA-BAND", "SERVICE-AREA") means both tables missed this block
                // and the raw constant leaked through to the admin. "FAQ" is
                // exempt on purpose: it is genuinely what the section is called.
                expect(s.label).not.toMatch(/^[A-Z]+-[A-Z-]+$/);
            }
    });

    it("over-offers rather than hides for an unknown template code", () => {
        // A newly added template whose manifest has not been regenerated must not
        // silently lose every toggle — the admin can see the sections on the page.
        const unknown = sectionsForTemplate("nosuch:ZZ");
        expect(unknown.length).toBeGreaterThan(0);
        expect(blocksForTemplate("nosuch:ZZ").size).toBeGreaterThan(0);
        expect(blocksForTemplate(undefined).size).toBeGreaterThan(0);
    });

    it("blocksForTemplate agrees with sectionsForTemplate", () => {
        for (const code of Object.keys(TEMPLATE_SECTION_ORDER)) {
            const set = blocksForTemplate(code);
            const list = sectionsForTemplate(code).map((s) => s.block);
            expect([...set].sort()).toEqual([...list].sort());
        }
    });
});

describe("GROUP_BLOCK (the Content panel's group -> section map)", () => {
    it("maps every content group except the header to a real block", () => {
        const realBlocks = new Set(ALL_BLOCKS.map((b) => b.name));
        for (const [groupId, block] of Object.entries(GROUP_BLOCK)) {
            expect(groupId).not.toBe("header");
            expect(realBlocks.has(block)).toBe(true);
        }
    });

    it("leaves no schema group silently always-shown except the header", () => {
        // A group with no entry here is never filtered out. That is correct for
        // the header (no wrapper gates on it) and a bug for anything else — it
        // would keep offering fields for a section the template does not render.
        const unmapped = GENERIC_CONTENT_SCHEMA.map((g) => g.id).filter((id) => !GROUP_BLOCK[id]);
        expect(unmapped).toEqual(["header"]);
    });

    it("covers every block the templates render, so no section loses its fields", () => {
        const mapped = new Set(Object.values(GROUP_BLOCK));
        const rendered = new Set<string>();
        for (const list of Object.values(TEMPLATE_SECTION_ORDER))
            for (const b of list) rendered.add(b);
        for (const b of rendered) expect(mapped.has(b)).toBe(true);
    });
});

describe("schemesForTemplate (per-template colour narrowing)", () => {
    it("returns the family list when a template narrows nothing", () => {
        expect(schemesForTemplate("hospitality", "hospitality:BJ")).toEqual(CURATED.hospitality);
    });

    it("narrows, and can only ever narrow", () => {
        const family = CURATED.hospitality;
        const narrowed = schemesForTemplate("hospitality", "hospitality:BK");
        expect(narrowed.length).toBeLessThan(family.length);
        for (const id of narrowed) expect(family).toContain(id);
        // The point of the entry: brass on near-black cannot survive maroon.
        expect(narrowed).not.toContain("maroon");
    });

    it("cannot smuggle in a scheme the family disallows", () => {
        for (const [code, list] of Object.entries(CURATED_BY_TEMPLATE)) {
            const family = code.split(":")[0] as keyof typeof CURATED;
            const out = schemesForTemplate(family, code);
            for (const id of out) expect(CURATED[family]).toContain(id);
            expect(list.length).toBeGreaterThan(0);
        }
    });

    it("never offers nothing, whatever family a narrowed code is asked against", () => {
        // The intersection is defensive: a narrowing that empties a family list
        // is a typo, not an intention, and an empty scheme menu is unusable.
        for (const family of Object.keys(CURATED) as Array<keyof typeof CURATED>)
            for (const code of Object.keys(CURATED_BY_TEMPLATE))
                expect(schemesForTemplate(family, code).length).toBeGreaterThan(0);
        expect(schemesForTemplate(null, null).length).toBeGreaterThan(0);
        expect(schemesForTemplate("medical", null)).toEqual(CURATED.medical);
    });

    it("every narrowed template is a real template code", () => {
        for (const code of Object.keys(CURATED_BY_TEMPLATE))
            expect(TEMPLATE_SECTION_ORDER[code]).toBeDefined();
    });
});

describe("templateSectionLabels", () => {
    it("only labels sections the template actually renders", () => {
        for (const [code, blocks] of Object.entries(TEMPLATE_SECTION_LABELS)) {
            const rendered = TEMPLATE_SECTION_ORDER[code];
            expect(rendered).toBeDefined();
            for (const block of Object.keys(blocks)) expect(rendered).toContain(block);
        }
    });

    it("has a default for every block any template renders", () => {
        const all = new Set<string>();
        for (const list of Object.values(TEMPLATE_SECTION_ORDER))
            for (const b of list) all.add(b);
        for (const b of all) expect(DEFAULT_SECTION_LABELS[b]).toBeDefined();
    });
});
