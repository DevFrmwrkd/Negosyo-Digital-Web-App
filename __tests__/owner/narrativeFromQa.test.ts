import {
    buildNarrativeFromQa,
    meetsAnswerMinimum,
    INTAKE_QUESTIONS,
    LOAD_BEARING_MIN_CHARS,
    type QaPair,
} from '../../lib/narrativeFromQa';

/** Look a canonical question up by machine key — the tests key off the stable id,
 *  never the display text, for the same reason the storage format does. */
const question = (key: string) => {
    const found = INTAKE_QUESTIONS.find((entry) => entry.key === key);
    if (!found) throw new Error(`no such intake question: ${key}`);
    return found;
};

/** A realistic sari-sari store intake, typed on a phone. */
const SARI_SARI: QaPair[] = [
    {
        q: question('what_you_sell').q,
        a: 'We sell canned goods, rice by the kilo, instant noodles, softdrinks, ice, shampoo and soap in sachet, and cellphone load for all networks. We also have LPG tank refills and we take Gcash cash-in and cash-out.',
    },
    {
        q: question('who_you_serve').q,
        a: 'Mostly the families here on our street, tricycle drivers who stop for softdrinks, and students from the elementary school two blocks away.',
    },
    {
        q: question('what_makes_you_different').q,
        a: 'We open at 5am before anybody else on this street and we close at 11pm. We also give lista to the regulars we know, so nanay can get milk for the baby even before payday.',
    },
    {
        q: question('how_to_buy').q,
        a: 'Just walk up to the window. You can also message us on Facebook and we can set aside your order, and for LPG we deliver within the barangay.',
    },
    { q: question('year_opened').q, a: '2013' },
    {
        q: question('permits_and_associations').q,
        a: 'We have our barangay business permit and mayor’s permit, and DTI registration for the store name.',
    },
    {
        q: question('common_questions').q,
        a: 'Do you have load. Do you deliver LPG. Can I pay Gcash. What time do you open.',
    },
    {
        q: question('what_regulars_say').q,
        a: 'They say we are the only ones open that early. And they say our prices are the same as the palengke so they do not have to ride out.',
    },
];

/**
 * A REAL submission from the dev deployment — a street-food stall, typed exactly
 * as it arrived. Do not tidy these strings: the value of this fixture is that
 * nobody wrote it to pass a test. It is the case that exposed the original bug —
 * "None" for permits — and the one that keeps us honest about the fix, because
 * its testimonial opens with "Walang" and its first answer contains "na".
 */
const STREET_FOOD: QaPair[] = [
    {
        q: question('what_you_sell').q,
        a: 'Bili na kayo kikiam fish ball kwek kwek palamig pang merienda mura lang bagong luto',
    },
    { q: question('who_you_serve').q, a: 'anyone' },
    {
        q: question('what_makes_you_different').q,
        a: 'Mas mabilis ang serbisyo namin kaysa sa karamihan dito sa area, at palaging consistent ang quality. Kaya bumabalik ang mga regulars—alam nilang hindi sila ma-disappoint.',
    },
    { q: question('how_to_buy').q, a: 'on site cash' },
    { q: question('year_opened').q, a: '2024' },
    { q: question('permits_and_associations').q, a: 'None' },
    { q: question('common_questions').q, a: 'Magkano? May discount ba? Hanngang ano oras kayo bukas?' },
    {
        q: question('what_regulars_say').q,
        a: 'Walang hassle, laging okay ang quality. Kahit siksikan, worth it maghintay.',
    },
];

/** Words that must never be the last word of a narrated block: cut there and the
 *  terminal stop turns a hinge into a sentence the owner never said. */
const DANGLING_TAIL = /(?:^|\s)(a|an|the|and|or|but|so|to|of|for|with|from|by|at|in|on|ang|ng|na|nang|sa|mga|kaya|pero|tapos|saka|para|kasi|pati|o)[.!?…]$/i;

describe('narrativeFromQa — the canonical question list', () => {
    it('has 8 questions with unique stable keys', () => {
        expect(INTAKE_QUESTIONS).toHaveLength(8);
        const keys = new Set(INTAKE_QUESTIONS.map((entry) => entry.key));
        expect(keys.size).toBe(8);
    });
    it('marks exactly two load-bearing questions and two optional', () => {
        const loadBearing = INTAKE_QUESTIONS.filter((entry) => entry.minChars === LOAD_BEARING_MIN_CHARS);
        expect(loadBearing.map((entry) => entry.key)).toEqual([
            'what_you_sell',
            'what_makes_you_different',
        ]);
        const optional = INTAKE_QUESTIONS.filter((entry) => entry.optional);
        expect(optional.map((entry) => entry.key)).toEqual([
            'permits_and_associations',
            'what_regulars_say',
        ]);
    });
    /**
     * THE ROOT CAUSE, PINNED. The permits hint has always ended "Leave blank if
     * you'd rather not say" — but without `optional` the mutation rejected the
     * whole intake with 'Please answer "Any permits…"'. The owner was told they
     * could skip and then physically could not, so they typed the shortest word
     * that turned the button on. That is where the real submission's "None" came
     * from: the filter was never the disease. A hint that offers a skip and a
     * flag that refuses one is the bug this asserts against.
     */
    it('never promises a skip it cannot honour', () => {
        const OFFERS_A_SKIP = /leave (it )?blank|rather not say|\(optional\)|skip/i;
        for (const entry of INTAKE_QUESTIONS) {
            if (!OFFERS_A_SKIP.test(`${entry.q} ${entry.hint}`)) continue;
            expect(entry.optional).toBe(true);
            expect(meetsAnswerMinimum(entry, '')).toBe(true);
        }
        // Named, so deleting the flag cannot be quietly absorbed by the loop.
        expect(meetsAnswerMinimum(question('permits_and_associations'), '')).toBe(true);
    });
    /**
     * The question table carries ONE framing per question and it is the hedged,
     * conversational one. There was briefly a second, terse frame used on short
     * answers; it is gone because a fabricated first-person frame turns a shrug
     * into a positioning statement ("We have Yes.", "We opened in Since 2024.").
     * This test exists to make reintroducing one a red build.
     */
    it('gives every question exactly one framing — the conversational lead-in', () => {
        for (const entry of INTAKE_QUESTIONS) {
            expect(entry.lead.length).toBeGreaterThan(0);
            expect(Object.keys(entry)).not.toContain('terse');
            // A lead-in is reported speech, not a sentence to lift: it hands off
            // rather than closing.
            expect(entry.lead.endsWith('—')).toBe(true);
        }
    });
});

describe('narrativeFromQa — answer minimums', () => {
    it('rejects a one-word answer on a load-bearing question', () => {
        expect(meetsAnswerMinimum(question('what_you_sell'), 'Sari-sari')).toBe(false);
        expect(meetsAnswerMinimum(question('what_makes_you_different'), 'Cheap')).toBe(false);
    });
    it('accepts ~2 sentences on a load-bearing question', () => {
        expect(meetsAnswerMinimum(question('what_you_sell'), SARI_SARI[0].a)).toBe(true);
    });
    it('accepts a short answer where no minimum applies', () => {
        expect(meetsAnswerMinimum(question('year_opened'), '2013')).toBe(true);
    });
    it('rejects blank on a required question but allows it on the optional ones', () => {
        expect(meetsAnswerMinimum(question('who_you_serve'), '   ')).toBe(false);
        expect(meetsAnswerMinimum(question('what_regulars_say'), '')).toBe(true);
        expect(meetsAnswerMinimum(question('permits_and_associations'), '')).toBe(true);
        expect(meetsAnswerMinimum(question('permits_and_associations'), '   ')).toBe(true);
    });
});

describe('narrativeFromQa — a realistic sari-sari store', () => {
    const narrative = buildNarrativeFromQa(SARI_SARI);

    it('lands in the 500–2000 char target window', () => {
        expect(narrative.length).toBeGreaterThanOrEqual(500);
        expect(narrative.length).toBeLessThanOrEqual(2000);
    });
    it('carries every answer through', () => {
        expect(narrative).toContain('cellphone load for all networks');
        expect(narrative).toContain('tricycle drivers');
        expect(narrative).toContain('open at 5am');
        expect(narrative).toContain('2013');
        expect(narrative).toContain('DTI registration');
        expect(narrative).toContain('Do you have load');
        expect(narrative).toContain('the only ones open that early');
    });
    /**
     * THE BUDGET BUG, in the answer it damaged. The old per-answer limit was
     * BODY_BUDGET / answerCount, so a 4-char "2013" reserved the same ~200-char
     * slot as this 208-char answer and the answer was cut at 198 to "…we take
     * Gcash cash-in and." — half a real service lost, and a dangling conjunction
     * promoted to a sentence — while the whole narrative sat ~650 chars under
     * its ceiling. what_you_sell drives about, services[] and marquee.text.
     */
    it('carries the 208-char what_you_sell answer intact, cash-out and all', () => {
        expect(SARI_SARI[0].a.length).toBe(208);
        expect(narrative).toContain(SARI_SARI[0].a);
        expect(narrative).toContain('cash-in and cash-out');
        expect(narrative).not.toContain('cash-in and.');
    });
    it('every answer arrives whole — nothing is truncated at all', () => {
        for (const pair of SARI_SARI) expect(narrative).toContain(pair.a);
    });
    it('narrates all 8 answers with their lead-ins', () => {
        expect(narrative.split('\n\n')).toHaveLength(8);
        for (const entry of INTAKE_QUESTIONS) expect(narrative).toContain(entry.lead);
    });
    it('is prose — no JSON, markdown, bullets or Q/A labels', () => {
        expect(narrative).not.toMatch(/[{}[\]]/);
        expect(narrative).not.toMatch(/^\s*[-*#>]/m);
        expect(narrative).not.toMatch(/\bQ:|\bA:/);
        expect(narrative).not.toContain('N/A');
    });
    it('does not echo the question text back', () => {
        for (const entry of INTAKE_QUESTIONS) {
            expect(narrative).not.toContain(entry.q);
        }
    });
    it('speaks in the first person', () => {
        expect(narrative).toMatch(/\bwe\b/i);
    });
    it('is deterministic', () => {
        expect(buildNarrativeFromQa(SARI_SARI)).toBe(narrative);
    });
    it('narrates in canonical order regardless of input order', () => {
        const shuffled = [...SARI_SARI].reverse();
        expect(buildNarrativeFromQa(shuffled)).toBe(narrative);
    });
});

describe('narrativeFromQa — degenerate input', () => {
    it('returns empty string for an empty array', () => {
        expect(buildNarrativeFromQa([])).toBe('');
    });
    it('returns empty string when every answer is blank', () => {
        const blank = INTAKE_QUESTIONS.map((entry) => ({ q: entry.q, a: '   \n\t ' }));
        expect(buildNarrativeFromQa(blank)).toBe('');
    });
    it('skips blank answers instead of emitting a placeholder', () => {
        const out = buildNarrativeFromQa([
            { q: question('what_you_sell').q, a: 'We fix motorcycles.' },
            { q: question('permits_and_associations').q, a: '' },
            { q: question('what_regulars_say').q, a: '   ' },
        ]);
        expect(out).toContain('We fix motorcycles.');
        expect(out).not.toContain('permits');
        expect(out).not.toContain('regulars');
        expect(out.split('\n\n')).toHaveLength(1);
    });
    it('narrates a one-word answer behind its lead-in like any other', () => {
        const out = buildNarrativeFromQa(INTAKE_QUESTIONS.map((entry) => ({ q: entry.q, a: 'Rice' })));
        expect(out.split('\n\n')).toHaveLength(8);
        // Reported speech, not a manufactured claim: the lead-in stays, the fact
        // is quoted as typed, and nothing is invented around it.
        expect(out).toContain(`${question('year_opened').lead} Rice.`);
        expect(out).not.toContain('We opened in Rice.');
    });
    it('caps a very long answer and the narrative as a whole', () => {
        const flood = 'sobrang haba '.repeat(2000);
        const out = buildNarrativeFromQa(INTAKE_QUESTIONS.map((entry) => ({ q: entry.q, a: flood })));
        expect(out.length).toBeLessThanOrEqual(2000);
        expect(out).toMatch(/[.!?…]$/); // never stops mid-word
    });
    it('caps far more pairs than there are questions', () => {
        const many: QaPair[] = Array.from({ length: 60 }, (_, i) => ({
            q: `some question ${i}`,
            a: 'ang haba ng sagot na ito, paulit ulit lang. '.repeat(20),
        }));
        expect(buildNarrativeFromQa(many).length).toBeLessThanOrEqual(2000);
    });
    it('flattens newlines and strips control characters', () => {
        const out = buildNarrativeFromQa([
            { q: question('who_you_serve').q, a: 'Families here.\n\nAnd\tdrivers.' },
        ]);
        expect(out).toContain('Families here. And drivers.');
        expect(out).not.toMatch(/[\u0000-\u001f]/);
    });
    it('keeps quotes and emoji verbatim — they are the owner’s own words', () => {
        const out = buildNarrativeFromQa([
            { q: question('what_regulars_say').q, a: 'They say "ang bait mo talaga" ❤️ and ‘sulit’.' },
        ]);
        expect(out).toContain('"ang bait mo talaga"');
        expect(out).toContain('❤️');
        expect(out).toContain('‘sulit’');
    });
    it('narrates an unrecognised question as bare prose, last', () => {
        const out = buildNarrativeFromQa([
            { q: 'Anything else we should know?', a: 'We also rent tables for fiestas.' },
            { q: question('what_you_sell').q, a: 'We sell rice and canned goods.' },
        ]);
        const blocks = out.split('\n\n');
        expect(blocks).toHaveLength(2);
        expect(blocks[0]).toBe(`${question('what_you_sell').lead} We sell rice and canned goods.`);
        expect(blocks[1]).toBe('We also rent tables for fiestas.');
        expect(out).not.toContain('Anything else we should know?');
    });
    it('matches a question by its machine key too, so stored keys still narrate', () => {
        const out = buildNarrativeFromQa([{ q: 'what_you_sell', a: 'We sell rice, canned goods and load.' }]);
        expect(out).toBe(`${question('what_you_sell').lead} We sell rice, canned goods and load.`);
    });
    it('takes the first non-blank answer when a question is duplicated', () => {
        const out = buildNarrativeFromQa([
            { q: question('year_opened').q, a: '' },
            { q: question('year_opened').q, a: '2013' },
            { q: question('year_opened').q, a: '1999' },
        ]);
        expect(out).toContain('2013');
        expect(out).not.toContain('1999');
    });
    it('survives a reworded question, because the key carries the meaning', () => {
        // The display text is safe to edit; only the key is a contract.
        const out = buildNarrativeFromQa([
            { q: 'WHAT DO YOU SELL, OR WHAT DO YOU DO FOR PEOPLE ???', a: 'We sell rice, canned goods and load.' },
        ]);
        expect(out).toBe(`${question('what_you_sell').lead} We sell rice, canned goods and load.`);
    });
});

/**
 * ---- EVERY ANSWER KEEPS ITS LEAD-IN --------------------------------------
 *
 * The lead-in's hedged register is the signal that this document is raw
 * interview speech and not copy to lift. Replacing it on short answers with a
 * neat first-person frame was tried and reverted: it turned "Yes" into "We have
 * Yes.", "Since 2024" into "We opened in Since 2024.", and stripped the frame off
 * anything containing a full stop, which made a testimonial unidentifiable as a
 * quote. These tests pin the reverted behaviour.
 */
describe('narrativeFromQa — reported speech, never a manufactured claim', () => {
    it('keeps the lead-in on a four-character answer', () => {
        const out = buildNarrativeFromQa([{ q: question('year_opened').q, a: '2024' }]);
        expect(out).toBe(`${question('year_opened').lead} 2024.`);
    });
    it('keeps the lead-in on every short answer in one intake, each its own block', () => {
        const out = buildNarrativeFromQa([
            { q: question('how_to_buy').q, a: 'on site cash' },
            { q: question('year_opened').q, a: '2024' },
        ]);
        expect(out.split('\n\n')).toHaveLength(2);
        expect(out).toBe(
            `${question('how_to_buy').lead} on site cash.\n\n${question('year_opened').lead} 2024.`,
        );
    });
    it('does not restate a short answer that is already a sentence', () => {
        const out = buildNarrativeFromQa([{ q: question('what_you_sell').q, a: 'We fix motorcycles.' }]);
        expect(out).toBe(`${question('what_you_sell').lead} We fix motorcycles.`);
    });
    it('never invents a first-person frame around an answer', () => {
        const out = buildNarrativeFromQa([
            { q: question('year_opened').q, a: 'Since 2024' },
            { q: question('who_you_serve').q, a: 'mostly students' },
        ]);
        expect(out).not.toContain('We opened in Since 2024');
        expect(out).not.toContain('We serve mostly students');
        expect(out).toContain(`${question('year_opened').lead} Since 2024.`);
    });
    it('keeps a testimonial framed as one, punctuation or not', () => {
        const quoted = 'Sulit daw. Laging bago.';
        const out = buildNarrativeFromQa([{ q: question('what_regulars_say').q, a: quoted }]);
        expect(out).toBe(`${question('what_regulars_say').lead} ${quoted}`);
    });
});

/**
 * ---- CONTENTLESS ANSWERS -------------------------------------------------
 *
 * A contentless answer is a blank the owner typed a word into. Narrated, "On the
 * permits and the paperwork side — None." tells a copywriting model, as ground
 * truth, that a real shop has no permits — and it will write a trust section on
 * it. "Yes" is worse: it claims a credential without naming one.
 */
describe('narrativeFromQa — an answer with no substance is nothing to say', () => {
    /** Narrate one answer to the permits question and see whether it survived. */
    const permits = (answer: string) =>
        buildNarrativeFromQa([
            { q: question('what_you_sell').q, a: 'We sell kikiam, fish ball, kwek kwek and palamig for merienda.' },
            { q: question('permits_and_associations').q, a: answer },
        ]);

    it('drops the exact answer that exposed this — "None" for permits', () => {
        const out = permits('None');
        expect(out).not.toContain('None');
        expect(out).not.toContain(question('permits_and_associations').lead);
        expect(out.split('\n\n')).toHaveLength(1);
    });

    // The spellings a word list caught.
    it.each([
        'none', 'None', 'NONE', '  none  ', 'None.', 'none po', 'none yet', 'none as of now',
        'n/a', 'N/A', 'N.A.', 'na', 'no', 'No.', 'nope', 'nothing', 'not yet', 'never',
        'wala', 'Wala', 'wala pa', 'wala po', 'wala pa po', 'walang', 'wla', 'hindi', 'di', 'ala',
        '-', '.', '--', '0', 'x', 'X', 'none for now', 'wala pa sa ngayon',
    ])('treats %p as a blank', (answer) => {
        const out = permits(answer);
        expect(out).not.toContain(question('permits_and_associations').lead);
        expect(out.split('\n\n')).toHaveLength(1);
    });

    /**
     * SPELLINGS A BARE LIST OF LITERALS WOULD LEAK, caught without any
     * question-topic subtraction: negations, contentless affirmatives, particles
     * and filler, plus two pieces of morphology (the Tagalog -ng linker, the
     * un-/non- privative) and a diacritic fold, so no list has to enumerate every
     * inflection. Every entry here is contentless in EVERY question's context —
     * that is the bar now, and it is why nothing permit-shaped appears below.
     */
    it.each([
        'not applicable', 'Not applicable', 'not applicable po', 'N/A - not applicable',
        'none of the above', 'none so far', 'none at the moment', 'none right now', 'zero',
        'walâ', 'Walâ po', 'wala, bago pa lang kami', 'wala pa po kami nun',
        'wala pa, baguhan pa kami', 'di pa nakakakuha', 'di pa nakuha', 'still processing',
        'processing pa', 'pending pa po', 'sorry wala po',
    ])('now also treats %p as a blank', (answer) => {
        const out = permits(answer);
        expect(out).not.toContain(question('permits_and_associations').lead);
        expect(out.split('\n\n')).toHaveLength(1);
    });

    /**
     * CONTENTLESS AFFIRMATIVES. A bare "Yes" to "any permits?" names no permit,
     * so there is nothing for a credentials block to print — but framed at all it
     * becomes an unnamed-credential claim, which is the fabrication direction and
     * strictly worse than the honest "None" the rule above suppresses. Note none
     * of these carries a second word: "meron kami" is still nothing, but "may
     * permit kami" names something and is kept — see the survivors below.
     */
    it.each([
        'Yes', 'yes', 'yes po', 'Yeah', 'yep', 'oo', 'Oo', 'opo', 'Opo', 'oo naman',
        'meron', 'Meron po', 'mayroon', 'ok', 'OK', 'okay', 'okey', 'sige', 'sure', 'tama',
        'legit', 'legit po', 'complete', 'kumpleto', 'kumpleto po', 'yes we have', 'meron kami',
    ])('treats the contentless affirmative %p as a blank too', (answer) => {
        const out = permits(answer);
        expect(out).not.toContain(question('permits_and_associations').lead);
        expect(out.split('\n\n')).toHaveLength(1);
    });

    it('returns empty string when EVERY answer says nothing, so the Groq gates stay shut', () => {
        const nothings = ['none', 'wala', 'N/A', 'no', 'wala pa po', 'None.', '-', 'x'];
        expect(buildNarrativeFromQa(INTAKE_QUESTIONS.map((entry, i) => ({ q: entry.q, a: nothings[i] })))).toBe('');
        const yeses = ['yes', 'oo', 'opo', 'ok', 'meron', 'legit', 'sige', 'okay'];
        const out = buildNarrativeFromQa(INTAKE_QUESTIONS.map((entry, i) => ({ q: entry.q, a: yeses[i] })));
        expect(out).toBe('');
        expect(out).toBeFalsy(); // the point of '' — a falsy transcript gates the copy off
    });

    /**
     * DO NOT DELETE THIS TEST. It is the whole reason detection is a whole-answer
     * rule and not `includes('wala')` / `startsWith`. This exact string is a real
     * owner's testimonial — the single most valuable answer in that submission —
     * and it opens with "Walang". A substring check silently destroys it and the
     * site loses its only testimonial with nothing in the logs to say why.
     */
    it('KEEPS the real "Walang hassle" testimonial — a negation word inside a real sentence is content', () => {
        const testimonial = 'Walang hassle, laging okay ang quality. Kahit siksikan, worth it maghintay.';
        const out = buildNarrativeFromQa([{ q: question('what_regulars_say').q, a: testimonial }]);
        expect(out).toContain(testimonial);
        expect(out).toBe(`${question('what_regulars_say').lead} ${testimonial}`);
    });

    it.each([
        ['walang preservatives', 'preservatives'],
        ['walang tapon', 'tapon'],
        ['hindi kami nagtataas ng presyo', 'nagtataas'],
        ['no preservatives, no MSG', 'MSG'],
        ['Wala kaming problema sa barangay, taon-taon kami nagre-renew.', 'nagre-renew'],
        ['Hindi kami nagbebenta ng expired', 'expired'],
    ])('keeps %p — one real noun and the answer is the owner talking', (answer, noun) => {
        const out = buildNarrativeFromQa([{ q: question('what_makes_you_different').q, a: answer }]);
        expect(out).toContain(answer);
        expect(out).toContain(noun);
    });

    it('keeps a NAMED credential, which is what the permits question is actually for', () => {
        for (const answer of ['DTI', 'BIR and DTI registered', 'barangay permit and mayor’s permit', 'PRC licensed']) {
            expect(permits(answer)).toContain(answer);
        }
    });

    /**
     * NON-LATIN SCRIPTS ARE CONTENT. The tokenizer maps everything outside a–z0–9
     * to spaces, so a Chinese, Thai or emoji-only answer tokenizes to nothing —
     * indistinguishable, to a token counter, from a bare "-". Treated as blank it
     * would silently delete a Chinese-Filipino shop's FAQ from its own website.
     * Anything with no ASCII letters at all counts as content-present.
     */
    it.each([
        '營業時間？多少錢？',
        '我们卖热食和饮料，价格便宜。',
        'คนไทย',
        '😀🍢🥤',
        '❤️❤️❤️',
    ])('keeps the non-Latin answer %p rather than discarding it as blank', (answer) => {
        const out = buildNarrativeFromQa([{ q: question('common_questions').q, a: answer }]);
        expect(out).toContain(answer);
        expect(out).toContain(question('common_questions').lead);
    });

    it('folds diacritics rather than letting one circumflex walk past the tokenizer', () => {
        expect(permits('walâ')).not.toContain('walâ');
        // ...but folding must not turn a real word into a nothing.
        expect(permits('may permit kami sa munisipyô')).toContain('munisipyô');
    });

    /**
     * ---- THE SURVIVORS ---------------------------------------------------
     *
     * THE FALSE-POSITIVE DIRECTION, WHICH IS THE UNRECOVERABLE ONE. A leaked
     * negation costs one hedged fragment an admin reads before publish. A false
     * positive deletes something the owner actually said, silently, with nothing
     * in the logs. Every string below was DELETED by the version of this filter
     * that subtracted question-topic words — 'permit', 'registered', 'business',
     * 'complete', 'papers', 'accredited' — which are the exact nouns that ARE the
     * answer to "which permits do you have?". That subtraction is gone.
     */
    it.each([
        'may business permit kami',
        'business permit',
        'registered business',
        'complete permits',
        'kumpleto ang papeles namin',
        'Our permits are complete',
        'licensed and accredited',
        'may permit kami',
        'BIR registered',
        'accredited by the association',
    ])('KEEPS the true credential %p — deleting a real one is unrecoverable', (answer) => {
        const out = permits(answer);
        expect(out).toContain(answer);
        expect(out).toContain(`${question('permits_and_associations').lead} ${answer}`);
        expect(out.split('\n\n')).toHaveLength(2);
    });

    /**
     * "Lahat" was deleted while its English twin "anyone" sailed through, because
     * 'lahat' sat in the particle list as the shape-alike of "any". In a
     * Philippines-market product that asymmetry runs exactly the wrong way: the
     * Tagalog answer is the one more owners type.
     */
    it.each(['Lahat', 'lahat', 'lahat ng tao', 'kahit sino', 'anyone', 'lahat ng tao dito sa amin'])(
        'KEEPS %p as an answer to "who are your customers?" — Tagalog and English alike',
        (answer) => {
            const out = buildNarrativeFromQa([{ q: question('who_you_serve').q, a: answer }]);
            expect(out).toContain(answer);
            expect(out).toContain(question('who_you_serve').lead);
        },
    );

    it('keeps "May permit ba kayo?" — it is a real FAQ, not an answer about permits', () => {
        const asked = 'May permit ba kayo?';
        const out = buildNarrativeFromQa([{ q: question('common_questions').q, a: asked }]);
        expect(out).toBe(`${question('common_questions').lead} ${asked}`);
    });

    /**
     * ---- THE ACCEPTED CONSEQUENCE, ASSERTED RATHER THAN HIDDEN -------------
     *
     * Dropping the topic-echo subtraction means "no permits at this time" is now
     * NARRATED. That is the correct trade and it is deliberate, so it is pinned
     * here rather than left as a silent regression: what lands in the transcript
     * is one hedged fragment of reported speech behind its lead-in — interview
     * noise a copywriter steps around — and NOT the crisp declarative a terse
     * frame would have manufactured out of it. The hedged register is the whole
     * safety property; see the governing principle at the top of the source.
     */
    it.each([
        'no permits at this time',
        'no permits yet',
        'Wala pa kami permits',
        'not registered',
        'unregistered',
        'no papers yet',
    ])('narrates %p as hedged interview speech rather than deleting it', (answer) => {
        const out = permits(answer);
        expect(out).toContain(`${question('permits_and_associations').lead} ${answer}`);
        expect(out.split('\n\n')).toHaveLength(2);
        // The register that makes this harmless: reported speech, never a claim.
        expect(out).not.toContain('We have no permits');
        expect(out).not.toContain('We are not registered');
    });
});

/**
 * ---- THE ANSWER BUDGET ---------------------------------------------------
 *
 * Dividing the body budget by headcount weights a 4-char year the same as a
 * 208-char description of the whole business. Answers now take what they need and
 * the surplus from the short ones falls to the long ones.
 */
describe('narrativeFromQa — the budget follows need, not headcount', () => {
    it('lets one long answer spend the surplus seven short ones did not use', () => {
        const long = 'Kami ay nagtitinda ng '.padEnd(480, 'kikiam at fish ball, kwek kwek, palamig, mais, at iba pa. ').slice(0, 480);
        const qa: QaPair[] = INTAKE_QUESTIONS.map((entry, i) => ({
            q: entry.q,
            a: i === 0 ? long : 'maikli ito',
        }));
        const out = buildNarrativeFromQa(qa);
        // The old min(500, max(140, 1600/8)) = 200 limit cut this at 200.
        expect(long.length).toBe(480);
        expect(out).toContain(long.trimEnd());
        expect(out.length).toBeLessThanOrEqual(2000);
    });

    it('still refuses to let one essay eat the whole transcript', () => {
        const essay = 'napakahaba talaga ng sagot na ito '.repeat(100);
        const qa: QaPair[] = INTAKE_QUESTIONS.map((entry, i) => ({
            q: entry.q,
            a: i === 0 ? essay : 'Isang normal na sagot na may sapat na haba para sa isang tanong.',
        }));
        const out = buildNarrativeFromQa(qa);
        expect(out.length).toBeLessThanOrEqual(2000);
        // Every other answer still arrives whole.
        expect(out.split('\n\n')).toHaveLength(8);
        expect(out).toContain('Isang normal na sagot na may sapat na haba para sa isang tanong.');
    });
});

/**
 * ---- TRUNCATION MUST NOT MANUFACTURE SENTENCES ---------------------------
 *
 * Cutting at a word boundary and then adding a full stop produced "…we take
 * Gcash cash-in and." and a bare "Ang." — a dangling conjunction or article
 * promoted to a sentence, in a document the copywriter reads as verbatim speech.
 */
describe('narrativeFromQa — truncation never invents prose', () => {
    it('backs up to the last sentence boundary inside the limit', () => {
        const line = 'Bumabalik ang mga suki namin dito sa amin. ';
        const tail =
            'Hindi kami nagtataas ng presyo kahit tumaas ang bilihin sa palengke dahil alam naming mahirap din ang buhay ngayon at gusto naming makatulong sa mga kapitbahay namin dito sa kanto.';
        const out = buildNarrativeFromQa([{ q: question('what_you_sell').q, a: line.repeat(12) + tail }]);
        // Stops where the OWNER stopped: whole sentences, no fragment of the tail.
        expect(out.endsWith('dito sa amin.')).toBe(true);
        expect(out).not.toContain('Hindi kami');
        expect(out).not.toMatch(/[a-z]$/);
    });

    it('drops a dangling conjunction rather than punctuating it into a sentence', () => {
        // Cut lands immediately after "and": no sentence boundary to back up to.
        const answer = 'kikiam '.repeat(70) + 'and merienda-palamig-pang-hapon-mura-lang-dito-sa-kanto';
        const out = buildNarrativeFromQa([{ q: question('what_you_sell').q, a: answer }]);
        expect(out).not.toMatch(/\band\.$/);
        expect(out).not.toMatch(DANGLING_TAIL);
        expect(out.endsWith('kikiam.')).toBe(true);
    });

    /**
     * A SHORT ANSWER ENDING ON A HINGE KEEPS ITS WORDS. This asserted the
     * opposite for one round, and that round was wrong: dropping a word we did
     * not cut is this file editing speech the owner completed. It cost real
     * meaning in Tagalog — "matagal na" (completive: it has ALREADY been a long
     * time) came out as "matagal", and the explicit hedge "2013 or so" came out
     * as a confident "2013" feeding trust.years downstream.
     *
     * So the hinge cleanup is scoped to cuts WE made (see the truncation tests
     * above). Here nothing is long enough to truncate, so the answer is theirs:
     * punctuate it and leave it. "…mais at." is clumsy prose, and clumsy is the
     * safe failure — it reads as interview speech, which is the whole register
     * this file is trying to preserve.
     */
    it.each([
        'kikiam, fish ball, palamig, mais at',
        'we take Gcash cash-in and',
        'bukas kami ng maaga, sarado ng gabi, tapos',
        'rice, load, ice and',
        'on site cash or',
        'matagal na',
        '2013 or so',
    ])('leaves the short answer %p intact, adding only a stop', (answer) => {
        const out = buildNarrativeFromQa([{ q: question('what_you_sell').q, a: answer }]);
        expect(out).toBe(`${question('what_you_sell').lead} ${answer}.`);
        expect(out).not.toContain(',.');
    });

    /**
     * A sentence the owner already ended keeps its last word too, even when that
     * word is on the hinge list: "come here for." is their sentence, not our
     * artifact.
     */
    it.each([
        'That is what our customers come here for.',
        'Sila ang madalas naming pinagbebentahan ng mga paninda namin araw-araw.',
        'Ito ang pinakamurang tindahan sa kanto namin at dito rin kami nakatira.',
    ])('leaves %p exactly as the owner ended it', (answer) => {
        const out = buildNarrativeFromQa([{ q: question('what_makes_you_different').q, a: answer }]);
        expect(out).toBe(`${question('what_makes_you_different').lead} ${answer}`);
    });

    it('leaves no block ending in a dangling article or conjunction, however it was cut', () => {
        const messy = [
            'kikiam at fish ball at kwek kwek at palamig at mais at sitsirya at tinapay at '.repeat(12),
            'we sell rice and load and ice and softdrinks and shampoo and soap and sugar and '.repeat(12),
            'ang tindahan namin ay bukas ng maaga at sarado ng gabi at may lista kami para sa '.repeat(12),
        ];
        for (const answer of messy) {
            const out = buildNarrativeFromQa(INTAKE_QUESTIONS.map((entry) => ({ q: entry.q, a: answer })));
            for (const block of out.split('\n\n')) {
                expect(block).not.toMatch(DANGLING_TAIL);
                expect(block).toMatch(/[.!?…]$/);
            }
        }
    });

    it('never leaves a comma stranded in front of the terminal stop', () => {
        const answer = 'kikiam, fish ball, kwek kwek, palamig, mais, sitsirya, tinapay, gulaman, '.repeat(12);
        const out = buildNarrativeFromQa(INTAKE_QUESTIONS.map((entry) => ({ q: entry.q, a: answer })));
        expect(out).not.toContain(',.');
        expect(out).not.toContain(' .');
    });
});

/**
 * ---- THE REAL SUBMISSION -------------------------------------------------
 *
 * End to end on the intake that exposed the original bug. If this describe block
 * goes red, a real owner's website is about to get worse.
 */
describe('narrativeFromQa — the real street-food stall submission', () => {
    const narrative = buildNarrativeFromQa(STREET_FOOD);
    const blocks = narrative.split('\n\n');

    /**
     * THE WHOLE STRING, CHARACTER FOR CHARACTER. Everything else in this file
     * checks one property at a time; this checks the artefact a real owner's
     * website is actually built from. If it changes, someone changed the copy of
     * a live shop, and they should have to say so in the diff.
     */
    it('produces exactly this transcript, end to end', () => {
        expect(narrative).toBe(
            'Let me start with what we sell and what we do here — Bili na kayo kikiam fish ball kwek kwek palamig pang merienda mura lang bagong luto.\n\n' +
            'The customers who come to us — anyone.\n\n' +
            'What makes us different from the other places around here — Mas mabilis ang serbisyo namin kaysa sa karamihan dito sa area, at palaging consistent ang quality. Kaya bumabalik ang mga regulars—alam nilang hindi sila ma-disappoint.\n\n' +
            'If someone wants to buy from us, this is how it goes — on site cash.\n\n' +
            'As for when we opened — 2024.\n\n' +
            'People always ask me the same few things — Magkano? May discount ba? Hanngang ano oras kayo bukas?\n\n' +
            'And the regulars, the ones who keep coming back, they tell me things like — Walang hassle, laging okay ang quality. Kahit siksikan, worth it maghintay.',
        );
    });

    /**
     * AND THE REASON IT SAYS "None" AT ALL. The permits question now carries
     * `optional`, so an owner who would rather not say can leave it blank and
     * move on — the state this submission could not reach. The filter still
     * catches the "None" already in the DB, but the pressure that produced it is
     * off at source, which is the fix that matters.
     */
    it('would have let this owner skip the question that produced "None"', () => {
        expect(question('permits_and_associations').optional).toBe(true);
        expect(meetsAnswerMinimum(question('permits_and_associations'), '')).toBe(true);
        const skipped = STREET_FOOD.filter((pair) => pair.q !== question('permits_and_associations').q);
        expect(skipped).toHaveLength(7);
        expect(buildNarrativeFromQa(skipped)).toBe(narrative);
    });

    it('says nothing at all about permits', () => {
        expect(narrative).not.toContain('None');
        expect(narrative).not.toContain('permits');
        expect(narrative).not.toContain(question('permits_and_associations').lead);
    });

    it('carries the two rich answers through verbatim — this is the copy', () => {
        expect(narrative).toContain(STREET_FOOD[2].a); // what makes them different
        expect(narrative).toContain(STREET_FOOD[7].a); // the testimonial, "Walang…"
    });

    it('carries every other answer through verbatim too', () => {
        expect(narrative).toContain(STREET_FOOD[0].a); // "Bili na kayo kikiam…" — note the "na"
        expect(narrative).toContain('anyone');
        expect(narrative).toContain('on site cash');
        expect(narrative).toContain('2024');
        expect(narrative).toContain('Magkano? May discount ba?');
    });

    it('reports every short answer as speech, behind its lead-in', () => {
        expect(narrative).toContain(`${question('who_you_serve').lead} anyone.`);
        expect(narrative).toContain(`${question('how_to_buy').lead} on site cash.`);
        expect(narrative).toContain(`${question('year_opened').lead} 2024.`);
        // The frames that a copywriter would lift as claims. None of them exist.
        expect(narrative).not.toContain('We serve anyone.');
        expect(narrative).not.toContain('We opened in 2024.');
        expect(narrative).not.toContain('We have');
    });

    it('is seven answers in seven paragraphs — one dropped, none merged', () => {
        expect(blocks).toHaveLength(7);
    });

    it('ends every block cleanly and never on a dangling word', () => {
        for (const block of blocks) {
            expect(block).toMatch(/[.!?…]$/);
            expect(block).not.toMatch(DANGLING_TAIL);
        }
    });

    it('is still prose, first person, and inside the ceiling', () => {
        expect(narrative).not.toMatch(/[{}[\]]/);
        expect(narrative).not.toMatch(/^\s*[-*#>]/m);
        expect(narrative).not.toMatch(/\bQ:|\bA:/);
        expect(narrative).toMatch(/\b(we|namin|kami)\b/i);
        expect(narrative.length).toBeLessThanOrEqual(2000);
    });

    it('is deterministic and order-independent', () => {
        expect(buildNarrativeFromQa(STREET_FOOD)).toBe(narrative);
        expect(buildNarrativeFromQa([...STREET_FOOD].reverse())).toBe(narrative);
    });
});
