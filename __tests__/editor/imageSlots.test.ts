/**
 * applyImageSlot writes an uploaded/picked photo into the draft.
 *
 * Its named cases are LEGACY storage keys the older templates read. Everything
 * else is a real dotted content path — gallery.items.2.image, ctaBand.image —
 * which the newer templates read exactly where it is written. Those used to be
 * appended to images[] instead: the photo went back into the library and the
 * slot stayed empty, so an admin picked a photo for a gallery tile and nothing
 * changed on the page.
 */
import { applyImageSlot, isImageField } from "@/components/editor/editorImageSlots";

const URL_A = "https://pub-x.r2.dev/a.jpg";
const URL_B = "https://pub-x.r2.dev/b.jpg";

describe("applyImageSlot — the library", () => {
    it("appends to images[] when there is no slot", () => {
        const out = applyImageSlot({ images: [URL_A] }, null, URL_B);
        expect(out.images).toEqual([URL_A, URL_B]);
    });

    it("never mutates the draft it was given", () => {
        const before = { images: [URL_A], gallery: { items: [{ image: "" }] } };
        const snapshot = JSON.stringify(before);
        applyImageSlot(before, "gallery.items.0.image", URL_B);
        expect(JSON.stringify(before)).toBe(snapshot);
    });
});

describe("applyImageSlot — legacy storage keys still route as before", () => {
    it("hero.image fills images[0]", () => {
        expect(applyImageSlot({}, "hero.image", URL_A).images).toEqual([URL_A]);
        expect(applyImageSlot({ images: [URL_A] }, "hero.image", URL_B).images).toEqual([URL_B]);
    });

    it("about.image fills about_images[0]", () => {
        expect(applyImageSlot({}, "about.image", URL_A).about_images).toEqual([URL_A]);
    });

    it("favicon is its own key", () => {
        expect(applyImageSlot({}, "favicon", URL_A).favicon).toBe(URL_A);
    });

    it("gallery.tile.N fills featured_images[N]", () => {
        expect(applyImageSlot({}, "gallery.tile.2", URL_A).featured_images).toEqual(["", "", URL_A]);
    });
});

describe("applyImageSlot — a real content path lands at that path", () => {
    it("fills a gallery tile the newer templates actually read", () => {
        const out = applyImageSlot({}, "gallery.items.2.image", URL_A);
        expect(out.gallery.items[2].image).toBe(URL_A);
        // and it is a LIST, not an object with a "2" key — nothing downstream
        // iterates the latter.
        expect(Array.isArray(out.gallery.items)).toBe(true);
    });

    it("fills a services row image without disturbing its siblings", () => {
        const draft = { services: { items: [{ title: "Room one" }, { title: "Room two" }] } };
        const out = applyImageSlot(draft, "services.items.1.image", URL_A);
        expect(out.services.items[1]).toEqual({ title: "Room two", image: URL_A });
        expect(out.services.items[0]).toEqual({ title: "Room one" });
    });

    it("fills a plain nested path", () => {
        expect(applyImageSlot({}, "ctaBand.image", URL_A).ctaBand.image).toBe(URL_A);
        expect(applyImageSlot({}, "why.image", URL_A).why.image).toBe(URL_A);
    });

    it("does NOT dump the photo into the library instead of the slot", () => {
        // The regression: the slot stayed empty and images[] grew.
        const out = applyImageSlot({ images: [URL_A] }, "ctaBand.image", URL_B);
        expect(out.images).toEqual([URL_A]);
        expect(out.ctaBand.image).toBe(URL_B);
    });
});

describe("isImageField", () => {
    it("recognises the paths the newer templates bind", () => {
        for (const f of ["hero.image", "about.image", "ctaBand.image", "gallery.items.0.image", "services.items.3.image"])
            expect(isImageField(f)).toBe(true);
    });

    it("does not claim ordinary text paths", () => {
        for (const f of ["hero.headline", "services.items.0.title", "location.address"])
            expect(isImageField(f)).toBe(false);
    });
});
