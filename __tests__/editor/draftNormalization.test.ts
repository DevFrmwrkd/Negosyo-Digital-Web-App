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
        // The numeric branch matters for the four-part list-row paths the
        // sidebar writes (services.items.0.title): the parent it creates has to
        // be an ARRAY, exactly as setValue makes it, or these tests would not be
        // reproducing what the editor actually does to the draft.
        const numeric = /^\d+$/.test(parts[i + 1]);
        if (Array.isArray(cur[k])) cur[k] = [...cur[k]];
        else if (cur[k] && typeof cur[k] === "object") cur[k] = { ...cur[k] };
        else if (typeof cur[k] === "string" && cur[k].trim()) cur[k] = numeric ? [] : { lead: cur[k] };
        else cur[k] = numeric ? [] : {};
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

/**
 * SERVICES — the same silent-data-loss bug, in the one block that was left out.
 *
 * Reported by the owner: typing into a services row in the v3 sidebar does not
 * save. The field takes the text, the row shows it, the toast says saved, and
 * nothing reaches Convex. It is the identical three-fact pile-up as above:
 *
 *   1. The AI and the legacy shape both emit this block as a BARE ARRAY at
 *      content.services (lib/astro-builder.ts:669 documents the same thing).
 *   2. genericContentSchema declares the list at "services.items" with
 *      fallbackPaths: ['services'], so READING a bare array works — the panel
 *      cheerfully shows "Items (3)".
 *   3. So every WRITE goes to services.items.N.<key>, setValue walks that path
 *      and hangs an `items` property on an Array, and JSON.stringify drops
 *      non-index properties of an Array. The edit renders, then evaporates.
 *
 * The fallback in (2) is what made this one worse than its siblings: the other
 * five blocks at least LOOKED broken ("No items yet"), so nobody typed into
 * them. Services looked perfectly healthy and ate the edits.
 *
 * The aliases (name -> title, description -> desc) are the ones
 * lib/astro-builder.ts:677-682 already applies to the legacy shape, so the
 * sidebar and the build agree on which key holds what.
 */

/** The legacy / AI shape: a BARE ARRAY of {name, description}. */
const legacyServicesContent = () => ({
    business_name: "Kubo Stays",
    services: [
        { name: "Garden Room", description: "Queen bed, own balcony.", price: "3,200" },
        { name: "Loft Room", description: "Sleeps four.", price: "4,100" },
        { name: "Whole House", description: "All three rooms.", price: "9,500" },
    ],
});

describe("draft normalization · services (the block the sidebar could not save)", () => {
    it("PROVES THE BUG: a row edit on an un-normalized draft never reaches Convex", () => {
        // No normalization — v3's behaviour before the fix.
        const draft: any = { ...legacyServicesContent() };
        writeDotted(draft, "services.items.0.title", "Garden Room (renovated)");

        // In memory the edit is right there, which is why the row redrew with
        // the new text and the toast went green…
        expect(draft.services.items[0].title).toBe("Garden Room (renovated)");

        // …and this is where it died: `items` is a non-index property hung off
        // an Array, so JSON.stringify drops it on the way to /api/save-content.
        const saved = overTheWire(draft);
        expect(saved.services.items).toBeUndefined();
        // What Convex actually received: the original three rows, untouched.
        expect(saved.services).toHaveLength(3);
        expect(saved.services[0].name).toBe("Garden Room");
    });

    it("PROVES THE FIX: the same keystroke survives once the draft is normalized", () => {
        const draft = normalizeDraft(legacyServicesContent());
        // Exactly what ContentFieldsAuto writes when the admin types into the
        // row's Title input.
        writeDotted(draft, "services.items.0.title", "Garden Room (renovated)");

        const saved = overTheWire(draft);
        expect(saved.services.items[0].title).toBe("Garden Room (renovated)");
        expect(saved.services.items).toHaveLength(3);
    });

    it("PROVES THE FIX: '+ Add' survives too, having written onto an Array before", () => {
        const draft = normalizeDraft(legacyServicesContent());
        writeDotted(draft, "services.items", [
            ...draft.services.items,
            { title: "Day Use", desc: "9am to 5pm.", price: "1,200" },
        ]);

        const saved = overTheWire(draft);
        expect(saved.services.items).toHaveLength(4);
        expect(saved.services.items[3].title).toBe("Day Use");
    });

    it("editing one row leaves its siblings byte-identical after save", () => {
        const draft = normalizeDraft(legacyServicesContent());
        const before = overTheWire(draft.services.items);

        writeDotted(draft, "services.items.1.desc", "Sleeps four, sea view.");
        const saved = overTheWire(draft);

        expect(saved.services.items).toHaveLength(3);
        // The untouched rows must come out the far end unchanged, key for key.
        expect(JSON.stringify(saved.services.items[0])).toBe(JSON.stringify(before[0]));
        expect(JSON.stringify(saved.services.items[2])).toBe(JSON.stringify(before[2]));
        // The edited row keeps every key the admin did not touch.
        expect(saved.services.items[1].desc).toBe("Sleeps four, sea view.");
        expect(saved.services.items[1].title).toBe("Loft Room");
        expect(saved.services.items[1].price).toBe("4,100");
    });

    it("wraps a bare array into { items } so the schema's primary path resolves", () => {
        const d = normalizeDraft(legacyServicesContent());
        expect(Array.isArray(d.services)).toBe(false);
        expect(d.services.items).toHaveLength(3);
        // Untouched sibling content is still carried through.
        expect(d.business_name).toBe("Kubo Stays");
    });

    it("aliases the legacy row names onto the ones the schema edits", () => {
        const d = normalizeDraft(legacyServicesContent());
        expect(d.services.items[0].title).toBe("Garden Room");             // name -> title
        expect(d.services.items[0].desc).toBe("Queen bed, own balcony.");  // description -> desc
        // The originals survive, so the .astro components' own fallbacks and
        // lib/astro-builder.ts keep working on the very same object.
        expect(d.services.items[0].name).toBe("Garden Room");
        expect(d.services.items[0].description).toBe("Queen bed, own balcony.");
        // Keys that are neither aliased nor known pass straight through.
        expect(d.services.items[0].price).toBe("3,200");
    });

    it("does not let the services aliases clobber an already-correct row", () => {
        const d = normalizeDraft({
            services: [
                { title: "Set by hand", desc: "Edited copy", name: "old", description: "old" },
            ],
        });
        expect(d.services.items[0].title).toBe("Set by hand");
        expect(d.services.items[0].desc).toBe("Edited copy");
    });

    it("leaves an already-wrapped services block alone, wrapper keys and all", () => {
        // What a submission saved through v1 (or through this fix) looks like
        // when it comes back from the server.
        const already = {
            tag: "What we do",
            headline: "Three rooms",
            sub: "Book one or take the lot.",
            ctaLabel: "Enquire",
            items: [{ title: "Garden Room", desc: "Queen bed.", price: "3,200" }],
        };
        const d = normalizeDraft({ services: already });

        expect(d.services).toEqual(already);
        expect(d.services.tag).toBe("What we do");
        expect(d.services.headline).toBe("Three rooms");
        expect(d.services.sub).toBe("Book one or take the lot.");
        expect(d.services.ctaLabel).toBe("Enquire");
        expect(d.services.items).toHaveLength(1);
    });

    it("still aliases the rows inside an already-wrapped block", () => {
        // The half-migrated shape: someone wrapped the block but the rows still
        // carry the AI's field names.
        const d = normalizeDraft({
            services: { tag: "Rooms", items: [{ name: "Loft", description: "Sleeps four." }] },
        });
        expect(d.services.tag).toBe("Rooms");
        expect(d.services.items[0].title).toBe("Loft");
        expect(d.services.items[0].desc).toBe("Sleeps four.");
    });

    it("does not invent a services block where there was none", () => {
        // An undefined block must stay undefined — normalizing must never write
        // an empty {items: []} over a template's own defaults.
        expect(normalizeDraft({ business_name: "X" }).services).toBeUndefined();
        expect(normalizeDraft({ services: undefined }).services).toBeUndefined();
        expect(normalizeDraft({ services: null }).services).toBeNull();
        // And nothing lands on the wire either.
        expect("services" in overTheWire(normalizeDraft({ business_name: "X" }))).toBe(false);
    });

    it("passes malformed services through without throwing", () => {
        expect(() => normalizeDraft({ services: "Haircuts, colour" })).not.toThrow();
        expect(normalizeDraft({ services: "Haircuts, colour" }).services).toBe("Haircuts, colour");
        expect(normalizeDraft({ services: 42 }).services).toBe(42);
        expect(normalizeDraft({ services: true }).services).toBe(true);
        // An object with no items[] anywhere is returned as-is, not wrapped.
        expect(normalizeDraft({ services: { headline: "Just a heading" } }).services)
            .toEqual({ headline: "Just a heading" });
    });

    it("handles rows that are not objects", () => {
        const d = normalizeDraft({ services: ["Haircut", null, 42, undefined] });
        expect(d.services.items).toHaveLength(4);
        expect(d.services.items[0]).toBe("Haircut");
        expect(d.services.items[1]).toBeNull();
        expect(d.services.items[2]).toBe(42);
    });

    // ── IDEMPOTENCE ──────────────────────────────────────────────────────
    // normalizeDraft runs at THREE seed points (useEditorDraft.ts:150, :279,
    // :293) and, critically, on the right-hand side of the clean-sync equality
    // test at :290. If a second pass differs from the first by so much as a key
    // ORDER, that test reads as permanently dirty and the editor SILENTLY STOPS
    // ADOPTING SERVER UPDATES. The stringify assertion below is the production
    // predicate itself (`j()`), not a proxy for it.
    //
    // This is the trap the credentials aliases already fell into once: detail ->
    // body plus body -> desc is a CHAIN, and ordering it wrongly made the second
    // pass derive a desc the first pass did not. services' two aliases (name ->
    // title, description -> desc) share no key, so they cannot chain — these
    // cases exist to keep it that way.
    const idempotenceCases: Array<[string, any]> = [
        ["a bare array", { services: [{ name: "A", description: "a" }] }],
        ["the wrapped shape", { services: { tag: "t", items: [{ title: "A", desc: "a" }] } }],
        ["a wrapper whose rows still use legacy names", { services: { items: [{ name: "A", description: "a" }] } }],
        ["mixed legacy and already-correct rows", {
            services: [
                { name: "A", description: "a" },
                { title: "B", desc: "b" },
                { name: "C", desc: "c" },
                { title: "D", description: "d" },
            ],
        }],
        ["rows that are not objects", { services: ["Haircut", null, 42, undefined] }],
        ["an empty array", { services: [] }],
        ["an empty wrapper", { services: { headline: "h", items: [] } }],
        ["a bare array alongside every sibling block", legacyServicesContent()],
        ["services next to the Groq-shaped blocks", { ...groqShapedContent(), ...legacyServicesContent() }],
    ];

    it.each(idempotenceCases)("is idempotent for %s", (_label, input) => {
        const once = normalizeDraft(input);
        const twice = normalizeDraft(once);
        expect(twice).toEqual(once);
        // The exact comparison the clean-sync guard performs.
        expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    });

    it("stays idempotent after the sidebar has written to a row", () => {
        // The realistic sequence: seed, admin types, server pushes the saved
        // content back, hook re-normalizes to compare. A third pass must still
        // be a no-op or the adopt path breaks after the very first edit.
        const draft = normalizeDraft(legacyServicesContent());
        writeDotted(draft, "services.items.0.title", "Garden Room (renovated)");
        const roundTripped = overTheWire(draft);

        const once = normalizeDraft(roundTripped);
        expect(JSON.stringify(normalizeDraft(once))).toBe(JSON.stringify(once));
        // And a clean editor comparing its draft against the freshly saved
        // server content reads as CLEAN, which is what lets it adopt at all.
        expect(JSON.stringify(once)).toBe(JSON.stringify(normalizeDraft(roundTripped)));
    });
});

/**
 * FOOTER.SOCIAL — the same bug one level in, and the reason it is worse.
 *
 * The producer writes the links as `footer.social_links`
 * (app/api/generate-website/route.ts:894). The sidebar schema edits
 * `footer.social` and declares `fallbackPaths: ['footer.social_links']`
 * (genericContentSchema.ts:757-766). So:
 *
 *   1. READING works. ListField falls through to the fallback and the panel
 *      shows all three links — the same false health that made services worse
 *      than its siblings.
 *   2. WRITING a row does not. Each row input commits ONE leaf at
 *      `footer.social.<n>.<key>`, and `footer.social` does not exist, so
 *      setValue mints a fresh array with a hole at every index before `<n>`.
 *   3. JSON.stringify turns those holes into `null`. Unlike services this write
 *      LANDS — the toast is honest — and the siblings arrive at Convex as nulls.
 *      barbershop/footer/FooterF.astro:33 then dereferences `s.url` on one and
 *      the rebuild THROWS.
 *
 * normalizeBlockEditor cannot express this one: services' fallback was the
 * block's OWN key (a bare array AT `services`), which is a block-shape change.
 * This fallback is a SIBLING key inside `footer`, so it is a hoist within the
 * footer object.
 */

/** What generate-website stores for a site with social links. */
const footerSocialContent = () => ({
    business_name: "Villa Marilag",
    footer: {
        brand_blurb: "Beachfront rooms in San Juan, Batangas.",
        visit: { lines: ["Barangay Laiya", "0917 555 0134"] },
        social_links: [
            { platform: "Instagram", url: "https://instagram.com/villamarilag" },
            { platform: "Facebook", url: "https://facebook.com/villamarilag" },
            { platform: "TikTok", url: "https://tiktok.com/@villamarilag" },
        ],
    },
});

/**
 * What every footer .astro does with the block, verbatim from
 * barbershop/footer/FooterF.astro:16-18. `layout.socialLinks` is
 * `content.footer?.social_links` (lib/astro-builder.ts:354). This is how the
 * tests below check that the hoist keeps the PAGE showing what the PANEL shows.
 */
const socialAsRendered = (saved: any): Array<{ platform: string; url: string }> => {
    const f = saved.footer || {};
    return Array.isArray(f.social) && f.social.length
        ? f.social
        : (Array.isArray(f.social_links) ? f.social_links : []);
};

/** What ListField displays: primary path, else the fallback (ContentFieldsAuto.tsx:511-518). */
const socialAsListed = (draft: any): any[] => {
    const f = draft.footer || {};
    let raw = f.social;
    if (!Array.isArray(raw) || raw.length === 0) raw = f.social_links;
    return Array.isArray(raw) ? raw : [];
};

describe("draft normalization · footer.social (the list a row edit turned to nulls)", () => {
    it("PROVES THE BUG: editing row 2 of 3 saves [null, {…}] and drops the rest", () => {
        // No normalization — the panel is showing three links read through the
        // fallback, and the admin fixes the Facebook URL on the second one.
        const draft: any = { ...footerSocialContent() };
        expect(socialAsListed(draft)).toHaveLength(3);

        writeDotted(draft, "footer.social.1.url", "https://facebook.com/villamarilag.ph");

        const saved = overTheWire(draft);
        // The write LANDED — this is why the toast was honest and nobody looked.
        expect(saved.footer.social[1].url).toBe("https://facebook.com/villamarilag.ph");
        // …and this is the damage: a two-element array whose first row is null,
        // in place of the three links the panel was showing.
        expect(saved.footer.social).toEqual([null, { url: "https://facebook.com/villamarilag.ph" }]);
        // The page now prefers that array (non-empty), so three links become two,
        // one of them a null that FooterF.astro:33 dereferences as `s.url`.
        const rendered = socialAsRendered(saved);
        expect(rendered).toHaveLength(2);
        expect(rendered[0]).toBeNull();
        expect(() => rendered.map((s: any) => s.url)).toThrow(TypeError);
        // The Instagram and TikTok rows are simply gone.
        expect(rendered.some((s: any) => s?.platform === "Instagram")).toBe(false);
    });

    it("PROVES THE FIX: the same keystroke leaves all three links intact", () => {
        const draft = normalizeDraft(footerSocialContent());
        writeDotted(draft, "footer.social.1.url", "https://facebook.com/villamarilag.ph");

        const saved = overTheWire(draft);
        expect(saved.footer.social).toHaveLength(3);
        expect(saved.footer.social.every((s: any) => s && typeof s === "object")).toBe(true);
        expect(saved.footer.social[1].url).toBe("https://facebook.com/villamarilag.ph");
        // The edited row keeps the key the admin did not touch…
        expect(saved.footer.social[1].platform).toBe("Facebook");
        // …and the untouched rows come out byte-identical.
        expect(JSON.stringify(saved.footer.social[0]))
            .toBe(JSON.stringify(footerSocialContent().footer.social_links[0]));
        expect(JSON.stringify(saved.footer.social[2]))
            .toBe(JSON.stringify(footerSocialContent().footer.social_links[2]));
    });

    it("keeps the page and the panel on the same list after the hoist", () => {
        const draft = normalizeDraft(footerSocialContent());
        writeDotted(draft, "footer.social.1.url", "https://facebook.com/villamarilag.ph");
        const saved = overTheWire(draft);

        // Every footer .astro prefers `f.social` when it is a non-empty array,
        // so the rendered list IS the edited list — no desync with
        // layout.socialLinks, which the hoist emptied on purpose.
        expect(socialAsRendered(saved)).toEqual(saved.footer.social);
        expect(socialAsRendered(saved)).toEqual(socialAsListed(saved));
        // Stated as what the visitor sees, because page == panel is also true
        // when BOTH are broken — that is exactly the state this fix removes.
        expect(socialAsRendered(saved).map((s: any) => s.platform))
            .toEqual(["Instagram", "Facebook", "TikTok"]);
    });

    it("hoists the links onto the path the schema actually edits", () => {
        const d = normalizeDraft(footerSocialContent());
        expect(d.footer.social).toHaveLength(3);
        expect(d.footer.social[0].platform).toBe("Instagram");
        // The legacy key is REMOVED, so ListField's fallback can never fire
        // again — which is what stops "remove every row" from resurrecting the
        // old links on the next render.
        expect("social_links" in d.footer).toBe(false);
    });

    it("carries every other footer key through untouched", () => {
        const d = normalizeDraft(footerSocialContent());
        expect(d.footer.brand_blurb).toBe("Beachfront rooms in San Juan, Batangas.");
        expect(d.footer.visit.lines).toEqual(["Barangay Laiya", "0917 555 0134"]);
        expect(d.business_name).toBe("Villa Marilag");
    });

    it("does not clobber a footer.social the admin already has", () => {
        const d = normalizeDraft({
            footer: {
                social: [{ platform: "Instagram", url: "https://instagram.com/new" }],
                social_links: [{ platform: "Instagram", url: "https://instagram.com/old" }],
            },
        });
        expect(d.footer.social).toEqual([{ platform: "Instagram", url: "https://instagram.com/new" }]);
        // And the legacy copy is LEFT ALONE in that state. There is no bug to fix
        // (the primary exists, so row writes are not destructive), and on a draft
        // already truncated by this bug it is the only surviving copy of the
        // original links.
        expect(d.footer.social_links).toEqual([{ platform: "Instagram", url: "https://instagram.com/old" }]);
    });

    it("hoists over an EMPTY footer.social, because that is what the panel does", () => {
        // ContentFieldsAuto.tsx:513 treats [] as absent and falls through to the
        // fallback — so [] is showing the fallback and has the same bug.
        const d = normalizeDraft({
            footer: { social: [], social_links: [{ platform: "Facebook", url: "https://fb.com/x" }] },
        });
        expect(d.footer.social).toEqual([{ platform: "Facebook", url: "https://fb.com/x" }]);
        expect("social_links" in d.footer).toBe(false);
    });

    it("does not invent a footer on content that has none", () => {
        expect(normalizeDraft({ business_name: "X" }).footer).toBeUndefined();
        expect(normalizeDraft({ footer: undefined }).footer).toBeUndefined();
        expect(normalizeDraft({ footer: null }).footer).toBeNull();
        // Nothing lands on the wire either.
        expect("footer" in overTheWire(normalizeDraft({ business_name: "X" }))).toBe(false);
    });

    it("leaves a footer with no social_links exactly as it was", () => {
        const footer = { brand_blurb: "b", hours: [{ day: "Mon", time: "9-5" }] };
        const d = normalizeDraft({ footer });
        expect(d.footer).toEqual(footer);
        expect("social" in d.footer).toBe(false);
    });

    it("passes malformed footers through without throwing", () => {
        expect(() => normalizeDraft({ footer: "Just a blurb" })).not.toThrow();
        expect(normalizeDraft({ footer: "Just a blurb" }).footer).toBe("Just a blurb");
        expect(normalizeDraft({ footer: 42 }).footer).toBe(42);
        // A footer that is itself an ARRAY is not a footer object — leave it be
        // rather than hanging a `social` property on an Array, which is the very
        // shape JSON.stringify drops.
        const arrFooter = [{ platform: "IG" }] as any;
        expect(normalizeDraft({ footer: arrFooter }).footer).toBe(arrFooter);
        // social_links that is not an array is not the list we are hoisting.
        expect(normalizeDraft({ footer: { social_links: "https://instagram.com/x" } }).footer)
            .toEqual({ social_links: "https://instagram.com/x" });
    });

    it("hoists an empty social_links too, so the key never lingers", () => {
        // generate-website:898 writes `social_links: []` as the DEFAULT footer for
        // every site with no extracted footer, so this is the common case.
        const d = normalizeDraft({ footer: { social_links: [] } });
        expect(d.footer).toEqual({ social: [] });
        // Renders as nothing either way — `|| []` at astro-builder.ts:354.
        expect(socialAsRendered(overTheWire(d))).toEqual([]);
    });

    // ── IDEMPOTENCE ──────────────────────────────────────────────────────
    // normalizeDraft runs at three seed points AND on the right-hand side of the
    // clean-sync equality test (useEditorDraft.ts:489). A second pass that
    // differs by so much as key ORDER reads as permanently dirty and the editor
    // SILENTLY STOPS ADOPTING SERVER UPDATES. The hoist is self-limiting for the
    // same reason it is safe: it keys off `social_links`, which it removes.
    const footerIdempotenceCases: Array<[string, any]> = [
        ["the producer's shape", footerSocialContent()],
        ["an empty social_links", { footer: { social_links: [] } }],
        ["an empty social beside a full social_links", { footer: { social: [], social_links: [{ platform: "IG", url: "u" }] } }],
        ["a social that already won", { footer: { social: [{ platform: "IG", url: "new" }], social_links: [{ platform: "IG", url: "old" }] } }],
        ["a footer with no social at all", { footer: { brand_blurb: "b", notes: ["(c) 2026"] } }],
        ["no footer at all", { business_name: "X" }],
        ["a malformed footer", { footer: "Just a blurb" }],
        ["footer.social rows that are not objects", { footer: { social_links: ["https://ig.com/x", null, 42] } }],
        ["footer beside every other normalized block", { ...groqShapedContent(), ...footerSocialContent() }],
    ];

    it.each(footerIdempotenceCases)("is idempotent for %s", (_label, input) => {
        const once = normalizeDraft(input);
        const twice = normalizeDraft(once);
        expect(twice).toEqual(once);
        // The exact comparison the clean-sync guard performs.
        expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
        // And a third pass, because the guard runs on every render.
        expect(JSON.stringify(normalizeDraft(twice))).toBe(JSON.stringify(once));
    });

    it("stays idempotent after the sidebar has written to a row", () => {
        // Seed → admin edits → server pushes the saved content back → the hook
        // re-normalizes to compare. If this drifted, the editor would stop
        // adopting server updates after the very first social edit.
        const draft = normalizeDraft(footerSocialContent());
        writeDotted(draft, "footer.social.1.url", "https://facebook.com/villamarilag.ph");
        const roundTripped = overTheWire(draft);

        const once = normalizeDraft(roundTripped);
        expect(JSON.stringify(normalizeDraft(once))).toBe(JSON.stringify(once));
        // A clean editor comparing its draft against the freshly saved server
        // content reads as CLEAN, which is what lets it adopt at all.
        expect(JSON.stringify(once)).toBe(JSON.stringify(normalizeDraft(roundTripped)));
    });

    it("survives the whole add / edit / remove cycle the panel offers", () => {
        const draft = normalizeDraft(footerSocialContent());
        // "+ Add" writes the WHOLE array (ListField.handleAdd).
        writeDotted(draft, "footer.social", [...draft.footer.social, { platform: "YouTube", url: "https://youtube.com/@vm" }]);
        // A row input writes one leaf.
        writeDotted(draft, "footer.social.3.url", "https://youtube.com/@villamarilag");
        // "Remove" writes the whole array again.
        writeDotted(draft, "footer.social", draft.footer.social.filter((_: any, i: number) => i !== 0));

        const saved = overTheWire(draft);
        expect(saved.footer.social).toHaveLength(3);
        expect(saved.footer.social.map((s: any) => s.platform)).toEqual(["Facebook", "TikTok", "YouTube"]);
        expect(saved.footer.social[2].url).toBe("https://youtube.com/@villamarilag");
        expect(socialAsRendered(saved)).toEqual(saved.footer.social);
    });
});

describe('normalizeDraft — trust and gallery, the two blocks whose components accept a bare array', () => {
    // 37 Trust*.astro and 36 Gallery*.astro read
    //   Array.isArray(x.cells) ? x.cells : (Array.isArray(x) ? x : [])
    // so the bare shape RENDERS. Undefended it also swallows every write: the
    // leaf lands on a named property of an Array and JSON.stringify drops it,
    // with a success toast. trust is reachable today — groq.service.ts admits
    // it with `typeof parsed.trust === 'object'`, and typeof [] is "object".

    const save = (o: any) => JSON.parse(JSON.stringify(o));

    it('wraps a bare trust array into { cells } so a row write can land', () => {
        const out = normalizeDraft({ trust: [{ num: '2014', label: 'Est.' }, { num: '4.9', label: 'Rating' }] });
        expect(Array.isArray(out.trust)).toBe(false);
        expect(out.trust.cells).toHaveLength(2);
        expect(out.trust.cells[0]).toEqual({ num: '2014', label: 'Est.' });
    });

    it('wraps a bare gallery array into { items }', () => {
        const out = normalizeDraft({ gallery: [{ image: 'p0.jpg' }, { image: 'p1.jpg' }] });
        expect(out.gallery.items).toHaveLength(2);
    });

    it('PROVES IT: a trust row edit survives the save it used to be dropped by', () => {
        // Unnormalised — the shape the pipeline can hand us today.
        const bare: any = { trust: [{ num: '2014' }, { num: '4.9' }] };
        (bare.trust as any).cells = [{ num: '2014', label: 'Established' }];
        expect(save(bare).trust.cells).toBeUndefined();          // the old behaviour

        // Normalised first, the same edit is an ordinary array write.
        const out: any = normalizeDraft({ trust: [{ num: '2014' }, { num: '4.9' }] });
        out.trust.cells = out.trust.cells.slice();
        out.trust.cells[0] = { ...out.trust.cells[0], label: 'Established' };
        expect(save(out).trust.cells[0].label).toBe('Established');
        expect(save(out).trust.cells).toHaveLength(2);           // sibling intact
    });

    it('leaves a normal trust OBJECT alone — it has no cells array to hoist', () => {
        const normal = { trust: { years: '10', licenses: ['a'], memberships: ['b'] } };
        expect(normalizeDraft(normal).trust).toEqual(normal.trust);
    });

    it('leaves an already-wrapped gallery alone and keeps its wrapper keys', () => {
        const g = { gallery: { tag: 'Gallery', headline: 'Our work', items: [{ image: 'a' }] } };
        const out = normalizeDraft(g);
        expect(out.gallery.tag).toBe('Gallery');
        expect(out.gallery.headline).toBe('Our work');
        expect(out.gallery.items).toEqual([{ image: 'a' }]);
    });

    it('is idempotent for both, in every shape', () => {
        const shapes: any[] = [
            { trust: [{ num: '1' }] },
            { trust: { years: '10' } },
            { trust: { cells: [{ num: '1' }] } },
            { trust: null },
            { trust: 'nonsense' },
            { gallery: [{ image: 'a' }] },
            { gallery: { items: [] } },
            { gallery: undefined },
        ];
        for (const x of shapes) {
            const once = normalizeDraft(x);
            expect(JSON.stringify(normalizeDraft(once))).toBe(JSON.stringify(once));
        }
    });
});
