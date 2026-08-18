/**
 * Regression test for the v3 editor's silent-data-loss bug.
 *
 * The failure was invisible in the UI: an admin edited the FAQ answers, saw a
 * green "Changes saved" toast, and the payload that reached Convex contained
 * none of them. It came from three facts lining up:
 *
 *   1. lib/services/groq.service.ts emits `why` / `how` / `testimonials` /
 *      `faq` / `credentials` as BARE ARRAYS, and generate-website passes them
 *      into extractedContent verbatim.
 *   2. The sidebar schema reads `why.items`, `how.steps`, `faq.items` …
 *   3. So writing `why.items` on a bare array hangs a non-index property on an
 *      Array — and JSON.stringify silently drops those. The edit died on the
 *      wire, not in the UI.
 *
 * v1 never hit this because it seeded its draft through normalizeDraft, which
 * rewraps the bare arrays. v3 spread the raw content. These tests pin the
 * behaviour so the hook can never regress to the bare spread.
 */
import { normalizeDraft } from "@/components/editor/useEditorDraft";

/** What the AI extraction actually stores for these five blocks. */
const groqShapedContent = () => ({
    business_name: "Villa Marilag",
    why: [
        { title: "Right on the beach", description: "Two minutes to the sand." },
        { title: "Breakfast included", description: "Served under the mango tree." },
    ],
    how: [{ step: "1", title: "Message us", description: "Tell us your dates." }],
    testimonials: [{ quote: "Wonderful stay.", name: "Marisol D.", context: "April" }],
    faq: [{ question: "What time is check-in?", answer: "From 2pm." }],
    credentials: [{ label: "DOT accredited", detail: "Accommodation enterprise" }],
});

/** The write ContentFieldsAuto performs, mirrored from useEditorDraft.setValue. */
const writeDotted = (root: any, path: string, value: any) => {
    const parts = path.split(".");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (Array.isArray(cur[k])) cur[k] = [...cur[k]];
        else if (cur[k] && typeof cur[k] === "object") cur[k] = { ...cur[k] };
        else cur[k] = {};
        cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
    return root;
};

/** What onSaveContent → /api/save-content does to the draft on the way out. */
const overTheWire = (draft: any) => JSON.parse(JSON.stringify(draft));

describe("draft normalization (v3 silent data loss)", () => {
    it("demonstrates the original bug: a bare array loses .items over the wire", () => {
        // No normalization — this is what v3 did before the fix.
        const draft: any = { ...groqShapedContent() };
        writeDotted(draft, "why.items", [{ title: "Edited", body: "New copy." }]);

        // In memory the edit looks present, which is why the UI showed success…
        expect(draft.why.items).toHaveLength(1);
        // …but it does not survive JSON, so Convex never saw it.
        expect(overTheWire(draft).why.items).toBeUndefined();
    });

    it("round-trips an edit to every affected block once normalized", () => {
        const draft = normalizeDraft(groqShapedContent());

        writeDotted(draft, "why.items", [{ title: "Edited why", body: "b" }]);
        writeDotted(draft, "how.steps", [{ title: "Edited how", body: "b" }]);
        writeDotted(draft, "testimonials.items", [{ quote: "Edited quote", who: "M" }]);
        writeDotted(draft, "faq.items", [{ q: "Edited q", a: "Edited a" }]);
        writeDotted(draft, "credentials.items", [{ label: "Edited", desc: "d" }]);

        const saved = overTheWire(draft);
        expect(saved.why.items[0].title).toBe("Edited why");
        expect(saved.how.steps[0].title).toBe("Edited how");
        expect(saved.testimonials.items[0].quote).toBe("Edited quote");
        expect(saved.faq.items[0].q).toBe("Edited q");
        expect(saved.credentials.items[0].label).toBe("Edited");
    });

    it("exposes AI content at the paths the sidebar schema reads", () => {
        const d = normalizeDraft(groqShapedContent());
        // Before the fix every one of these was undefined and the panels
        // rendered "No items yet" beside an iframe showing the content.
        expect(d.why.items).toHaveLength(2);
        expect(d.how.steps).toHaveLength(1);
        expect(d.testimonials.items).toHaveLength(1);
        expect(d.faq.items).toHaveLength(1);
        expect(d.credentials.items).toHaveLength(1);
    });

    it("aliases the AI's field names onto the ones the schema edits", () => {
        const d = normalizeDraft(groqShapedContent());
        expect(d.why.items[0].body).toBe("Two minutes to the sand.");   // description → body
        expect(d.how.steps[0].body).toBe("Tell us your dates.");        // description → body
        expect(d.testimonials.items[0].who).toBe("Marisol D.");         // name → who
        expect(d.testimonials.items[0].role).toBe("April");             // context → role

        // Credentials: the AI emits {label, detail} but the schema edits
        // {title, body}, so without these two aliases the panel showed blank rows
        // over content the page was rendering fine (the .astro components fall
        // back to .label/.detail themselves).
        expect(d.credentials.items[0].title).toBe("DOT accredited");   // label → title
        expect(d.credentials.items[0].body).toBe("Accommodation enterprise"); // detail → body
        // The originals survive, so the components' own fallbacks keep working.
        expect(d.credentials.items[0].label).toBe("DOT accredited");
        expect(d.credentials.items[0].detail).toBe("Accommodation enterprise");
    });

    it("does not let the credentials aliases clobber an already-correct row", () => {
        const d = normalizeDraft({
            credentials: [{ title: "Set by hand", body: "Edited copy", label: "old", detail: "old" }],
        });
        expect(d.credentials.items[0].title).toBe("Set by hand");
        expect(d.credentials.items[0].body).toBe("Edited copy");
    });

    it("is idempotent, so re-seeding an already-normalized draft is a no-op", () => {
        // The hook normalizes at three points (seed, cached restore, clean-sync
        // adopt). If this were not idempotent the clean-sync equality test would
        // drift and the editor would stop adopting server updates.
        const once = normalizeDraft(groqShapedContent());
        const twice = normalizeDraft(once);
        expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    });

    it("leaves already-correct wrapper shapes alone", () => {
        // Submissions previously saved through v1 arrive already healed.
        const already = {
            why: { tag: "Why us", items: [{ title: "a", body: "b" }] },
            faq: { items: [{ q: "q", a: "a" }] },
        };
        const d = normalizeDraft(already);
        expect(d.why.tag).toBe("Why us");
        expect(d.why.items).toHaveLength(1);
        expect(d.faq.items[0].q).toBe("q");
    });

    it("passes through empty and malformed input without throwing", () => {
        expect(normalizeDraft(undefined)).toEqual({});
        expect(normalizeDraft(null)).toEqual({});
        expect(normalizeDraft({}).why).toBeUndefined();
        expect(normalizeDraft({ faq: "not an array" }).faq).toBe("not an array");
    });
});
