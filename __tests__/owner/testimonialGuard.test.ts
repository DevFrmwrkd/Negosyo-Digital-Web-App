import {
    hasSuppliedTestimonials,
    stripFabricatedTestimonials,
    TESTIMONIAL_SOURCE_QUESTION,
} from '../../lib/services/groq.service';
import { INTAKE_QUESTIONS, type QaPair } from '../../lib/narrativeFromQa';

/** Look a canonical question up by machine key — the tests key off the stable id,
 *  never the display text, for the same reason the storage format does. */
const question = (key: string) => {
    const found = INTAKE_QUESTIONS.find((entry) => entry.key === key);
    if (!found) throw new Error(`no such intake question: ${key}`);
    return found;
};

/**
 * The seven answers an owner gives before the optional testimonial question,
 * stored the way submitOwnerIntake stores them: canonical display text, owner's
 * words. The testimonial question is added per-test — its presence or absence is
 * the whole subject here.
 */
const INTAKE_WITHOUT_TESTIMONIALS: QaPair[] = [
    { q: question('what_you_sell').q, a: 'Kikiam, fish ball, kwek kwek, palamig. Merienda after school, bagong luto lahat.' },
    { q: question('who_you_serve').q, a: 'Students and the office workers from the building across.' },
    { q: question('what_makes_you_different').q, a: 'Bagong luto talaga, hindi namin iniinit ulit. Tatlong sarsa, gawa namin.' },
    { q: question('how_to_buy').q, a: 'Walk up to the cart. Cash or Gcash.' },
    { q: question('year_opened').q, a: '2019' },
    { q: question('common_questions').q, a: 'Anong oras kayo nandiyan. Meron pa bang kwek kwek.' },
];

/** The real fabrication this guard exists for: three customers the copywriting
 *  model invented for a stall whose owner skipped the testimonial question. */
const FABRICATED = [
    { name: 'May A', context: 'regular customer', quote: 'I love the variety of sauces they offer' },
    { name: 'John D', context: 'office worker', quote: 'Their kwek-kwek is always freshly cooked' },
    { name: 'Ana G', context: 'student', quote: 'The staff are always friendly and helpful' },
];

describe('hasSuppliedTestimonials', () => {
    it('is true when the owner answered the testimonial question', () => {
        expect(
            hasSuppliedTestimonials({
                contentSource: 'owner_intake',
                interviewQa: [
                    ...INTAKE_WITHOUT_TESTIMONIALS,
                    {
                        q: question(TESTIMONIAL_SOURCE_QUESTION).q,
                        a: 'Sabi nila walang tapon, laging bagong luto. And they say mas mura kaysa sa mall.',
                    },
                ],
            }),
        ).toBe(true);
    });

    it('is false when the optional testimonial question was skipped', () => {
        // The skip is a MISSING PAIR, not a blank one: normalizeQa drops empty
        // answers before the row is written, so "skipped" never round-trips as ''.
        expect(
            hasSuppliedTestimonials({
                contentSource: 'owner_intake',
                interviewQa: INTAKE_WITHOUT_TESTIMONIALS,
            }),
        ).toBe(false);
    });

    it('is false when the answer is present but blank', () => {
        expect(
            hasSuppliedTestimonials({
                contentSource: 'owner_intake',
                interviewQa: [
                    ...INTAKE_WITHOUT_TESTIMONIALS,
                    { q: question(TESTIMONIAL_SOURCE_QUESTION).q, a: '   ' },
                ],
            }),
        ).toBe(false);
    });

    it('matches the stored pair by machine key as well as by display text', () => {
        expect(
            hasSuppliedTestimonials({
                contentSource: 'owner_intake',
                interviewQa: [{ q: TESTIMONIAL_SOURCE_QUESTION, a: 'They say we never run out of ice.' }],
            }),
        ).toBe(true);
    });

    it('never matches on some OTHER answer, however testimonial-shaped', () => {
        // what_you_sell reaching the testimonial gate would make every submission
        // "sourced" and switch the guard off product-wide.
        expect(
            hasSuppliedTestimonials({
                contentSource: 'owner_intake',
                interviewQa: [{ q: question('what_you_sell').q, a: 'Everyone tells us our kwek kwek is the best.' }],
            }),
        ).toBe(false);
    });

    it('is false on the creator funnel even with a transcript full of praise', () => {
        // No structured Q&A exists on that path, so there is nothing to verify
        // against — see hasSuppliedTestimonials for why the answer is NO rather
        // than a guess at the prose.
        expect(hasSuppliedTestimonials({ contentSource: undefined, interviewQa: undefined })).toBe(false);
        expect(
            hasSuppliedTestimonials({
                interviewQa: [{ q: question(TESTIMONIAL_SOURCE_QUESTION).q, a: 'They say we are the best.' }],
            }),
        ).toBe(false);
    });

    it('is false for missing or malformed input', () => {
        expect(hasSuppliedTestimonials(null)).toBe(false);
        expect(hasSuppliedTestimonials(undefined)).toBe(false);
        expect(hasSuppliedTestimonials({ contentSource: 'owner_intake', interviewQa: null })).toBe(false);
        expect(hasSuppliedTestimonials({ contentSource: 'owner_intake', interviewQa: [] })).toBe(false);
    });
});

describe('stripFabricatedTestimonials', () => {
    it('empties an invented flat testimonials array and reports the count', () => {
        const { content, removed } = stripFabricatedTestimonials({
            business_name: 'Ate Beth Street Food',
            testimonials: FABRICATED,
        });
        expect(content.testimonials).toEqual([]);
        expect(removed.testimonials).toBe(3);
        expect(content.business_name).toBe('Ate Beth Street Food');
    });

    it('empties the wrapped generic-template shape but keeps its tag and headline', () => {
        // astro-builder hides the block on a zero-length items[] just as it does
        // on a zero-length array, so an empty wrapper is a working page — and any
        // eyebrow/headline the admin wrote survives the strip.
        const { content, removed } = stripFabricatedTestimonials({
            testimonials: { tag: 'Reviews', headline: 'What people say', items: FABRICATED },
        });
        expect(content.testimonials).toEqual({ tag: 'Reviews', headline: 'What people say', items: [] });
        expect(removed.testimonials).toBe(3);
    });

    it('strips the nested featured_products[].testimonial and leaves the project intact', () => {
        const { content, removed } = stripFabricatedTestimonials({
            featured_products: [
                {
                    title: 'Complete Business Setup',
                    description: 'A comprehensive project.',
                    tags: ['Setup', 'Complete'],
                    testimonial: { quote: 'They exceeded all our expectations.', author: 'Maria Santos' },
                },
                { title: 'Service Area Enhancement', description: 'Upgraded the main service area.', tags: ['Service'] },
            ],
        });
        expect(content.featured_products[0]).not.toHaveProperty('testimonial');
        expect(content.featured_products[0].title).toBe('Complete Business Setup');
        expect(content.featured_products[0].tags).toEqual(['Setup', 'Complete']);
        expect(content.featured_products[1]).toEqual({
            title: 'Service Area Enhancement',
            description: 'Upgraded the main service area.',
            tags: ['Service'],
        });
        expect(removed.productTestimonials).toBe(1);
    });

    it('strips both sources in one pass', () => {
        const { content, removed } = stripFabricatedTestimonials({
            testimonials: FABRICATED,
            featured_products: [
                { title: 'A', testimonial: { quote: 'q', author: 'Juan Dela Cruz' } },
                { title: 'B', testimonial: { quote: 'q', author: 'Ana Reyes' } },
            ],
        });
        expect(content.testimonials).toEqual([]);
        expect(content.featured_products.every((p: any) => !('testimonial' in p))).toBe(true);
        expect(removed).toEqual({ testimonials: 3, productTestimonials: 2 });
    });

    it('accepts a bare featured_products array — the default-products call site', () => {
        const { content, removed } = stripFabricatedTestimonials([
            { title: 'A', testimonial: { quote: 'q', author: 'Carlo Mendoza' } },
        ]);
        expect(content).toEqual([{ title: 'A' }]);
        expect(removed.productTestimonials).toBe(1);
    });

    it('does not mutate the payload it was given', () => {
        const generated = {
            testimonials: [...FABRICATED],
            featured_products: [{ title: 'A', testimonial: { quote: 'q', author: 'Lisa Garcia' } }],
        };
        stripFabricatedTestimonials(generated);
        expect(generated.testimonials).toHaveLength(3);
        expect(generated.featured_products[0]).toHaveProperty('testimonial');
    });

    it('reports nothing removed when there was nothing to remove', () => {
        const { content, removed } = stripFabricatedTestimonials({ business_name: 'X', testimonials: [] });
        expect(content).toEqual({ business_name: 'X', testimonials: [] });
        expect(removed).toEqual({ testimonials: 0, productTestimonials: 0 });
    });

    it('leaves every other extracted field alone', () => {
        const generated = {
            business_name: 'Ate Beth Street Food',
            tagline: 'Bagong luto, gabi-gabi',
            about: 'A street-food cart in Cubao.',
            services: [{ name: 'Kwek kwek', description: 'Quail eggs, fried to order.' }],
            unique_selling_points: ['Bagong luto', 'Three house sauces'],
            faq: [{ q: 'Anong oras kayo?', a: 'From 3pm.' }],
            trust: { years: 'Serving Cubao since 2019' },
            testimonials: FABRICATED,
        };
        const { content } = stripFabricatedTestimonials(generated);
        expect({ ...content, testimonials: undefined }).toEqual({ ...generated, testimonials: undefined });
    });

    it('is a no-op on non-objects', () => {
        expect(stripFabricatedTestimonials(null).content).toBeNull();
        expect(stripFabricatedTestimonials(undefined).content).toBeUndefined();
        expect(stripFabricatedTestimonials('nope').content).toBe('nope');
    });

    // ── Shapes that used to walk straight through ────────────────────────────

    it('empties a bare STRING testimonials value', () => {
        // A model answering the key with prose instead of an array. Not one
        // sentence of it is attributable, and [] is what the builder hides on.
        const { content, removed } = stripFabricatedTestimonials({
            testimonials: 'Customers always say the kwek kwek is the freshest in Cubao.',
        });
        expect(content.testimonials).toEqual([]);
        expect(removed.testimonials).toBe(1);
    });

    it('does not count an empty string as removed praise', () => {
        const { content, removed } = stripFabricatedTestimonials({ testimonials: '   ' });
        expect(content.testimonials).toEqual([]);
        expect(removed.testimonials).toBe(0);
    });

    it('drops the wrapper pull-quote, not just the items under it', () => {
        // bigQuote/bigWho sit BESIDE items[] and render on their own in
        // TestimonialsA/D — emptying items[] left the invented pull-quote on the
        // page, headlined.
        const { content, removed } = stripFabricatedTestimonials({
            testimonials: {
                tag: 'Reviews',
                headline: 'What people say',
                bigQuote: '"The only place I would walk past three other stalls for."',
                bigWho: '// Review kept live on Google',
                items: FABRICATED,
            },
        });
        expect(content.testimonials).toEqual({ tag: 'Reviews', headline: 'What people say', items: [] });
        expect(content.testimonials).not.toHaveProperty('bigQuote');
        expect(content.testimonials).not.toHaveProperty('bigWho');
        expect(removed.testimonials).toBe(4); // 3 items + the pull-quote
    });

    it('drops a single testimonial answered inline on the wrapper', () => {
        const { content, removed } = stripFabricatedTestimonials({
            testimonials: { tag: 'Reviews', quote: 'Best merienda in Cubao.', author: 'May A' },
        });
        expect(content.testimonials).toEqual({ tag: 'Reviews', items: [] });
        expect(removed.testimonials).toBe(1);
    });

    it('drops flat quote/author keys sitting on the content root', () => {
        const { content, removed } = stripFabricatedTestimonials({
            business_name: 'Ate Beth Street Food',
            quote: 'Sobrang sarap, laging bagong luto.',
            author: 'John D',
        });
        expect(content).toEqual({ business_name: 'Ate Beth Street Food' });
        expect(removed.testimonials).toBe(1);
    });

    it('removes an explicitly null featured_products testimonial key', () => {
        // `testimonial: null` read as "nothing to strip", so the key survived
        // every spread downstream and kept announcing a quote slot.
        const { content, removed } = stripFabricatedTestimonials({
            featured_products: [{ title: 'Merienda cart', testimonial: null }],
        });
        expect(content.featured_products[0]).toEqual({ title: 'Merienda cart' });
        expect(content.featured_products[0]).not.toHaveProperty('testimonial');
        expect(removed.productTestimonials).toBe(0); // an empty slot is not removed praise
    });

    it('drops flat quote/author on a featured product', () => {
        const { content, removed } = stripFabricatedTestimonials({
            featured_products: [{ title: 'Merienda cart', quote: 'Sarap!', author: 'Ana G' }],
        });
        expect(content.featured_products[0]).toEqual({ title: 'Merienda cart' });
        expect(removed.productTestimonials).toBe(1);
    });

    it('drops a featured product testimonial given as a bare string', () => {
        const { content, removed } = stripFabricatedTestimonials({
            featured_products: [{ title: 'Merienda cart', testimonial: 'They loved it.' }],
        });
        expect(content.featured_products[0]).toEqual({ title: 'Merienda cart' });
        expect(removed.productTestimonials).toBe(1);
    });
});

/**
 * ASSEMBLY pass — the regenerate hole.
 *
 * The generation guards never fire on a regenerate (nothing is generated), so
 * stored content has to face the same gate on the way OUT. It cannot be a
 * blanket strip: every editor Save round-trips through the same route, so
 * wiping stored quotes would delete an admin's typed testimonials a second
 * after they typed them. The split is per item, on provenance the editor
 * already writes: `who` is added by the editor's list writer and by inline
 * click-to-edit, and no prompt asks a model for it.
 */
describe('stripFabricatedTestimonials — keepAdminAuthored (stored content)', () => {
    /** What the editor's "add quote" button clones: genericContentSchema's
     *  newItem, attribution included even when it is left blank. */
    const ADMIN_TYPED = [
        { quote: 'Sabi nila walang tapon, laging bagong luto.', who: 'Tita Malou, kapitbahay' },
        { quote: 'Mas mura pa kaysa sa mall.', who: '' },
    ];

    it('keeps the quotes an admin typed', () => {
        const { content, removed } = stripFabricatedTestimonials(
            { testimonials: { tag: 'Reviews', items: ADMIN_TYPED } },
            { keepAdminAuthored: true },
        );
        expect(content.testimonials.items).toEqual(ADMIN_TYPED);
        expect(removed.testimonials).toBe(0);
    });

    it('still drops the three invented customers from the incident row', () => {
        const { content, removed } = stripFabricatedTestimonials(
            { testimonials: FABRICATED },
            { keepAdminAuthored: true },
        );
        expect(content.testimonials).toEqual([]);
        expect(removed.testimonials).toBe(3);
    });

    it('splits a mixed list item by item', () => {
        // The real state of a row an admin has half-corrected: the model's
        // originals still there, one real quote typed underneath.
        const { content, removed } = stripFabricatedTestimonials(
            { testimonials: { items: [...FABRICATED, ADMIN_TYPED[0]] } },
            { keepAdminAuthored: true },
        );
        expect(content.testimonials.items).toEqual([ADMIN_TYPED[0]]);
        expect(removed.testimonials).toBe(3);
    });

    it('keeps the admin-written pull-quote — no generator can produce one', () => {
        const { content, removed } = stripFabricatedTestimonials(
            { testimonials: { bigQuote: 'Their sauces are the reason I walk the extra block.', bigWho: '— a regular', items: [] } },
            { keepAdminAuthored: true },
        );
        expect(content.testimonials.bigQuote).toBe('Their sauces are the reason I walk the extra block.');
        expect(content.testimonials.bigWho).toBe('— a regular');
        expect(removed.testimonials).toBe(0);
    });

    it('drops product testimonials regardless — no editor field writes them', () => {
        const { content, removed } = stripFabricatedTestimonials(
            { featured_products: [{ title: 'A', testimonial: { quote: 'q', author: 'Maria Santos' } }] },
            { keepAdminAuthored: true },
        );
        expect(content.featured_products[0]).not.toHaveProperty('testimonial');
        expect(removed.productTestimonials).toBe(1);
    });

    it('drops a stored bare-string testimonials value — nothing there was typed as a quote', () => {
        const { content, removed } = stripFabricatedTestimonials(
            { testimonials: 'Everyone says we are the best.' },
            { keepAdminAuthored: true },
        );
        expect(content.testimonials).toEqual([]);
        expect(removed.testimonials).toBe(1);
    });

    /**
     * The laundering path: `who` is not written only by humans. Both
     * lib/astro-builder.ts#normalizeBlock and
     * components/editor/SandboxEditor.tsx#normalizeBlockEditor (v1 — the
     * DEFAULT editor) alias stored testimonials with
     * `{ name: 'who', author: 'who', context: 'role' }` on load. So an admin who
     * opens a legacy row and presses Save persists a `who` on every invented
     * customer, /api/save-content republishes it, and a naive
     * `'who' in item` test would keep them forever.
     */
    const EDITOR_NORMALIZED = FABRICATED.map((t) => ({ ...t, who: t.name, role: t.context }));

    it('drops the incident row after the editor has aliased name → who', () => {
        const { content, removed } = stripFabricatedTestimonials(
            { testimonials: { tag: 'Reviews', items: EDITOR_NORMALIZED } },
            { keepAdminAuthored: true },
        );
        expect(content.testimonials.items).toEqual([]);
        expect(removed.testimonials).toBe(3);
    });

    it('drops an aliased quote whose attribution came from `author`', () => {
        const { content } = stripFabricatedTestimonials(
            { testimonials: { items: [{ quote: 'Sarap!', author: 'May A', who: 'May A' }] } },
            { keepAdminAuthored: true },
        );
        expect(content.testimonials.items).toEqual([]);
    });

    it('still keeps a typed quote sitting in a list the editor has normalized', () => {
        // A half-corrected row after an editor round-trip: the model's three
        // now carry `who`, the admin's own item carries only `who`.
        const { content, removed } = stripFabricatedTestimonials(
            { testimonials: { items: [...EDITOR_NORMALIZED, ADMIN_TYPED[0]] } },
            { keepAdminAuthored: true },
        );
        expect(content.testimonials.items).toEqual([ADMIN_TYPED[0]]);
        expect(removed.testimonials).toBe(3);
    });
});

describe('the guard end to end', () => {
    /** What the route does: gate once off the submission, strip generated output. */
    const guard = <T>(submission: { contentSource?: string; interviewQa?: QaPair[] }, generated: T): T =>
        hasSuppliedTestimonials(submission) ? generated : stripFabricatedTestimonials(generated).content;

    const GENERATED = {
        testimonials: FABRICATED,
        featured_products: [{ title: 'Merienda cart', testimonial: { quote: 'Sarap!', author: 'May A' } }],
    };

    it('owner intake WITH a real testimonial answer keeps everything the model wrote', () => {
        const kept = guard(
            {
                contentSource: 'owner_intake',
                interviewQa: [
                    ...INTAKE_WITHOUT_TESTIMONIALS,
                    { q: question(TESTIMONIAL_SOURCE_QUESTION).q, a: 'Sabi nila laging bagong luto at mura.' },
                ],
            },
            GENERATED,
        );
        expect(kept.testimonials).toHaveLength(3);
        expect(kept.featured_products[0]).toHaveProperty('testimonial');
    });

    it('owner intake with the question SKIPPED forces [] and strips the nested quote', () => {
        // The exact submission from the incident: the owner never answered
        // what_regulars_say, and the model invented May A, John D and Ana G.
        const stripped = guard(
            { contentSource: 'owner_intake', interviewQa: INTAKE_WITHOUT_TESTIMONIALS },
            GENERATED,
        );
        expect(stripped.testimonials).toEqual([]);
        expect(stripped.featured_products[0]).not.toHaveProperty('testimonial');
        expect(stripped.featured_products[0].title).toBe('Merienda cart');
    });

    it('creator funnel strips too — nothing there can verify a quote', () => {
        const stripped = guard({}, GENERATED);
        expect(stripped.testimonials).toEqual([]);
        expect(stripped.featured_products[0]).not.toHaveProperty('testimonial');
    });

    // ── REGENERATE ───────────────────────────────────────────────────────────
    // What the route does on the way OUT, to content it READ rather than
    // generated. Nothing is generated on a regenerate, so this pass is the only
    // thing standing between a pre-fix row and republishing its invented
    // customers.
    const assemble = <T>(submission: { contentSource?: string; interviewQa?: QaPair[] }, stored: T): T =>
        hasSuppliedTestimonials(submission)
            ? stored
            : stripFabricatedTestimonials(stored, { keepAdminAuthored: true }).content;

    it('regenerating the incident row drops the three customers it stored', () => {
        // Nothing to generate — services are full, testimonials already exist —
        // so every generation-time guard is skipped and this is the only pass.
        const stored = {
            business_name: 'Ate Beth Street Food',
            services: [{ name: 'Kwek kwek' }, { name: 'Fish ball' }, { name: 'Palamig' }],
            testimonials: FABRICATED,
            featured_products: [{ title: 'Merienda cart', testimonial: { quote: 'Sarap!', author: 'May A' } }],
        };
        const republished = assemble({ contentSource: 'owner_intake', interviewQa: INTAKE_WITHOUT_TESTIMONIALS }, stored);
        expect(republished.testimonials).toEqual([]);
        expect(republished.featured_products[0]).not.toHaveProperty('testimonial');
        expect(republished.services).toHaveLength(3);
    });

    it('saving from the editor keeps what the admin typed', () => {
        // /api/save-content persists the draft and then calls this route, so an
        // editor Save is a regenerate. If this stripped, the admin's words would
        // vanish a second after they typed them — and the creator funnel would
        // have no escape hatch at all.
        const draft = {
            testimonials: { tag: 'Reviews', items: [{ quote: 'Laging bagong luto.', who: 'Tita Malou' }] },
        };
        const saved = assemble({}, draft);
        expect(saved.testimonials.items).toHaveLength(1);
        expect(saved.testimonials.items[0].quote).toBe('Laging bagong luto.');
    });
});
