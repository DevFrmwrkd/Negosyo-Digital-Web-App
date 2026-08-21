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
    labelFor,
    parseRoleColorKey,
    roleColorKey,
    scopeSelector,
    sectionForField,
} from '@/lib/roleColors';

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
 * The exact every-section selector list. Frozen on purpose: this string is
 * baked into HTML already published, and a site coloured before sections
 * existed has to render exactly as it does now.
 */
const LEGACY_PRIMARY_CTA =
    '[data-field="hero.cta1.text"],[data-field="ctaBand.cta1.text"],[data-field="ctaBand.cta.text"],' +
    '[data-field="hero.cta1.text"]:hover,[data-field="ctaBand.cta1.text"]:hover,[data-field="ctaBand.cta.text"]:hover,' +
    '[data-field="hero.cta1.text"]:focus,[data-field="ctaBand.cta1.text"]:focus,[data-field="ctaBand.cta.text"]:focus';

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
        // primaryCta lives only in hero + ctaBand. Scoping it to the footer must
        // drop every selector rather than fall back to all of them.
        expect(buildRoleColorCss({ 'footer:primaryCta:bg': '#17181A' })).toBe('');
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
            .toEqual({ section: 'about', role: 'heading', prop: 'fg' });
        expect(parseRoleColorKey(roleColorKey('primaryCta', 'bg')))
            .toEqual({ section: null, role: 'primaryCta', prop: 'bg' });
        // A dotless hook has no section, so this must round-trip as the
        // every-section key rather than a scoped one that matches nothing.
        expect(parseRoleColorKey(roleColorKey('link', 'fg', sectionForField('navCtaHref'))))
            .toEqual({ section: null, role: 'link', prop: 'fg' });
        expect(parseRoleColorKey(roleColorKey('link', 'fg', sectionForField('nav.cta.href'))))
            .toEqual({ section: 'nav', role: 'link', prop: 'fg' });
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
