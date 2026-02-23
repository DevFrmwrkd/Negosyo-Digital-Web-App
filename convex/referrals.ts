import { v } from 'convex/values';
import { query, internalMutation } from './_generated/server';
import { internal } from './_generated/api';

// ==================== INTERNAL MUTATIONS ====================

/**
 * Create a referral record when a new creator signs up with a referral code
 */
export const createFromSignup = internalMutation({
    args: {
        referrerId: v.id('creators'),
        referredId: v.id('creators'),
        referralCode: v.string(),
    },
    handler: async (ctx, args) => {
        // Dedup: check if referral already exists
        const existing = await ctx.db
            .query('referrals')
            .withIndex('by_referred', (q) => q.eq('referredId', args.referredId))
            .first();

        if (existing) return existing._id;

        return await ctx.db.insert('referrals', {
            referrerId: args.referrerId,
            referredId: args.referredId,
            referralCode: args.referralCode,
            status: 'pending',
            createdAt: Date.now(),
        });
    },
});

/**
 * Qualify a referral when the referred creator's first submission is approved
 */
export const qualifyByCreator = internalMutation({
    args: {
        referredId: v.id('creators'),
        bonusAmount: v.number(),
    },
    handler: async (ctx, args) => {
        // Find the pending referral for this referred creator
        const referral = await ctx.db
            .query('referrals')
            .withIndex('by_referred', (q) => q.eq('referredId', args.referredId))
            .filter((q) => q.eq(q.field('status'), 'pending'))
            .first();

        if (!referral) return;

        // Mark referral as qualified
        await ctx.db.patch(referral._id, {
            status: 'qualified',
            bonusAmount: args.bonusAmount,
            qualifiedAt: Date.now(),
        });

        // Credit the referrer
        const referrer = await ctx.db.get(referral.referrerId);
        if (referrer) {
            await ctx.db.patch(referral.referrerId, {
                balance: (referrer.balance || 0) + args.bonusAmount,
                totalEarnings: (referrer.totalEarnings || 0) + args.bonusAmount,
            });

            // Create earning record for referrer
            await ctx.scheduler.runAfter(0, internal.earnings.create, {
                creatorId: referral.referrerId,
                submissionId: referral.referredId as any, // Use referredId as reference
                amount: args.bonusAmount,
                type: 'referral_bonus',
            });

            // Send notification to referrer
            await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
                creatorId: referral.referrerId,
                type: 'payout_sent',
                title: 'Referral Bonus!',
                body: `You earned ₱${args.bonusAmount} from a referral!`,
                data: { referralId: referral._id },
            });
        }
    },
});

// ==================== QUERIES ====================

/**
 * Get all referrals by a referrer (enriched with referred creator names)
 */
export const getByReferrer = query({
    args: { referrerId: v.id('creators') },
    handler: async (ctx, args) => {
        const referrals = await ctx.db
            .query('referrals')
            .withIndex('by_referrer', (q) => q.eq('referrerId', args.referrerId))
            .order('desc')
            .collect();

        return await Promise.all(
            referrals.map(async (referral) => {
                const referred = await ctx.db.get(referral.referredId);
                return {
                    ...referral,
                    referredName: referred
                        ? `${referred.firstName} ${referred.lastName}`
                        : 'Unknown',
                };
            })
        );
    },
});

/**
 * Get referral stats for a creator
 */
export const getStats = query({
    args: { referrerId: v.id('creators') },
    handler: async (ctx, args) => {
        const referrals = await ctx.db
            .query('referrals')
            .withIndex('by_referrer', (q) => q.eq('referrerId', args.referrerId))
            .collect();

        return {
            total: referrals.length,
            pending: referrals.filter((r) => r.status === 'pending').length,
            qualified: referrals.filter((r) => r.status === 'qualified').length,
            paid: referrals.filter((r) => r.status === 'paid').length,
            totalEarned: referrals.reduce((sum, r) => sum + (r.bonusAmount || 0), 0),
        };
    },
});
