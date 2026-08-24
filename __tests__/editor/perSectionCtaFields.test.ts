import fs from 'fs';
import path from 'path';
import {
    GENERIC_CONTENT_SCHEMA,
    isSchemaEditablePath,
    isSchemaListRowPath,
} from '../../components/editor/genericContentSchema';
import { sectionForField, roleForField } from '../../lib/roleColors';

/* ─────────────────────────────────────────────────────────────────────────────
 * PER-SECTION CTA FIELDS
 *
 * 57 section components used to render a button bound to ANOTHER section's
 * field — nearly always hero.cta1.text/href. Two things followed from that, and
 * both were bugs:
 *
 *   · the LABEL was shared, so retyping the hero's button retyped the header's,
 *     the footer's and the How band's;
 *   · the COLOUR was shared, because lib/roleColors.ts derives the section from
 *     the leading segment of the hook. Both buttons reported section "hero", so
 *     one primaryCta fill painted both — and on foodcraft:BN that put a black
 *     button on the near-black Procedure band, which the template had
 *     deliberately drawn in orange.
 *
 * The fix gives each section its own cta text and href. This file locks down
 * the two halves that a future edit could silently undo: the SCHEMA half (the
 * fields exist, in the right group, and report the right section), and the
 * COMPONENT half (no section outside /hero/ binds hero.cta1 any more).
 *
 * The fallback that keeps published sites intact lives in the components
 * themselves — each reads its own field first and falls through to exactly what
 * it read before — and deliberately NOT in a `fallbackPaths` here: a fallback
 * path is a survival signal to ContentFieldsAuto, so declaring hero.cta1.text
 * would make "Footer button" appear on every template that draws a hero, i.e.
 * all of them.
 * ────────────────────────────────────────────────────────────────────────── */

const NEW = [
    { group: 'Header / Nav', text: 'navCtaText', href: 'navCtaHref', section: '' },
    { group: 'Footer', text: 'footer.cta.text', href: 'footer.cta.href', section: 'footer' },
    { group: 'How it works', text: 'how.cta.text', href: 'how.cta.href', section: 'how' },
    { group: 'Services', text: 'services.cta.text', href: 'services.cta.href', section: 'services' },
    { group: 'About', text: 'about.cta.text', href: 'about.cta.href', section: 'about' },
];

describe('per-section CTA fields — the schema half', () => {
    it('declares each pair exactly once, in its own section group, as a link', () => {
        for (const n of NEW) {
            const hits = GENERIC_CONTENT_SCHEMA.flatMap((g) =>
                g.fields
                    .filter((f: any) => f.path === n.text)
                    .map((f: any) => ({ group: (g as any).title ?? (g as any).id, f })),
            );
            expect({ path: n.text, count: hits.length }).toEqual({ path: n.text, count: 1 });
            expect(hits[0]!.f.kind).toBe('link');
            expect(hits[0]!.f.hrefPath).toBe(n.href);
            expect(hits[0]!.group).toBe(n.group);
            // The fallback belongs in the component, never here — see the header
            // note. A fallbackPaths entry is a survival signal, not a default.
            expect([n.text, hits[0]!.f.fallbackPaths]).toEqual([n.text, undefined]);
        }
    });

    it('adds no path that collides with one already declared', () => {
        const paths = GENERIC_CONTENT_SCHEMA.flatMap((g) => g.fields.map((f: any) => f.path));
        for (const n of NEW) {
            expect([n.text, paths.filter((p) => p === n.text).length]).toEqual([n.text, 1]);
        }
        // services.cta is a nested object BESIDE services.ctaLabel / .ctaHref,
        // which is the per-card button repeated across the grid. Two buttons in
        // one section, two fields, and both answer to the Services colour scope.
        const hrefPaths = GENERIC_CONTENT_SCHEMA.flatMap((g) =>
            g.fields.map((f: any) => f.hrefPath).filter(Boolean),
        );
        expect(paths).toContain('services.ctaLabel');
        expect(hrefPaths).toContain('services.ctaHref');
        // …and the new pair is a different pair, not a rename of that one.
        expect(hrefPaths.filter((p) => p === 'services.cta.href')).toHaveLength(1);
    });

    it('makes both halves inline-editable and neither a list row', () => {
        for (const n of NEW) {
            expect([n.text, isSchemaEditablePath(n.text)]).toEqual([n.text, true]);
            expect([n.href, isSchemaEditablePath(n.href)]).toEqual([n.href, true]);
            expect([n.text, isSchemaListRowPath(n.text)]).toEqual([n.text, false]);
            expect([n.href, isSchemaListRowPath(n.href)]).toEqual([n.href, false]);
        }
    });

    it('reports the section the colour picker scopes a pick to', () => {
        for (const n of NEW) {
            expect([n.text, sectionForField(n.text)]).toEqual([n.text, n.section]);
            expect([n.href, sectionForField(n.href)]).toEqual([n.href, n.section]);
        }
        // The four dotted pairs are primary buttons, narrowed by their section.
        for (const n of NEW.filter((x) => x.section)) {
            expect([n.text, roleForField(n.text, true)]).toEqual([n.text, 'primaryCta']);
        }
        // The header pair is dotless, so it has no section to scope by and is
        // routed to its own role by exact match instead.
        expect(roleForField('navCtaText', false)).toBe('headerCta');
        expect(roleForField('navCtaHref', false)).toBe('headerCta');
    });
});

/* ───────────────────────────────────────────────────────────────────────────*/

const COMPONENTS = path.join(__dirname, '..', '..', 'astro-site-template', 'src', 'components');

function astroFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...astroFiles(full));
        else if (entry.name.endsWith('.astro')) out.push(full);
    }
    return out;
}

describe('per-section CTA fields — the component half', () => {
    it('leaves no section outside the hero binding the hero CTA', () => {
        // A component that falls back for its VALUE but still binds the OLD path
        // has fixed nothing: the first edit would land on the hero again and
        // re-share the label, and the colour picker would keep reporting "hero".
        const offenders = astroFiles(COMPONENTS)
            .filter((f) => !/[\\/]hero[\\/]/.test(f))
            .filter((f) =>
                /data-(href-)?field="hero\.cta1\.(text|href)"/.test(fs.readFileSync(f, 'utf8')),
            )
            .map((f) => path.relative(COMPONENTS, f).replace(/\\/g, '/'));
        expect(offenders).toEqual([]);
    });

    it('never hooks a section CTA without spelling that section in the hook', () => {
        // Every element that carries one of the four dotted text hooks must
        // carry the matching href hook or none at all — never another section's.
        // (A pill whose href is a WhatsApp / Messenger CHANNEL carries no
        // data-href-field at all, which is why "none" is allowed.)
        const bad: string[] = [];
        for (const file of astroFiles(COMPONENTS)) {
            const src = fs.readFileSync(file, 'utf8');
            for (const section of ['footer', 'how', 'services', 'about']) {
                const re = new RegExp(
                    `data-field="${section}\\.cta\\.text"[^>]*?data-href-field="([^"]+)"`,
                    'g',
                );
                for (const m of src.matchAll(re)) {
                    if (m[1] !== `${section}.cta.href`) {
                        bad.push(`${path.relative(COMPONENTS, file)}: ${section}.cta.text -> ${m[1]}`);
                    }
                }
            }
        }
        expect(bad).toEqual([]);
    });
});
