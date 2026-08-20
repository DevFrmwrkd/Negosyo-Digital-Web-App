import {
    AWAITING_FUNDING_STATES,
    needsFunding,
    fundingStateAgeMs,
    describeStateAge,
    type FundingStateRow,
} from '../../lib/payouts/fundingState';

const row = (over: Partial<FundingStateRow> = {}): FundingStateRow => ({
    status: 'processing',
    ...over,
});

/**
 * This decides whether an admin is told to send money to a creator.
 *
 * It has been wrong once already: the first version listed the FUNDED states and
 * negated them, so `processing` — the state a transfer enters the moment it IS
 * funded — came back as "needs funding". A real admin funded a real payout, came
 * back to the page, and was still told to fund it. The obvious response to that
 * badge is to pay the person twice.
 */
describe('needsFunding — the double-payment guard', () => {
    it('does NOT ask for funding once Wise reports processing', () => {
        // THE REGRESSION. `processing` means Wise took the money in and is
        // sending it on. Anything that reports this as unfunded invites a
        // second payment for the same withdrawal.
        expect(needsFunding(row({ wiseDetailedState: 'processing' }))).toBe(false);
    });

    it('does not ask for funding on any state past the funding step', () => {
        for (const state of [
            'funds_converted',
            'outgoing_payment_sent',
            'paid_out',
            'bounced_back',
            'charged_back',
        ]) {
            expect(needsFunding(row({ wiseDetailedState: state }))).toBe(false);
        }
    });

    it('does not ask for funding on an unrecognised state', () => {
        // Fails toward silence, not toward a second payment. Wise can add states
        // at any time and this must not treat novelty as "send money".
        expect(needsFunding(row({ wiseDetailedState: 'some_future_wise_state' }))).toBe(false);
    });

    it('asks for funding while Wise is still waiting to be paid in', () => {
        for (const state of AWAITING_FUNDING_STATES) {
            expect(needsFunding(row({ wiseDetailedState: state }))).toBe(true);
        }
    });

    it('asks for funding when Wise has never been polled', () => {
        // The common case, not an edge case: wiseDetailedState is written only by
        // the hourly cron, so every withdrawal under an hour old has none — and
        // is certainly unfunded, because nothing funds automatically.
        expect(needsFunding(row({ wiseDetailedState: undefined }))).toBe(true);
        expect(needsFunding(row({ wiseDetailedState: '' }))).toBe(true);
    });

    it('is case-insensitive about the Wise state', () => {
        expect(needsFunding(row({ wiseDetailedState: 'INCOMING_PAYMENT_WAITING' }))).toBe(true);
        expect(needsFunding(row({ wiseDetailedState: 'PROCESSING' }))).toBe(false);
    });

    it('never asks for funding outside the processing status', () => {
        // pending  → no Wise transfer exists yet, nothing to fund.
        // completed/failed → settled; markFailed already restored the balance.
        for (const status of ['pending', 'completed', 'failed'] as const) {
            expect(needsFunding(row({ status, wiseDetailedState: undefined }))).toBe(false);
            expect(needsFunding(row({ status, wiseDetailedState: 'incoming_payment_waiting' }))).toBe(false);
        }
    });
});

describe('funding state freshness', () => {
    const NOW = 1_700_000_000_000;

    it('reports null age when Wise has never been polled', () => {
        expect(fundingStateAgeMs(row(), NOW)).toBeNull();
        expect(describeStateAge(row(), NOW)).toBe('not yet checked with Wise');
    });

    it('describes recent and stale checks in units an admin reads', () => {
        expect(describeStateAge(row({ lastStatusCheckAt: NOW - 30_000 }), NOW)).toBe('checked just now');
        expect(describeStateAge(row({ lastStatusCheckAt: NOW - 12 * 60_000 }), NOW)).toBe('checked 12m ago');
        expect(describeStateAge(row({ lastStatusCheckAt: NOW - 2 * 3_600_000 }), NOW)).toBe('checked 2h ago');
    });

    it('clamps a future timestamp to zero rather than reporting negative age', () => {
        expect(fundingStateAgeMs(row({ lastStatusCheckAt: NOW + 60_000 }), NOW)).toBe(0);
    });
});
