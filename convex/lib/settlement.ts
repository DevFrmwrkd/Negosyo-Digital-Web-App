/**
 * ════════════════════════════════════════════════════════════════════════════
 *  WITHDRAWAL SETTLEMENT GUARD — "has this payout already moved money?"
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Settling a withdrawal has monetary side effects that are NOT idempotent:
 *
 *   completed → creator.totalWithdrawn += amount
 *   failed    → creator.balance        += amount   (restore)
 *
 * Five separate functions apply those transitions — markFailed, adminRetry,
 * updateStatus, updateByTransactionRef, updateByWiseTransferId — and none of
 * them checked whether the row had already settled. Applying a terminal status
 * twice therefore credits twice, and there is no natural stop: replaying the
 * same `failed` transition N times adds N × amount to a creator's balance.
 *
 * That mattered because the /wise-webhook endpoint is unauthenticated and
 * `updateStatus` is a public mutation, so the replay did not require any
 * access — but the guard belongs here regardless of who can reach the callers.
 * Wise itself retries webhooks, and the hourly poller and the manual refresh
 * button can both race the webhook for the same transition.
 *
 * Pure and dependency-free so it is unit-testable; see
 * __tests__/payouts/settlement.test.ts.
 */

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Statuses after which the money has already moved. */
export const TERMINAL_STATUSES: readonly WithdrawalStatus[] = ['completed', 'failed'];

export function isTerminal(status: string | undefined): boolean {
    return status === 'completed' || status === 'failed';
}

/**
 * May `next` be applied to a row currently at `current`?
 *
 * Returns null when the transition is allowed, or a human-readable reason when
 * it must be refused. Two rules, both about money already spent:
 *
 *   1. terminal → terminal is refused even when the status is unchanged.
 *      `completed → completed` is the webhook-retry case and would credit
 *      totalWithdrawn a second time; `completed → failed` would credit
 *      totalWithdrawn AND restore the balance for the same payout.
 *
 *   2. terminal → processing is refused. Walking a settled row backwards
 *      re-arms it, so the next terminal transition credits all over again.
 *
 * Everything else is allowed, including processing → processing, which carries
 * no monetary effect and is the ordinary Wise state-change webhook.
 */
export function settlementBlockReason(
    current: string | undefined,
    next: WithdrawalStatus
): string | null {
    if (!isTerminal(current)) return null;

    if (isTerminal(next)) {
        return `Withdrawal already settled as '${current}' — refusing to apply '${next}' a second time.`;
    }
    return `Withdrawal already settled as '${current}' — refusing to reopen it as '${next}'.`;
}
