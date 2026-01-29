import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

// ==================== QUERIES ====================

/**
 * Check if user is admin
 */
export const isAdmin = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        const creator = await ctx.db
            .query('creators')
            .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
            .unique();

        return creator?.role === 'admin';
    },
});

/**
 * Get pending payouts (submissions with payout requests)
 */
export const getPendingPayouts = query({
    args: {},
    handler: async (ctx) => {
        const submissions = await ctx.db
            .query('submissions')
            .filter((q) =>
                q.and(
                    q.neq(q.field('payoutRequestedAt'), undefined),
                    q.eq(q.field('creatorPaidAt'), undefined)
                )
            )
            .order('desc')
            .collect();

        // Enrich with creator info
        const payouts = await Promise.all(
            submissions.map(async (submission) => {
                const creator = await ctx.db.get(submission.creatorId);
                return {
                    ...submission,
                    creator: creator
                        ? {
                            firstName: creator.firstName,
                            lastName: creator.lastName,
                            email: creator.email,
                            phone: creator.phone,
                            payoutMethod: creator.payoutMethod,
                            payoutDetails: creator.payoutDetails,
                        }
                        : null,
                };
            })
        );

        return payouts;
    },
});

/**
 * Get payout statistics
 */
export const getPayoutStats = query({
    args: {},
    handler: async (ctx) => {
        const allSubmissions = await ctx.db.query('submissions').collect();

        // Pending payouts
        const pendingPayouts = allSubmissions.filter(
            (s) => s.payoutRequestedAt && !s.creatorPaidAt
        );
        const totalPending = pendingPayouts.length;
        const totalPendingAmount = pendingPayouts.reduce(
            (sum, s) => sum + s.creatorPayout,
            0
        );

        // Paid this week
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const paidThisWeek = allSubmissions.filter(
            (s) => s.creatorPaidAt && s.creatorPaidAt > oneWeekAgo
        );
        const paidThisWeekCount = paidThisWeek.length;
        const paidThisWeekAmount = paidThisWeek.reduce(
            (sum, s) => sum + s.creatorPayout,
            0
        );

        return {
            totalPending,
            totalPendingAmount,
            paidThisWeek: paidThisWeekCount,
            paidThisWeekAmount,
        };
    },
});

/**
 * Get dashboard stats
 */
export const getDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        const submissions = await ctx.db.query('submissions').collect();
        const creators = await ctx.db.query('creators').collect();

        const totalSubmissions = submissions.length;
        const pendingReview = submissions.filter(
            (s) => s.status === 'submitted' || s.status === 'in_review'
        ).length;
        const websitesGenerated = submissions.filter(
            (s) =>
                s.status === 'website_generated' ||
                s.status === 'pending_payment' ||
                s.status === 'paid' ||
                s.status === 'completed'
        ).length;
        const totalCreators = creators.length;
        const activeCreators = creators.filter((c) => c.status === 'active').length;

        return {
            totalSubmissions,
            pendingReview,
            websitesGenerated,
            totalCreators,
            activeCreators,
        };
    },
});

// ==================== MUTATIONS ====================

/**
 * Mark payout as paid
 */
export const markPayoutPaid = mutation({
    args: { submissionId: v.id('submissions') },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error('Submission not found');

        await ctx.db.patch(args.submissionId, {
            creatorPaidAt: Date.now(),
            status: 'completed',
        });
    },
});

/**
 * Bulk mark payouts as paid
 */
export const bulkMarkPayoutsPaid = mutation({
    args: { submissionIds: v.array(v.id('submissions')) },
    handler: async (ctx, args) => {
        const now = Date.now();

        for (const id of args.submissionIds) {
            await ctx.db.patch(id, {
                creatorPaidAt: now,
                status: 'completed',
            });
        }
    },
});
