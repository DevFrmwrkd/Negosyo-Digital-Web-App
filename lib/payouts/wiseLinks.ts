/**
 * ════════════════════════════════════════════════════════════════════════════
 *  WISE DASHBOARD LINKS — "show me this transfer in Wise"
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Nothing in this app can move a transfer once Wise has it. Every stall past
 * that point is resolved in the Wise dashboard, so the payouts page needs to
 * get an admin there in one click — from any row with a transfer, not only the
 * unfunded ones. Chasing an in-flight payout that has not landed is the other
 * half of the job, and it was the half with no link.
 *
 * Lives in lib/ next to fundingState.ts so both halves of "what do I do about
 * this row" are importable and testable together.
 */

/** Wise's account-wide activity list. Always valid, never specific. */
export const WISE_ACTIVITY_URL = 'https://wise.com/transactions';

/**
 * Path template for a single transfer inside the activity list.
 *
 * ⚠️ UNVERIFIED against a live Wise session. This is Wise's documented
 * by-resource activity route, but it has not been clicked through on this
 * account yet. It is a named constant precisely so that correcting it is a
 * one-line change here rather than an edit at three call sites — and so a wrong
 * guess degrades to "wrong page on the right site", never to a broken link.
 */
export const WISE_TRANSFER_PATH = '/activities/by-resource/TRANSFER';

/**
 * Deep link to one Wise transfer, falling back to the activity list.
 *
 * Falls back rather than returning null because the caller is always rendering
 * a button either way: an admin sent to the list can still find the transfer by
 * reference, while an admin sent nowhere has to leave the page to make progress.
 */
export function wiseTransferUrl(transferId?: string | null): string {
    if (!transferId) return WISE_ACTIVITY_URL;
    return `${WISE_ACTIVITY_URL}${WISE_TRANSFER_PATH}/${encodeURIComponent(transferId)}`;
}
