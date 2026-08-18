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
import { isSchemaEditablePath } from "@/components/editor/genericContentSchema";

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
