/**
 * Guards the inline-editing allow-list.
 *
 * v3 makes text in the preview directly editable, and originally decided what
 * was editable with a hand-written SKIP regex. That is an unwinnable game: any
 * template family that ships a new data-field gets inline editing for free,
 * whether or not the schema can represent the path. LocationBI's
 * `location.hours.<i>.day` slipped through exactly that way — and because the
 * schema declares `location.hours` as a single TEXT field, the deep writer
 * converted that string into an array and dropped every other hours row on the
 * next rebuild.
 *
 * isSchemaEditablePath inverts it: a node is editable only if the form could
 * have edited it anyway. These tests pin that boundary.
 */
import {
    isSchemaEditablePath,
    isSchemaListRowPath,
    GENERIC_CONTENT_SCHEMA,
} from "@/components/editor/genericContentSchema";

describe("isSchemaEditablePath", () => {
    it("accepts plain scalar fields the form declares", () => {
        expect(isSchemaEditablePath("footer.brand")).toBe(true);
        expect(isSchemaEditablePath("contact.phone")).toBe(true);
        // Added in Pass 1 so the browser tab and SEO snippet are editable at all.
        expect(isSchemaEditablePath("business_name")).toBe(true);
        expect(isSchemaEditablePath("tagline")).toBe(true);
    });

    it("accepts both halves of a link field", () => {
        expect(isSchemaEditablePath("navCtaText")).toBe(true);
        expect(isSchemaEditablePath("navCtaHref")).toBe(true);
    });

    it("accepts list rows at the paths the form actually renders", () => {
        // ContentFieldsAuto composes joinPath(spec.path, idx) then the item field.
        expect(isSchemaEditablePath("services.items.0.title")).toBe(true);
        expect(isSchemaEditablePath("services.items.12.desc")).toBe(true);
        // `body` is NOT declared for services rows — the schema owns
        // title/desc/note/image — so it is correctly rejected even though a
        // few templates emit it. That mismatch is worth its own fix; the
        // allow-list is right to refuse a path the form cannot edit.
        expect(isSchemaEditablePath("services.items.12.body")).toBe(false);
        expect(isSchemaEditablePath("faq.items.3.q")).toBe(true);
        expect(isSchemaEditablePath("navbar_links.1.label")).toBe(true);
    });

    it("accepts a plain string row for a string-array list", () => {
        expect(isSchemaEditablePath("area.places.0")).toBe(true);
        // …but not a sub-path on one, because there are no item fields to own it.
        expect(isSchemaEditablePath("area.places.0.name")).toBe(false);
    });

    it("REJECTS the path that caused the bug", () => {
        // The schema declares location.hours as a single text field, so these
        // sub-paths have no owner — and writing them destroys the existing value.
        expect(isSchemaEditablePath("location.hours.0.day")).toBe(false);
        expect(isSchemaEditablePath("location.hours.0.time")).toBe(false);
    });

    it("rejects item fields a list does not declare", () => {
        expect(isSchemaEditablePath("faq.items.0.nope")).toBe(false);
        expect(isSchemaEditablePath("services.items.0.price.currency")).toBe(false);
    });

    it("rejects unknown, empty and malformed paths", () => {
        expect(isSchemaEditablePath("")).toBe(false);
        expect(isSchemaEditablePath("totally.made.up")).toBe(false);
        expect(isSchemaEditablePath("services.items")).toBe(false);      // the list itself, not a row
        expect(isSchemaEditablePath("services.items.x.title")).toBe(false); // non-numeric index
    });
});

/**
 * Guards the OTHER half of the inline-editing gate: which schema-owned paths
 * are still kept out of click-to-edit.
 *
 * Inline editing commits ONE leaf. A leaf write inside a list the draft does
 * not hold yet (because the panel is reading it through fallbackPaths, or
 * through lib/derive-content-defaults.ts) mints a fresh SPARSE array holding
 * only that row, and JSON.stringify turns the holes into `null` — every sibling
 * row destroyed, with an honest "saved" toast. So rows are edited in the
 * sidebar, which writes the whole array at once.
 *
 * v3 excluded them with `/\.(items|steps|paragraphs)\.\d+/`, which keys on list
 * NAMES rather than list SHAPE and therefore covered only half the schema's
 * lists. isSchemaListRowPath reads the shape off the ListSpecs themselves, so a
 * list declared tomorrow is excluded the moment it exists.
 */
describe("isSchemaListRowPath", () => {
    it("matches every row shape the schema declares", () => {
        // Object rows.
        expect(isSchemaListRowPath("services.items.0.title")).toBe(true);
        expect(isSchemaListRowPath("faq.items.12.a")).toBe(true);
        expect(isSchemaListRowPath("how.steps.1.body")).toBe(true);
        // String rows, where the index IS the whole row.
        expect(isSchemaListRowPath("about.paragraphs.2")).toBe(true);
        expect(isSchemaListRowPath("area.places.0")).toBe(true);
    });

    it("CLOSES the rows the name-matching regex left open", () => {
        // Each of these is a declared list whose key is not items/steps/
        // paragraphs, so the old regex waved it straight through to a
        // single-leaf inline commit.
        expect(isSchemaListRowPath("hero.headlineLines.0")).toBe(true);
        expect(isSchemaListRowPath("trust.cells.0.num")).toBe(true);
        expect(isSchemaListRowPath("about.specs.0.label")).toBe(true);
        expect(isSchemaListRowPath("area.places.0")).toBe(true);
        expect(isSchemaListRowPath("area.rows.0.place")).toBe(true);
        expect(isSchemaListRowPath("location.rules.0.label")).toBe(true);
        expect(isSchemaListRowPath("footer.visit.lines.0")).toBe(true);
        expect(isSchemaListRowPath("footer.explore.links.0.text")).toBe(true);
        expect(isSchemaListRowPath("footer.hours.0.day")).toBe(true);
        expect(isSchemaListRowPath("footer.social.0.platform")).toBe(true);
        expect(isSchemaListRowPath("footer.notes.0")).toBe(true);
    });

    it("covers EVERY list the schema declares, including ones added later", () => {
        // The point of deriving it: this test needs no maintenance when a new
        // list ships. If one is ever missed, it fails here rather than in
        // production on somebody's live footer.
        for (const group of GENERIC_CONTENT_SCHEMA) {
            for (const field of group.fields) {
                if ((field as any).kind !== "list") continue;
                const list = field as any;
                expect(isSchemaListRowPath(`${list.path}.0`)).toBe(true);
                for (const item of list.itemFields ?? []) {
                    const p = item.path ? `${list.path}.3.${item.path}` : `${list.path}.3`;
                    expect(isSchemaListRowPath(p)).toBe(true);
                }
            }
        }
    });

    it("is strictly NARROWER than nothing and never wider than the old regex", () => {
        // The standing rule: this gate may only ever close paths, never re-open
        // one. Everything the retired name regex matched must still be matched.
        const oldRegex = /\.(items|steps|paragraphs)\.\d+/;
        const samples = [
            "why.items.0.title", "why.items.0.body",
            "how.steps.0.title", "how.steps.0.body",
            "testimonials.items.0.quote", "testimonials.items.0.who",
            "faq.items.0.q", "faq.items.0.a",
            "credentials.items.0.title", "credentials.items.0.body",
            "services.items.0.title", "services.items.0.desc",
            "gallery.items.0.caption", "about.paragraphs.0",
        ];
        for (const s of samples) {
            expect(oldRegex.test(s)).toBe(true);
            expect(isSchemaListRowPath(s)).toBe(true);
        }
    });

    it("does not match the list itself, only its rows", () => {
        expect(isSchemaListRowPath("services.items")).toBe(false);
        expect(isSchemaListRowPath("footer.social")).toBe(false);
        expect(isSchemaListRowPath("footer.hours")).toBe(false);
    });

    it("does not match a sibling field that merely shares a list's prefix", () => {
        // footer.visit.lines is a list; footer.visit.title is a scalar beside it
        // and must stay inline-editable.
        expect(isSchemaListRowPath("footer.visit.title")).toBe(false);
        expect(isSchemaListRowPath("footer.explore.title")).toBe(false);
        expect(isSchemaListRowPath("footer.brand")).toBe(false);
        expect(isSchemaListRowPath("contact.phone")).toBe(false);
    });

    it("rejects empty, unknown and non-numeric paths", () => {
        expect(isSchemaListRowPath("")).toBe(false);
        expect(isSchemaListRowPath("totally.made.up.0")).toBe(false);
        expect(isSchemaListRowPath("services.items.x.title")).toBe(false);
        // location.hours is a TEXT field, not a list — so this is not a "row"
        // here. It stays excluded anyway, by isSchemaEditablePath, which is the
        // check that already refuses it.
        expect(isSchemaListRowPath("location.hours.0.day")).toBe(false);
        expect(isSchemaEditablePath("location.hours.0.day")).toBe(false);
    });
});

/**
 * The composite gate v3 actually applies (SandboxEditorV3.setupInlineEditing).
 * Reproduced here so the two predicates are tested the way they are combined:
 * a node is inline-editable only if the schema owns the path AND it is not a
 * list row AND it is not one of the three structural exclusions.
 */
describe("v3 inline-editing gate (allow-list minus rows)", () => {
    const inlineEditable = (f: string) =>
        isSchemaEditablePath(f) &&
        f !== "hero.headline" &&
        !/^(nav\.brand|nav\.status|nav\.links|navbar_links)(\.|$)/.test(f) &&
        !isSchemaListRowPath(f);

    it("still allows the plain scalars inline editing exists for", () => {
        expect(inlineEditable("business_name")).toBe(true);
        expect(inlineEditable("tagline")).toBe(true);
        expect(inlineEditable("footer.brand")).toBe(true);
        expect(inlineEditable("footer.visit.title")).toBe(true);
        expect(inlineEditable("contact.phone")).toBe(true);
    });

    it("closes every row that used to slip through", () => {
        for (const f of [
            "hero.headlineLines.0",
            "trust.cells.0.num",
            "about.specs.0.label",
            "area.places.0",
            "area.rows.0.place",
            "location.rules.0.label",
            "footer.visit.lines.0",
            "footer.explore.links.0.text",
            "footer.hours.0.day",
            "footer.social.0.platform",
            "footer.notes.0",
            // …and the ones the name regex already covered.
            "gallery.items.0.caption",
            "faq.items.1.a",
        ]) {
            expect(inlineEditable(f)).toBe(false);
        }
    });

    it("keeps the three structural exclusions", () => {
        expect(inlineEditable("hero.headline")).toBe(false);
        expect(inlineEditable("navbar_links.0.label")).toBe(false);
        expect(inlineEditable("nav.brand")).toBe(false);
    });
});
