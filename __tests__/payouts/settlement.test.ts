import {
    isTerminal,
    settlementBlockReason,
    TERMINAL_STATUSES,
    type WithdrawalStatus,
} from '../../convex/lib/settlement';

/**
 * These two rules are the only thing standing between a replayed webhook and an
 * unbounded balance. `failed` restores the withdrawal amount to the creator's
 * wallet, and nothing else de-duplicates it — so every path that can apply a
 * terminal status twice mints money.
 */
describe('settlementBlockReason', () => {
    it('allows the ordinary settlement paths', () => {
        expect(settlementBlockReason('processing', 'completed')).toBeNull();
        expect(settlementBlockReason('processing', 'failed')).toBeNull();
        expect(settlementBlockReason('pending', 'failed')).toBeNull();
        expect(settlementBlockReason(undefined, 'completed')).toBeNull();
    });

    it('allows processing → processing (no money moves)', () => {
        // The ordinary Wise state-change webhook. Blocking it would stall rows.
        expect(settlementBlockReason('processing', 'processing')).toBeNull();
    });

    it('refuses a repeat of the SAME terminal status', () => {
        // Wise retries webhooks. Without this, a retry credits twice.
        for (const s of TERMINAL_STATUSES) {
            expect(settlementBlockReason(s, s)).toMatch(/already settled/);
        }
    });

    it('refuses crossing from one terminal status to the other', () => {
        // completed → failed would credit totalWithdrawn AND restore balance
        // for a single payout.
        expect(settlementBlockReason('completed', 'failed')).toMatch(/already settled/);
        expect(settlementBlockReason('failed', 'completed')).toMatch(/already settled/);
    });

    it('refuses reopening a settled row', () => {
        // Walking backwards re-arms the row so the next terminal transition
        // credits all over again — the replay loop, one step longer.
        expect(settlementBlockReason('completed', 'processing')).toMatch(/reopen/);
        expect(settlementBlockReason('failed', 'processing')).toMatch(/reopen/);
    });

    it('classifies terminal statuses', () => {
        expect(isTerminal('completed')).toBe(true);
        expect(isTerminal('failed')).toBe(true);
        expect(isTerminal('processing')).toBe(false);
        expect(isTerminal('pending')).toBe(false);
        expect(isTerminal(undefined)).toBe(false);
    });

    it('never blocks a transition that has not settled yet', () => {
        const open: Array<WithdrawalStatus | undefined> = [undefined, 'pending', 'processing'];
        const next: WithdrawalStatus[] = ['processing', 'completed', 'failed'];
        for (const c of open) for (const n of next) {
            expect(settlementBlockReason(c, n)).toBeNull();
        }
    });
});
