/**
 * ════════════════════════════════════════════════════════════════════════════
 *  WITHDRAWAL FUNDING STATE — "has anyone actually paid this creator?"
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Every Wise transfer this app creates starts UNFUNDED. Releasing it is a manual
 * admin step in the Wise dashboard, by design — see
 * docs/wise/WISE-PAYMENT-FLOW-MOBILE.md Stage 4. Nothing in this codebase funds
 * a transfer, so "the system is handling it" is never true.
 *
 * Lives in lib/ rather than inline in the payouts page because it decides
 * whether an admin is told to send money, and that decision has been wrong once
 * already in a way that invited a DOUBLE PAYMENT. Here it is importable and
 * unit-tested; see __tests__/payouts/fundingState.test.ts.
 */

/** The minimum shape this logic needs. Matches the `withdrawals` row. */
export interface FundingStateRow {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    /** Wise's verbose state, written ONLY by the hourly status cron. */
    wiseDetailedState?: string;
    /** When the cron last polled Wise for this row. */
    lastStatusCheckAt?: number;
}

/**
 * The ONLY Wise states meaning nobody has paid the money in yet.
 *
 * Deliberately an allow-list of "still waiting", NOT a deny-list of "already
 * funded". The first version listed funded states and negated them, which
 * silently classified every state it had not enumerated — `processing` above
 * all, which is what a transfer becomes the moment it IS funded — as needing
 * funding. An admin who had just paid a creator saw "Fund in Wise" still on the
 * row, and the obvious response to that badge is to pay them again.
 *
 * Erring toward "needs funding" risks double payments. Erring the other way
 * risks a creator waiting a little longer. Silence is the recoverable failure:
 * the row still shows its real Wise state and the creator's status emails keep
 * going out, so a missed payout surfaces through another channel.
 */
export const AWAITING_FUNDING_STATES = ['incoming_payment_waiting', 'incoming_payment_initiated'];

/**
 * Does this withdrawal still need an admin to release the money in Wise?
 *
 * An absent `wiseDetailedState` counts as YES rather than as unknown: the field
 * is only written by the hourly cron, so a withdrawal created in the last hour
 * has none — and it is certainly unfunded, because nothing funds automatically.
 * That is the common case, not an edge case.
 */
export function needsFunding(row: FundingStateRow): boolean {
    if (row.status !== 'processing') return false;
    const state = (row.wiseDetailedState || '').toLowerCase();
    if (!state) return true;
    return AWAITING_FUNDING_STATES.some((s) => state.includes(s));
}

/**
 * How stale the funding verdict is, in ms — or null when Wise has never been
 * polled for this row.
 *
 * The badge is only ever as fresh as the last cron run (hourly). Someone who
 * funds a transfer and comes straight back to this page WILL still see "Fund in
 * Wise", and without knowing the reading is up to an hour old, the reasonable
 * conclusion is that the funding did not work.
 */
export function fundingStateAgeMs(row: FundingStateRow, now: number): number | null {
    if (!row.lastStatusCheckAt) return null;
    return Math.max(0, now - row.lastStatusCheckAt);
}

/** "12m ago" / "2h ago" / "never" — for the freshness caveat next to the badge. */
export function describeStateAge(row: FundingStateRow, now: number): string {
    const age = fundingStateAgeMs(row, now);
    if (age === null) return 'not yet checked with Wise';
    const mins = Math.floor(age / 60000);
    if (mins < 1) return 'checked just now';
    if (mins < 60) return `checked ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `checked ${hrs}h ago`;
}
