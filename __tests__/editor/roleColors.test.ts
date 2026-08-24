/**
 * roleColors — two promises, tested together.
 *
 * 1. A background pick must carry a legible label with it.
 *    The v3 editor's click-to-recolour defaults to editing a button's
 *    BACKGROUND. It used to emit `background` + `border-color` and nothing
 *    else, leaving the label at whatever the template's own tokens had chosen
 *    and checking the pair against nothing. Recolour a button toward its own
 *    label colour and the label disappears — one click, on the default prop, on
 *    every template. These colours are baked into the built HTML by
 *    app/api/generate-website, so it ships.
 *
 * 2. A colour belongs to a ROLE **in a SECTION**, not to a role everywhere.
 *    `primaryCta` covers both `hero.cta1.text` and `ctaBand.cta.text`, so
 *    recolouring the hero button also recoloured the closing band's — the bug
 *    the owner reported. The section is the leading segment of the hook path
 *    the admin clicked, so nothing new is stored; keys just gained a prefix.
 *    The two-part keys already sitting in published sites' customizations must
 *    keep emitting exactly the CSS they emit today, which is why several tests
 *    below assert the whole selector string rather than a substring.
 */
import {
    buildRoleColorCss,
    COLOR_ROLES,
    COLOR_STATE_LABELS,
    COLOR_STATES,
    labelFor,
    parseRoleColorKey,
    roleColorKey,
    roleForField,
    scopeSelector,
    sectionForField,
} from '@/lib/roleColors';
import type { ColorProp, ColorRole } from '@/lib/roleColors';

const luminance = (hex: string): number => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const lin = [0, 2, 4].map((i) => {
        const s = parseInt(h.slice(i, i + 2), 16) / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
};
const contrast = (a: string, b: string): number => {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const labelsIn = (css: string): string[] =>
    [...css.matchAll(/\{color:([^ ]+) !important;\}/g)].map((m) => m[1]!);
/** The emitted rules, in source order — order is load-bearing, so keep it. */
const rulesIn = (css: string): string[] => (css ? css.split('\n') : []);

/**
 * The exact every-section selector list.
 *
 * WHAT IS FROZEN IS THE SET OF PAINTED ELEMENTS, NOT THIS STRING. The promise
 * is that a site whose customizations hold `primaryCta:bg` today keeps
 * colouring the same buttons after a change, because that CSS is already baked
 * into published HTML.
 *
 * The string therefore GREW when the per-section CTAs stopped borrowing the
 * hero's field. `about.cta.text`, `services.cta.text`, `how.cta.text` and
 * `footer.cta.text` name buttons that used to emit `data-field="hero.cta1.text"`
 * — the About host action, the Services whole-package button, the How band's
 * action and the footer's contact link / message pill. They were covered by
 * this key through the hero's selector; listing them here is what KEEPS them
 * covered now that they carry their own hooks. Dropping them would silently
 * un-colour a published site's buttons on its next publish, which is the
 * failure this constant exists to catch, not an example of it.
 *
 * `navCtaText` / `nav.cta.text` are deliberately absent: the header CTA has its
 * own `headerCta` role. See the additive test at the foot of this file.
 */
const LEGACY_PRIMARY_CTA =
    '[data-field="hero.cta1.text"],[data-field="ctaBand.cta1.text"],[data-field="ctaBand.cta.text"],' +
    '[data-field="about.cta.text"],[data-field="services.cta.text"],[data-field="how.cta.text"],[data-field="footer.cta.text"],' +
    '[data-field="hero.cta1.text"]:hover,[data-field="ctaBand.cta1.text"]:hover,[data-field="ctaBand.cta.text"]:hover,' +
    '[data-field="about.cta.text"]:hover,[data-field="services.cta.text"]:hover,[data-field="how.cta.text"]:hover,[data-field="footer.cta.text"]:hover,' +
    '[data-field="hero.cta1.text"]:focus,[data-field="ctaBand.cta1.text"]:focus,[data-field="ctaBand.cta.text"]:focus,' +
    '[data-field="about.cta.text"]:focus,[data-field="services.cta.text"]:focus,[data-field="how.cta.text"]:focus,[data-field="footer.cta.text"]:focus';

describe('buildRoleColorCss — a background pick carries its label', () => {
    it('gives a background pick a legible label', () => {
        const css = buildRoleColorCss({ 'primaryCta:bg': '#17181A' });
        expect(css).toContain('background:#17181A !important');
        expect(labelsIn(css)).toEqual(['#FFFFFF']);
    });

    it('flips the label when the picked background is light', () => {
        const css = buildRoleColorCss({ 'primaryCta:bg': '#FBF6F4' });
        expect(labelsIn(css)).toEqual(['#0B0B0F']);
    });

    it("never overwrites a label the admin chose themselves", () => {
        const css = buildRoleColorCss({ 'primaryCta:bg': '#17181A', 'primaryCta:fg': '#E0713F' });
        expect(labelsIn(css)).toEqual(['#E0713F']);
    });

    it('keeps roles independent — one role having a label pick does not silence another', () => {
        const css = buildRoleColorCss({
            'primaryCta:bg': '#17181A',
            'secondaryCta:bg': '#FBF6F4',
            'secondaryCta:fg': '#5A0000',
        });
        expect(labelsIn(css).sort()).toEqual(['#5A0000', '#FFFFFF']);
    });

    it('clears AA on every picked background, which a 0.5 luminance threshold does not', () => {
        // The six that a `luminance(bg) > 0.5 ? black : white` rule gets wrong.
        for (const bg of ['#C8881A', '#E0713F', '#F5F5DC', '#14532D', '#2C7BE5', '#7B4FA8']) {
            const label = labelFor(bg);
            expect(contrast(label, bg)).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('rejects a 4-digit #rgba, which luminance cannot read', () => {
        // The gate used to be {3,8}, which admits #rgba. luminance() handles
        // 3, 6 and 8 only; a 4-char value fell through to its 0.5 default and
        // labelFor() then returned BLACK for every one of them — black on a
        // black fill, which is the exact failure this file exists to prevent.
        expect(buildRoleColorCss({ 'hero:primaryCta:bg': '#0f0f' })).toBe('');
        expect(buildRoleColorCss({ 'hero:primaryCta:bg': '#1234567' })).toBe('');
        // the lengths it CAN read still work
        for (const ok of ['#000', '#17181A', '#17181AFF']) {
            expect(buildRoleColorCss({ 'hero:primaryCta:bg': ok })).not.toBe('');
        }
    });

    it('emits nothing for a malformed colour rather than a broken rule', () => {
        expect(buildRoleColorCss({ 'primaryCta:bg': 'red' })).toBe('');
        expect(buildRoleColorCss({ 'primaryCta:bg': '' })).toBe('');
        expect(buildRoleColorCss(undefined)).toBe('');
    });
});

describe('buildRoleColorCss — a pick is scoped to one section', () => {
    it('recolours the closing band and leaves the hero button alone', () => {
        // The reported bug, stated as a test: these two share the primaryCta
        // role, sit on different grounds, and usually want opposite treatments.
        const css = buildRoleColorCss({ 'ctaBand:primaryCta:bg': '#17181A' });

        expect(css).toContain('[data-field="ctaBand.cta.text"]');
        expect(css).toContain('[data-field="ctaBand.cta1.text"]');
        expect(css).toContain('background:#17181A !important');
        expect(css).not.toContain('hero.cta1.text');
        expect(css).not.toContain('hero');
    });

    it('recolours the hero button and leaves the closing band alone', () => {
        const css = buildRoleColorCss({ 'hero:primaryCta:bg': '#17181A' });

        expect(css).toContain('[data-field="hero.cta1.text"]');
        expect(css).not.toContain('ctaBand');
        // Dropping the selectors that can never match is the whole mechanism:
        // only the hero's own button survives, across base/:hover/:focus.
        expect(rulesIn(css)[0]).toBe(
            '[data-field="hero.cta1.text"],[data-field="hero.cta1.text"]:hover,[data-field="hero.cta1.text"]:focus' +
            '{background:#17181A !important;border-color:#17181A !important;}',
        );
    });

    it('emits nothing for a section none of the role selectors can reach', () => {
        // primaryCta reaches hero, ctaBand, about, services, how and footer —
        // the six sections that draw a primary button — and NOTHING else.
        // Scoping it to a section with no button must drop every selector
        // rather than fall back to all of them.
        expect(buildRoleColorCss({ 'location:primaryCta:bg': '#17181A' })).toBe('');
        expect(buildRoleColorCss({ 'gallery:primaryCta:bg': '#17181A' })).toBe('');
        // ...and the six that DO draw one narrow to their own button alone.
        const FOOTER_CTA =
            '[data-field="footer.cta.text"],[data-field="footer.cta.text"]:hover,' +
            '[data-field="footer.cta.text"]:focus';
        expect(rulesIn(buildRoleColorCss({ 'footer:primaryCta:bg': '#17181A' }))).toEqual([
            `${FOOTER_CTA}{background:#17181A !important;border-color:#17181A !important;}`,
            `${FOOTER_CTA}{color:#FFFFFF !important;}`,
        ]);
        expect(buildRoleColorCss({ 'how:primaryCta:bg': '#17181A' })).toContain(
            '[data-field="how.cta.text"]',
        );
        expect(buildRoleColorCss({ 'how:primaryCta:bg': '#17181A' })).not.toContain('hero.cta1');
    });

    it('scopes an open-ended selector by prefix instead of dropping it', () => {
        // [data-field$=".headline"] matches a headline in EVERY section, so it
        // has to gain a section test — dropping it would leave `about` with no
        // heading selector at all.
        expect(scopeSelector('[data-field$=".headline"]', 'about'))
            .toBe('[data-field$=".headline"][data-field^="about."]');

        const css = buildRoleColorCss({ 'about:heading:fg': '#5A0000' });
        expect(rulesIn(css)[0]).toBe(
            '[data-field$=".headline"][data-field^="about."],' +
            '[data-field$=".headline"][data-field^="about."]:hover,' +
            '[data-field$=".headline"][data-field^="about."]:focus' +
            '{color:#5A0000 !important;}',
        );
        // ...while the hero-pinned companion selector is dropped, since it can
        // never match inside `about`.
        expect(css).not.toContain('headlineLines');
    });

    it("scopes the link role's presence test and keeps the :not(.btn) tail intact", () => {
        expect(scopeSelector('a[data-href-field]:not(.btn)', 'footer'))
            .toBe('a[data-href-field^="footer."]:not(.btn)');

        const css = buildRoleColorCss({ 'footer:link:fg': '#5A0000' });
        // The state suffix must land after :not(.btn), not inside the attribute.
        expect(rulesIn(css)[0]).toBe(
            'a[data-href-field^="footer."]:not(.btn),' +
            'a[data-href-field^="footer."]:not(.btn):hover,' +
            'a[data-href-field^="footer."]:not(.btn):focus' +
            '{color:#5A0000 !important;}',
        );
    });

    it('keeps a pinned selector whose own path already names the section', () => {
        // '=' and '^=' selectors carry the section in their value, so scoping is
        // a filter: keep for the matching section, drop everywhere else.
        expect(scopeSelector('[data-field="hero.cta1.text"]', 'hero')).toBe('[data-field="hero.cta1.text"]');
        expect(scopeSelector('[data-field="hero.cta1.text"]', 'ctaBand')).toBeNull();
        expect(scopeSelector('[data-field^="hero.headlineLines"]', 'hero')).toBe('[data-field^="hero.headlineLines"]');
        expect(scopeSelector('[data-field^="hero.headlineLines"]', 'about')).toBeNull();
        // No section = the legacy every-section form: hand the selector back untouched.
        expect(scopeSelector('[data-field="hero.cta1.text"]', '')).toBe('[data-field="hero.cta1.text"]');
        expect(scopeSelector('a[data-href-field]:not(.btn)', '')).toBe('a[data-href-field]:not(.btn)');
    });

    it('mixes both selector shapes when a section has each', () => {
        const css = buildRoleColorCss({ 'hero:heading:fg': '#5A0000' });
        expect(rulesIn(css)[0]).toBe(
            '[data-field$=".headline"][data-field^="hero."],[data-field^="hero.headlineLines"],' +
            '[data-field$=".headline"][data-field^="hero."]:hover,[data-field^="hero.headlineLines"]:hover,' +
            '[data-field$=".headline"][data-field^="hero."]:focus,[data-field^="hero.headlineLines"]:focus' +
            '{color:#5A0000 !important;}',
        );
    });

    it('scopes a section pick without touching a sibling section', () => {
        const about = buildRoleColorCss({ 'about:eyebrow:fg': '#5A0000' });
        const services = buildRoleColorCss({ 'services:eyebrow:fg': '#5A0000' });
        expect(about).toContain('[data-field^="about."]');
        expect(about).not.toContain('services');
        expect(services).toContain('[data-field^="services."]');
        expect(services).not.toContain('about');
        // hero.kicker is pinned to the hero, so neither section inherits it.
        expect(about).not.toContain('hero.kicker');
        expect(services).not.toContain('hero.kicker');
    });
});

describe('buildRoleColorCss — legacy two-part keys are untouched', () => {
    it('emits the exact every-section selector list for a legacy pinned role', () => {
        const css = buildRoleColorCss({ 'primaryCta:bg': '#17181A' });
        expect(rulesIn(css)).toEqual([
            `${LEGACY_PRIMARY_CTA}{background:#17181A !important;border-color:#17181A !important;}`,
            `${LEGACY_PRIMARY_CTA}{color:#FFFFFF !important;}`,
        ]);
    });

    it('leaves a legacy open-ended selector unprefixed', () => {
        // The temptation when adding scoping is to prefix everywhere. A legacy
        // key means "every section", so [data-field$=".headline"] must stay
        // open — a published site's About headline still has to be recoloured.
        expect(buildRoleColorCss({ 'heading:fg': '#5A0000' })).toBe(
            '[data-field$=".headline"],[data-field^="hero.headlineLines"],' +
            '[data-field$=".headline"]:hover,[data-field^="hero.headlineLines"]:hover,' +
            '[data-field$=".headline"]:focus,[data-field^="hero.headlineLines"]:focus' +
            '{color:#5A0000 !important;}',
        );
    });

    it('leaves a legacy presence test unprefixed', () => {
        expect(buildRoleColorCss({ 'link:fg': '#5A0000' })).toBe(
            'a[data-href-field]:not(.btn),a[data-href-field]:not(.btn):hover,a[data-href-field]:not(.btn):focus' +
            '{color:#5A0000 !important;}',
        );
    });

    it('leaves a legacy mixed-shape role unprefixed', () => {
        expect(buildRoleColorCss({ 'eyebrow:fg': '#5A0000' })).toBe(
            '[data-field$=".tag"],[data-field="hero.kicker"],' +
            '[data-field$=".tag"]:hover,[data-field="hero.kicker"]:hover,' +
            '[data-field$=".tag"]:focus,[data-field="hero.kicker"]:focus' +
            '{color:#5A0000 !important;}',
        );
    });
});

describe('buildRoleColorCss — the section entry is emitted last', () => {
    // A pinned selector like [data-field="ctaBand.cta.text"] is IDENTICAL in
    // the legacy and the section-scoped rule, so the two tie on specificity and
    // nothing but source order decides. Order is therefore the entire
    // guarantee: assert it, not mere presence.
    const expectSectionWins = (css: string) => {
        const bg = rulesIn(css).filter((r) => r.includes('background:'));
        expect(bg).toHaveLength(2);
        // Both really do target the same element — the tie is real, not hypothetical.
        expect(bg.every((r) => r.includes('[data-field="ctaBand.cta.text"],'))).toBe(true);
        expect(bg[0]).toContain('background:#17181A'); // legacy, every section
        expect(bg[0]).toContain('hero.cta1.text');
        expect(bg[1]).toContain('background:#AAAAAA'); // section-scoped, wins by coming last
        expect(bg[1]).not.toContain('hero.cta1.text');
    };

    it('puts the section rule after the legacy one when the section key is first in the map', () => {
        expectSectionWins(buildRoleColorCss({
            'ctaBand:primaryCta:bg': '#AAAAAA',
            'primaryCta:bg': '#17181A',
        }));
    });

    it('puts the section rule after the legacy one when the legacy key is first in the map', () => {
        // Same output from the opposite insertion order: emission order is
        // decided by scope, not by however the map happened to get built.
        expectSectionWins(buildRoleColorCss({
            'primaryCta:bg': '#17181A',
            'ctaBand:primaryCta:bg': '#AAAAAA',
        }));
    });

    it('keeps every every-section rule ahead of every section-scoped rule', () => {
        const rules = rulesIn(buildRoleColorCss({
            'hero:heading:fg': '#111111',
            'link:fg': '#222222',
            'ctaBand:eyebrow:fg': '#333333',
            'eyebrow:fg': '#444444',
        }));
        const scoped = rules.map((r) => r.includes('^="hero."') || r.includes('^="ctaBand."'));
        expect(scoped).toEqual([false, false, true, true]);
    });
});

describe('buildRoleColorCss — an explicit label only silences its own scope', () => {
    it('does not let a legacy label pick suppress a section fill’s auto-label', () => {
        // The admin set a label for primaryCta everywhere, then filled the
        // closing band's button dark. The band has no label of its own, so it
        // still needs one computed — reusing the legacy fg check here would
        // have left the band's label unset and possibly invisible.
        const css = buildRoleColorCss({
            'primaryCta:fg': '#E0713F',
            'ctaBand:primaryCta:bg': '#17181A',
        });
        expect(labelsIn(css)).toEqual(['#E0713F', '#FFFFFF']);
    });

    it('does not let a section label pick suppress a legacy fill’s auto-label', () => {
        const css = buildRoleColorCss({
            'primaryCta:bg': '#17181A',
            'ctaBand:primaryCta:fg': '#E0713F',
        });
        expect(labelsIn(css)).toEqual(['#FFFFFF', '#E0713F']);
    });

    it('does let a label pick suppress the auto-label at the SAME scope', () => {
        const css = buildRoleColorCss({
            'ctaBand:primaryCta:bg': '#17181A',
            'ctaBand:primaryCta:fg': '#E0713F',
        });
        expect(labelsIn(css)).toEqual(['#E0713F']);
    });

    it('keeps sections independent — a label in one does not silence another', () => {
        const css = buildRoleColorCss({
            'hero:primaryCta:bg': '#17181A',
            'ctaBand:primaryCta:bg': '#FBF6F4',
            'ctaBand:primaryCta:fg': '#5A0000',
        });
        expect(labelsIn(css).sort()).toEqual(['#5A0000', '#FFFFFF']);
    });
});

describe('sectionForField', () => {
    it('takes the leading segment of a dotted hook path', () => {
        expect(sectionForField('hero.cta1.text')).toBe('hero');
        expect(sectionForField('ctaBand.cta.text')).toBe('ctaBand');
        expect(sectionForField('services.items.0.title')).toBe('services');
        expect(sectionForField('hero.headlineLines.2')).toBe('hero');
    });

    it('places the nav hooks that ARE dotted, under the namespace the markup uses', () => {
        // The templates emit nav.* and navbar_links.*, and both are prefix-
        // matchable, so both scope. An earlier draft aliased these to a section
        // called 'header'; not one template emits a header.* hook, so every
        // header colour was stored under a key whose selector matched nothing
        // and the pick silently did nothing.
        expect(sectionForField('nav.cta.href')).toBe('nav');
        expect(sectionForField('navbar_links.0.label')).toBe('navbar_links');
    });

    it('reports NO section for a dotless hook rather than inventing one', () => {
        // Scoping works by prefix — [data-field^="x."] — so a section is only
        // usable when its hooks start with it AND a dot. navCtaText/navCtaHref
        // are the whole dotless set; no prefix reaches them, so they report no
        // section and the caller falls back to every-section. Claiming a
        // section here would store a key that can never match.
        expect(sectionForField('navCtaText')).toBe('');
        expect(sectionForField('navCtaHref')).toBe('');
        expect(sectionForField('business_name')).toBe('');
    });

    it('returns empty for junk instead of inventing a section', () => {
        expect(sectionForField('')).toBe('');
        expect(sectionForField('   ')).toBe('');
        expect(sectionForField('.leadingDot')).toBe('');
        expect(sectionForField(undefined as unknown as string)).toBe('');
        expect(sectionForField(null as unknown as string)).toBe('');
    });

    it('cannot be fooled by an Object.prototype member', () => {
        // sectionForField used to read an alias map with `map[head] ?? head`.
        // Every inherited member is truthy, so 'constructor' came back as a
        // FUNCTION from a signature that declares string, and flowed into a
        // storage key. There is no map any more, which is the real fix, but
        // the guarantee is worth pinning.
        for (const f of ['constructor', '__proto__', 'toString.x', 'hasOwnProperty.y']) {
            expect(typeof sectionForField(f)).toBe('string');
        }
        expect(sectionForField('constructor')).toBe('');
        expect(sectionForField('toString.x')).toBe('toString');
    });
});

describe('roleColorKey / parseRoleColorKey', () => {
    it('writes three parts for a section and two without one', () => {
        expect(roleColorKey('primaryCta', 'bg', 'ctaBand')).toBe('ctaBand:primaryCta:bg');
        expect(roleColorKey('primaryCta', 'bg')).toBe('primaryCta:bg');
        expect(roleColorKey('primaryCta', 'bg', null)).toBe('primaryCta:bg');
        // sectionForField returns '' for a field it cannot place; that must
        // produce the every-section key, not `:primaryCta:bg`.
        expect(roleColorKey('primaryCta', 'bg', '')).toBe('primaryCta:bg');
        expect(roleColorKey('primaryCta', 'bg', sectionForField(''))).toBe('primaryCta:bg');
    });

    it('round-trips a key it wrote, in either form', () => {
        expect(parseRoleColorKey(roleColorKey('heading', 'fg', 'about')))
            .toEqual({ section: 'about', role: 'heading', prop: 'fg', state: 'base' });
        expect(parseRoleColorKey(roleColorKey('primaryCta', 'bg')))
            .toEqual({ section: null, role: 'primaryCta', prop: 'bg', state: 'base' });
        // A dotless hook has no section, so this must round-trip as the
        // every-section key rather than a scoped one that matches nothing.
        expect(parseRoleColorKey(roleColorKey('link', 'fg', sectionForField('navCtaHref'))))
            .toEqual({ section: null, role: 'link', prop: 'fg', state: 'base' });
        expect(parseRoleColorKey(roleColorKey('link', 'fg', sectionForField('nav.cta.href'))))
            .toEqual({ section: 'nav', role: 'link', prop: 'fg', state: 'base' });
    });

    it('rejects a malformed key instead of guessing at it', () => {
        // A stray entry has to be skipped. Guessing is how `ctaBand:primaryCta:bg`
        // used to be read as role `ctaBand`, prop `primaryCta`.
        expect(parseRoleColorKey('primaryCta')).toBeNull();          // no prop
        expect(parseRoleColorKey('')).toBeNull();
        expect(parseRoleColorKey('hero:ctaBand:primaryCta:bg')).toBeNull(); // four parts
        expect(parseRoleColorKey(':primaryCta:bg')).toBeNull();      // empty section
        expect(parseRoleColorKey('noSuchRole:bg')).toBeNull();
        expect(parseRoleColorKey('hero:noSuchRole:bg')).toBeNull();
        expect(parseRoleColorKey('primaryCta:border')).toBeNull();   // not a prop we set
        expect(parseRoleColorKey('hero:primaryCta:border')).toBeNull();
        expect(parseRoleColorKey('primaryCta:BG')).toBeNull();       // props are lowercase
        expect(parseRoleColorKey('bg:primaryCta')).toBeNull();       // parts reversed
        expect(parseRoleColorKey(undefined as unknown as string)).toBeNull();
        expect(parseRoleColorKey(null as unknown as string)).toBeNull();
    });

    it('rejects an inherited Object property posing as a role', () => {
        // `'constructor' in COLOR_ROLES` is true via the prototype chain, and a
        // truthy non-RoleDef makes buildRoleColorCss read `.selectors` off a
        // function — a throw on the path that runs during publish.
        expect(parseRoleColorKey('constructor:bg')).toBeNull();
        expect(parseRoleColorKey('toString:fg')).toBeNull();
        expect(parseRoleColorKey('__proto__:bg')).toBeNull();
        expect(parseRoleColorKey('hero:constructor:bg')).toBeNull();
    });

    it('skips stray keys and still emits the good ones', () => {
        const withJunk = buildRoleColorCss({
            'ctaBand:primaryCta:bg': '#17181A',
            'not:a:real:key:at:all': '#FFFFFF',
            'weirdRole:fg': '#FFFFFF',
            'ctaBand:primaryCta:opacity': '#FFFFFF',
            'constructor:bg': '#FFFFFF',
            ':primaryCta:bg': '#FFFFFF',
        });
        expect(withJunk).toBe(buildRoleColorCss({ 'ctaBand:primaryCta:bg': '#17181A' }));
        expect(withJunk).not.toBe('');
    });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. A colour belongs to a ROLE in a SECTION **at a STATE**.
 *
 *    Resting, pointed at, held down. The owner asked for hover and pressed to
 *    be pickable separately, and the three ways that can go wrong are ordering
 *    or shape problems rather than arithmetic:
 *
 *      · the state rides on the PROP segment (`bg@hover`), because a fourth
 *        colon field would make `role:prop:state` and `section:role:prop` both
 *        three parts and impossible to tell apart;
 *      · every rule is `!important` at the same specificity, so a hover rule
 *        beats the base rule ONLY by being emitted after it — the tests below
 *        assert the INDEX, never mere presence;
 *      · `base` still paints :hover and :focus, exactly as it shipped, so a map
 *        written before states existed must emit byte-identical CSS. That is
 *        asserted as a whole-document string match, not a substring.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The selector list of one emitted rule, split back into individual selectors. */
const selectorsOf = (rule: string): string[] => rule.slice(0, rule.indexOf('{')).split(',');
/** The colour each `background:` rule paints, in emission order. */
const fillsIn = (css: string): string[] =>
    [...css.matchAll(/\{background:([^ ]+) !important;/g)].map((m) => m[1]!);

/** Frozen for the same reason LEGACY_PRIMARY_CTA is: published sites read it. */
const HERO_PRIMARY_BASE =
    '[data-field="hero.cta1.text"],[data-field="hero.cta1.text"]:hover,[data-field="hero.cta1.text"]:focus';

describe('buildRoleColorCss — a base-only map is byte-identical to pre-states', () => {
    it('emits exactly the pre-state document for a legacy base-only map', () => {
        // The whole string, not a substring. This CSS is already baked into
        // published HTML by app/api/generate-website, so a states axis is only
        // allowed to be additive: a map that predates it has to come out
        // character-for-character the same.
        const css = buildRoleColorCss({ 'primaryCta:bg': '#17181A', 'heading:fg': '#5A0000' });
        expect(css).toBe(
            `${LEGACY_PRIMARY_CTA}{background:#17181A !important;border-color:#17181A !important;}\n` +
            `${LEGACY_PRIMARY_CTA}{color:#FFFFFF !important;}\n` +
            '[data-field$=".headline"],[data-field^="hero.headlineLines"],' +
            '[data-field$=".headline"]:hover,[data-field^="hero.headlineLines"]:hover,' +
            '[data-field$=".headline"]:focus,[data-field^="hero.headlineLines"]:focus' +
            '{color:#5A0000 !important;}',
        );
    });

    it('emits exactly the pre-state document for a section-scoped base-only map', () => {
        const css = buildRoleColorCss({ 'hero:primaryCta:bg': '#17181A' });
        expect(css).toBe(
            `${HERO_PRIMARY_BASE}{background:#17181A !important;border-color:#17181A !important;}\n` +
            `${HERO_PRIMARY_BASE}{color:#FFFFFF !important;}`,
        );
    });

    it('never paints :active or :focus-visible unless a state was actually picked', () => {
        // Letting `base` cover :active is the tidy-looking choice and it is the
        // one that breaks the promise above: every map already stored would
        // start emitting a rule it has never emitted.
        const css = buildRoleColorCss({
            'primaryCta:bg': '#17181A',
            'secondaryCta:fg': '#E0713F',
            'hero:heading:fg': '#5A0000',
            'footer:link:fg': '#222222',
            'ctaBand:eyebrow:fg': '#333333',
        });
        expect(css).not.toBe('');
        expect(css).not.toContain(':active');
        expect(css).not.toContain(':focus-visible');
        // ...while still painting the two pseudo-classes base has always painted.
        expect(css).toContain(':hover');
        expect(css).toContain(':focus');
    });
});

describe('buildRoleColorCss — a hover pick lands after the base it must beat', () => {
    it('emits :hover and :focus-visible for a hover pick, and nothing resting', () => {
        expect(buildRoleColorCss({ 'hero:primaryCta:bg@hover': '#17181A' })).toBe(
            '[data-field="hero.cta1.text"]:hover,[data-field="hero.cta1.text"]:focus-visible' +
            '{background:#17181A !important;border-color:#17181A !important;}\n' +
            '[data-field="hero.cta1.text"]:hover,[data-field="hero.cta1.text"]:focus-visible' +
            '{color:#FFFFFF !important;}',
        );
    });

    it('puts the hover rule AFTER the base rule — index, not presence', () => {
        // Both rules are !important and both match the same element with the
        // same specificity, because `base` paints :hover too. Source order is
        // the entire cascade here, so presence proves nothing: assert the index.
        const rules = rulesIn(buildRoleColorCss({
            'hero:primaryCta:bg': '#17181A',
            'hero:primaryCta:bg@hover': '#AAAAAA',
        }));
        expect(rules).toHaveLength(4);
        expect(rules[0]).toBe(
            `${HERO_PRIMARY_BASE}{background:#17181A !important;border-color:#17181A !important;}`);
        expect(rules[1]).toBe(`${HERO_PRIMARY_BASE}{color:#FFFFFF !important;}`);
        expect(rules[2]).toContain('background:#AAAAAA !important');
        expect(rules[2]).toContain(':focus-visible');
        // The tie is real, not hypothetical: rule 0 and rule 2 both match
        // [data-field="hero.cta1.text"]:hover.
        expect(selectorsOf(rules[0]!)).toContain('[data-field="hero.cta1.text"]:hover');
        expect(selectorsOf(rules[2]!)).toContain('[data-field="hero.cta1.text"]:hover');
    });

    it('orders by state, not by however the map happened to get built', () => {
        const written = buildRoleColorCss({
            'hero:primaryCta:bg@hover': '#AAAAAA',
            'hero:primaryCta:bg': '#17181A',
        });
        const reversed = buildRoleColorCss({
            'hero:primaryCta:bg': '#17181A',
            'hero:primaryCta:bg@hover': '#AAAAAA',
        });
        expect(written).toBe(reversed);
        expect(fillsIn(written)).toEqual(['#17181A', '#AAAAAA']);
    });
});

describe('buildRoleColorCss — a pressed pick lands last', () => {
    it('emits :active only, and after both base and hover', () => {
        const rules = rulesIn(buildRoleColorCss({
            'hero:primaryCta:bg@active': '#5A0000',
            'hero:primaryCta:bg@hover': '#AAAAAA',
            'hero:primaryCta:bg': '#17181A',
        }));
        expect(rules).toHaveLength(6);
        expect(fillsIn(rules.join('\n'))).toEqual(['#17181A', '#AAAAAA', '#5A0000']);
        // Last, for the same reason CSS teaches :link :visited :hover :active in
        // that order — and it is the ONLY rule painting :active.
        expect(rules[4]).toBe(
            '[data-field="hero.cta1.text"]:active' +
            '{background:#5A0000 !important;border-color:#5A0000 !important;}');
        expect(rules[5]).toBe('[data-field="hero.cta1.text"]:active{color:#FFFFFF !important;}');
        expect(rules.filter((r) => r.includes(':active'))).toHaveLength(2);
        expect(rules.slice(0, 4).some((r) => r.includes(':active'))).toBe(false);
    });

    it('orders by STATE first and scope second, and the two are not interchangeable', () => {
        // STATE is the major key. An earlier version sorted scope-major, which
        // reads as equivalent and is not: the scope contest only exists BETWEEN
        // RULES PAINTING THE SAME PSEUDO-CLASS, so hoisting it above state
        // pushed every section rule past every global one — and a section pick
        // for the RESTING colour then beat a global pick for hover or pressed.
        const css = buildRoleColorCss({
            'ctaBand:primaryCta:bg': '#111111',
            'primaryCta:bg@active': '#222222',
            'primaryCta:bg': '#333333',
            'ctaBand:primaryCta:bg@hover': '#444444',
        });
        // base(global, section), then hover, then active.
        expect(fillsIn(css)).toEqual(['#333333', '#111111', '#444444', '#222222']);
    });

    it('resolves to what the admin asked for, not merely to a tidy emission order', () => {
        // Order is only a proxy. What matters is the colour a browser lands on,
        // and the previous ordering passed an order assertion while painting
        // the wrong thing in three separate combinations. Resolve properly:
        // every rule is !important at equal specificity, so the LAST matching
        // rule wins.
        const BTN = '[data-field="hero.cta1.text"]';
        const paints = (css: string, pseudos: string[]): string | null => {
            let out: string | null = null;
            for (const rule of rulesIn(css)) {
                const body = rule.slice(rule.indexOf('{'));
                const m = /background:([^ ;]+)/.exec(body);
                if (!m) continue;
                for (const sel of selectorsOf(rule)) {
                    if (!sel.startsWith(BTN)) continue;
                    const suffix = sel.slice(BTN.length);
                    if (suffix === '' || pseudos.includes(suffix)) { out = m[1]!; break; }
                }
            }
            return out;
        };

        // An explicit global HOVER beats a section RESTING pick, whose reach
        // into :hover is only a back-compat spill.
        expect(paints(buildRoleColorCss({
            'primaryCta:bg@hover': '#E0713F', 'hero:primaryCta:bg': '#2B5CE0',
        }), [':hover'])).toBe('#E0713F');

        // Held down, :hover and :active both match — :active has to win.
        expect(paints(buildRoleColorCss({
            'hero:primaryCta:bg@hover': '#E0713F', 'primaryCta:bg@active': '#1E8E3E',
        }), [':hover', ':active'])).toBe('#1E8E3E');

        // …while the section guarantee survives: at equal state the narrower
        // pick still wins, and a sibling section is untouched.
        expect(paints(buildRoleColorCss({
            'primaryCta:bg': '#111111', 'hero:primaryCta:bg': '#2B5CE0',
        }), [])).toBe('#2B5CE0');
        expect(paints(buildRoleColorCss({
            'primaryCta:bg@hover': '#111111', 'hero:primaryCta:bg@hover': '#2B5CE0',
        }), [':hover'])).toBe('#2B5CE0');
        expect(paints(buildRoleColorCss({
            'primaryCta:bg': '#111111', 'ctaBand:primaryCta:bg': '#2B5CE0',
        }), [])).toBe('#111111');
    });
});

describe('buildRoleColorCss — the state suffix is applied per selector', () => {
    it('gives EVERY selector of a multi-selector role its own :hover', () => {
        // Appending the pseudo-class to the JOINED string attaches it to the
        // last selector only, and that bug is invisible in a one-selector role.
        // secondaryCta has four.
        const rule = rulesIn(buildRoleColorCss({ 'secondaryCta:fg@hover': '#5A0000' }))[0]!;
        const sels = selectorsOf(rule);
        expect(sels).toHaveLength(8); // 4 selectors x 2 suffixes
        expect(sels.every((s) => /:(hover|focus-visible)$/.test(s))).toBe(true);
        expect(sels.filter((s) => s.endsWith(':hover'))).toEqual([
            '[data-field="hero.cta2.text"]:hover',
            '[data-field="hero.cta3.text"]:hover',
            '[data-field="ctaBand.cta2.text"]:hover',
            '[data-field="ctaBand.cta3.text"]:hover',
        ]);
        expect(sels.filter((s) => s.endsWith(':focus-visible'))).toHaveLength(4);
    });

    it('gives EVERY selector of a multi-selector role its own :active', () => {
        const rule = rulesIn(buildRoleColorCss({ 'secondaryCta:bg@active': '#5A0000' }))[0]!;
        const sels = selectorsOf(rule);
        expect(sels).toHaveLength(4); // 4 selectors x 1 suffix
        expect(sels.every((s) => s.endsWith(':active'))).toBe(true);
        expect(sels).toEqual([
            '[data-field="hero.cta2.text"]:active',
            '[data-field="hero.cta3.text"]:active',
            '[data-field="ctaBand.cta2.text"]:active',
            '[data-field="ctaBand.cta3.text"]:active',
        ]);
    });

    it('suffixes a mixed-shape role per selector once it has been scoped', () => {
        expect(buildRoleColorCss({ 'hero:heading:fg@active': '#5A0000' })).toBe(
            '[data-field$=".headline"][data-field^="hero."]:active,' +
            '[data-field^="hero.headlineLines"]:active' +
            '{color:#5A0000 !important;}',
        );
    });

    it('lands the state suffix after :not(.btn), not inside the attribute', () => {
        expect(buildRoleColorCss({ 'hero:link:fg@hover': '#5A0000' })).toBe(
            'a[data-href-field^="hero."]:not(.btn):hover,' +
            'a[data-href-field^="hero."]:not(.btn):focus-visible' +
            '{color:#5A0000 !important;}',
        );
    });

    it('leaves a legacy open-ended selector unprefixed at a state too', () => {
        expect(buildRoleColorCss({ 'heading:fg@hover': '#5A0000' })).toBe(
            '[data-field$=".headline"]:hover,[data-field^="hero.headlineLines"]:hover,' +
            '[data-field$=".headline"]:focus-visible,[data-field^="hero.headlineLines"]:focus-visible' +
            '{color:#5A0000 !important;}',
        );
    });
});

describe('buildRoleColorCss — the automatic label follows the state it covers', () => {
    it('gives a hover background its own legible label', () => {
        // The same failure as the resting case, one pseudo-class along: fill the
        // hover state toward the label colour and the label vanishes on hover.
        expect(labelsIn(buildRoleColorCss({ 'hero:primaryCta:bg@hover': '#FBF6F4' })))
            .toEqual(['#0B0B0F']);
        expect(labelsIn(buildRoleColorCss({ 'hero:primaryCta:bg@hover': '#17181A' })))
            .toEqual(['#FFFFFF']);
    });

    it('gives a pressed background its own legible label', () => {
        expect(labelsIn(buildRoleColorCss({ 'hero:primaryCta:bg@active': '#FBF6F4' })))
            .toEqual(['#0B0B0F']);
    });

    it('does NOT let a base label pick suppress the hover fill auto-label', () => {
        // Tempting, because a base label does reach :hover. But it reaches it
        // as a BACK-COMPAT SPILL, not as a decision about the hover state, and
        // counting the spill as a decision waived the legibility check on
        // exactly the pairing this file exists to catch:
        //   { fg: '#FEFEFE', bg@hover: '#FFF9C4' }  ->  1.06:1 on hover
        // The automatic hover label lands after the base label (state-major
        // ordering), so it wins on :hover and the resting label is untouched.
        const css = buildRoleColorCss({
            'hero:primaryCta:fg': '#E0713F',
            'hero:primaryCta:bg@hover': '#17181A',
        });
        expect(fillsIn(css)).toEqual(['#17181A']);
        expect(labelsIn(css)).toEqual(['#E0713F', '#FFFFFF']);
    });

    it('rescues the pairing that motivated the rule — near-white on pale yellow', () => {
        const css = buildRoleColorCss({
            'primaryCta:fg': '#FEFEFE',
            'primaryCta:bg@hover': '#FFF9C4',
        });
        // 1.06:1 before; the automatic label is emitted and wins on :hover.
        expect(labelsIn(css)).toEqual(['#FEFEFE', '#0B0B0F']);
    });

    it('does NOT let a base label pick suppress the pressed fill auto-label', () => {
        // Nothing paints :active unless :active was picked, so the resting label
        // does not reach it. Suppressing here would leave the pressed label at
        // whatever the template chose — pinned by nothing and checked by nobody,
        // over a fill the admin has just changed.
        const css = buildRoleColorCss({
            'hero:primaryCta:fg': '#E0713F',
            'hero:primaryCta:bg@active': '#17181A',
        });
        expect(labelsIn(css)).toEqual(['#E0713F', '#FFFFFF']);
    });

    it('does NOT let a hover label pick suppress the resting fill auto-label', () => {
        // Coverage runs one way only: base reaches hover, hover does not reach
        // back to the resting state.
        const css = buildRoleColorCss({
            'hero:primaryCta:fg@hover': '#E0713F',
            'hero:primaryCta:bg': '#17181A',
        });
        expect(labelsIn(css)).toEqual(['#FFFFFF', '#E0713F']);
    });

    it('lets a label pick suppress the auto-label at its OWN state', () => {
        expect(labelsIn(buildRoleColorCss({
            'hero:primaryCta:bg@hover': '#17181A',
            'hero:primaryCta:fg@hover': '#E0713F',
        }))).toEqual(['#E0713F']);
        expect(labelsIn(buildRoleColorCss({
            'hero:primaryCta:bg@active': '#17181A',
            'hero:primaryCta:fg@active': '#E0713F',
        }))).toEqual(['#E0713F']);
    });

    it('keeps scopes independent at a state — a hero label does not silence the band', () => {
        const css = buildRoleColorCss({
            'hero:primaryCta:fg': '#E0713F',
            'hero:primaryCta:bg@hover': '#17181A',
            'ctaBand:primaryCta:bg@hover': '#FBF6F4',
        });
        // Both hover fills get their own label — a base label covers only the
        // base state — and hero's resting label is still emitted first.
        expect(labelsIn(css)).toEqual(['#E0713F', '#FFFFFF', '#0B0B0F']);
    });

    it('does not let a legacy label cover a section fill at the same state', () => {
        const css = buildRoleColorCss({
            'primaryCta:fg': '#E0713F',
            'ctaBand:primaryCta:bg@hover': '#17181A',
        });
        expect(labelsIn(css)).toEqual(['#E0713F', '#FFFFFF']);
    });
});

describe('COLOR_STATES / COLOR_STATE_LABELS', () => {
    it('offers exactly the three states, resting first', () => {
        expect(COLOR_STATES).toEqual(['base', 'hover', 'active']);
        // The picker opens on the resting colour, which is also the state
        // roleColorKey collapses — so it has to be the first entry.
        expect(COLOR_STATES[0]).toBe('base');
    });

    it('spells the states for an admin, not for the code', () => {
        // 'base' and 'active' are CSS words; an admin recolouring a button is
        // thinking Normal / Hover / Pressed.
        expect(COLOR_STATE_LABELS).toEqual({ base: 'Normal', hover: 'Hover', active: 'Pressed' });
        for (const st of COLOR_STATES) expect(COLOR_STATE_LABELS[st]).toBeTruthy();
    });
});

describe('roleColorKey / parseRoleColorKey — the state axis', () => {
    it('collapses base to a plain prop and decorates only the other two', () => {
        // A resting pick must write EXACTLY the key that shipped before states
        // existed, or every colour already stored needs migrating.
        expect(roleColorKey('primaryCta', 'bg')).toBe('primaryCta:bg');
        expect(roleColorKey('primaryCta', 'bg', null, 'base')).toBe('primaryCta:bg');
        expect(roleColorKey('primaryCta', 'bg', null, null)).toBe('primaryCta:bg');
        expect(roleColorKey('primaryCta', 'bg', 'hero', 'base')).toBe('hero:primaryCta:bg');

        expect(roleColorKey('primaryCta', 'bg', null, 'hover')).toBe('primaryCta:bg@hover');
        expect(roleColorKey('primaryCta', 'bg', null, 'active')).toBe('primaryCta:bg@active');
        expect(roleColorKey('heading', 'fg', null, 'hover')).toBe('heading:fg@hover');
    });

    it('carries a section AND a state on one key', () => {
        const key = roleColorKey('primaryCta', 'bg', 'ctaBand', 'hover');
        expect(key).toBe('ctaBand:primaryCta:bg@hover');
        // Still three colon-separated parts — which is the whole reason the
        // state rides on the prop instead of taking a fourth field.
        expect(key.split(':')).toHaveLength(3);
        expect(parseRoleColorKey(key))
            .toEqual({ section: 'ctaBand', role: 'primaryCta', prop: 'bg', state: 'hover' });

        expect(roleColorKey('heading', 'fg', 'about', 'active')).toBe('about:heading:fg@active');
        expect(parseRoleColorKey('about:heading:fg@active'))
            .toEqual({ section: 'about', role: 'heading', prop: 'fg', state: 'active' });

        // ...and it emits a rule that is scoped AND stateful, not one or other.
        const css = buildRoleColorCss({ [key]: '#17181A' });
        expect(rulesIn(css)[0]).toBe(
            '[data-field="ctaBand.cta1.text"]:hover,[data-field="ctaBand.cta.text"]:hover,' +
            '[data-field="ctaBand.cta1.text"]:focus-visible,[data-field="ctaBand.cta.text"]:focus-visible' +
            '{background:#17181A !important;border-color:#17181A !important;}',
        );
        expect(css).not.toContain('hero');
    });

    it('reports state "base" for a key with no state on it', () => {
        expect(parseRoleColorKey('primaryCta:bg'))
            .toEqual({ section: null, role: 'primaryCta', prop: 'bg', state: 'base' });
        expect(parseRoleColorKey('hero:primaryCta:fg'))
            .toEqual({ section: 'hero', role: 'primaryCta', prop: 'fg', state: 'base' });
    });

    it('rejects "bg@base" — one colour must not have two spellings', () => {
        // roleColorKey collapses base to 'bg', so 'bg@base' is not a key we
        // write. Accepting it would let one colour live under two keys meaning
        // the same thing, with the picker showing whichever it looked up first
        // and the other one still painting the page.
        expect(parseRoleColorKey('primaryCta:bg@base')).toBeNull();
        expect(parseRoleColorKey('primaryCta:fg@base')).toBeNull();
        expect(parseRoleColorKey('hero:primaryCta:bg@base')).toBeNull();
        // Rejected because it is the redundant spelling, NOT because '@' is
        // unreadable — the two real states on the same prop still parse.
        expect(parseRoleColorKey('primaryCta:bg@hover'))
            .toEqual({ section: null, role: 'primaryCta', prop: 'bg', state: 'hover' });
        expect(parseRoleColorKey('primaryCta:bg@active'))
            .toEqual({ section: null, role: 'primaryCta', prop: 'bg', state: 'active' });
    });

    it('rejects a malformed state instead of guessing at one', () => {
        expect(parseRoleColorKey('primaryCta:bg@junk')).toBeNull();
        expect(parseRoleColorKey('primaryCta:bg@HOVER')).toBeNull();     // states are lowercase
        expect(parseRoleColorKey('primaryCta:bg@')).toBeNull();          // trailing @, no state
        expect(parseRoleColorKey('primaryCta:@hover')).toBeNull();       // state, no prop
        expect(parseRoleColorKey('hero:primaryCta:@hover')).toBeNull();
        expect(parseRoleColorKey('@hover')).toBeNull();                  // not a key at all
        expect(parseRoleColorKey('primaryCta:bg@hover@active')).toBeNull();
        expect(parseRoleColorKey('primaryCta:border@hover')).toBeNull(); // not a prop we set
        expect(parseRoleColorKey('noSuchRole:bg@hover')).toBeNull();
        expect(parseRoleColorKey('constructor:bg@hover')).toBeNull();
        expect(parseRoleColorKey('hero:primaryCta:bg@hover:extra')).toBeNull();
        // ...and the well-formed neighbours of every one of those still parse,
        // so this is a state check and not a blanket ban on the '@'.
        expect(parseRoleColorKey('hero:primaryCta:bg@hover'))
            .toEqual({ section: 'hero', role: 'primaryCta', prop: 'bg', state: 'hover' });
        expect(parseRoleColorKey('heading:fg@active'))
            .toEqual({ section: null, role: 'heading', prop: 'fg', state: 'active' });
    });

    it('round-trips every real combination of section, role, prop and state', () => {
        const sections: Array<string | null> = [null, 'hero', 'ctaBand', 'about'];
        const roles: ColorRole[] = ['primaryCta', 'secondaryCta', 'headerCta', 'heading', 'eyebrow', 'link'];
        const props: ColorProp[] = ['bg', 'fg'];
        let checked = 0;
        for (const section of sections) {
            for (const role of roles) {
                for (const prop of props) {
                    for (const state of COLOR_STATES) {
                        const key = roleColorKey(role, prop, section, state);
                        expect(parseRoleColorKey(key)).toEqual({ section, role, prop, state });
                        checked += 1;
                    }
                }
            }
        }
        expect(checked).toBe(sections.length * roles.length * props.length * COLOR_STATES.length);
    });

    it('skips a stray state key and still emits the good ones', () => {
        const withJunk = buildRoleColorCss({
            'hero:primaryCta:bg@hover': '#17181A',
            'hero:primaryCta:bg@base': '#FFFFFF',
            'primaryCta:bg@junk': '#FFFFFF',
            'primaryCta:@hover': '#FFFFFF',
            'primaryCta:bg@': '#FFFFFF',
            'primaryCta:bg@hover@active': '#FFFFFF',
        });
        expect(withJunk).toBe(buildRoleColorCss({ 'hero:primaryCta:bg@hover': '#17181A' }));
        expect(withJunk).not.toBe('');
    });
});

/**
 * The header CTA has its own role.
 *
 * The bug: clicking the header's "Contact us" opened a picker labelled
 * "Primary buttons", and the colour never arrived. roleForField's catch-all
 * returned `primaryCta` for ANY button, but primaryCta's selectors are pinned
 * to `hero.cta1.text` / `ctaBand.cta1.text` / `ctaBand.cta.text` and name no
 * header hook — so the pick was stored, the CSS was emitted, and it landed on
 * the hero and closing-band buttons instead of the one that was clicked.
 *
 * The templates emit the header CTA in TWO shapes, and both are covered:
 *   · `navCtaText` / `navCtaHref`     — dotless, 15 family headers and footers
 *   · `nav.cta.text` / `nav.cta.href` — the five generic headers (HeaderA–E),
 *     which read the same `content.navCtaText` but emit a dotted hook.
 */

/** The exact every-section selector list for the header role. Frozen on purpose. */
const HEADER_CTA_BASE =
    '[data-field="navCtaText"],[data-field="nav.cta.text"],' +
    '[data-field="navCtaText"]:hover,[data-field="nav.cta.text"]:hover,' +
    '[data-field="navCtaText"]:focus,[data-field="nav.cta.text"]:focus';

describe('headerCta — the role exists and matches what the templates emit', () => {
    it('names both shapes the templates emit, and nothing else', () => {
        // Checked against a scan of astro-site-template/src, not guessed:
        // `navCtaText` appears in 15 files, `nav.cta.text` in 5. Covering only
        // one shape would leave a quarter of the catalogue as broken as before.
        expect(COLOR_ROLES.headerCta.selectors).toEqual([
            '[data-field="navCtaText"]',
            '[data-field="nav.cta.text"]',
        ]);
    });

    it('reads in the popover beside the other button roles', () => {
        expect(COLOR_ROLES.headerCta.label).toBe('Header button');
        // A name an admin can tell apart from the two it used to be confused
        // with, at a glance, in the same list.
        const labels = [
            COLOR_ROLES.primaryCta.label,
            COLOR_ROLES.secondaryCta.label,
            COLOR_ROLES.headerCta.label,
        ];
        expect(new Set(labels).size).toBe(3);
    });

    it('opens on the fill, like every other button role', () => {
        // A click on a button means "this button's colour", and for a button
        // that is the fill. Matching primaryCta/secondaryCta also means an
        // admin who has recoloured one button already knows what the next
        // click will do.
        expect(COLOR_ROLES.headerCta.defaultProp).toBe('bg');
        expect(COLOR_ROLES.headerCta.defaultProp).toBe(COLOR_ROLES.primaryCta.defaultProp);
        expect(COLOR_ROLES.headerCta.props).toEqual(['bg', 'fg']);
    });

    it('emits the header selectors and NOT the hero or closing band', () => {
        const css = buildRoleColorCss({ 'headerCta:bg': '#17181A' });
        expect(css).toBe(
            `${HEADER_CTA_BASE}{background:#17181A !important;border-color:#17181A !important;}\n` +
            `${HEADER_CTA_BASE}{color:#FFFFFF !important;}`,
        );
        // The whole point: it must not reach the buttons primaryCta owns.
        expect(css).not.toContain('hero.cta1');
        expect(css).not.toContain('ctaBand');
    });

    it('carries a legible label like any other background pick', () => {
        // A pale header fill must flip the label to dark, same as everywhere.
        const css = buildRoleColorCss({ 'headerCta:bg': '#FFF9C4' });
        expect(labelsIn(css)).toEqual(['#0B0B0F']);
        expect(contrast('#0B0B0F', '#FFF9C4')).toBeGreaterThanOrEqual(4.5);
    });
});

describe('headerCta — primaryCta no longer claims the header field', () => {
    it('does not list any header hook among primaryCta or secondaryCta selectors', () => {
        // Verified against the file, so a later edit that "helpfully" widens
        // primaryCta to cover the header trips here — that widening would
        // change what every already-published primaryCta:bg paints.
        const others = [...COLOR_ROLES.primaryCta.selectors, ...COLOR_ROLES.secondaryCta.selectors];
        for (const sel of others) {
            expect(sel).not.toContain('navCta');
            expect(sel).not.toContain('nav.cta');
        }
    });

    it('emits nothing touching the header for a primaryCta pick', () => {
        const css = buildRoleColorCss({ 'primaryCta:bg': '#17181A', 'primaryCta:fg': '#FFFFFF' });
        expect(css).not.toContain('navCtaText');
        expect(css).not.toContain('nav.cta.text');
    });

    it('keeps the header and the hero primary independent of each other', () => {
        // Two roles, two keys, two disjoint rule sets — the independence the
        // owner asked for. A header CTA is chrome; a hero CTA sits on artwork.
        const header = buildRoleColorCss({ 'headerCta:bg': '#B8860B' });
        const hero = buildRoleColorCss({ 'hero:primaryCta:bg': '#B8860B' });
        expect(header).not.toBe(hero);
        expect(header).not.toContain('hero.cta1');
        expect(hero).not.toContain('navCtaText');
    });
});

describe('roleForField — every button field the templates emit', () => {
    // Every data-field / data-href-field that sits on a button-ish element in
    // astro-site-template/src, enumerated by scanning the .astro sources rather
    // than recalled. `isButton` is what the preview bridge computes: a <button>
    // tag, or `btn` as a whole word in the class list, or a `.btn`/`button`
    // ancestor.
    const TABLE: Array<[field: string, isButton: boolean, role: ColorRole]> = [
        // ── the header CTA: its own role now, in BOTH shapes ────────────────
        ['navCtaText', true, 'headerCta'],
        ['navCtaHref', true, 'headerCta'],
        ['nav.cta.text', true, 'headerCta'],
        ['nav.cta.href', true, 'headerCta'],
        // ── hero ───────────────────────────────────────────────────────────
        ['hero.cta1.text', true, 'primaryCta'],
        ['hero.cta2.text', true, 'secondaryCta'],
        ['hero.cta3.text', true, 'secondaryCta'],
        // ── closing band ───────────────────────────────────────────────────
        ['ctaBand.cta.text', true, 'primaryCta'],
        ['ctaBand.cta1.text', true, 'primaryCta'],
        ['ctaBand.cta2.text', true, 'secondaryCta'],
        ['ctaBand.cta3.text', true, 'secondaryCta'],
        ['ctaBand.primary.text', true, 'primaryCta'],
        ['ctaBand.secondary.text', true, 'primaryCta'],
        // ── the long tail of one-off buttons, all still the catch-all ──────
        ['location.cta.text', true, 'primaryCta'],
        ['location.directions.text', true, 'primaryCta'],
        ['location.phone', true, 'primaryCta'],
        ['services.cta.text', true, 'primaryCta'],
        ['services.ctaLabel', true, 'primaryCta'],
        // ── the header's NON-CTA hooks, which must NOT be swept up ─────────
        ['nav.phone', false, 'link'],
        ['nav.phone.href', false, 'link'],
        ['nav.brand', false, 'link'],
        ['nav.status', false, 'link'],
    ];

    it.each(TABLE)('routes %s (isButton=%s) to %s', (field, isButton, role) => {
        expect(roleForField(field, isButton)).toBe(role);
    });

    it('routes the header CTA by its hook, NOT by whether it looks like a button', () => {
        // Only 7 of the 15 dotless files dress this hook as `.btn`; the rest
        // use `a.nav-resv`, `a.navc`, `a.link`, `a.foot-cta`, and one of the
        // five generic headers uses `a.nav-cta`. On 9 of 20 templates the
        // bridge therefore reports isButton=false. A check placed INSIDE the
        // isButton branch would have fixed the pill templates and left the
        // others routing to `link` — the same button answering differently
        // depending on a class name the template author happened to type.
        for (const f of ['navCtaText', 'navCtaHref', 'nav.cta.text', 'nav.cta.href']) {
            expect(roleForField(f, true)).toBe('headerCta');
            expect(roleForField(f, false)).toBe('headerCta');
        }
    });

    it('matches on the whole hook, so a lookalike is not captured', () => {
        // An exact-match set, not a /^nav\./ pattern — which would have
        // swallowed nav.phone and nav.brand — and not a substring test either.
        expect(roleForField('hero.navCtaText', true)).toBe('primaryCta');
        expect(roleForField('navCtaTextExtra', true)).toBe('primaryCta');
        expect(roleForField('nav.cta.textarea', true)).toBe('primaryCta');
        expect(roleForField('footer.nav.cta.text', true)).toBe('primaryCta');
    });

    it('still routes the non-button roles it always did', () => {
        expect(roleForField('services.headline', false)).toBe('heading');
        expect(roleForField('hero.headlineLines.0', false)).toBe('heading');
        expect(roleForField('about.tag', false)).toBe('eyebrow');
        expect(roleForField('hero.kicker', false)).toBe('eyebrow');
        expect(roleForField('footer.blurb', false)).toBe('link');
        expect(roleForField('', false)).toBe('link');
    });
});

describe('headerCta — the section and state axes', () => {
    it('produces an every-section key for the dotless hook, because it must', () => {
        // sectionForField returns '' for a dotless hook: scoping works by
        // prefix and no prefix reaches `navCtaText`. That is not a shortfall —
        // there is one header, so every-section and header-only are the same
        // set of elements.
        expect(sectionForField('navCtaText')).toBe('');
        expect(roleColorKey('headerCta', 'bg', sectionForField('navCtaText')))
            .toBe('headerCta:bg');
        expect(parseRoleColorKey('headerCta:bg'))
            .toEqual({ section: null, role: 'headerCta', prop: 'bg', state: 'base' });
    });

    it('scopes the DOTTED shape to nav, and that reaches only the generic headers', () => {
        // The five generic headers emit nav.cta.text, so a click there yields
        // section 'nav'. The dotless selector cannot live under any section and
        // is dropped, leaving exactly the selector that can match.
        expect(sectionForField('nav.cta.text')).toBe('nav');
        expect(buildRoleColorCss({ 'nav:headerCta:bg': '#17181A' })).toBe(
            '[data-field="nav.cta.text"],[data-field="nav.cta.text"]:hover,' +
            '[data-field="nav.cta.text"]:focus' +
            '{background:#17181A !important;border-color:#17181A !important;}\n' +
            '[data-field="nav.cta.text"],[data-field="nav.cta.text"]:hover,' +
            '[data-field="nav.cta.text"]:focus{color:#FFFFFF !important;}',
        );
    });

    it('emits nothing when scoped to a section the header cannot be in', () => {
        // Both selectors are pinned, and neither names `hero`, so both drop and
        // the entry is skipped rather than emitting a rule that matches nothing.
        expect(buildRoleColorCss({ 'hero:headerCta:bg': '#17181A' })).toBe('');
        expect(buildRoleColorCss({ 'ctaBand:headerCta:fg': '#17181A' })).toBe('');
        expect(scopeSelector('[data-field="navCtaText"]', 'nav')).toBeNull();
        expect(scopeSelector('[data-field="nav.cta.text"]', 'nav'))
            .toBe('[data-field="nav.cta.text"]');
    });

    it('takes the hover and pressed states, each with its own suffixes', () => {
        expect(buildRoleColorCss({ 'headerCta:fg@hover': '#E0713F' })).toBe(
            '[data-field="navCtaText"]:hover,[data-field="nav.cta.text"]:hover,' +
            '[data-field="navCtaText"]:focus-visible,[data-field="nav.cta.text"]:focus-visible' +
            '{color:#E0713F !important;}',
        );
        expect(buildRoleColorCss({ 'headerCta:fg@active': '#E0713F' })).toBe(
            '[data-field="navCtaText"]:active,[data-field="nav.cta.text"]:active' +
            '{color:#E0713F !important;}',
        );
    });

    it('orders the header states base → hover → pressed, like every other role', () => {
        const css = buildRoleColorCss({
            'headerCta:bg@active': '#111111',
            'headerCta:bg': '#333333',
            'headerCta:bg@hover': '#222222',
        });
        const rules = rulesIn(css);
        const idx = (c: string) => rules.findIndex((r) => r.includes(`background:${c}`));
        expect(idx('#333333')).toBeLessThan(idx('#222222'));
        expect(idx('#222222')).toBeLessThan(idx('#111111'));
    });

    it('gives each header state its own auto-label, and lets an fg pick silence it', () => {
        // A pale hover fill under a base label picked for a dark resting fill
        // is exactly the 1.06:1 pairing the auto-label rule exists to catch.
        const spilled = buildRoleColorCss({
            'headerCta:fg': '#FEFEFE',
            'headerCta:bg@hover': '#FFF9C4',
        });
        expect(labelsIn(spilled)).toEqual(['#FEFEFE', '#0B0B0F']);
        // ...and a label chosen for the hover state itself is left alone.
        const chosen = buildRoleColorCss({
            'headerCta:bg@hover': '#FFF9C4',
            'headerCta:fg@hover': '#E0713F',
        });
        expect(labelsIn(chosen)).toEqual(['#E0713F']);
    });
});

describe('headerCta is additive — published sites render byte-identically', () => {
    it('emits the frozen legacy primaryCta document, untouched by the new role', () => {
        // The promise: a site whose customizations hold primaryCta:bg today
        // colours its hero, closing-band and per-section buttons. After this
        // change it must colour EXACTLY those elements — the HEADER pill was
        // never covered by this key, so it must not start being covered by it
        // now, however the 24 headers that used to print hero.cta1.text are
        // rehooked.
        expect(buildRoleColorCss({ 'primaryCta:bg': '#17181A' })).toBe(
            `${LEGACY_PRIMARY_CTA}{background:#17181A !important;border-color:#17181A !important;}\n` +
            `${LEGACY_PRIMARY_CTA}{color:#FFFFFF !important;}`,
        );
    });

    it('leaves a realistic published map completely unchanged', () => {
        // A whole-site palette of the kind already baked into published HTML,
        // asserted whole. Nothing here may gain a header rule.
        const css = buildRoleColorCss({
            'primaryCta:bg': '#B8860B',
            'primaryCta:fg': '#0B0B0F',
            'secondaryCta:bg': '#FFFFFF',
            'heading:fg': '#5A0000',
            'eyebrow:fg': '#E0713F',
            'link:fg': '#2563EB',
            'hero:primaryCta:bg': '#17181A',
            'ctaBand:primaryCta:bg@hover': '#FFF9C4',
        });
        expect(css).not.toContain('navCtaText');
        expect(css).not.toContain('nav.cta.text');
        expect(css).not.toContain('headerCta');
        // ...and still says everything it used to.
        expect(css).toContain('[data-field="hero.cta1.text"]');
        expect(css).toContain('[data-field="ctaBand.cta.text"]');
        expect(css).toContain('a[data-href-field]:not(.btn)');
    });

    it('does not let the header key alter what a legacy key emits beside it', () => {
        // Adding a header colour must be purely additive: the legacy rules come
        // out character-for-character as they do on their own.
        const legacyOnly = buildRoleColorCss({ 'primaryCta:bg': '#17181A' });
        const withHeader = buildRoleColorCss({
            'primaryCta:bg': '#17181A',
            'headerCta:bg': '#B8860B',
        });
        expect(withHeader.startsWith(legacyOnly)).toBe(true);
        expect(rulesIn(withHeader).slice(0, 2)).toEqual(rulesIn(legacyOnly));
    });

    it('does not let a header label pick silence a primaryCta auto-label', () => {
        // fgCovers is keyed by scope+ROLE+state, so the two roles cannot leak
        // into one another's legibility check.
        const css = buildRoleColorCss({
            'headerCta:fg': '#FF0000',
            'primaryCta:bg': '#17181A',
        });
        expect(labelsIn(css)).toEqual(['#FF0000', '#FFFFFF']);
    });
});

/**
 * headerCta — the two things it does that are NOT obvious from its name.
 *
 * Both are deliberate and both were confirmed against the built site rather
 * than reasoned about. They are pinned here because each looks like a bug to
 * the next reader, and "fixing" either one costs more than it buys.
 */
describe('headerCta — the deliberate over-reach, pinned', () => {
    it('carries no ancestor constraint, so it reaches the FOOTER copies too', () => {
        // Five of the 15 dotless files are footers (foodcraft BL/BM/BN/BO,
        // hospitality BK) that draw `navCtaText` again as a contact line, and
        // on four of them the same page carries both. A `bg` pick therefore
        // puts a filled block behind a footer text link — verified on
        // astro-site-template/dist/index.html, where {headerCta:bg} paints
        // `header … a.btn.pcbn-cta` AND `footer … a.linkc.pcbn-fcta`.
        //
        // `header [data-field="navCtaText"]` would stop that and would be
        // worse: roleForField sees a field and a boolean, never the ancestor,
        // so a click on the footer copy would still open this picker, still
        // say "Header button", and then change something off-screen — the
        // silent wrong-target this role exists to fix. Every element the
        // picker opens FROM must be an element the pick reaches.
        for (const sel of COLOR_ROLES.headerCta.selectors) {
            expect(sel.trim().startsWith('[')).toBe(true);
            expect(/^\s*(header|footer|nav)\b/.test(sel)).toBe(false);
        }
    });

    it('loses to an every-section `link` colour on the 9 non-.btn files', () => {
        // Not an ordering question — buildRoleColorCss only settles contests
        // between rules of EQUAL specificity, and this pair is not equal. On
        // the 9 files that dress the CTA as `a.nav-resv` / `a.navc` / `a.link`
        // / `a.nav-cta` / `a.linkc` rather than `.btn`, `link`'s selector
        // matches the very same element and outweighs this role's, so an
        // every-section link colour beats a header `fg` — including the
        // automatic label a `bg` pick emits — whichever is written last.
        //
        // Narrowing `link` would fix it and would change the CSS every
        // published `link:*` key emits. That trade is not available here.
        const weight = (sel: string): [number, number, number] => {
            // Only the shapes this file emits: attribute tests, one type, and
            // a :not() holding a single class.
            const flat = sel.replace(/:not\(([^)]*)\)/g, '$1');
            const attrs = (flat.match(/\[[^\]]*\]/g) ?? []).length;
            // Attribute VALUES hold dots ("nav.cta.text"); blank the brackets
            // out before looking for classes or a dots would each score.
            const rest = flat.replace(/\[[^\]]*\]/g, ' ');
            const ids = (rest.match(/#[\w-]+/g) ?? []).length;
            const classes = (rest.match(/\.[\w-]+/g) ?? []).length;
            const types = (rest.match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
            return [ids, attrs + classes, types];
        };
        const beats = (a: [number, number, number], b: [number, number, number]) =>
            a[0] !== b[0] ? a[0]! > b[0]! : a[1] !== b[1] ? a[1]! > b[1]! : a[2]! > b[2]!;

        const link = weight(COLOR_ROLES.link.selectors[0]!);
        expect(link).toEqual([0, 2, 1]);
        for (const sel of COLOR_ROLES.headerCta.selectors) {
            expect(weight(sel)).toEqual([0, 1, 0]);
            expect(beats(link, weight(sel))).toBe(true);
        }
    });
});
