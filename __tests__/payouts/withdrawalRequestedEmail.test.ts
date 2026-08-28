import { getWithdrawalRequestedEmailHtml } from '../../lib/email/templates';

const base = {
    creatorName: 'Jefferson',
    amount: 500,
    wiseEmail: 'jeffersonkam28@gmail.com',
    reference: 'PAYOUT-j570ncgn-1787205474171',
    requestedAt: Date.parse('2026-08-20T05:57:54.171Z'),
};

/**
 * This email is the only thing standing between a creator and the four ways
 * this flow silently failed: an unrecognised sender, no Wise account, a
 * mismatched address, and a claim window nobody mentioned. Each assertion below
 * pins one of them.
 */
describe('getWithdrawalRequestedEmailHtml', () => {
    it('names the address Wise will use', () => {
        // A creator whose Wise account uses a different email never receives it.
        const html = getWithdrawalRequestedEmailHtml(base);
        expect(html).toContain('jeffersonkam28@gmail.com');
    });

    it('states the 7-day claim window and what happens after', () => {
        const html = getWithdrawalRequestedEmailHtml(base);
        expect(html).toMatch(/7 days/);
        expect(html).toMatch(/back to your Tendso balance/i);
    });

    it('names the Wise sender when we know it', () => {
        const html = getWithdrawalRequestedEmailHtml({ ...base, wiseSenderName: 'VONAS, OPC' });
        expect(html).toContain('VONAS, OPC');
        expect(html).toMatch(/really is from us/i);
    });

    it('never invents a sender name when it is unset', () => {
        // Naming the wrong company is worse than naming none — it teaches
        // creators to distrust the genuine Wise email.
        const html = getWithdrawalRequestedEmailHtml(base);
        expect(html).not.toMatch(/registered company name/i);
        expect(html).toContain('noreply@wise.com');
    });

    it('escapes creator-supplied text', () => {
        // creatorName is self-set profile text and lands in an HTML email.
        const html = getWithdrawalRequestedEmailHtml({
            ...base,
            creatorName: '<script>alert(1)</script>',
        });
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('omits the reference row entirely when there is no reference', () => {
        const html = getWithdrawalRequestedEmailHtml({ ...base, reference: undefined });
        expect(html).not.toMatch(/>Reference</);
        expect(html).toMatch(/>Requested</);
    });
});
