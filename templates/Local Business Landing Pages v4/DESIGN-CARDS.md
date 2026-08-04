# DESIGN-CARDS.md

Nine local-business landing pages, one per bucket. Each is a single self-contained
`.html` file — fully offline (system-font stacks, CSS/SVG-designed image frames, zero
external calls), readable with JavaScript off, and a superset of every block (operators
customise by *deleting* blocks, never adding). Each page uses `data-component="NAME"
data-variant="v2"` on block roots and wraps them in `<!-- BLOCK: NAME [level] -->` comments.

Volatile data (hours, rating, review count) is never hardcoded — it sits in clearly
commented **GBP-BOUND** slots for the Google Business Profile feed.

Use these cards to decide which design to reach for, and how to re-theme it.

---

## 01 · Kalan — Filipino Kitchen & Kapé  → `lp-01-food.html`
- **schema:** `Restaurant` · **bucket:** food · **CTA:** reserve / order / directions
- **Manifesto — "Mercado Nocturne":** warm supper-club editorial · 1970s Manila carinderia menu-card / letterpress · **twist: full-bleed ken-burns plate hero with a running "today's kalan" dish ticker.**
- **When to pick:** warm, appetite-led food or hospitality brands that trade on heritage and a full-bleed hero photo; when the story is "family recipe, cooked slow."
- **Mood:** warm, editorial, homey, unhurried, cinematic.
- **bestFor:** restaurants, cafés, bakeries, carinderias, family kitchens, coffee roasters.
- **avoidFor:** clinical/medical, high-tech, budget-value or discount-led brands (the warmth reads as "premium comfort").
- **variationIdeas:**
  1. Cool-coastal palette — swap clay/ember for deep teal + sea-salt cream for a seafood or beach café.
  2. Café-forward — trade the Palatino display for a rounded humanist sans and a milk-and-espresso palette.
  3. Night-market energy — deepen the ground to ink, push the ticker faster, add neon-sign accent hues.
  4. Bakery-soft — lift to a bright bone/butter palette, thinner rules, pastry-photo galleries.

---

## 02 · Héla Hair Studio  → `lp-02-beauty.html`
- **schema:** `HairSalon` · **bucket:** beauty · **CTA:** book
- **Manifesto — "Poblacion Atelier":** stark fashion split · 1990s minimalist editorial / Didot masthead · **twist: hard 50/50 split-screen that parts (wipes open) on load, portrait plate on slow parallax.**
- **When to pick:** refined, image-led personal-care brands that want to feel like a fashion editorial; strong when there's a hero portrait and an air of restraint.
- **Mood:** elegant, minimal, high-fashion, calm-luxe, monochrome-with-one-accent.
- **bestFor:** hair studios, salons, spas, nail/brow bars, makeup artists, aesthetic clinics (non-medical), boutique fashion.
- **avoidFor:** loud value brands, trades, anything needing dense information above the fold.
- **variationIdeas:**
  1. Barbershop-masculine — swap dusty-nude for oxblood + charcoal, heavier slab display.
  2. Spa-serene — sage + limestone palette, softer serif, longer fades.
  3. Bridal-luxe — ivory + brass, more italic Didot, gold hairlines.
  4. Studio-mono — pure black/white, drop the accent entirely for a gallery feel.

---

## 03 · Domingo Hardware & Supply  → `lp-03-retail.html`
- **schema:** `HardwareStore` (Store) · **bucket:** retail · **CTA:** directions / call
- **Manifesto — "Catálogo":** industrial catalog editorial · mid-century hardware trade catalog / Swiss grid · **twist: oversized index-number department navigation feeding a horizontal scroll-snap catalog rail.**
- **When to pick:** stock-heavy retail with many categories/departments to browse; when "come in, we've got the exact part" is the pitch and a grid/catalog structure helps.
- **Mood:** utilitarian, confident, industrious, newsprint-editorial, trustworthy-local.
- **bestFor:** hardware, auto-parts, agri-supply, general merchandise, garden centres, stationery/bookshops, any multi-department shop.
- **avoidFor:** single-service businesses, luxury/beauty, calm wellness brands.
- **variationIdeas:**
  1. Garden-centre green — swap oxblood/yellow for leaf-green + terracotta, botanical plates.
  2. Bookshop-literary — cream stock, a serif display over the grotesque, ink + one spot colour.
  3. Auto-parts chrome — cooler steel-blue + hazard orange, tighter mono.
  4. Grocery-fresh — brighter primary palette, larger department imagery, friendlier weight.

---

## 04 · Vulca Garage & Detailing  → `lp-04-automotive.html`
- **schema:** `AutoRepair` · **bucket:** automotive · **CTA:** quote / call
- **Manifesto — "Torque":** dark garage industrial · 1970s motorsport livery / spec-sheet · **twist: diagonal section seams across the page + a tachometer rev-counter whose needle sweeps up on load.**
- **When to pick:** rugged, technical, mechanical services where trust = competence; strong on dark grounds with one hot accent and a "diagnose-first, honest-quote" message.
- **Mood:** dark, industrial, precise, high-torque, masculine-utility.
- **bestFor:** auto repair, detailing, tyre/vulcanizing, motorcycle shops, welding/fabrication, machine shops.
- **avoidFor:** soft wellness, children/education, delicate beauty, food (too heavy/greasy a mood).
- **variationIdeas:**
  1. EV/clean-tech — swap hazard amber for electric cyan, lighten to graphite, calmer seams.
  2. Motorcycle-cafe — add cream + racing-green, more vintage badge detailing.
  3. Premium-detailing — near-black + champagne accent, drop the hazard chevrons for a luxe valet feel.
  4. Fleet/commercial — safety-orange + steel, boxier panels, spec-sheet everywhere.

---

## 05 · Batis Dental Studio  → `lp-05-medical.html`
- **schema:** `Dentist` · **bucket:** medical (YMYL) · **CTA:** book
- **Manifesto — "Clear Water":** calm clinical editorial · contemporary Scandinavian healthcare / journal calm · **twist: an offset floating clinic card that gently rises, over a persistent credibility rail (trust made visible).**
- **When to pick:** YMYL / health & wellness where calm and credibility win; lots of whitespace, soft rounded forms, licensing surfaced early.
- **Mood:** calm, airy, trustworthy, gentle, clean-clinical.
- **bestFor:** dental, medical & vet clinics, physio, optometry, mental-health, wellness, childcare.
- **avoidFor:** loud/edgy brands, nightlife, heavy industry, discount retail.
- **variationIdeas:**
  1. Warm-derma — swap teal for blush + sand for skin/derm or paediatric clinics.
  2. Optical-crisp — cool slate-blue + white, sharper corners, lens-motif imagery.
  3. Vet-friendly — add a soft coral accent and rounded, playful iconography.
  4. Serif-journal — introduce a refined serif for headings to lean more "medical journal."

---

## 06 · Kalasag Strength Co.  → `lp-06-fitness.html`
- **schema:** `ExerciseGym` · **bucket:** fitness · **CTA:** trial / inquire
- **Manifesto — "Strength Ledger":** brutalist kinetic · chalk-and-steel training floor / sports poster · **twist: a viewport-filling kinetic headline, a running class marquee, and a count-up "training ledger" of the gym's numbers.**
- **When to pick:** high-energy, motivational brands that can carry huge type and one acid accent on near-black; the pitch is intensity + community.
- **Mood:** bold, kinetic, raw, motivational, brutalist.
- **bestFor:** gyms, CrossFit/strength boxes, boxing/MMA, bootcamps, spin/HIIT studios, sports teams.
- **avoidFor:** calm wellness, YMYL medical, refined luxury, anything needing a gentle tone.
- **variationIdeas:**
  1. Yoga/pilates-calm — this template inverted: soften to warm neutrals, lighten the type, slow the motion (good stress-test of the layout).
  2. Combat-red — swap acid-lime for blood-red on black for a fight gym.
  3. Studio-pastel — bright off-white ground, one candy accent, for a boutique class studio.
  4. Team-colours — drop in a club's two colours for a sports-team or league site.

---

## 07 · Labaná Laundry & Press  → `lp-07-services.html`
- **schema:** `ProfessionalService` · **bucket:** services · **CTA:** call / book
- **Manifesto — "Wash Ticket":** utilitarian receipt · neighbourhood laundromat drop-off ticket / dot-matrix mono · **twist: the hero is a perforated service ticket that "prints" in on load; perforated seams and rubber stamps run through the page.**
- **When to pick:** everyday, transactional local services where the charm is honest utility; the ticket/receipt metaphor fits anything with an order, a drop-off, or a booking slip.
- **Mood:** utilitarian, honest, tactile, monospace-charming, friendly-local.
- **bestFor:** laundry, tailor/alterations, printing/photocopy, key-cutting, repair (shoe/phone/watch), courier/errands, small accountants.
- **avoidFor:** luxury, high-emotion hospitality, big-ticket medical (too casual/paper-thin a mood).
- **variationIdeas:**
  1. Tailor-boutique — swap manila + laundry-blue for charcoal + tape-measure yellow, add fabric-swatch plates.
  2. Print-shop — CMYK registration marks, ink-dot textures, bolder mono.
  3. Courier-dispatch — warmer kraft + parcel-orange, barcode motifs pushed further.
  4. Accountant-ledger — cooler grey + green ledger lines, receipt becomes an invoice stub.

---

## 08 · Talíno Learning Studio  → `lp-08-education.html`
- **schema:** `EducationalOrganization` · **bucket:** education · **CTA:** enrol / inquire
- **Manifesto — "Ruled":** scholarly notebook editorial · exam bluebook / ruled composition paper / academic press · **twist: SVG highlighter and underline strokes that draw themselves on as each section scrolls into view.**
- **When to pick:** learning & child-facing brands where warmth + credibility matter; the ruled-paper, taped-photo, highlighter world feels studious and human.
- **Mood:** warm, scholarly, encouraging, handmade, optimistic.
- **bestFor:** tutoring/review centres, music/art/driving schools, preschools, language schools, workshops, libraries.
- **avoidFor:** heavy industry, nightlife, luxury, anything cold or corporate.
- **variationIdeas:**
  1. Music-school — swap highlighter-yellow for a warm coral + staff-line motif instead of ruled lines.
  2. STEM-cool — graph-paper grid + cyan accent, more mono, for a coding/robotics academy.
  3. Preschool-playful — brighter primaries, rounder shapes, crayon textures.
  4. Corporate-training — mute to slate + one accent, straighten the taped photos for a professional-development feel.

---

## 09 · Volt & Line Electrical Services  → `lp-09-trades.html`
- **schema:** `HomeAndConstructionBusiness` · **bucket:** trades (no storefront) · **CTA:** call / quote
- **Manifesto — "Dispatch":** technical blueprint · electrical schematic / drafting sheet · **twist: a service-area coverage grid with pulsing dispatch pings and a giant tap-to-call number — a service-area business with no storefront.**
- **When to pick:** mobile / service-area trades with no walk-in shop; the pitch is "we come to you, licensed and to code," and the coverage map replaces a location pin. Uses schema `areaServed` instead of a storefront address.
- **Mood:** technical, dependable, precise, no-nonsense, safety-first.
- **bestFor:** electricians, plumbers, HVAC/aircon, pest control, movers, cleaning, solar installers, handyman/contractor crews.
- **avoidFor:** walk-in retail or dine-in (there's deliberately no storefront model), soft lifestyle brands.
- **variationIdeas:**
  1. Plumbing-aqua — swap blueprint-navy + cyan for deep teal + water-blue, pipe-schematic plates.
  2. HVAC-cool — ice-blue + white, airflow-line motifs, cooler grid.
  3. Solar-warm — midnight + solar-gold, sun-path diagram instead of the coverage blob.
  4. Pest/cleaning-fresh — swap to green + white with a friendlier grotesque while keeping the dispatch map.

---

### Shared system notes (applies to all nine)
- **Blocks (superset):** NAV, HERO*, TRUST, ABOUT, SERVICES*, WHY, HOW, TESTIMONIALS, GALLERY, FAQ, SERVICE-AREA, CREDENTIALS, LOCATION*, CTA-BAND, CLICK-TO-MESSAGE, FOOTER (*required). Plus one signature block per page (TICKER, INDEX-NAV, SPEC-PANEL, CREDIBILITY-RAIL, MARQUEE, INDEX/ticket, coverage map).
- **Imagery:** every image is an art-directed CSS/SVG frame (duotone wash + grain + caption + `role="img"` alt), ready to be swapped for commissioned photography by replacing the `.ph` element with an `<img>`.
- **Motion:** each page respects `prefers-reduced-motion` and is fully readable with JS off (reveals are opt-in via a `.js` class the page sets on itself).
- **SEO:** one `<h1>`, valid `LocalBusiness` + `FAQPage` JSON-LD, service+city in `<title>`/copy/schema (never forced into the visible hero headline); NAP identical across Location block, footer and schema.

---

## Expansion — walk-in businesses 19–100 (`lp-19` … `lp-100`) + `index.html`

Pages 19–100 scale the series to **100 landing pages** covering walk-in Filipino businesses
across eight storefront buckets (food, beauty, retail, auto, medical, fitness, services,
education). `index.html` is a browsable directory of all 100, grouped by bucket, with each
card tagged by its layout system.

- **Six structurally-distinct layout archetypes — not one recoloured skeleton.** The first
  attempt swapped palette/font/hero on a single fixed DOM; that read as one template 82 times
  and was rejected. Each page is now rendered through one of six genuinely different layout
  systems (different DOM, nav, section order/structure, type scale, and signature motif):
  - **broadsheet** — newspaper: centred masthead with date line + double rules, classified
    dotted-leader service list, drop-cap columns, "letters" testimonials, directory. Light, serif.
  - **editorial** — fashion magazine: full-height split hero, oversized italic display type,
    scrolling marquee tape, alternating splits, big pull-quote, bento gallery. Light, serif.
  - **brutalist** — mono grid: hard 2px ink borders, boxed cells, Space Mono labels, ticker
    bar, uppercase, high-contrast. Dark or stark-light.
  - **panel** — fixed left sidebar (brand + nav dots + contact, sticky) beside a numbered
    scrolling content stream. Dark, serif.
  - **bento** — tile dashboard: floating rounded nav pill, 12-col card grid of varying tile
    sizes, pill buttons, soft borders. Light, modern-app.
  - **kiosk** — cinematic split-screen: sticky full-height duotone image panels alternating
    sides with content; difference-blend nav. Dark, editorial.
- **Archetypes rotate within every bucket** (assigned by bucket-relative index, offset per
  bucket) so each category cycles through all six and adjacent pages differ. Palette (15 options)
  and font (10 pairings) still vary *within* each archetype from archetype-appropriate pools.
- **Content parity across the rebuild.** Business data + all editorial copy (hero, about, why,
  how, FAQ, credentials, service descriptions, reviews) were recovered from the v2 pages and
  re-laid-out — same words, new structure. Hero headline + lede stay short and human (never SEO
  run-on); service names, cities, barangays, reviewer names are real and specific.
- **Same guarantees, every archetype:** self-contained + offline, GBP-BOUND slots for
  hours/rating (`data-gbp` + comments), art-directed duotone image frames, `prefers-reduced-motion`,
  JS-off readable, one `<h1>`, valid `LocalBusiness` + `FAQPage` JSON-LD, NAP consistent across
  location block + footer + schema, service+city in `<title>`/schema (never forced into the hero).
- **`data-component` / `data-variant`** on every block name the block and its archetype, so the
  layout system is legible in the DOM.
