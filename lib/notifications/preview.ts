/**
 * ════════════════════════════════════════════════════════════════════════════
 *  NOTIFICATION PREVIEW — what fits on a phone
 * ════════════════════════════════════════════════════════════════════════════
 *
 * `notifications.body` is rendered by the mobile app as a list row: a clipped
 * line or two, with no detail view to expand into. Announcements were writing
 * the entire message there — up to 4000 characters of paragraphs — so a creator
 * saw a sentence fragment cut mid-word and had no way to read the rest.
 *
 * The notification's job is to say what arrived and where the whole thing is.
 * The email is what carries the message; it is reliably delivered and has no
 * length limit.
 *
 * Kept deliberately short. The announcement title already says what the message
 * is about, so the snippet is secondary — what matters is that the pointer to
 * the email survives the clamp rather than being cut off with everything else.
 *
 * The mobile app is a separate repo, so what we store is the only lever here.
 */

export const NOTIFICATION_PREVIEW_LIMIT = 120;
export const FULL_MESSAGE_HINT = 'Full message sent to your email.';

/**
 * A one-line preview of a long message.
 *
 * Whitespace is flattened first: paragraph breaks mean nothing in a clipped
 * list row, and a body starting with a blank line would otherwise render as an
 * empty notification.
 *
 * A short message is returned untouched and WITHOUT the hint — telling someone
 * to check their email for text they can already read in full is noise.
 */
export function notificationPreview(body: string, limit: number = NOTIFICATION_PREVIEW_LIMIT): string {
    const flat = (body || '').replace(/\s+/g, ' ').trim();

    if (!flat) return FULL_MESSAGE_HINT;
    if (flat.length <= limit) return flat;

    const cut = flat.slice(0, limit);
    const lastSpace = cut.lastIndexOf(' ');
    // Break on a word boundary, unless that would throw away most of the
    // snippet — one very long word should still be cut rather than dropped.
    const snippet = (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut)
        .replace(/[\s.,;:!?—–-]+$/, '');

    return `${snippet}… ${FULL_MESSAGE_HINT}`;
}
