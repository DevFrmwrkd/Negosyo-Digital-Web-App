/**
 * Turn the owner's typed intake interview into the `submissions.transcript` string.
 *
 * Why this file exists: three of the four Groq copy generators in
 * app/api/generate-website/route.ts are hard-gated on `submission.transcript`
 * being truthy — the main re-extraction (:135), the conversion blocks (:254) and
 * the generic:A–E sections (:296). With no transcript they never fire and the
 * route writes tagline/about/services from business name + type + city alone.
 * The owner funnel has no audio, so we synthesize the prose those gates want.
 *
 * The output must therefore look like what already flows through that route: the
 * raw text of a Whisper transcription of a shop owner talking, interpolated
 * verbatim under "INTERVIEW TRANSCRIPT:" in lib/services/groq.service.ts. Plain
 * first-person prose only — no JSON, no markdown, no Q/A labels, nothing the
 * copywriter prompt would have to parse around.
 *
 * ---- THE GOVERNING PRINCIPLE ---------------------------------------------
 *
 * THIS FILE WRITES REPORTED INTERVIEW SPEECH. IT NEVER WRITES MARKETING CLAIMS.
 *
 * A hedged, rambling fragment is SAFER than a crisp declarative sentence, because
 * a copywriting model lifts crisp declaratives verbatim and steps around
 * interview noise. Everything below follows from that: the conversational lead-in
 * on every block is a FEATURE, not padding to be optimised away, and the only
 * editorial power this file has is to DROP an answer, never to reshape one.
 *
 * There was briefly a "terse" mode here that replaced the lead-in with a small
 * fabricated first-person frame on short answers ("We have {}.", "We opened in
 * {}."). It is gone and must not come back. A fabricated frame turns a shrug into
 * a positioning statement and an absence into a claim: "None" for permits became
 * "We have no permits at this time." — a quotable trust-section sentence — and
 * "Yes" became "We have Yes.", an unnamed-credential claim, which is the
 * FABRICATION direction and strictly worse than the honest nothing it replaced.
 * The hedged register of "On the permits and the paperwork side — ..." is what
 * signals to the copywriter that this is raw speech and not a line to lift.
 *
 * Pure: no I/O, no clock, no randomness. Same input, same string, forever.
 */

/** Stable machine key per question. Stored with the answer so the display text
 *  above can be reworded without orphaning every answer already in the DB. */
export type IntakeQuestionKey =
    | 'what_you_sell'
    | 'who_you_serve'
    | 'what_makes_you_different'
    | 'how_to_buy'
    | 'year_opened'
    | 'permits_and_associations'
    | 'common_questions'
    | 'what_regulars_say';

export interface IntakeQuestion {
    /** Never changes. The join key between the form, the mutation and this file. */
    key: IntakeQuestionKey;
    /** What the owner reads on /start. Safe to reword — nothing keys off it. */
    q: string;
    /** Sub-label under the field. */
    hint: string;
    /** The clause this answer is stitched behind in the narrative. EVERY answer
     *  that survives filtering gets this one, however short it is. */
    lead: string;
    /** Owner may leave it blank. Both /start and normalizeQa read this, so it is
     *  the ONLY thing that makes a "leave it blank" hint true — a hint offering a
     *  skip without it is a trap, and the owner types the shortest string that
     *  unblocks the button. Keep flag and hint in agreement. */
    optional?: true;
    /** Treat a contentless answer ("None", "Yes", "wala") as a blank, so the
     *  question drops out entirely. Set on the credentials question ALONE: it is
     *  the only box where an absence narrated as content invites a fabricated
     *  trust section. Everywhere else those same words are ordinary answers —
     *  "Meron pa ba?" is a real FAQ, "bago pa lang" is a real opening year — and
     *  filtering them deletes owner speech nothing in the app ever renders back. */
    blankWhenContentless?: true;
    /** The two load-bearing answers: everything the page says about the business
     *  and why anyone should pick it comes from these. A one-word answer here
     *  produces a one-word website, so both the form and the mutation enforce a
     *  ~2-sentence floor. `undefined` = no minimum beyond "not blank". */
    minChars?: number;
}

/** ~2 typed sentences from a phone keyboard. Deliberately forgiving — this is a
 *  floor against "Sari-sari store", not a quality bar we can actually measure. */
export const LOAD_BEARING_MIN_CHARS = 80;

/**
 * The 8 canonical intake questions, in the order they are asked and in the order
 * they are narrated. Shared by the /start form and submitOwnerIntake so the two
 * cannot drift apart.
 *
 * The arrow in each comment is what the answer ends up driving downstream.
 */
export const INTAKE_QUESTIONS: readonly IntakeQuestion[] = [
    {
        // → about, services[], marquee.text
        key: 'what_you_sell',
        q: 'What do you sell, or what do you do for people?',
        hint: 'List the main things. Two sentences is plenty.',
        lead: 'Let me start with what we sell and what we do here —',
        minChars: LOAD_BEARING_MIN_CHARS,
    },
    {
        // → tone, hero.sub
        key: 'who_you_serve',
        q: 'Who are your customers?',
        hint: 'The people who actually walk in — neighbours, students, drivers, offices.',
        lead: 'The customers who come to us —',
    },
    {
        // → unique_selling_points, why[]
        key: 'what_makes_you_different',
        q: 'What makes you different from the others nearby?',
        hint: 'The real reason regulars pick you. Two sentences is plenty.',
        lead: 'What makes us different from the other places around here —',
        minChars: LOAD_BEARING_MIN_CHARS,
    },
    {
        // → how[] steps, messaging
        key: 'how_to_buy',
        q: 'How does someone buy from you?',
        hint: 'Walk in, message, call, deliver, book ahead — however it really works.',
        lead: 'If someone wants to buy from us, this is how it goes —',
    },
    {
        // → trust.years
        key: 'year_opened',
        q: 'What year did you open?',
        hint: 'Just the year is fine.',
        lead: 'As for when we opened —',
    },
    {
        // → trust.licenses / trust.memberships, credentials[]
        key: 'permits_and_associations',
        q: 'Any permits, licences, or associations you belong to?',
        hint: "Business permit, BIR, DTI, PRC, barangay, an association. Leave blank if you'd rather not say.",
        lead: 'On the permits and the paperwork side —',
        // THE ROOT CAUSE OF THE "None" SUBMISSION. The hint has always offered a
        // blank, but without this flag normalizeQa rejected the whole intake with
        // 'Please answer "Any permits…"' — so the owner typed the shortest word
        // that turned the button on. A shrug in a required box is the most
        // dangerous input this file gets; make the promise true, don't filter the
        // shrug harder.
        optional: true,
        blankWhenContentless: true,
    },
    {
        // → faq[]
        key: 'common_questions',
        q: 'What are 3–5 things customers always ask you?',
        hint: 'The same questions you answer every single day.',
        lead: 'People always ask me the same few things —',
    },
    {
        // → testimonials[]. THE ONLY testimonial source — left blank, the block
        // correctly auto-hides rather than the page inventing praise.
        key: 'what_regulars_say',
        q: 'What are 2–3 things your regulars say about you? (optional)',
        hint: 'In their words, as close as you remember.',
        lead: 'And the regulars, the ones who keep coming back, they tell me things like —',
        optional: true,
    },
] as const;

/** Whether an answer clears the floor for its question. Both /start and
 *  submitOwnerIntake call this, so client and server can never disagree. */
export function meetsAnswerMinimum(question: IntakeQuestion, answer: string): boolean {
    const clean = (answer ?? '').trim();
    if (clean.length === 0) return !!question.optional;
    return clean.length >= (question.minChars ?? 1);
}

export interface QaPair {
    q: string;
    a: string;
}

/** Total characters of owner-typed answer we're willing to carry. The transcript
 *  is interpolated whole into prompts with a max_tokens ceiling, so an owner who
 *  pastes an essay must not push the copy brief out of the window. */
const BODY_BUDGET_CHARS = 1600;
/** Nobody's slice of the body budget drops below this, however many answers
 *  there are, and nobody's exceeds this however few. */
const MIN_ANSWER_CHARS = 140;
const MAX_ANSWER_CHARS = 500;
/** Hard ceiling on the finished string, scaffolding included. */
const MAX_NARRATIVE_CHARS = 2000;

/** Fullwidth stops are here for the same reason the tokenizer treats non-Latin
 *  text as content: a Chinese-Filipino owner's FAQ already ends its sentences,
 *  and appending an ASCII "." to "多少錢？" would be us editing their words. */
const SENTENCE_ENDINGS = ['.', '!', '?', '…', '。', '！', '？'];

/** Match a stored question back to its canonical entry. Keyed on the display
 *  text OR the machine key, because a caller holding one and not the other
 *  should still narrate correctly. */
function normalizeQuestion(q: string): string {
    return (q ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const QUESTION_LOOKUP: ReadonlyMap<string, IntakeQuestion> = new Map(
    INTAKE_QUESTIONS.flatMap((entry) => [
        [normalizeQuestion(entry.q), entry] as const,
        [normalizeQuestion(entry.key), entry] as const,
    ]),
);

/** Whisper emits one flowing utterance, never a form field — so flatten the
 *  newlines a textarea introduces and drop control characters outright.
 *  Quotes and emoji are left alone: they're the owner's own words. */
function cleanAnswer(answer: string): string {
    return (answer ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * ---- CONTENTLESS ANSWERS -------------------------------------------------
 *
 * A bare "None" in the permits box is not an answer, it is the ABSENCE of one,
 * and it is treated exactly like a blank — the question is dropped and the
 * downstream block correctly renders nothing. It carries no copy, only risk.
 * (Note this is now the SECOND line of defence: the permits question is
 * `optional`, so the owner who typed "None" to unblock a required field can
 * simply skip it. That fix is upstream of this one and matters more.)
 *
 * THE ASYMMETRY THAT SETS THE THRESHOLD. The two errors do not cost the same. A
 * LEAKED NEGATION costs one hedged fragment of interview speech behind a lead-in
 * — with terse frames gone that is the harmless register, and an admin reviews
 * 100% of these before publish. A FALSE POSITIVE silently DELETES something the
 * owner actually said: unrecoverable, and invisible to owner, admin and logs
 * alike. So this BIASES HEAVILY TOWARD KEEPING. It drops only when the answer is
 * unambiguously contentless: EVERY token is a negation, a contentless
 * affirmative, or a pure particle / filler, with no other word anywhere.
 *
 * WHY THERE IS NO "QUESTION TOPIC" SUBTRACTION. A RESTATED_TOPIC_WORDS set once
 * lived here — 'permit', 'licensed', 'registered', 'business', 'papers',
 * 'complete', 'accredited' — subtracted so "no permits yet" would tokenize to
 * nothing. It is deleted and must not come back: for a question that asks WHICH
 * PERMITS DO YOU HAVE, the topic nouns ARE the answer. It deleted "may business
 * permit kami", "registered business", "Our permits are complete" and "licensed
 * and accredited" — true, named credentials, gone silently.
 *
 * THE ACCEPTED CONSEQUENCE, PLAINLY: "no permits at this time" is now NARRATED,
 * not dropped — a bare "None" is a blank with a word typed in it, but a phrase
 * with real words in it is speech. The correct trade: one hedged fragment in a
 * transcript full of them, for "may business permit kami" surviving intact.
 *
 * AFFIRMATIVES COUNT TOO. A bare "Yes" / "Oo" / "meron" / "legit" carries as
 * little as "None" and is more dangerous: framed at all it is an
 * unnamed-credential claim, the fabrication direction. The rule is "contentless",
 * not "negative" — one real word alongside it and the owner is talking.
 *
 * THE RULE IS WHOLE-ANSWER, NEVER SUBSTRING. The most valuable answer we have
 * seen from a real owner is a testimonial that OPENS with a negation — "Walang
 * hassle, laging okay ang quality." — and the best selling points in this market
 * are negations too ("walang preservatives", "hindi kami nagtataas ng presyo").
 * Anything built on includes() or startsWith() destroys them.
 */

/** Fold "walâ" onto "wala", "señora" onto "senora". Without this a single
 *  circumflex from a phone keyboard walks straight past the tokenizer. */
function foldDiacritics(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Tokens for matching only — the owner's actual words are never touched. */
function contentTokens(folded: string): string[] {
    return folded.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

/** Carries the negation itself. Cheap to have near-duplicates here — the
 *  all-tokens rule below is what keeps the set from over-reaching, so a word
 *  that is also an ordinary Tagalog particle ("na", "di") is safe to list. */
const NEGATION_WORDS: ReadonlySet<string> = new Set([
    // English, as typed on a phone.
    'no', 'none', 'nope', 'nothing', 'not', 'never', 'nil', 'nada', 'zero',
    // "N/A", "n.a.", "N / A" — punctuation is stripped before matching, so the
    // 'n' lands on its own with 'a' as a particle.
    'n', 'na',
    // Tagalog / Taglish.
    'wala', 'walang', 'wla', 'hindi', 'hnd', 'di', 'ala',
    // The keyboard shrugs.
    '0', 'x',
]);

/** Say-nothing YESES. "Yes" to "any permits?" names no permit, so there is
 *  nothing for a credentials block to print — but framed it reads as one. Same
 *  treatment as "None", for the opposite-looking reason. */
const AFFIRMATION_WORDS: ReadonlySet<string> = new Set([
    'yes', 'yeah', 'yep', 'yup', 'yah', 'sure', 'affirmative',
    'oo', 'opo', 'oho', 'meron', 'mayroon', 'mayron', 'tama', 'sige',
    'ok', 'oks', 'okay', 'okey', 'ayos', 'fine', 'good',
    // "legit" / "complete" assert a credential without naming one, which is the
    // worst of both worlds: unverifiable and quotable.
    'legit', 'legal', 'complete', 'kumpleto', 'kompleto', 'done',
]);

/** No content of their own: politeness, aspect, pronouns, hedges, time-fillers,
 *  conjunctions. Present so "wala pa po", "none as of now", "none so far" and
 *  "wala, bago pa lang kami" all read as the same nothing "wala" does. */
const NULL_CONTENT_WORDS: ReadonlySet<string> = new Set([
    // Tagalog particles and politeness.
    'po', 'ho', 'pa', 'muna', 'lang', 'talaga', 'ba', 'naman', 'din', 'rin', 'ng', 'sa', 'pang',
    'ang', 'mga', 'yan', 'yun', 'yung', 'ito', 'iyan', 'nun', 'niyan', 'noon', 'nga',
    // Pronouns and auxiliaries — a subject with no predicate says nothing.
    'a', 'an', 'the', 'any', 'we', 'i', 'my', 'our', 'us', 'it', 'they', 'you', 'me',
    'have', 'has', 'had', 'got', 'is', 'are', 'am', 'be', 'been', 'do', 'does', 'did',
    'kami', 'kaming', 'ako', 'akin', 'akong', 'amin', 'aming', 'tayo', 'namin', 'kayo',
    // The Tagalog existential, the same shape as "have": a bare "may" names
    // nothing. NOT 'lahat' — listed as the twin of "any", it deleted "Lahat"
    // while English "anyone" sailed through. In a PH-market product that
    // asymmetry runs backwards, and "Lahat" is a true answer to "who are your
    // customers?" anyway.
    'may',
    // Conjunctions and prepositions.
    'and', 'or', 'but', 'as', 'of', 'for', 'at', 'in', 'on', 'to', 'with', 'from', 'by', 'so', 'far',
    // "non-registered" tokenizes as two words, so the privative strip below
    // never sees it as one.
    'non',
    // Time hedges: "as of now", "not yet", "at the moment", "none so far".
    'now', 'yet', 'still', 'moment', 'right', 'ngayon', 'today', 'currently', 'above',
    // "we're still new" — an explanation of the nothing, not a fact about the shop.
    'bago', 'baguhan', 'new', 'recently', 'sorry', 'sori', 'applicable',
    // "in process", "di pa nakakakuha" — an intention to have papers is not
    // having papers, and it is not copy either.
    'process', 'processing', 'pending', 'ongoing', 'apply', 'applying', 'application',
    'kuha', 'nakuha', 'nakakuha', 'nakakakuha', 'makakuha', 'kumuha', 'kukuha', 'inaayos',
]);

/** One token is empty when it is any of the three kinds of nothing above. Note
 *  what is NOT a fourth kind: the nouns the question asked about. See the block
 *  comment — 'permit', 'registered', 'business' and their friends are content
 *  here, not scaffolding, and subtracting them deleted real credentials. */
function isListedToken(token: string): boolean {
    return (
        NEGATION_WORDS.has(token) ||
        AFFIRMATION_WORDS.has(token) ||
        NULL_CONTENT_WORDS.has(token)
    );
}

/** English privatives, stripped so the lists above also cover their negated
 *  forms — "unsure" says what "not sure" says, and nobody should have to
 *  remember to list both. */
const PRIVATIVE_PREFIXES = ['un', 'non'] as const;

function isEmptyToken(token: string): boolean {
    if (isListedToken(token)) return true;
    // The Tagalog linker: "walang", "munang", "akong", "bagong", "kaming" are
    // the listed words with -ng attached. Morphology, not more literals — this
    // is what stopped "wala pa akong permit" leaking past a list that happened
    // to have 'kaming' in it and not 'akong'.
    if (token.length > 3 && token.endsWith('ng') && isListedToken(token.slice(0, -2))) return true;
    for (const prefix of PRIVATIVE_PREFIXES) {
        const stem = token.slice(prefix.length);
        if (stem.length > 2 && token.startsWith(prefix) && isListedToken(stem)) return true;
    }
    return false;
}

/**
 * True when the WHOLE answer is a way of saying nothing — so it is skipped like
 * a blank. See the block comment above for why this can never be a substring
 * test, and note the deliberate asymmetry at the bottom: a script we cannot
 * tokenize is treated as CONTENT.
 */
function isContentless(answer: string): boolean {
    const folded = foldDiacritics(answer);
    const tokens = contentTokens(folded);
    if (tokens.length === 0) {
        // The a–z tokenizer saw nothing at all. Two very different reasons:
        //   • "-", ".", "??" — nothing was said, drop it;
        //   • "營業時間？多少錢？", "คนไทย", an emoji-only answer — plenty was
        //     said, in a script this file cannot read.
        // Anything outside ASCII counts as CONTENT. A Chinese-Filipino shop
        // typing its FAQ in Chinese silently vanishing from its own website is a
        // far worse failure than narrating one line we do not understand, and
        // unlike a fabricated frame it invents nothing.
        return !/[^\u0000-\u007f]/.test(folded);
    }
    return tokens.every(isEmptyToken);
}

/** Highest index of a sentence-ending mark in `text`, or -1. */
function lastSentenceEnd(text: string): number {
    let best = -1;
    for (const mark of SENTENCE_ENDINGS) best = Math.max(best, text.lastIndexOf(mark));
    return best;
}

/** Words that cannot be the last word of a sentence. Cut an answer after one and
 *  the terminal stop we add promotes a hinge into a claim: "…we take Gcash
 *  cash-in and." or a bare "Ang." — prose the owner never said, in a document
 *  the copywriter reads as verbatim speech. */
const DANGLING_TAIL_WORDS: ReadonlySet<string> = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'so', 'to', 'of', 'for', 'with', 'from', 'by', 'at', 'in', 'on',
    'ang', 'ng', 'na', 'nang', 'sa', 'mga', 'kaya', 'pero', 'tapos', 'saka', 'para', 'kasi', 'pati', 'o', 'at',
    // The Tagalog half the first pass missed: 'ay' is the copula, 'dahil' /
    // 'kung' / 'habang' / 'upang' subordinate a clause that never arrives, 'ni'
    // marks a name. "kami ay." is the bare "Ang." bug in the other language.
    'ay', 'dahil', 'kung', 'habang', 'upang', 'ni',
]);

function tailWord(word: string): string {
    return foldDiacritics(word).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Trailing punctuation a cut can strand in front of the stop we are about to
 *  add, so we never write ",." or " .". */
const TRAILING_JOINERS = /[\s,;:—–-]+$/;

/** Drop trailing hinge words. Never returns empty — an answer made entirely of
 *  them is the caller's problem, not something to delete. */
function dropDanglingTail(text: string): string {
    const words = text.split(' ');
    while (words.length > 1 && DANGLING_TAIL_WORDS.has(tailWord(words[words.length - 1]))) {
        words.pop();
    }
    const trimmed = words.join(' ').trimEnd();
    return trimmed.length > 0 ? trimmed : text;
}

/**
 * Cut to `limit` without manufacturing a sentence the owner never said.
 *
 * Preference order: stop where the OWNER stopped (the last sentence boundary
 * inside the limit), because that cut cannot invent anything; failing that, cut
 * at a word boundary and clean up OUR OWN break.
 *
 * THE HINGE CLEANUP BELONGS HERE AND NOWHERE ELSE. It briefly lived in
 * endSentence so that a short answer merely ENDING on a hinge would also be
 * tidied — but that made this file edit speech the owner completed: "matagal na"
 * (Tagalog completive: it has ALREADY been a long time) came out as "matagal",
 * and "2013 or so" — an explicit hedge — came out as a confident "2013" feeding
 * trust.years. Dropping a word we did not cut is the fabrication direction this
 * file exists to avoid. When the owner ends on a hinge we punctuate it and leave
 * it alone: "kikiam, fish ball, palamig, mais at." is clumsy, and it is theirs.
 */
function truncateAtWord(text: string, limit: number): string {
    if (text.length <= limit) return text;
    const slice = text.slice(0, limit);

    // Only worth backing up to if it keeps most of what we were given —
    // otherwise a long second sentence would cost us the whole answer.
    const boundary = lastSentenceEnd(slice);
    if (boundary > limit / 2) return slice.slice(0, boundary + 1).trimEnd();

    const lastSpace = slice.lastIndexOf(' ');
    const cut = (lastSpace > limit / 2 ? slice.slice(0, lastSpace) : slice).trimEnd();
    return dropDanglingTail(cut).replace(TRAILING_JOINERS, '');
}

/**
 * Give every block a terminal stop — the copywriter prompt reads better when the
 * transcript is sentences rather than fragments run together.
 *
 * It adds punctuation and NEVER removes a word — see truncateAtWord for why the
 * hinge cleanup is scoped to cuts we made ourselves.
 */
function endSentence(text: string): string {
    const trimmed = text.replace(TRAILING_JOINERS, '');
    if (trimmed.length === 0) return text;
    if (SENTENCE_ENDINGS.some((mark) => trimmed.endsWith(mark))) return trimmed;
    return `${trimmed}.`;
}

/** One narrated block before rendering: the lead-in (already carrying its
 *  trailing space, empty for an unrecognised question) and the owner's words. */
interface NarrativeEntry {
    lead: string;
    answer: string;
}

/**
 * Hand out the body budget by NEED, not by headcount.
 *
 * Dividing equally is the obvious thing and it is wrong: a 4-char "2013" would
 * reserve the same ~200-char slot as a 208-char description of everything the
 * shop sells, and the description gets cut mid-clause while the finished
 * narrative sits 650 chars under its ceiling. `what_you_sell` drives about,
 * services[] and marquee.text, so it is the single worst answer to shave.
 *
 * So: shortest first, each answer offered an even split of what is LEFT, and
 * whatever it does not use falls to the answers still waiting. Everything short
 * is untouched and the long ones share the surplus. Bounds still apply — nobody
 * drops below MIN_ANSWER_CHARS or climbs above MAX_ANSWER_CHARS.
 */
function allocateAnswerBudget(lengths: number[], scaffoldingChars: number): number[] {
    // The 2000-char ceiling covers the lead-ins and the paragraph breaks too, so
    // spend what is actually left after them rather than discovering the overrun
    // in the final truncation.
    const budget = Math.max(
        MIN_ANSWER_CHARS,
        Math.min(BODY_BUDGET_CHARS, MAX_NARRATIVE_CHARS - scaffoldingChars),
    );

    const shortestFirst = lengths
        .map((length, index) => index)
        .sort((a, b) => lengths[a] - lengths[b] || a - b);

    const limits = new Array<number>(lengths.length).fill(MIN_ANSWER_CHARS);
    let remaining = budget;
    let unresolved = lengths.length;

    for (const index of shortestFirst) {
        const share = Math.floor(remaining / unresolved);
        const limit = Math.min(MAX_ANSWER_CHARS, Math.max(MIN_ANSWER_CHARS, share));
        limits[index] = limit;
        remaining -= Math.min(lengths[index], limit);
        unresolved -= 1;
    }

    return limits;
}

/**
 * Build the transcript prose from the owner's typed answers.
 *
 * Answers are narrated in canonical question order regardless of input order,
 * so a reordered form still produces a coherent interview. Anything whose
 * question we don't recognise is narrated last, on its own, without a lead-in —
 * we'd rather lose the framing than print a question label into a transcript.
 *
 * Blank answers are SKIPPED, never filled with "N/A": a fabricated answer is
 * worse than a missing one, because the copy generators treat every line here as
 * ground truth about a real shop. For the same reason an all-blank intake
 * returns '' — a falsy transcript leaves the three gates shut, which is the
 * honest outcome, instead of feeding the model an empty scaffold to embroider.
 *
 * An answer that says nothing — "None", "wala pa po", "not applicable", but also
 * "Yes" and "meron" — is skipped on exactly the same grounds: it is a blank the
 * owner typed a word into. See isContentless, and note that this is a
 * whole-answer test, never a substring one, because a real testimonial can open
 * with "Walang".
 *
 * Everything that survives is narrated the same way: its lead-in, then the
 * owner's words untouched. Short answers are not "improved" into small
 * first-person sentences — see the governing principle at the top of the file.
 */
export function buildNarrativeFromQa(qa: Array<QaPair>): string {
    if (!Array.isArray(qa) || qa.length === 0) return '';

    // First non-blank answer per question wins; a duplicated question is a form
    // bug, not a second opinion.
    const byKey = new Map<IntakeQuestionKey, string>();
    const unmatched: string[] = [];

    for (const pair of qa) {
        const answer = cleanAnswer(pair?.a);
        if (answer.length === 0) continue;

        const question = QUESTION_LOOKUP.get(normalizeQuestion(pair?.q));
        if (!question) {
            unmatched.push(answer);
            continue;
        }
        // THE CONTENTLESS FILTER IS SCOPED TO ONE QUESTION, DELIBERATELY.
        // "None" only ever needed suppressing in the credentials box, where an
        // absence narrated as content invites a fabricated trust section. Run
        // globally it deletes real answers everywhere else, because the words it
        // keys on are ordinary in other contexts: "Meron pa ba?" and "Wala na
        // ba?" are the two most-asked questions in a sari-sari store and belong
        // in faq[]; "bago pa lang" IS the answer to what year you opened. Both
        // vanished silently — and nothing renders interviewQa, so a deletion is
        // invisible to the owner, the admin and the logs alike.
        if (question.blankWhenContentless && isContentless(answer)) continue;
        if (!byKey.has(question.key)) byKey.set(question.key, answer);
    }

    const entries: NarrativeEntry[] = [];
    for (const question of INTAKE_QUESTIONS) {
        const answer = byKey.get(question.key);
        if (answer) entries.push({ lead: `${question.lead} `, answer });
    }
    for (const answer of unmatched) entries.push({ lead: '', answer });
    if (entries.length === 0) return '';

    // WHOLE-INPUT BAIL-OUT, not a per-answer filter. Scoping isContentless to the
    // credentials box means "none" survives in the other seven — right, because
    // those words are ordinary answers there. But an intake where NOTHING has
    // substance anywhere is a different thing: there is no owner content to lose,
    // and returning '' keeps the three Groq gates shut rather than handing the
    // model eight shrugs to embroider into a website. Deletes nothing that was
    // worth keeping, which is why it can be global when the per-answer test
    // cannot. (Unreachable from /start today — the two minChars questions floor
    // at ~80 chars — but this is a pure function and callers change.)
    if (entries.every((entry) => isContentless(entry.answer))) return '';

    // Everything in the finished string that is not the owner's own words: the
    // lead-ins, one terminal stop each, and the blank line between blocks.
    const scaffoldingChars =
        entries.reduce((total, entry) => total + entry.lead.length + 1, 0) + 2 * (entries.length - 1);
    const limits = allocateAnswerBudget(entries.map((entry) => entry.answer.length), scaffoldingChars);

    const blocks = entries.map(
        (entry, index) => `${entry.lead}${endSentence(truncateAtWord(entry.answer, limits[index]))}`,
    );

    const narrative = blocks.join('\n\n');
    return narrative.length <= MAX_NARRATIVE_CHARS
        ? narrative
        : endSentence(truncateAtWord(narrative, MAX_NARRATIVE_CHARS));
}
