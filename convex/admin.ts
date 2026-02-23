import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { internal } from './_generated/api';

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
            (sum, s) => sum + (s.creatorPayout ?? 0),
            0
        );

        // Paid this week
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const paidThisWeek = allSubmissions.filter(
            (s) => s.creatorPaidAt && s.creatorPaidAt > oneWeekAgo
        );
        const paidThisWeekCount = paidThisWeek.length;
        const paidThisWeekAmount = paidThisWeek.reduce(
            (sum, s) => sum + (s.creatorPayout ?? 0),
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
        const deployed = submissions.filter((s) => s.status === 'deployed').length;
        const totalCreators = creators.length;
        const activeCreators = creators.filter((c) => c.status === 'active').length;

        return {
            totalSubmissions,
            pendingReview,
            websitesGenerated,
            deployed,
            totalCreators,
            activeCreators,
        };
    },
});

// ==================== WIRED ADMIN MUTATIONS ====================

/**
 * Approve a submission — sets status, tracks reviewer, triggers audit + notification + analytics + referral check
 */
export const approveSubmission = mutation({
    args: {
        submissionId: v.id('submissions'),
        adminId: v.string(),
    },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error('Submission not found');

        const previousStatus = submission.status;

        // Update submission status
        await ctx.db.patch(args.submissionId, {
            status: 'approved',
            reviewedBy: args.adminId,
            reviewedAt: Date.now(),
        });

        // Audit log
        await ctx.scheduler.runAfter(0, internal.auditLogs.log, {
            adminId: args.adminId,
            action: 'submission_approved',
            targetType: 'submission',
            targetId: args.submissionId,
            metadata: { businessName: submission.businessName, previousStatus },
        });

        // Notification to creator
        await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
            creatorId: submission.creatorId,
            type: 'submission_approved',
            title: 'Submission Approved!',
            body: `Your submission for "${submission.businessName}" has been approved.`,
            data: { submissionId: args.submissionId },
        });

        // Analytics
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: today,
            periodType: 'daily',
            field: 'approvedCount',
            delta: 1,
        });
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: month,
            periodType: 'monthly',
            field: 'approvedCount',
            delta: 1,
        });

        // Referral check: if this is the creator's first approval, qualify the referral
        const referral = await ctx.db
            .query('referrals')
            .withIndex('by_referred', (q) => q.eq('referredId', submission.creatorId))
            .filter((q) => q.eq(q.field('status'), 'pending'))
            .first();

        if (referral) {
            // Check if this is the first approved submission
            const approvedSubmissions = await ctx.db
                .query('submissions')
                .withIndex('by_creatorId', (q) => q.eq('creatorId', submission.creatorId))
                .filter((q) => q.eq(q.field('status'), 'approved'))
                .collect();

            // Count 1 because we just approved this one
            if (approvedSubmissions.length <= 1) {
                await ctx.scheduler.runAfter(0, internal.referrals.qualifyByCreator, {
                    referredId: submission.creatorId,
                    bonusAmount: 100, // ₱100 referral bonus
                });
            }
        }

        return args.submissionId;
    },
});

/**
 * Reject a submission — sets status + reason, triggers audit + notification + analytics
 */
export const rejectSubmission = mutation({
    args: {
        submissionId: v.id('submissions'),
        adminId: v.string(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error('Submission not found');

        const previousStatus = submission.status;

        // Update submission status
        const updates: any = {
            status: 'rejected',
            reviewedBy: args.adminId,
            reviewedAt: Date.now(),
        };
        if (args.reason) {
            updates.rejectionReason = args.reason;
        }
        await ctx.db.patch(args.submissionId, updates);

        // Audit log
        await ctx.scheduler.runAfter(0, internal.auditLogs.log, {
            adminId: args.adminId,
            action: 'submission_rejected',
            targetType: 'submission',
            targetId: args.submissionId,
            metadata: { businessName: submission.businessName, reason: args.reason, previousStatus },
        });

        // Notification to creator
        const reasonText = args.reason ? ` Reason: ${args.reason}` : '';
        await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
            creatorId: submission.creatorId,
            type: 'submission_rejected',
            title: 'Submission Rejected',
            body: `Your submission for "${submission.businessName}" was rejected.${reasonText}`,
            data: { submissionId: args.submissionId },
        });

        // Analytics
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: today,
            periodType: 'daily',
            field: 'rejectedCount',
            delta: 1,
        });
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: month,
            periodType: 'monthly',
            field: 'rejectedCount',
            delta: 1,
        });

        return args.submissionId;
    },
});

/**
 * Mark a submission as deployed — triggers audit + notification + analytics
 */
export const markDeployed = mutation({
    args: {
        submissionId: v.id('submissions'),
        adminId: v.string(),
        websiteUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error('Submission not found');

        // Update submission status
        const updates: any = { status: 'deployed' };
        if (args.websiteUrl) updates.websiteUrl = args.websiteUrl;
        await ctx.db.patch(args.submissionId, updates);

        // Audit log
        await ctx.scheduler.runAfter(0, internal.auditLogs.log, {
            adminId: args.adminId,
            action: 'website_deployed',
            targetType: 'submission',
            targetId: args.submissionId,
            metadata: { businessName: submission.businessName, websiteUrl: args.websiteUrl },
        });

        // Notification to creator
        await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
            creatorId: submission.creatorId,
            type: 'website_live',
            title: 'Website is Live!',
            body: `The website for "${submission.businessName}" is now live!`,
            data: { submissionId: args.submissionId, websiteUrl: args.websiteUrl },
        });

        // Analytics
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: today,
            periodType: 'daily',
            field: 'websitesLive',
            delta: 1,
        });
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: month,
            periodType: 'monthly',
            field: 'websitesLive',
            delta: 1,
        });

        return args.submissionId;
    },
});

/**
 * Mark a submission as paid — creates earning record, updates creator, triggers audit + notification + analytics
 */
export const markPaid = mutation({
    args: {
        submissionId: v.id('submissions'),
        adminId: v.string(),
    },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error('Submission not found');

        const payoutAmount = submission.creatorPayout ?? 0;

        // Update submission
        await ctx.db.patch(args.submissionId, {
            creatorPaidAt: Date.now(),
            status: 'completed',
        });

        // Update creator earnings
        const creator = await ctx.db.get(submission.creatorId);
        if (creator) {
            await ctx.db.patch(submission.creatorId, {
                balance: (creator.balance || 0) + payoutAmount,
                totalEarnings: (creator.totalEarnings || 0) + payoutAmount,
            });
        }

        // Create earning record
        await ctx.scheduler.runAfter(0, internal.earnings.create, {
            creatorId: submission.creatorId,
            submissionId: args.submissionId,
            amount: payoutAmount,
            type: 'submission_approved',
        });

        // Audit log
        await ctx.scheduler.runAfter(0, internal.auditLogs.log, {
            adminId: args.adminId,
            action: 'payment_sent',
            targetType: 'submission',
            targetId: args.submissionId,
            metadata: {
                businessName: submission.businessName,
                amount: payoutAmount,
                creatorId: submission.creatorId,
            },
        });

        // Notification to creator
        await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
            creatorId: submission.creatorId,
            type: 'payout_sent',
            title: 'Payment Received!',
            body: `You received ₱${payoutAmount} for "${submission.businessName}".`,
            data: { submissionId: args.submissionId, amount: payoutAmount },
        });

        // Analytics
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: today,
            periodType: 'daily',
            field: 'earningsTotal',
            delta: payoutAmount,
        });
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: month,
            periodType: 'monthly',
            field: 'earningsTotal',
            delta: payoutAmount,
        });

        return args.submissionId;
    },
});

// ==================== LEGACY MUTATIONS (kept for backward compat) ====================

/**
 * Mark payout as paid (legacy — use markPaid for audit trail)
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
