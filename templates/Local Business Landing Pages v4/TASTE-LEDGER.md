# TASTE-LEDGER.md

Append-only record of design judgments for the Local-Business Landing Pages series.
Every entry is dated and carries a mandatory `why:`. Newest entries go at the bottom of
each list. This ledger is the running memory of what makes these pages good — and what
gets a page rejected.

---

## LIKE ✅

- **2026-07-09 — Distinct character per bucket.**
  why: Nine buckets, nine genuinely different worlds — warm supper-club (food), stark fashion split (beauty), Swiss catalog (retail), motorsport spec-sheet (auto), calm Scandinavian clinic (medical), brutalist gym poster (fitness), perforated wash-ticket (services), ruled notebook (education), blueprint dispatch (trades). A stranger could never mistake one for another; that variety is the whole product.

- **2026-07-09 — No two pages share a hero architecture.**
  why: Full-bleed cinematic / vertical split / grid-masthead-with-giant-numerals / diagonal-seam / floating-card / viewport-filling-type / ticket-stub / ruled-paper-taped-photo / coverage-grid. Checked against each other up front; the hero is the first thing seen, so sameness there sinks the whole set.

- **2026-07-09 — One signature twist per page, executed properly.**
  why: A single structural idea done well (dish ticker, curtain-part split, index-number nav, rev-counter, credibility rail, class marquee + ledger, printing ticket, highlighter draw-ons, pulsing coverage map) beats five gimmicks. Each twist is tied to the business, not decoration.

- **2026-07-09 — Art-directed image placeholders, never grey boxes.**
  why: Every slot is a designed duotone frame in the page's own palette — grain, scrim, caption, a yellow crate-tag or a tape corner, and a real `role="img"` alt. Offline and self-contained, yet reads as a commissioned photography slot the operator just swaps an `<img>` into.

- **2026-07-09 — Finished, real sample content.**
  why: Believable named PH businesses, real cities, written copy with a voice. No "Business Name Here", no lorem, no `{{TOKENS}}`. The pages open looking like live sites, which is the bar.

- **2026-07-09 — The designer owns the visuals.**
  why: Layout, palette, type pairing, motion and density were decided per page to serve that business, not dropped into a shared template. The block set is constant; everything visual is bespoke.

- **2026-07-09 — Motion that reads with JS off.**
  why: Content is visible by default; reveal animations are opt-in via a `.js` class the page adds to itself, and every animation respects `prefers-reduced-motion`. The page is fully crawlable and readable with scripts disabled — enhancement, never dependency.

- **2026-07-09 — Hero visibility must not depend on the reveal observer.**
  why: lp-08 first shipped with a `data-reveal` hero that flashed blank because the IntersectionObserver hadn't fired at load. Above-the-fold hero content must paint via CSS load animation (or be visible by default), never gated on JS. Fixed, and now a rule.

- **2026-07-09 — GBP-bound slots for volatile data.**
  why: Hours, rating and review count live in clearly commented `data-gbp` slots with graceful non-volatile fallbacks ("live hours on our Google listing") — nothing that goes stale is hardcoded, and the page still looks live.

- **2026-07-09 — Service-area model for the no-storefront trade.**
  why: lp-09 leads with a coverage map + giant tap-to-call instead of a location pin, and its schema uses `areaServed` rather than a walk-in address. The design honours how the business actually works.

- **2026-07-09 — System fonts pushed for real range.**
  why: Fully offline meant no web fonts, yet the nine feel typographically distinct — Palatino warmth, Didot fashion contrast, Swiss Helvetica, Impact condensed, light system-ui calm, Arial Black brutalism, Courier receipt mono, Iowan/serif scholarship, technical grotesque. Constraint met without looking constrained.

- **2026-07-12 — Scaling to 100 via a style engine, not a copied template.**
  why: Pages 19–100 are composed from orthogonal axes — palettes, type pairings, hero architectures. NOTE (superseded same day): swapping those on ONE fixed block skeleton was not enough — see the AVOID entry below. The skeleton itself has to change.

- **2026-07-12 — Uniqueness is a per-page budget, not a per-archetype one (final pass).**
  why: Six archetypes × ~14 pages each still read as clones, because same-archetype pages shared palette+font+structure. Fix that stuck: give EVERY page its own tuple — unique palette (27-palette pool, zero repeats within an archetype), rotated font (14 pairings), AND a structural variant (0–3) that mutates the archetype itself (masthead centred vs left, hero image left/right/absent, sidebar side, tile radius, gallery pattern, service-list style, section order, ticker/tape/ribbon). Now two broadsheet pages differ in colour, type, masthead alignment and hero composition at once. The archetype is the genre; the variant + palette + font make the individual. Recovered all editorial copy from the prior pages first (DOMParser, archetype-branched selectors) so nothing was lost in the re-lay-out.

- **2026-07-12 — Real, specific sample content held the bar at volume.**
  why: Every one of the 82 new businesses has a believable PH name, a real city + barangay, hand-written hero line (short and human, never SEO run-on), and true-to-type service names. Believability survived the scale-up — no `{{TOKENS}}`, no lorem, no "Business Name Here".

- **2026-07-12 — An index is a navigation aid, not filler.**
  why: `index.html` groups all 100 by bucket so the set is browsable. It earns its place (100 loose files are unusable otherwise) and stays out of the landing-page product itself.

---

## AVOID ❌

- **2026-07-12 — Recoloring one fixed skeleton and calling it "unique designs."**
  why: The first 19–100 pass kept a single DOM/section-order and only varied palette + font + hero band. Every page had the same bones in the same order; the client immediately saw it as "same design" and rejected it. Fix: six genuinely distinct layout ARCHETYPES (broadsheet, editorial, brutalist, panel, bento, kiosk) — different DOM, nav, section structure, type scale, motif — rotated within every bucket. Lesson: real variety is structural, not a skin. When someone asks for unique designs, change the bones, not the paint.

- **2026-07-12 — Splicing a file with a greedy regex.**
  why: A `replace(/<div class="wrap">[\s\S]*?<\/div>.../)` rebuild of `index.html` swallowed the header and left a headless grid. Rebuild whole files, or anchor replacements on unique strings — never a broad `[\s\S]*?` across structural boundaries.

- **2026-07-12 — Escaped markup leaking into visible copy.**
  why: An early archetype emitted `&lt;em&gt;` as literal text in the About block because rich HTML (`h1`/about with `<em>`) was double-escaped. Keep ONE rich-text path (`<em>` preserved, stray `& < >` escaped) separate from the plain-text `esc()` path, and never run rich fields through `esc()`.

- **2026-07-09 — Run-on `Name — <description> in City` hero headlines.**
  why: Reads as SEO sludge, not a crafted headline. Service+city relevance belongs in `<title>`, body copy and schema; the visible hero gets a real, short, human line ("Cooked slow. Served warm.", "We come to you.").

- **2026-07-09 — Pages with no imagery or no motion.**
  why: A static, image-less page looks unfinished and dead. Every page needs art-directed image slots and intentional choreography; either being absent is an automatic reject.

- **2026-07-09 — Visible `{{TOKENS}}`, `Lorem ipsum`, or "Business Name Here".**
  why: Instantly breaks the illusion of a real, live business. Ship finished content or don't ship.

- **2026-07-09 — Hardcoded prices, promos, dates or years-in-business.**
  why: They go stale and they're GBP/operator territory. No peso figures, no "since 2011", no "20 years" — express longevity as "three generations" and leave rating/hours to the GBP slot.

- **2026-07-09 — Template-y sameness / AI-slop defaults.**
  why: Identical three-card grids as the answer to everything, purple-gradient-on-dark, emoji-as-icons, everything centred and symmetrical. If a page would look at home in a template marketplace, it has failed. Each page must earn its own layout logic.

- **2026-07-09 — Timid, flat styling.**
  why: Safe, decoration-free pages read as unfinished, not "clean". Commit to a bold, specific art direction per page — real hero architecture, real type contrast, real signature twist.

- **2026-07-09 — Invalid CSS custom-property values slipping through.**
  why: lp-08 shipped a draft with `--ink2:#3a4straight;` (a corrupted hex). An unresolved `var()` silently falls back to nothing and can wreck contrast or hide text. Token values must be checked, not trusted.

- **2026-07-12 — Engine-written editorial copy is the watch-point at scale.**
  why: To reach 100, the why/how/FAQ/credentials bodies are per-bucket templates interpolated with name + city — so same-bucket pages share phrasing there. It clears the "believable, no lorem" bar, but it's the one place sameness can creep in. The distinctiveness budget was spent on visuals + hero copy + service lists; if any single page needs to stand out, hand-rewrite its editorial bodies.

- **2026-07-09 — Multi-word wordmarks left to wrap in the nav.**
  why: "Batis Dental Studio" and "VOLT & LINE" wrapped under their logo mark and looked broken. Brand lockups in a fixed-height nav need `white-space:nowrap` / `flex:none` so they never break across lines.
