/**
 * balanceInlineHtml — close the inline tags owner copy left open.
 *
 * WHY THIS EXISTS
 * ---------------
 * Templates print owner copy with Astro's `set:html` (1102 call sites across
 * 678 components). Nothing between the copy and the page balances its tags, so
 * a single unclosed `<em>` in `about.paragraphs.0` is handed to the browser's
 * HTML parser raw — and the parser does two things with it that look like CSS
 * bugs but are not:
 *
 *   1. It does NOT stop at the enclosing `</p>`. `em` is on the parser's list
 *      of *active formatting elements*, so after the paragraph closes the
 *      parser RE-OPENS it around the next block ("reconstruct the active
 *      formatting elements"). The italic runs through the rest of the section
 *      and into the sections after it, until something pops it off.
 *   2. Inside a flex row the reconstructed element becomes the row's only
 *      child, so both spans end up INSIDE it and `justify-content:
 *      space-between` has nothing left to space. That is the "jammed spec
 *      cells" symptom.
 *
 * The producers are `lib/services/groq.service.ts`, whose prompt explicitly
 * asks the model for `<em>highlight</em>` in headlines, and the admin editor,
 * whose own hint tells admins to "wrap a phrase in <em>…</em> to print it in
 * the accent colour". Both can emit a half-written tag; neither validates.
 *
 * WHERE IT IS CALLED
 * ------------------
 * `lib/astro-builder.ts` runs `balanceInlineHtmlDeep()` over the whole content
 * tree on its way out of `transformToAstroData()` — one choke point, before
 * `site-data.json` is written, which every template reads. That also repairs
 * content ALREADY stored in Convex, on the next rebuild.
 *
 * THE RULE IS DELIBERATELY CONSERVATIVE
 * -------------------------------------
 * This is not a sanitiser and must never become one. It performs exactly three
 * edits, and no others:
 *
 *   • append `</tag>` at the END of the string for each whitelisted inline tag
 *     left open, innermost first — or, if the string ends mid-`<`, immediately
 *     before that fragment, where the parser can still read them;
 *   • insert the closers a mis-nested `</tag>` skipped over, immediately
 *     before that closer (`<em><strong>x</em>` → `<em><strong>x</strong></em>`),
 *     because otherwise `strong` still leaks into the next section;
 *   • delete a whitelisted closing tag that was never opened — but only where
 *     removing those bytes cannot splice the text on either side into a tag.
 *
 * Every other byte is copied through verbatim. Text, entities (`&amp;`,
 * `&nbsp;`, `&#39;`), whitespace and attributes are never decoded, re-encoded,
 * escaped, reordered or normalised — the function slices the input and never
 * rewrites a slice. A string that needs no repair is returned BY IDENTITY, not
 * as an equal copy.
 *
 * That invariant is what makes the angle brackets in ordinary prose safe. The
 * scanner only recognises a tag when the bytes match a strict tag grammar AND
 * the name is on the whitelist; anything else is prose:
 *
 *   "opens at 9 < 10"          — `<` + space is not a tag name
 *   "a <> b", "5 < 6 > 4"      — ditto
 *   "mail me <paul@x.com>"     — a tag name may only be followed by
 *                                whitespace, `/` or `>`, never `@`
 *   "…and then <"              — a bare trailing `<`
 *
 * all come back byte-identical. This is the case that decides whether the fix
 * is cosmetic or content-destroying, so it is pinned in the tests.
 *
 * IT DOES NOT TOUCH CSS. The wrappers also feed `set:html` a `__overrideCss`
 * string (69 sites) — but that string is BUILT INSIDE the Astro template by
 * `buildOverrideCss(scheme, pairing)` in
 * `astro-site-template/src/lib/genericThemeOverrides.ts`, from two palette ids.
 * It is never carried in the content tree, so this pass never sees it. (Even
 * if it did: CSS contains no whitelisted inline tag, so it would come back
 * unchanged. There is a test pinning that.)
 */

/**
 * Tags this pass will open, close and re-order.
 *
 * The list is not taste — it is the HTML parser's own list of *active
 * formatting elements* (a, b, big, code, em, font, i, nobr, s, small, strike,
 * strong, tt, u), which are exactly the elements an unclosed tag can carry
 * PAST the enclosing block and into the following sections, plus four inline
 * wrappers that cannot cross a block boundary but still swallow the rest of
 * their own container — which is the flex-row half of the bug.
 *
 * Evidence for the ones this product actually emits today:
 *   • `em`     — groq.service.ts asks the model for `<em>highlight</em>` in
 *                headlines and headlineLines; the editor's own field hint
 *                documents it; the shipped sample site-data.json contains it.
 *   • `strong`, `b`, `i` — bold/italic, what an admin types by hand, and what
 *                the codebase's own HTML uses everywhere.
 *   • `span`   — how the templates wrap accent fragments.
 * The obsolete ones (big, font, nobr, strike, tt) cost nothing: nobody types
 * them, so they never change a byte — but if one ever arrives unbalanced it
 * reproduces this bug exactly, and it is cheaper to cover them now than to
 * rediscover the symptom on a customer page.
 */
const BALANCED_INLINE_TAGS: ReadonlySet<string> = new Set([
    // Active formatting elements — an unclosed one leaks across blocks.
    'a', 'b', 'big', 'code', 'em', 'font', 'i', 'nobr',
    's', 'small', 'strike', 'strong', 'tt', 'u',
    // Inline wrappers — an unclosed one swallows the rest of its container.
    'mark', 'span', 'sub', 'sup',
])

/**
 * Recognised, and deliberately NOT balanced.
 *
 * A void element cannot be "left open", so it must never reach the open-tag
 * stack — otherwise the end-of-string pass would emit `</br>`, inventing
 * markup that was never there. Its stray CLOSING form is left alone too: the
 * HTML parser reads `</br>` as a line break, so deleting it as an
 * "unopened closer" would silently remove a break the page renders today.
 *
 * This set exists so that a future editor adding `br` to the whitelist above —
 * the obvious-looking thing to do — finds the reason it is not there.
 */
const RECOGNISED_VOID_TAGS: ReadonlySet<string> = new Set(['br', 'wbr'])

/**
 * Tag grammar. Sticky so it can be anchored at a given `<` without slicing.
 *
 * Attributes are `[^>]*` — which means a `>` inside a quoted attribute value
 * ends the match early, where a real parser would carry on. That mis-parse is
 * harmless HERE and only here, because the parse result is used for one thing:
 * deciding whether to push or pop the open-tag stack. The bytes of the tag are
 * copied verbatim either way, so a mis-parsed attribute cannot corrupt output.
 *
 * `<` is NOT excluded from the attribute run, because the tokeniser does not
 * exclude it either: `<b <lily@tendso.com> text` is a real `<b>` element with
 * two attributes, and everything after it really is bold. Excluding `<` here
 * made this scanner read that as one unknown tag and walk past an element the
 * browser had left open — the leak, unrepaired.
 *
 * A tag name must be followed by whitespace, `/` or `>`. That single
 * restriction is what keeps `<paul@tendso.com>` prose instead of a `<paul>`
 * tag with attributes.
 *
 * END TAGS TAKE ATTRIBUTES TOO. `</em foo>` is a well-formed end tag — the
 * parser discards the attributes and closes the element. Reading it as prose
 * instead left `em` on this scanner's stack while the browser had already
 * closed it, and the end-of-string pass then appended a second, inert
 * `</em>`. Hence the same `(?:\s[^>]*)?` tail here as on the open form.
 */
const OPEN_TAG = /<([a-zA-Z][a-zA-Z0-9]*)(?:\s[^>]*)?\/?>/y
const CLOSE_TAG = /<\/([a-zA-Z][a-zA-Z0-9]*)(?:\s[^>]*)?>/y

/**
 * Is the text ending at `upTo` sitting inside an unterminated `<`?
 *
 * i.e. is there a `<` before `upTo` with no `>` between it and `upTo`. That
 * `<` is not a tag to this scanner, but it IS one to the browser's tokeniser,
 * which will keep consuming until it finds a `>` — including a `>` this pass
 * puts there, and including one that only becomes adjacent because this pass
 * deleted the bytes in between. Both of those are how a repair turns into
 * corruption, so both edits check here first:
 *
 *   `a<b</strong>> c`  — deleting the unopened `</strong>` would join `a<b`
 *                        to `>`, MINTING a real `<b>` element (and the leak
 *                        this module exists to stop) out of two pieces of
 *                        prose, and eating the `>` the reader typed.
 *   `<em>half a tag</` — appending `</em>` after it gives `</</em>`, which the
 *                        parser reads as a bogus comment: the closer is
 *                        swallowed, the `</` the owner typed disappears, and
 *                        the `<em>` is STILL open. The repair silently fails
 *                        in exactly the truncated-output case it exists for.
 */
function insideUnterminatedTag(input: string, upTo: number): boolean {
    if (upTo <= 0) return false
    const lt = input.lastIndexOf('<', upTo - 1)
    if (lt === -1) return false
    return input.lastIndexOf('>', upTo - 1) < lt
}

/**
 * Balance the whitelisted inline tags in one string.
 *
 * Returns the input BY IDENTITY when no repair was needed.
 */
export function balanceInlineHtml(input: string): string {
    if (typeof input !== 'string') return input
    // Fast path and, more importantly, the guarantee: no `<`, no tag, no work.
    if (input.indexOf('<') === -1) return input

    /** Names of tags opened and not yet closed, outermost first. */
    const open: string[] = []
    /** Output pieces. Only ever verbatim slices of `input` or `</name>`. */
    const out: string[] = []
    /** Start of the run of input not yet copied into `out`. */
    let pending = 0
    /** Scan position. */
    let i = 0
    /** Whether any repair happened at all — drives the identity return. */
    let repaired = false
    /**
     * Where the string runs into something the parser never gets out of — an
     * unterminated comment, or a `<` that puts the tokeniser in a tag with no
     * `>` left to end it. Everything from here on is inside that construct, so
     * it holds no markup, and any closer appended AFTER it would be swallowed
     * by it. -1 while the scan is still in ordinary text.
     */
    let truncatedAt = -1

    while (i < input.length) {
        const lt = input.indexOf('<', i)
        if (lt === -1) break

        // A comment is not markup — its contents are text the parser never
        // tokenises. Scanning inside one both invents closers for tags that
        // are not there (`<!-- <em> -->` gained a trailing `</em>`) and, worse,
        // spends a REAL closer on a commented-out one: `<em>a<!-- </em> -->b</em>`
        // is balanced input that came back unbalanced, leaking into the next
        // section — this module's own bug, manufactured by this module.
        if (input.startsWith('<!--', lt)) {
            // From lt + 2, not lt + 4, so the abrupt forms the parser also
            // closes — `<!-->` and `<!--->` — end here where they end there.
            const end = input.indexOf('-->', lt + 2)
            if (end === -1) {
                // An unterminated comment swallows the rest of the string.
                truncatedAt = lt
                break
            }
            i = end + 3
            continue
        }

        CLOSE_TAG.lastIndex = lt
        const close = CLOSE_TAG.exec(input)
        if (close) {
            const name = close[1].toLowerCase()
            const end = CLOSE_TAG.lastIndex
            // `</br>` and friends: the parser gives these a meaning of their
            // own. Pass them through untouched.
            if (RECOGNISED_VOID_TAGS.has(name)) {
                i = end
                continue
            }
            if (BALANCED_INLINE_TAGS.has(name)) {
                const depth = open.lastIndexOf(name)
                if (depth === -1) {
                    // Closing tag that was never opened. The parser ignores it,
                    // so dropping the token is pure tidying — and tidying is
                    // never worth minting markup, so it is skipped whenever the
                    // bytes on either side could close up into a tag.
                    if (!insideUnterminatedTag(input, lt)) {
                        out.push(input.slice(pending, lt))
                        pending = end
                        repaired = true
                    }
                } else {
                    if (depth !== open.length - 1) {
                        // Mis-nested: `<em><strong>x</em>`. Close what was
                        // opened inside, innermost first, right before this
                        // closer — otherwise those tags leak past the block.
                        out.push(input.slice(pending, lt))
                        for (let k = open.length - 1; k > depth; k--) out.push(`</${open[k]}>`)
                        pending = lt
                        repaired = true
                    }
                    open.length = depth
                }
            }
            i = end
            continue
        }

        OPEN_TAG.lastIndex = lt
        const opened = OPEN_TAG.exec(input)
        if (opened) {
            const name = opened[1].toLowerCase()
            // The trailing `/` in `<span/>` is deliberately ignored: outside
            // foreign content the HTML parser ignores it too and OPENS the
            // element, which is precisely the leak this module exists to stop.
            // Void elements never go on the stack.
            if (BALANCED_INLINE_TAGS.has(name) && !RECOGNISED_VOID_TAGS.has(name)) {
                open.push(name)
            }
            i = OPEN_TAG.lastIndex
            continue
        }

        // Not a tag this pass will touch — but that is not the same as "not a
        // tag". `<` followed by a letter, `/`, `!` or `?` takes the tokeniser
        // OUT of the data state, and it stays out until the next `>`,
        // swallowing everything in between as one bogus tag. So skip the same
        // span: reading markup inside it would see closers the browser never
        // sees (`<em>a<b</em>` closes nothing — `b</em` is the tag name) and
        // could delete or invent tags on the strength of it.
        const next = input.charCodeAt(lt + 1)
        const opensATag =
            next === 0x2f /* / */ || next === 0x21 /* ! */ || next === 0x3f /* ? */ ||
            (next >= 0x41 && next <= 0x5a) || (next >= 0x61 && next <= 0x7a)
        if (opensATag) {
            const gt = input.indexOf('>', lt + 1)
            if (gt === -1) {
                // The string ends inside that tag — nothing after it is markup.
                truncatedAt = lt
                break
            }
            i = gt + 1
            continue
        }

        // A `<` in prose: "under < 10 minutes", "I <3 this". The parser emits
        // it as text and carries straight on, so step over the one character
        // and keep scanning the rest of the sentence.
        i = lt + 1
    }

    if (!repaired && open.length === 0) return input

    // Where the missing closers go. Normally the very end — but not if the
    // string ends inside an unterminated `<`, because the parser is still in a
    // tag when it gets there and eats the closer whole (see
    // insideUnterminatedTag). `<em>Buy one get one free</` is not a contrived
    // case: a truncated model response or an admin who started typing a
    // closing tag lands exactly there, and that is the string this module is
    // supposed to save. So the closers go BEFORE that fragment, where the
    // parser is still in text and can read them.
    const tailAt = truncatedAt === -1 ? input.length : truncatedAt

    out.push(input.slice(pending, tailAt))
    for (let k = open.length - 1; k >= 0; k--) out.push(`</${open[k]}>`)
    if (tailAt < input.length) out.push(input.slice(tailAt))
    return out.join('')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') return false
    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
}

function walk(node: unknown): unknown {
    if (typeof node === 'string') return balanceInlineHtml(node)

    if (Array.isArray(node)) {
        let changed = false
        const next = node.map((item) => {
            const balanced = walk(item)
            if (balanced !== item) changed = true
            return balanced
        })
        return changed ? next : node
    }

    if (isPlainObject(node)) {
        let changed = false
        const next: Record<string, unknown> = {}
        for (const key of Object.keys(node)) {
            const value = node[key]
            const balanced = walk(value)
            if (balanced !== value) changed = true
            next[key] = balanced
        }
        return changed ? next : node
    }

    // Numbers, booleans, null, undefined, Dates, class instances — untouched.
    return node
}

/**
 * Balance every string in a content tree, at any depth, whatever the key.
 *
 * Generic on purpose. The bug is that ~740 `set:html` call sites read fields
 * nobody has enumerated, so enumerating the known ones here would leave the
 * same hole open one field over.
 *
 * Never mutates the input. Sub-trees that needed no repair are returned by
 * reference rather than copied — so the result may SHARE structure with the
 * argument. Callers must treat both as immutable, which is what
 * `transformToAstroData` does: it builds the tree, balances it, and hands it
 * straight to `JSON.stringify`.
 *
 * Object KEYS are never balanced; they are field names, not copy.
 */
export function balanceInlineHtmlDeep<T>(value: T): T {
    return walk(value) as T
}

/** Exported for tests and for anyone auditing what this pass considers markup. */
export const __inlineTagWhitelist = {
    balanced: BALANCED_INLINE_TAGS,
    void: RECOGNISED_VOID_TAGS,
} as const
