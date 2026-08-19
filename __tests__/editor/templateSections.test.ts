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
import { ALL_BLOCKS } from "@/components/editor/editorConstants";

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
