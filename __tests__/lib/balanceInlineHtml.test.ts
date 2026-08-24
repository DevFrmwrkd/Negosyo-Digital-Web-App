/**
 * One unclosed `<em>` in about.paragraphs.0 italicised the rest of the page.
 *
 * The templates print owner copy with `set:html` and nothing balances it, so
 * the browser's HTML parser gets the half-written tag raw. It does not stop at
 * the enclosing `</p>` — `em` is an active formatting element, so the parser
 * re-opens it after the block and every following section inherits the italic;
 * and inside a flex row the reconstructed element becomes the row's only child,
 * so `justify-content: space-between` has nothing left to space.
 *
 * These tests pin the repair AND the line it must not cross. The second half is
 * the important half: this pass runs over every string in the content tree, so
 * the day it mangles prose that merely CONTAINS an angle bracket, a cosmetic
 * bug becomes a content-destroying one.
 */
import { balanceInlineHtml, balanceInlineHtmlDeep } from "@/lib/balance-inline-html";
import { transformToAstroData } from "@/lib/astro-builder";

/** The reproduction, verbatim from the About block that broke the page. */
const BROKEN_PARAGRAPH =
    "Whether you are stopping by for a quick coffee, <em>sharing a meal with family and friends, or simply taking in the sea view.";
const FIXED_PARAGRAPH = BROKEN_PARAGRAPH + "</em>";

describe("the reproduction", () => {
    it("closes the unclosed <em> at the end of the string", () => {
        expect(balanceInlineHtml(BROKEN_PARAGRAPH)).toBe(FIXED_PARAGRAPH);
    });

    it("closes it wherever it sits in the tree — about.paragraphs.0", () => {
        const tree = {
            content: {
                about: {
                    tag: "About",
                    headline: "About Lily Kwek kwek",
                    paragraphs: [
                        BROKEN_PARAGRAPH,
                        "Get in touch and we'll walk you through what we can do for you.",
                    ],
                },
            },
        };

        const out = balanceInlineHtmlDeep(tree);

        expect(out.content.about.paragraphs[0]).toBe(FIXED_PARAGRAPH);
        // The sibling needed nothing and must be untouched.
        expect(out.content.about.paragraphs[1]).toBe(tree.content.about.paragraphs[1]);
    });

    it("survives the real builder: transformToAstroData emits it closed", async () => {
        const out: any = await transformToAstroData(
            {
                business_name: "Lily Kwek kwek",
                business_type: "restaurant",
                business_city: "General Trias",
                // Supplied so the geocoder never reaches the network.
                location: { lat: 14.3869, lng: 120.8817 },
                about: { paragraphs: [BROKEN_PARAGRAPH] },
            } as never,
            {} as never,
            [],
        );

        expect(out.content.about.paragraphs[0]).toBe(FIXED_PARAGRAPH);
    });

    it("does not mutate the caller's object", () => {
        const paragraphs = [BROKEN_PARAGRAPH];
        const tree = { content: { about: { paragraphs } } };

        balanceInlineHtmlDeep(tree);

        expect(tree.content.about.paragraphs).toBe(paragraphs);
        expect(paragraphs[0]).toBe(BROKEN_PARAGRAPH);
    });
});

describe("prose with an angle bracket comes back byte-identical", () => {
    // Each of these is a way to turn a cosmetic bug into a content-destroying
    // one. `toBe` on a string is a byte comparison; the function is also
    // expected to return the SAME reference, which these assertions pin.
    const untouched = [
        "We open at 9 < 10 minutes from the pier.",
        "a <> b",
        "5 < 6 > 4",
        "Mail the owner <lily@tendso.com> before Friday.",
        "Booking closes when the counter reads <",
        "Set the oven to <180C and wait.",
        "if (guests < 4) { table = small }",
        "Tom &amp; Jerry &nbsp; it's &#39;fine&#39; &lt;em&gt;not a tag&lt;/em&gt;",
        "No brackets here at all.",
        "",
    ];

    for (const s of untouched) {
        it(`leaves ${JSON.stringify(s)} exactly as it was`, () => {
            const out = balanceInlineHtml(s);
            expect(out).toBe(s);
        });
    }

    it("leaves an unknown tag alone rather than risk mangling prose", () => {
        // `<lily doe@tendso.com>` parses as a tag named `lily` under any tag
        // grammar. Neutralising unknown tags would destroy that sentence, so
        // the whitelist governs — at the cost of leaving this bug open for
        // tags nothing in the product emits.
        expect(balanceInlineHtml("Ask for <lily doe@tendso.com> at the desk.")).toBe(
            "Ask for <lily doe@tendso.com> at the desk.",
        );
        expect(balanceInlineHtml("<div>unclosed block")).toBe("<div>unclosed block");
        expect(balanceInlineHtml("stray </div> closer")).toBe("stray </div> closer");
    });

    it("leaves legitimate, balanced markup exactly as written", () => {
        const s = 'Roasted <em>daily</em> and <strong>served hot</strong>, <span class="x">always</span>.';
        expect(balanceInlineHtml(s)).toBe(s);
    });

    it("never re-encodes or reorders entities while repairing", () => {
        expect(balanceInlineHtml("<em>Tom &amp; Jerry&nbsp;&#39;s")).toBe(
            "<em>Tom &amp; Jerry&nbsp;&#39;s</em>",
        );
    });

    it("leaves CSS untouched", () => {
        // The templates' other set:html payload is __overrideCss, built inside
        // the Astro wrapper and never carried in the content tree. This pins
        // what would happen even if it were.
        const css =
            "html:root {\n  --gold: #E4B05E !important;\n  --ink: #1a1a1a !important;\n}\n.plate > img { width: 100% }";
        expect(balanceInlineHtml(css)).toBe(css);
    });
});

describe("what it repairs", () => {
    it("closes nested tags innermost first", () => {
        expect(balanceInlineHtml("<strong>hot <em>and fresh")).toBe(
            "<strong>hot <em>and fresh</em></strong>",
        );
    });

    it("drops a closing tag that was never opened", () => {
        expect(balanceInlineHtml("served hot</em> every day")).toBe("served hot every day");
        expect(balanceInlineHtml("</strong>")).toBe("");
    });

    it("repairs mis-nesting so the inner tag cannot leak past the block", () => {
        // Left alone, `strong` stays on the parser's active formatting list and
        // gets reconstructed around the NEXT section — the whole bug again.
        expect(balanceInlineHtml("<em><strong>x</em> y")).toBe("<em><strong>x</strong></em> y");
    });

    it("handles repeats of the same tag independently", () => {
        expect(balanceInlineHtml("<em>a</em> and <em>b")).toBe("<em>a</em> and <em>b</em>");
    });

    it("closes an element the parser opens despite a self-closing slash", () => {
        // Outside foreign content the HTML parser ignores the `/` and OPENS
        // the span, which is exactly the leak this module exists to stop.
        expect(balanceInlineHtml("<span/>rest of the line")).toBe(
            "<span/>rest of the line</span>",
        );
    });

    it("is case-insensitive about tag names", () => {
        expect(balanceInlineHtml("<EM>shouted")).toBe("<EM>shouted</em>");
        expect(balanceInlineHtml("<em>quiet</EM>")).toBe("<em>quiet</EM>");
    });

    it("keeps attributes verbatim, including a > inside a quoted value", () => {
        const s = '<em title="a > b">x</em>';
        expect(balanceInlineHtml(s)).toBe(s);
        expect(balanceInlineHtml('<a href="/menu?a=1&amp;b=2">Menu')).toBe(
            '<a href="/menu?a=1&amp;b=2">Menu</a>',
        );
    });
});

describe("void elements are recognised and never balanced", () => {
    it("never invents a </br>", () => {
        for (const s of ["one<br>two", "one<br/>two", "one<br />two", "one<wbr>two"]) {
            expect(balanceInlineHtml(s)).toBe(s);
        }
    });

    it("leaves a stray </br> alone — the parser reads it as a break", () => {
        expect(balanceInlineHtml("one</br>two")).toBe("one</br>two");
    });

    it("still balances around a <br>", () => {
        expect(balanceInlineHtml("<em>one<br>two")).toBe("<em>one<br>two</em>");
    });
});

describe("the deep walk", () => {
    it("reaches strings nested in objects and arrays at any depth", () => {
        const out = balanceInlineHtmlDeep({
            a: [{ b: { c: [["<em>deep"]] } }],
        });
        expect(out.a[0].b.c[0][0]).toBe("<em>deep</em>");
    });

    it("leaves non-strings alone and keeps them in place", () => {
        const tree = {
            lat: 14.3869,
            visible: true,
            missing: null,
            absent: undefined,
            photos: ["https://cdn.example.com/a.jpg"],
        };
        const out = balanceInlineHtmlDeep(tree);
        // Nothing needed repair, so the tree comes back by identity.
        expect(out).toBe(tree);
        expect(out.lat).toBe(14.3869);
        expect(out.visible).toBe(true);
        expect(out.missing).toBeNull();
        expect(out.photos[0]).toBe("https://cdn.example.com/a.jpg");
    });

    it("balances object VALUES, never object KEYS", () => {
        const out = balanceInlineHtmlDeep({ "<em>key": "value" });
        expect(Object.keys(out)).toEqual(["<em>key"]);
    });

    it("copies only the branches it changed", () => {
        const untouchedBranch = { headline: "Plain heading" };
        const tree = { about: { paragraphs: ["<em>x"] }, services: untouchedBranch };
        const out = balanceInlineHtmlDeep(tree);

        expect(out).not.toBe(tree);
        expect(out.about).not.toBe(tree.about);
        expect(out.services).toBe(untouchedBranch);
    });
});

/**
 * Regressions from the audit of this pass.
 *
 * Every case below was found by fuzzing the helper against a real HTML parser
 * (parse5) with three invariants: the visible text may not change, the output
 * may leave nothing open when the next block starts, and running the pass on
 * its own output must be a no-op. Each one is a way a "repair" turned into
 * damage, so each is pinned by the string that produced it.
 */
describe("the repair must never be worse than the break", () => {
    it("closes the tag BEFORE a half-typed tag at the end of the string", () => {
        // `</` at the end is the shape a truncated model response and a
        // half-typed closing tag both take — i.e. exactly the input this
        // module exists for. Appending after it produced `</</em>`, which the
        // parser reads as a bogus comment: the closer vanished, the `</` the
        // owner typed vanished with it, and the <em> was STILL open.
        expect(balanceInlineHtml("<em>Buy one get one free</")).toBe(
            "<em>Buy one get one free</em></",
        );
        expect(balanceInlineHtml("<em>Roasted daily</e")).toBe("<em>Roasted daily</em></e");
        // An unterminated comment swallows the rest of the string for the
        // parser too, so the closer has to go in front of that as well.
        expect(balanceInlineHtml("<em>a<!-- b")).toBe("<em>a</em><!-- b");
    });

    it("never deletes a stray closer if that would splice prose into a tag", () => {
        // Deleting the unopened `</strong>` joins `a<b` to `>` and MINTS a
        // real <b> element — the leak this module exists to stop, created by
        // this module, plus a `>` the reader typed and no longer sees.
        expect(balanceInlineHtml("a<b</strong>> c")).toBe("a<b</strong>> c");
        expect(balanceInlineHtml("sizes run 8<12</em> and > that")).toBe(
            "sizes run 8<12</em> and > that",
        );
        // Where nothing can close up, the tidy-up still happens.
        expect(balanceInlineHtml("served hot</em> every day")).toBe("served hot every day");
    });

    it("reads an end tag that carries attributes, as the parser does", () => {
        // `</em foo>` closes the element; treating it as prose left `em` on
        // the stack and appended a second, inert `</em>` at the end.
        expect(balanceInlineHtml("<em>y</em foo>")).toBe("<em>y</em foo>");
    });

    it("does not read markup inside a comment", () => {
        // Scanning inside a comment invented a closer for a tag that is not
        // there, and — worse — spent a REAL closer on a commented-out one,
        // turning balanced copy into the very leak this pass repairs.
        expect(balanceInlineHtml("<!-- <em> -->")).toBe("<!-- <em> -->");
        expect(balanceInlineHtml("<em>Fresh<!-- </em> -->daily</em>")).toBe(
            "<em>Fresh<!-- </em> -->daily</em>",
        );
        // `<!-->` is an abrupt-closed empty comment — it ends there.
        expect(balanceInlineHtml("<em>hot<!-->cold")).toBe("<em>hot<!-->cold</em>");
    });

    it("sees the elements the tokeniser sees, not the ones the regex wants", () => {
        // `<b <lily@tendso.com> …` is a real <b> with two attributes, and
        // everything after it really is bold. Reading it as one unknown tag
        // walked straight past an element the browser had left open.
        expect(balanceInlineHtml("<b <lily@tendso.com> bold from here")).toBe(
            "<b <lily@tendso.com> bold from here</b>",
        );
        // The other direction: `<b</em` is a TAG NAME to the parser, so that
        // `</em>` closes nothing and the <em> is still open.
        expect(balanceInlineHtml("<em>a<b</em>")).toBe("<em>a<b</em></em>");
    });

    it("is idempotent — a second build must not append a second closer", () => {
        const corpus = [
            BROKEN_PARAGRAPH,
            "<em>Buy one get one free</",
            "a<b</strong>> c",
            "<em><strong>x</em> y",
            "<em><strong>x</em></strong>",
            "<em>y</em foo>",
            "<em>Fresh<!-- </em> -->daily</em>",
            "<b <lily@tendso.com> bold",
            "<em>a<b</em>",
            "<em>a<!-- b",
            "served hot</em> every day",
            "<em>Open until 9 <",
            "Mail the owner <lily@tendso.com> before Friday.",
        ];
        for (const s of corpus) {
            const once = balanceInlineHtml(s);
            // Same value AND the same reference: a settled string is returned
            // by identity, which is what makes a rebuild a no-op.
            expect(balanceInlineHtml(once)).toBe(once);
        }
    });
});
