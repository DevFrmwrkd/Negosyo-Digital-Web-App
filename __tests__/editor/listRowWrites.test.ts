/**
 * Guards the rule that a list ROW write carries the whole displayed list.
 *
 * THE BUG THESE PIN. The sidebar shows a list it may never have read from the
 * draft: ListField reads spec.path, else spec.fallbackPaths, and the editor's
 * getValue falls through again to the submission-derived defaults. So a panel
 * can show four gallery tiles while draft.gallery.items holds nothing. Writing
 * ONE leaf of ONE row then minted a fresh sparse array with a single partial
 * row, and JSON.stringify turned the holes into null on the way to Convex:
 *
 *   gallery.items       panel showed 4 rows -> {"items":[null,null,null,{…}]}
 *   faq.items           panel showed 2 rows -> {"items":[null,{"a":"…"}]}
 *   footer.social       panel showed 3 links -> page drops to 1
 *   footer.visit.lines  same, via inline edit
 *
 * Two of those make the rebuild THROW (FaqBB.astro:43 reads item.q unguarded,
 * FooterF.astro:33 dereferences s.url). Unlike the services bug, the write
 * LANDS — so nothing warns anybody.
 */
import {
    splitRowPath,
    setRowValue,
    withRowValue,
    rowWriteInList,
    displayedList,
    rowWriteFromSchema,
    listSafeSetValue,
} from "@/components/editor/listRowWrites";
import { listShapeForRowPath } from "@/components/editor/genericContentSchema";

/** A read chain shaped like the editors': draft first, then derived defaults. */
function reader(draft: any, derived: any = {}) {
    const get = (src: any, path: string) => {
        let cur = src;
        for (const p of path.split(".")) {
            if (cur == null) return undefined;
            cur = cur[p];
        }
        return cur;
    };
    return (path: string) => {
        const v = get(draft, path);
        if (v !== undefined && v !== null && v !== "") return v;
        return get(derived, path);
    };
}

describe("splitRowPath", () => {
    it("splits a scalar row: the row IS the value", () => {
        expect(splitRowPath("about.paragraphs", "about.paragraphs.2")).toEqual({ index: 2, subPath: "" });
        expect(splitRowPath("footer.notes", "footer.notes.0")).toEqual({ index: 0, subPath: "" });
    });

    it("splits a one-key sub path inside a row", () => {
        expect(splitRowPath("gallery.items", "gallery.items.3.caption")).toEqual({ index: 3, subPath: "caption" });
    });

    it("splits a NESTED sub path — a link field's hrefPath can reach deeper", () => {
        expect(splitRowPath("services.items", "services.items.0.cta.text")).toEqual({ index: 0, subPath: "cta.text" });
        expect(splitRowPath("services.items", "services.items.0.cta.href")).toEqual({ index: 0, subPath: "cta.href" });
    });

    it("returns null for a path that is not under the list", () => {
        expect(splitRowPath("gallery.items", "gallery.headline")).toBeNull();
        expect(splitRowPath("gallery.items", "faq.items.0.q")).toBeNull();
        // The array itself, not a row.
        expect(splitRowPath("gallery.items", "gallery.items")).toBeNull();
        // Shares a prefix but is a different field.
        expect(splitRowPath("footer.notes", "footer.notesHeading")).toBeNull();
    });

    it("returns null for a non-numeric segment where the index belongs", () => {
        expect(splitRowPath("gallery.items", "gallery.items.all")).toBeNull();
        expect(splitRowPath("gallery.items", "gallery.items.length")).toBeNull();
        expect(splitRowPath("gallery.items", "gallery.items.-1.caption")).toBeNull();
        expect(splitRowPath("gallery.items", "gallery.items.1.5.caption")).toEqual({ index: 1, subPath: "5.caption" });
    });
});

describe("setRowValue", () => {
    it("replaces the whole row when there is no sub path", () => {
        expect(setRowValue("old line", "", "new line")).toBe("new line");
    });

    it("writes one key and keeps the rest of the row", () => {
        const row = { image: "a.jpg", caption: "old" };
        expect(setRowValue(row, "caption", "new")).toEqual({ image: "a.jpg", caption: "new" });
    });

    it("does NOT mutate the row it was given", () => {
        const row = { image: "a.jpg", caption: "old" };
        const next = setRowValue(row, "caption", "new");
        expect(row).toEqual({ image: "a.jpg", caption: "old" });
        expect(next).not.toBe(row);
    });

    it("builds a nested sub path without touching siblings", () => {
        const row = { title: "Suite", cta: { text: "Book", href: "#a" } };
        const next = setRowValue(row, "cta.text", "Reserve");
        expect(next).toEqual({ title: "Suite", cta: { text: "Reserve", href: "#a" } });
        expect(row.cta).toEqual({ text: "Book", href: "#a" });
        expect((next as any).cta).not.toBe(row.cta);
    });

    it("creates the missing container on the way down", () => {
        expect(setRowValue({ title: "Suite" }, "cta.text", "Book")).toEqual({ title: "Suite", cta: { text: "Book" } });
    });

    it("handles rows that are not objects", () => {
        // A hole / missing row.
        expect(setRowValue(undefined, "caption", "x")).toEqual({ caption: "x" });
        expect(setRowValue(null, "caption", "x")).toEqual({ caption: "x" });
        // A legacy bare-string row keeps its text as `lead`, exactly as the
        // whole-path setValue would have done for a string parent.
        expect(setRowValue("Haircut", "title", "Fade")).toEqual({ lead: "Haircut", title: "Fade" });
        // A blank string carries nothing worth keeping.
        expect(setRowValue("  ", "title", "Fade")).toEqual({ title: "Fade" });
    });

    it("builds an ARRAY when the next segment is an index", () => {
        expect(setRowValue({}, "tags.0", "new")).toEqual({ tags: ["new"] });
    });
});

describe("withRowValue", () => {
    it("keeps every sibling row", () => {
        const list = [{ caption: "a" }, { caption: "b" }, { caption: "c" }];
        expect(withRowValue(list, 1, "caption", "B")).toEqual([{ caption: "a" }, { caption: "B" }, { caption: "c" }]);
    });

    it("does not mutate the list or its rows", () => {
        const list = [{ caption: "a" }, { caption: "b" }];
        const next = withRowValue(list, 0, "caption", "A");
        expect(list).toEqual([{ caption: "a" }, { caption: "b" }]);
        expect(next).not.toBe(list);
        expect(next[1]).toBe(list[1]);
    });

    it("survives holes already present in the array", () => {
        const damaged: any[] = [];
        damaged[2] = { caption: "c" };
        const next = withRowValue(damaged, 0, "caption", "a");
        // The written row lands; the pre-existing damage is passed through, not
        // silently "repaired" into rows nobody asked for.
        expect(next[0]).toEqual({ caption: "a" });
        expect(next[2]).toEqual({ caption: "c" });
        expect(next.length).toBe(3);
    });
});

describe("rowWriteInList", () => {
    const list = [{ caption: "a" }, { caption: "b" }];

    it("redirects a leaf write to the whole array", () => {
        expect(rowWriteInList("gallery.items", list, "gallery.items.1.caption", "B")).toEqual({
            path: "gallery.items",
            value: [{ caption: "a" }, { caption: "B" }],
        });
    });

    it("passes a path that is not a row of this list straight through", () => {
        expect(rowWriteInList("gallery.items", list, "gallery.headline", "x")).toBeNull();
        expect(rowWriteInList("gallery.items", list, "gallery.items", [])).toBeNull();
    });

    it("refuses an index outside the displayed list rather than guessing", () => {
        // Padding out to index 7 of a 2-row list would ship five blank tiles.
        expect(rowWriteInList("gallery.items", list, "gallery.items.7.caption", "x")).toBeNull();
        expect(rowWriteInList("gallery.items", list, "gallery.items.2.caption", "x")).toBeNull();
    });

    it("refuses when there is no list at all", () => {
        expect(rowWriteInList("gallery.items", null, "gallery.items.0.caption", "x")).toBeNull();
        expect(rowWriteInList("gallery.items", undefined, "gallery.items.0.caption", "x")).toBeNull();
    });
});

describe("displayedList — the same chain ListField walks", () => {
    it("prefers the primary path", () => {
        const read = reader({ faq: { items: [{ q: "1" }] } });
        expect(displayedList(read, "faq.items", ["faq"])).toEqual([{ q: "1" }]);
    });

    it("falls back to the schema's fallbackPaths when the primary is empty", () => {
        // The legacy bare-array shape.
        const read = reader({ faq: [{ q: "1" }, { q: "2" }] });
        expect(displayedList(read, "faq.items", ["faq"])).toEqual([{ q: "1" }, { q: "2" }]);
    });

    it("falls back again to whatever the caller's read chain adds (derived defaults)", () => {
        const read = reader({}, { gallery: { items: [{ image: "1.jpg" }, { image: "2.jpg" }] } });
        expect(displayedList(read, "gallery.items")).toEqual([{ image: "1.jpg" }, { image: "2.jpg" }]);
    });

    it("returns null when nothing displays a list", () => {
        expect(displayedList(reader({}), "gallery.items")).toBeNull();
    });
});

describe("listShapeForRowPath", () => {
    it("finds the list a row path belongs to", () => {
        expect(listShapeForRowPath("gallery.items.2.image")?.path).toBe("gallery.items");
        expect(listShapeForRowPath("about.paragraphs.0")?.path).toBe("about.paragraphs");
        expect(listShapeForRowPath("footer.visit.lines.1")?.path).toBe("footer.visit.lines");
    });

    it("carries the schema's read fallbacks with it", () => {
        expect(listShapeForRowPath("faq.items.0.q")?.fallbackPaths).toEqual(["faq"]);
        expect(listShapeForRowPath("footer.social.0.url")?.fallbackPaths).toEqual(["footer.social_links"]);
        expect(listShapeForRowPath("services.items.0.title")?.fallbackPaths).toEqual(["services"]);
    });

    it("accepts a sub path the ListSpec never declared", () => {
        // Looser than isSchemaEditablePath on purpose: a link itemField's
        // hrefPath can reach a key the spec did not spell out, and refusing it
        // would send that write straight back down the destructive path.
        expect(listShapeForRowPath("services.items.0.cta.text")?.path).toBe("services.items");
    });

    it("is null for the array itself and for plain fields", () => {
        expect(listShapeForRowPath("gallery.items")).toBeNull();
        expect(listShapeForRowPath("gallery.headline")).toBeNull();
        expect(listShapeForRowPath("contact.phone")).toBeNull();
        expect(listShapeForRowPath("")).toBeNull();
    });
});

describe("rowWriteFromSchema — the four failures proven live", () => {
    it("gallery.items: a caption typed over DERIVED tiles keeps the other three", () => {
        // The draft holds no gallery at all — the four tiles are derived.
        const read = reader({}, {
            gallery: { items: [{ image: "1.jpg" }, { image: "2.jpg" }, { image: "3.jpg" }, { image: "4.jpg" }] },
        });
        const write = rowWriteFromSchema(read, "gallery.items.3.caption", "Sunset deck");
        expect(write!.path).toBe("gallery.items");
        expect(write!.value).toEqual([
            { image: "1.jpg" }, { image: "2.jpg" }, { image: "3.jpg" },
            { image: "4.jpg", caption: "Sunset deck" },
        ]);
        // The shape the bug produced, pinned so it cannot come back.
        expect(JSON.stringify({ items: write!.value })).not.toContain("null");
    });

    it("gallery.items.N.image: the picker route, the most reachable case", () => {
        const read = reader({}, { gallery: { items: [{ image: "1.jpg" }, { image: "2.jpg" }] } });
        const write = rowWriteFromSchema(read, "gallery.items.0.image", "new.jpg");
        expect(write).toEqual({ path: "gallery.items", value: [{ image: "new.jpg" }, { image: "2.jpg" }] });
    });

    it("faq.items: an answer typed over the legacy bare array keeps the question row", () => {
        // faq.items is empty; the rows come from the fallback path `faq`.
        const read = reader({ faq: [{ q: "Do you deliver?", a: "Yes" }, { q: "Hours?", a: "9-5" }] });
        const write = rowWriteFromSchema(read, "faq.items.1.a", "Nine to five");
        expect(write!.path).toBe("faq.items");
        expect(write!.value).toEqual([
            { q: "Do you deliver?", a: "Yes" },
            { q: "Hours?", a: "Nine to five" },
        ]);
        // FaqBB.astro:43 reads item.q unguarded — every row must still have one.
        expect(write!.value.every((r: any) => typeof r.q === "string")).toBe(true);
    });

    it("footer.social: editing one link keeps all three, so FooterF.astro:33 survives", () => {
        const read = reader({ footer: { social_links: [
            { platform: "Instagram", url: "https://ig/x" },
            { platform: "Facebook", url: "https://fb/x" },
            { platform: "TikTok", url: "https://tt/x" },
        ] } });
        const write = rowWriteFromSchema(read, "footer.social.1.url", "https://fb/y");
        expect(write!.path).toBe("footer.social");
        expect(write!.value).toHaveLength(3);
        // FooterF.astro dereferences s.url on every row.
        expect(write!.value.every((s: any) => typeof s?.url === "string")).toBe(true);
    });

    it("footer.visit.lines: a SCALAR row keeps its siblings", () => {
        const read = reader({ footer: { visit: { lines: ["Mon-Fri 9-5", "Sat 10-2", "Closed Sunday"] } } });
        const write = rowWriteFromSchema(read, "footer.visit.lines.1", "Sat 10-3");
        expect(write).toEqual({
            path: "footer.visit.lines",
            value: ["Mon-Fri 9-5", "Sat 10-3", "Closed Sunday"],
        });
    });

    it("passes a non-row path straight through", () => {
        const read = reader({ gallery: { items: [{ image: "1.jpg" }] } });
        expect(rowWriteFromSchema(read, "gallery.headline", "Our work")).toBeNull();
        expect(rowWriteFromSchema(read, "contact.phone", "123")).toBeNull();
    });

    it("passes through when nothing is displayed — the plain write was already right", () => {
        // Nothing to preserve, so a first row writes normally.
        expect(rowWriteFromSchema(reader({}), "gallery.items.0.caption", "x")).toBeNull();
    });

    it("passes through an index past the rows on screen", () => {
        const read = reader({}, { gallery: { items: [{ image: "1.jpg" }] } });
        expect(rowWriteFromSchema(read, "gallery.items.4.caption", "x")).toBeNull();
    });
});

describe("listSafeSetValue", () => {
    it("writes the whole array in ONE call — never read-then-write", () => {
        const calls: Array<[string, any]> = [];
        const read = reader({ about: { paragraphs: ["one", "two", "three"] } });
        const set = listSafeSetValue(read, (p, v) => calls.push([p, v]));
        set("about.paragraphs.2", "THREE");
        expect(calls).toEqual([["about.paragraphs", ["one", "two", "THREE"]]]);
    });

    it("leaves a plain scalar write exactly as it was", () => {
        const calls: Array<[string, any]> = [];
        const set = listSafeSetValue(reader({}), (p, v) => calls.push([p, v]));
        set("contact.phone", "+63 900");
        expect(calls).toEqual([["contact.phone", "+63 900"]]);
    });

    it("is idempotent against a caller that already materialised the array", () => {
        // ListField writes the whole array itself; that must not be re-wrapped.
        const calls: Array<[string, any]> = [];
        const read = reader({ about: { paragraphs: ["one", "two"] } });
        const set = listSafeSetValue(read, (p, v) => calls.push([p, v]));
        set("about.paragraphs", ["one", "TWO"]);
        expect(calls).toEqual([["about.paragraphs", ["one", "TWO"]]]);
    });

    /**
     * THE TRAP, pinned. A row write rebuilds the WHOLE array from what the
     * reader returns, so two writes in one event (handleLinkSave: text, then
     * href) are only safe if the second one READS the first one's result. Where
     * the writer defers — a React setState(prev => …) with a draftRef that is
     * only refreshed on render — the second write re-reads the pre-edit list and
     * its array silently overwrites the first edit. That is not a stale read,
     * it is a lost edit, and it is invisible: no nulls, no toast, no warning.
     *
     * v1's setDeepDraft was exactly this shape and dropped the link TEXT of
     * every footer.social / footer.explore.links / navbar_links row; it now
     * writes draftRef before setDraft, the invariant useEditorDraft.commitState
     * already kept for v3. Both halves are asserted so the requirement on the
     * caller cannot be quietly removed again.
     */
    it("LOSES the first edit if the reader does not see the first write", () => {
        const committed: any = { footer: { social: [{ platform: "IG", url: "#a" }, { platform: "FB", url: "#b" }] } };
        const pinned = JSON.parse(JSON.stringify(committed)); // what a render-only ref holds
        const queue: any[] = [];
        const write = (path: string, value: any) => queue.push([path, value]);
        // Reader pinned to the pre-edit draft — the deferred-commit editor.
        const set = listSafeSetValue(reader(pinned), write);
        set("footer.social.0.platform", "Instagram PH");
        set("footer.social.0.url", "https://ig/new");
        let out = committed;
        for (const [path, value] of queue) out.footer.social = value;
        expect(out.footer.social[0].url).toBe("https://ig/new");
        expect(out.footer.social[0].platform).toBe("IG"); // the text edit is gone
    });

    it("two writes into the same row compose, given a synchronous draft", () => {
        // What handleLinkSave does: text then href. The editors' setValue commits
        // into draftRef synchronously, so the second write sees the first.
        let draft: any = { footer: { explore: { links: [{ text: "a", href: "#a" }, { text: "b", href: "#b" }] } } };
        const write = (path: string, value: any) => {
            const parts = path.split(".");
            const root = { ...draft };
            let cur: any = root;
            for (let i = 0; i < parts.length - 1; i++) {
                cur[parts[i]] = Array.isArray(cur[parts[i]]) ? cur[parts[i]].slice() : { ...cur[parts[i]] };
                cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = value;
            draft = root;
        };
        const set = listSafeSetValue((p) => reader(draft)(p), write);
        set("footer.explore.links.0.text", "A");
        set("footer.explore.links.0.href", "#A");
        expect(draft.footer.explore.links).toEqual([{ text: "A", href: "#A" }, { text: "b", href: "#b" }]);
    });
});
