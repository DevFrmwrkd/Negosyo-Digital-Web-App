import {
    WISE_ACTIVITY_URL,
    WISE_TRANSFER_PATH,
    wiseTransferUrl,
} from '../../lib/payouts/wiseLinks';

/**
 * These links are the only way out of a stalled payout: once Wise holds a
 * transfer, nothing in this app can move it. The one property that must hold is
 * that every caller gets a usable Wise URL — an admin sent nowhere has to leave
 * the page to make any progress at all.
 */
describe('wiseTransferUrl', () => {
    it('deep-links a transfer by id', () => {
        expect(wiseTransferUrl('2320468106')).toBe(
            `${WISE_ACTIVITY_URL}${WISE_TRANSFER_PATH}/2320468106`
        );
    });

    it('falls back to the activity list when there is no transfer yet', () => {
        // A 'pending' withdrawal has no wiseTransferId: processWiseTransfer has
        // not run, so there is nothing at Wise to point at.
        for (const empty of [undefined, null, '']) {
            expect(wiseTransferUrl(empty)).toBe(WISE_ACTIVITY_URL);
        }
    });

    it('never returns anything but a Wise URL', () => {
        // WISE_TRANSFER_PATH is an unverified guess at Wise's route. A wrong
        // guess must degrade to "wrong page on the right site", never to an
        // off-site or malformed link.
        for (const id of [undefined, '2320468106', 'a b/c?d#e', '../../escape']) {
            expect(wiseTransferUrl(id).startsWith(WISE_ACTIVITY_URL)).toBe(true);
        }
    });

    it('encodes ids rather than letting them alter the path', () => {
        const url = wiseTransferUrl('../../escape');
        expect(url).toBe(`${WISE_ACTIVITY_URL}${WISE_TRANSFER_PATH}/..%2F..%2Fescape`);
        expect(url).not.toContain('/../');
    });
});
