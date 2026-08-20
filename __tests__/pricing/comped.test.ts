import {
    BASE_PRICE,
    CUSTOM_DOMAIN_PRICE,
    PRICING_MODE_COMPED,
    commissionFor,
    isComped,
    ownerChargeFor,
} from '../../lib/pricing';

/**
 * PROMO — the creator gives the website away, the platform still pays them.
 *
 * These pin the two rules the whole promo rests on:
 *   1. absent `pricingMode` means PAID (every row predating the promo)
 *   2. a comped row's `amount` is a list price, never a receivable
 *
 * Get either wrong and the failure is silent money: free sites counted as
 * revenue, or real sales quietly zeroed out.
 */
describe('lib/pricing — comped classification', () => {
    it('treats an absent pricingMode as a normal paid sale', () => {
        // The load-bearing case: every submission written before the promo
        // existed has no pricingMode at all.
        expect(isComped({})).toBe(false);
        expect(isComped({ pricingMode: undefined })).toBe(false);
        expect(isComped({ pricingMode: null })).toBe(false);
    });

    it('treats an explicit paid mode as paid', () => {
        expect(isComped({ pricingMode: 'paid' })).toBe(false);
    });

    it('recognises a comped row', () => {
        expect(isComped({ pricingMode: PRICING_MODE_COMPED })).toBe(true);
        expect(isComped({ pricingMode: 'comped' })).toBe(true);
    });

    it('never reports a null or undefined row as comped', () => {
        // Callers pass query results straight in; a missing row must not read
        // as a giveaway.
        expect(isComped(null)).toBe(false);
        expect(isComped(undefined)).toBe(false);
    });

    it('does not treat unknown modes as comped', () => {
        // Fail closed toward "paid": an unrecognised value must not silently
        // remove a real sale from revenue.
        expect(isComped({ pricingMode: 'COMPED' })).toBe(false);
        expect(isComped({ pricingMode: 'free' })).toBe(false);
        expect(isComped({ pricingMode: '' })).toBe(false);
    });
});

describe('lib/pricing — what the owner was actually charged', () => {
    it('charges nothing for a comped site, whatever its list price says', () => {
        // `amount` stays at the list price on a comped row — it is what the
        // site was worth and what the commission derives from — so every
        // revenue reader has to go through ownerChargeFor.
        expect(ownerChargeFor({ pricingMode: 'comped', amount: BASE_PRICE })).toBe(0);
        expect(ownerChargeFor({ pricingMode: 'comped', amount: CUSTOM_DOMAIN_PRICE })).toBe(0);
        expect(ownerChargeFor({ pricingMode: 'comped', amount: 4999 })).toBe(0);
    });

    it('returns the full amount for an ordinary sale', () => {
        expect(ownerChargeFor({ amount: BASE_PRICE })).toBe(BASE_PRICE);
        expect(ownerChargeFor({ pricingMode: 'paid', amount: CUSTOM_DOMAIN_PRICE })).toBe(1499);
    });

    it('handles rows with no amount', () => {
        expect(ownerChargeFor({})).toBe(0);
        expect(ownerChargeFor({ amount: undefined })).toBe(0);
        expect(ownerChargeFor(null)).toBe(0);
    });
});

describe('promo — the creator is paid in full regardless', () => {
    it('pays the same ₱500 commission on a comped site as on a sale', () => {
        // The promo gives away the SALE, never the creator's earnings. This is
        // the number the whole thing is advertised on.
        const listPrice = BASE_PRICE;
        const payout = commissionFor(listPrice);

        expect(payout).toBe(500);

        const sold = { pricingMode: 'paid', amount: listPrice, creatorPayout: payout };
        const given = { pricingMode: 'comped', amount: listPrice, creatorPayout: payout };

        expect(given.creatorPayout).toBe(sold.creatorPayout);
        // ...while the money coming IN differs completely.
        expect(ownerChargeFor(sold)).toBe(999);
        expect(ownerChargeFor(given)).toBe(0);
    });

    it('nets a promo site to a ₱500 loss, not a ₱999 gain', () => {
        const row = { pricingMode: 'comped', amount: BASE_PRICE, creatorPayout: 500 };
        const net = ownerChargeFor(row) - row.creatorPayout;
        expect(net).toBe(-500);
    });
});

describe('promo — aggregating a mixed book', () => {
    // Two real sales, two giveaways, and one legacy row with no pricingMode.
    const rows = [
        { pricingMode: 'paid', amount: 999, creatorPayout: 500 },
        { amount: 1499, creatorPayout: 500 },                      // legacy → paid
        { pricingMode: 'comped', amount: 999, creatorPayout: 500 },
        { pricingMode: 'comped', amount: 999, creatorPayout: 500 },
        { pricingMode: 'paid', amount: 4999, creatorPayout: 2500 }, // unlocked ceiling
    ];

    it('counts only real sales as revenue', () => {
        const revenue = rows.reduce((sum, r) => sum + ownerChargeFor(r), 0);
        // 999 + 1499 + 4999 — the two giveaways contribute nothing.
        expect(revenue).toBe(7497);
    });

    it('still owes every creator their payout', () => {
        const owed = rows.reduce((sum, r) => sum + r.creatorPayout, 0);
        expect(owed).toBe(4500);
    });

    it('separates promo cost from the rest', () => {
        const comped = rows.filter(isComped);
        expect(comped).toHaveLength(2);
        expect(comped.reduce((s, r) => s + r.creatorPayout, 0)).toBe(1000);
        // What was given away at list value — a headline figure, never revenue.
        expect(comped.reduce((s, r) => s + (r.amount ?? 0), 0)).toBe(1998);
    });

    it('does not let a legacy row without pricingMode fall out of revenue', () => {
        // The regression that would matter most: a schema addition silently
        // reclassifying every historical sale as a giveaway.
        const legacy = rows.filter((r) => !('pricingMode' in r));
        expect(legacy).toHaveLength(1);
        expect(ownerChargeFor(legacy[0])).toBe(1499);
    });
});
