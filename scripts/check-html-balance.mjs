#!/usr/bin/env node
/**
 * Guards a BUILT customer page against unbalanced inline markup.
 *
 * Owner copy reaches the page through `set:html` — 678 components, ~740 call
 * sites — so whatever is stored for a field is written into the document raw.
 * One field that says
 *
 *     Whether you are stopping by for a quick coffee, <em>sharing a meal …
 *
 * with no closing tag does NOT simply italicise that sentence. Two things
 * happen, both in the HTML parser, neither of them fixable in CSS:
 *
 *   1. the unclosed <em> does not stop at </p>. <em> is one of the parser's
 *      "active formatting elements", so after the block closes it is RE-OPENED
 *      around the next block, and the one after that. Every heading, sub-line
 *      and ledger row to the end of the document inherits the italic.
 *   2. inside a flex row the reconstructed <em> becomes the row's only child,
 *      so both spans end up INSIDE it and `justify-content: space-between` has
 *      nothing left to space. That is the "jammed together" spec cell.
 *
 * Nothing between the model and the page checks the tag is closed:
 * lib/services/groq.service.ts asks for "<em>highlight</em>" in headlines, and
 * an admin can type into the same fields by hand. The balancer belongs in
 * lib/astro-builder.ts, at the one choke point every template reads from. THIS
 * script is the other half of that: proof, against real built output, that the
 * balancer is actually working — so this class of defect cannot ship silently
 * again.
 *
 * WHAT IT ASSERTS, over the built HTML:
 *   · no inline formatting element is left unclosed (either forced shut early
 *     by an enclosing close tag, or still open at end of document)
 *   · no closing tag appears without an opener
 *   · no comment, tag or raw-text block runs off the end of the document
 *
 * WHAT IT DELIBERATELY DOES NOT FLAG, because a check that cries wolf gets
 * switched off (every one of these is proved by a fixture in --self-test):
 *   · void elements — <br> <img> <input> <hr> <meta> <link> … never need a
 *     closer, and </br>-style closers are ignored the way a browser ignores them
 *   · XML self-closing syntax — <path/>, <img />
 *   · anything inside an attribute VALUE — title="a > b", data-x="<em>"
 *   · <script> and <style> contents — `a < b`, `div > p {}`, "</em>" in a string
 *   · <textarea> and <title> contents, which are text to the parser too
 *   · HTML comments, <!DOCTYPE>, and processing-instruction-ish junk
 *   · blocks with optional end tags — <p> closed by the next <p>, bare <li>,
 *     bare <td>. Browsers close those themselves and nothing inherits anything.
 *     Only an INLINE element caught in one of those closes is reported.
 *
 * Run:  node scripts/check-html-balance.mjs
 *       node scripts/check-html-balance.mjs path/to/other.html …
 *       node scripts/check-html-balance.mjs --self-test
 *
 * No CI job builds the astro site, so by default this reads
 * astro-site-template/dist/index.html and tells you to build if it is not there.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_TARGET = path.join(ROOT, "astro-site-template/dist/index.html");

/** Elements that never have an end tag. A closer for one is ignored, not stray. */
const VOID = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "param", "source", "track", "wbr",
    "basefont", "bgsound", "frame", "keygen", // legacy, still void in the parser
]);

/** Contents are TEXT to the parser, not markup. Skip to the matching end tag. */
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);

/**
 * The elements an unclosed tag actually damages.
 *
 * The first row is the HTML5 "list of active formatting elements" — the ones
 * the parser reconstructs after a block ends, which is how a single unclosed
 * tag reaches sections it never appeared in.
 *
 * The second row is not reconstructed, but an unclosed one still swallows the
 * siblings that follow it inside its own block — that is the flex-row half of
 * the bug, and is just as invisible.
 */
const INLINE = new Set([
    "a", "b", "big", "code", "em", "font", "i", "nobr", "s", "small", "strike", "strong", "tt", "u",
    "abbr", "bdi", "bdo", "cite", "del", "dfn", "ins", "kbd", "mark", "q", "samp", "span", "sub", "sup", "var",
]);

const RECONSTRUCTED = new Set(
    ["a", "b", "big", "code", "em", "font", "i", "nobr", "s", "small", "strike", "strong", "tt", "u"]);

const isSpace = (ch) => ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f";
const isAlpha = (ch) => (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");

/**
 * Read one start tag beginning at `lt`.
 *
 * Attribute values are read WITH their quoting, which is the whole point: a
 * value may legally contain < and >, and a scanner that stopped at the first
 * ">" would end the tag in the middle of `title="a > b"` and then read the
 * rest of the attribute as markup.
 */
function readStartTag(html, lt) {
    const n = html.length;
    let j = lt + 1;
    while (j < n && !isSpace(html[j]) && html[j] !== "/" && html[j] !== ">") j++;
    const name = html.slice(lt + 1, j).toLowerCase();

    while (j < n) {
        const ch = html[j];
        if (ch === ">") return { name, selfClosing: false, end: j + 1, raw: html.slice(lt, j + 1) };
        if (ch === "/" && html[j + 1] === ">") return { name, selfClosing: true, end: j + 2, raw: html.slice(lt, j + 2) };
        if (ch === "/" || isSpace(ch)) { j++; continue; }

        // attribute name
        while (j < n && !isSpace(html[j]) && html[j] !== "/" && html[j] !== ">" && html[j] !== "=") j++;
        while (j < n && isSpace(html[j])) j++;
        if (html[j] !== "=") continue;                        // valueless attribute
        j++;
        while (j < n && isSpace(html[j])) j++;

        const q = html[j];
        if (q === '"' || q === "'") {
            const close = html.indexOf(q, j + 1);
            if (close === -1) return { name, unterminated: true, end: n };
            j = close + 1;                                    // < and > inside are safe
        } else {
            while (j < n && !isSpace(html[j]) && html[j] !== ">") j++;
        }
    }
    return { name, unterminated: true, end: n };
}

/** Where the raw text of `name` ends: the first "</name" that follows it. */
function rawTextEnd(lower, from, name) {
    const needle = "</" + name;
    let k = from;
    for (;;) {
        const at = lower.indexOf(needle, k);
        if (at === -1) return -1;
        const after = lower[at + needle.length];
        // "</scriptable" is text; "</script>", "</script >" and "</script/" end it.
        if (after === undefined || after === ">" || after === "/" || isSpace(after)) return at;
        k = at + needle.length;
    }
}

/** The editor field this element belongs to, so a report names something fixable. */
const fieldOf = (raw) => (raw && /data-(?:image-)?field="([^"]*)"/.exec(raw)?.[1]) || null;

/** Nearest data-field on the open stack, for elements that carry none themselves. */
function currentField(stack, from = stack.length) {
    for (let k = Math.min(from, stack.length) - 1; k >= 0; k--) if (stack[k].field) return stack[k].field;
    return null;
}

/**
 * Walk the document and return every balance problem in it.
 *
 * Only INLINE names are reported as unclosed. Blocks with optional end tags
 * close themselves in every browser, so reporting those would be pure noise —
 * but an inline element caught inside one of those closes IS reported, because
 * that is exactly the shape the bug takes.
 */
export function findImbalances(html, { max = 40 } = {}) {
    const problems = [];
    const stack = [];
    const lower = html.toLowerCase();
    const n = html.length;
    let i = 0;

    while (i < n && problems.length < max) {
        const lt = html.indexOf("<", i);
        if (lt === -1) break;
        const c = html[lt + 1];

        // ── comments, doctype, bogus comments ─────────────────────────────
        if (c === "!") {
            if (lower.startsWith("<!--", lt)) {
                const end = html.indexOf("-->", lt + 4);
                if (end === -1) {
                    problems.push({ kind: "unterminated-comment", name: "!--", index: lt });
                    break;
                }
                i = end + 3;
                continue;
            }
            const gt = html.indexOf(">", lt);
            if (gt === -1) { problems.push({ kind: "unterminated-tag", name: "!", index: lt }); break; }
            i = gt + 1;
            continue;
        }
        if (c === "?") {
            const gt = html.indexOf(">", lt);
            if (gt === -1) { problems.push({ kind: "unterminated-tag", name: "?", index: lt }); break; }
            i = gt + 1;
            continue;
        }

        // ── end tag ───────────────────────────────────────────────────────
        if (c === "/") {
            if (!isAlpha(html[lt + 2] ?? "")) { i = lt + 1; continue; }   // "</>" — the parser ignores it
            let j = lt + 2;
            while (j < n && !isSpace(html[j]) && html[j] !== ">") j++;
            const name = html.slice(lt + 2, j).toLowerCase();
            const gt = html.indexOf(">", j);
            if (gt === -1) { problems.push({ kind: "unterminated-tag", name, index: lt }); break; }
            i = gt + 1;

            if (VOID.has(name)) continue;   // </br> etc — ignored, exactly as a browser ignores it

            let at = -1;
            for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name === name) { at = k; break; }
            if (at === -1) {
                problems.push({ kind: "stray-close", name, index: lt, field: currentField(stack) });
                continue;
            }
            // Everything above `at` is being force-closed by this tag.
            for (let k = stack.length - 1; k > at; k--) {
                const el = stack[k];
                if (!INLINE.has(el.name)) continue;
                problems.push({
                    kind: "unclosed", name: el.name, index: el.index,
                    field: el.field ?? currentField(stack, k),
                    closedBy: { name, index: lt },
                });
            }
            stack.length = at;
            continue;
        }

        // ── a literal "<" in text: "a < b" ────────────────────────────────
        if (!isAlpha(c ?? "")) { i = lt + 1; continue; }

        // ── start tag ─────────────────────────────────────────────────────
        const tag = readStartTag(html, lt);
        if (tag.unterminated) { problems.push({ kind: "unterminated-tag", name: tag.name, index: lt }); break; }
        i = tag.end;

        if (RAW_TEXT.has(tag.name) && !tag.selfClosing) {
            const end = rawTextEnd(lower, tag.end, tag.name);
            if (end === -1) {
                problems.push({ kind: "unclosed-rawtext", name: tag.name, index: lt });
                break;
            }
            const gt = html.indexOf(">", end);
            i = gt === -1 ? n : gt + 1;                       // past the </script> etc
            continue;
        }
        if (tag.selfClosing || VOID.has(tag.name)) continue;
        stack.push({ name: tag.name, index: lt, field: fieldOf(tag.raw) });
    }

    // Anything inline still open at the end of the document.
    for (const el of stack) {
        if (problems.length >= max) break;
        if (INLINE.has(el.name)) {
            problems.push({ kind: "unclosed", name: el.name, index: el.index, field: el.field, closedBy: null });
        }
    }
    return problems;
}

const posOf = (html, index) => {
    const upto = html.slice(0, index);
    const line = upto.split("\n").length;
    const col = index - (upto.lastIndexOf("\n") + 1) + 1;
    return { line, col };
};

const snippetOf = (html, index, span = 110) => {
    const before = html.slice(Math.max(0, index - span), index).replace(/\s+/g, " ");
    const after = html.slice(index, index + span).replace(/\s+/g, " ");
    return (index > span ? "…" : "") + before + "▶" + after + "…";
};

function describe(html, p) {
    const { line, col } = posOf(html, p.index);
    const where = `line ${line}, col ${col} (offset ${p.index})`;
    const head =
        p.kind === "unclosed"
            ? `UNCLOSED <${p.name}> opened at ${where}` +
              (p.closedBy
                  ? ` — forced shut by </${p.closedBy.name}> at offset ${p.closedBy.index}`
                  : " — still open at end of document")
            : p.kind === "stray-close"
                ? `STRAY </${p.name}> at ${where} — nothing opened it`
                : p.kind === "unterminated-comment"
                    ? `UNTERMINATED COMMENT at ${where} — it swallows the rest of the page`
                    : p.kind === "unclosed-rawtext"
                        ? `UNCLOSED <${p.name}> at ${where} — its raw text runs to the end of the page`
                        : `UNTERMINATED TAG <${p.name}> at ${where}`;
    const lines = ["  ✗ " + head];
    if (p.field) lines.push(`      owner field: ${p.field}`);
    if (p.kind === "unclosed" && RECONSTRUCTED.has(p.name))
        lines.push(`      <${p.name}> is a formatting element: the parser re-opens it after every following block, so everything below inherits it`);
    lines.push("      " + snippetOf(html, p.index));
    return lines.join("\n");
}

const FIXTURES = [
    // ── the bug itself, and its family ────────────────────────────────────
    {
        name: "unclosed <em> forced shut by </p> (the reported bug)",
        html: '<div><p data-field="about.paragraphs.0">a quick coffee, <em>sharing a meal.</p></div>',
        expect: ["unclosed:em"],
    },
    {
        name: "unclosed <em> in a flex row swallows both spans",
        html: '<div class="row"><span>Seats</span> <em>six<span>at the bar</span></div>',
        expect: ["unclosed:em"],
    },
    { name: "inline still open at end of document", html: "<p>text <strong>bold", expect: ["unclosed:strong"] },
    { name: "closing tag with no opener", html: "<p>text</strong></p>", expect: ["stray:strong"] },
    { name: "misnested <b><i>x</b></i>", html: "<p><b><i>x</b></i></p>", expect: ["stray:i", "unclosed:i"] },
    { name: "unterminated comment", html: "<p>ok</p><!-- oops", expect: ["unterminated-comment:!--"] },
    { name: "unterminated start tag", html: '<p>ok</p><div class="x', expect: ["unterminated-tag:div"] },
    { name: "unclosed <script>", html: "<p>ok</p><script>var a = 1;", expect: ["unclosed-rawtext:script"] },

    // ── things that must NOT be reported ──────────────────────────────────
    { name: "clean balanced page", html: "<!DOCTYPE html><html><body><p>a <em>b</em> c</p></body></html>", expect: [] },
    { name: "void elements need no closer", html: "<p>a<br>b<hr><img src=x><input value=y></p><link rel=z><meta charset=utf-8>", expect: [] },
    { name: "</br>-style closer on a void element is ignored", html: "<p>a</br>b</p>", expect: [] },
    { name: "XML self-closing syntax", html: '<img src="a"/><span class="x"/><svg><path d="M0 0"/><title>Map</title></svg>', expect: [] },
    { name: "attribute value containing > and <", html: '<div title="a > b" data-note="an unclosed <em> in a value">x</div>', expect: [] },
    { name: "single-quoted attribute containing >", html: "<div data-x='a > b'><em>y</em></div>", expect: [] },
    { name: "unquoted attribute value", html: "<div class=row data-i=1><em>y</em></div>", expect: [] },
    {
        name: "<script> contents are text, not markup",
        html: '<script>var a = 1; if (a < 2 && 3 > 2) { s = "<em>"; t = "</em>"; }</script><p>after</p>',
        expect: [],
    },
    {
        name: "<style> contents are text, not markup",
        html: '<style>.a > .b { content: "<em>"; } @media (min-width:40em){ .c{color:red} }</style><p>after</p>',
        expect: [],
    },
    { name: "<textarea> contents are text", html: "<textarea><em>not markup</textarea><p>after</p>", expect: [] },
    { name: "<title> contents are text", html: "<head><title>A > B <em></title></head><p>after</p>", expect: [] },
    { name: "comment containing tags", html: "<!-- <em> and </strong> --><p>after</p>", expect: [] },
    { name: "literal < in body text", html: "<p>a < b and 3 > 2</p>", expect: [] },
    { name: "optional end tags: <p> closed by the next <p>", html: "<div><p>one<p>two</div>", expect: [] },
    { name: "optional end tags: bare <li>", html: "<ul><li>a<li>b</ul>", expect: [] },
    { name: "optional end tags: bare <td> and <tr>", html: "<table><tr><td>a<td>b<tr><td>c</table>", expect: [] },
    { name: "uppercase tag names", html: "<P>a <EM>b</EM></P>", expect: [] },
    { name: "attributes spanning newlines", html: '<div\n  class="a"\n  data-field="about.lead"\n>\n<em>x</em></div>', expect: [] },
    { name: "doctype and processing junk", html: "<!DOCTYPE html><?xml stylesheet?><p>a</p>", expect: [] },
    { name: "astro scoped-class attributes", html: '<p class="lede" data-field="hero.sub" data-astro-cid-yadbxreb>a <em>b</em></p>', expect: [] },
    { name: "an element whose name starts with a raw-text name", html: "<p>a</p><scriptish>b</scriptish>", expect: [] },
];

function selfTest() {
    let failed = 0;
    for (const f of FIXTURES) {
        const got = findImbalances(f.html)
            .map((p) => (p.kind === "unclosed" ? "unclosed" : p.kind === "stray-close" ? "stray" : p.kind) + ":" + p.name)
            .sort();
        const want = [...f.expect].sort();
        const ok = got.join("|") === want.join("|");
        if (!ok) failed++;
        console.log(
            `  ${ok ? "✓" : "✗"} ${f.name}\n      expected [${want.join(", ") || "clean"}]  got [${got.join(", ") || "clean"}]`);
    }
    console.log(`\n${FIXTURES.length} fixtures, ${failed} failed`);
    if (failed) {
        console.error("SELF-TEST FAILED — the scanner does not behave as documented, so its verdict on a real page means nothing.");
        process.exit(1);
    }
    console.log("✓ self-test OK");
}

// ── main ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes("--self-test")) { selfTest(); process.exit(0); }

const targets = args.filter((a) => !a.startsWith("--")).map((a) => path.resolve(a));
if (!targets.length) targets.push(DEFAULT_TARGET);

let missing = 0;
let unbalanced = 0;
for (const file of targets) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (!fs.existsSync(file)) {
        console.error(
            `${rel}: no built page to check.\n` +
            "  Build one first:  cd astro-site-template && npx astro build\n" +
            "  (no CI job builds the astro site, so this file only exists after a build.)");
        missing++;
        continue;
    }
    const html = fs.readFileSync(file, "utf8");
    const problems = findImbalances(html);
    console.log(`${rel}: ${(html.length / 1024).toFixed(0)} KB scanned`);
    if (!problems.length) continue;
    unbalanced++;
    console.error(`\n${problems.length} unbalanced-markup problem(s) in ${rel}:\n`);
    for (const p of problems) console.error(describe(html, p) + "\n");
}

if (unbalanced) {
    console.error(
        "An inline tag left open does not stop at the end of its block. The parser re-opens it\n" +
        "after the block closes, so the sections AFTER it inherit the formatting too, and inside a\n" +
        "flex row it becomes the row's only child — which is why `justify-content: space-between`\n" +
        "suddenly spaces nothing.\n\n" +
        "The copy comes from the owner's fields (and from lib/services/groq.service.ts, which asks\n" +
        "the model for \"<em>highlight</em>\"). Fix it where every template reads from — the content\n" +
        "tree lib/astro-builder.ts writes to src/data/site-data.json — not in the 678 components.\n" +
        "Then rebuild and re-run:\n" +
        "  cd astro-site-template && npx astro build && cd .. && node scripts/check-html-balance.mjs\n");
    process.exit(1);
}
if (missing) process.exit(1);
console.log("✓ markup balance OK — every inline formatting element is closed, and no closing tag is orphaned");
