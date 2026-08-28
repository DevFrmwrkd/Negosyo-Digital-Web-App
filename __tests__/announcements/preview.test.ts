import {
    notificationPreview,
    NOTIFICATION_PREVIEW_LIMIT,
    FULL_MESSAGE_HINT,
} from '../../lib/notifications/preview';

/**
 * notifications.body is a clipped list row on mobile with no detail view. The
 * announcement flow was writing the entire message there, so creators saw a
 * fragment cut mid-word and had no way to read the rest.
 */
describe('notificationPreview', () => {
    const long =
        'Pick one person — a friend, a kapatid, the tindahan sa kanto — and hand them a real Tendso website. They pay zero pesos.\n\n' +
        'You still get your 500 pesos. Same payout, same balance, same withdrawal as any paid submission.';

    it('leaves a short message alone, with no email hint', () => {
        // Telling someone to check their email for text they can already read
        // in full is noise.
        const short = 'Payouts are running a day late this week. Sorry for the wait.';
        expect(notificationPreview(short)).toBe(short);
        expect(notificationPreview(short)).not.toContain(FULL_MESSAGE_HINT);
    });

    it('truncates a long message and points at the email', () => {
        const out = notificationPreview(long);
        expect(out.length).toBeLessThan(long.length);
        expect(out).toContain('…');
        expect(out).toContain(FULL_MESSAGE_HINT);
    });

    it('flattens paragraph breaks', () => {
        // A body starting with a blank line would otherwise render as an empty
        // notification, and paragraph breaks mean nothing in a clipped row.
        const out = notificationPreview('\n\n  Hello there.\n\nSecond paragraph.  ');
        expect(out).toBe('Hello there. Second paragraph.');
        expect(out).not.toMatch(/\n/);
    });

    it('breaks on a word boundary, not mid-word', () => {
        const out = notificationPreview(long);
        const snippet = out.split('…')[0];
        // The character after the snippet in the flattened source should be a
        // space — i.e. we cut between words.
        const flat = long.replace(/\s+/g, ' ').trim();
        expect(flat.startsWith(snippet)).toBe(true);
        expect(flat[snippet.length]).toBe(' ');
    });

    it('still cuts a single unbroken word rather than dropping it', () => {
        const wall = 'x'.repeat(400);
        const out = notificationPreview(wall);
        expect(out).toContain('…');
        expect(out).toContain(FULL_MESSAGE_HINT);
        expect(out.split('…')[0].length).toBe(NOTIFICATION_PREVIEW_LIMIT);
    });

    it('does not leave dangling punctuation before the ellipsis', () => {
        const out = notificationPreview('The quick brown fox jumps over the lazy dog, and then keeps going for quite a while longer, well past the limit.');
        expect(out).not.toMatch(/[,;:\s-]…/);
    });

    it('falls back to the hint alone on an empty body', () => {
        expect(notificationPreview('')).toBe(FULL_MESSAGE_HINT);
        expect(notificationPreview('   \n  ')).toBe(FULL_MESSAGE_HINT);
    });

    it('keeps the whole preview short enough to survive a clamped row', () => {
        // The hint has to fit too — a pointer cut off with everything else
        // helps nobody.
        const out = notificationPreview(long);
        expect(out.length).toBeLessThanOrEqual(NOTIFICATION_PREVIEW_LIMIT + FULL_MESSAGE_HINT.length + 4);
    });
});
