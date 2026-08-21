/**
 * buildRoleColorCss — a background pick must carry a legible label with it.
 *
 * The v3 editor's click-to-recolour defaults to editing a button's BACKGROUND.
 * It used to emit `background` + `border-color` and nothing else, leaving the
 * label at whatever the template's own tokens had chosen and checking the pair
 * against nothing. Recolour a button toward its own label colour and the label
 * disappears — one click, on the default prop, on every template. These colours
 * are baked into the built HTML by app/api/generate-website, so it ships.
 */
import { buildRoleColorCss, labelFor } from '@/lib/roleColors';

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

describe('buildRoleColorCss', () => {
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

    it('emits nothing for a malformed colour rather than a broken rule', () => {
        expect(buildRoleColorCss({ 'primaryCta:bg': 'red' })).toBe('');
        expect(buildRoleColorCss({ 'primaryCta:bg': '' })).toBe('');
        expect(buildRoleColorCss(undefined)).toBe('');
    });
});
