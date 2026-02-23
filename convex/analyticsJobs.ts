import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';

/**
 * Get all daily analytics records for a given date
 */
export const getDailyRecords = internalQuery({
    args: { date: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('analytics')
            .withIndex('by_period', (q) =>
                q.eq('periodType', 'daily').eq('period', args.date)
            )
            .collect();
    },
});

/**
 * Aggregate yesterday's daily stats into the monthly record
 */
export const aggregateDailyToMonthly = internalMutation({
    args: {},
    handler: async (ctx) => {
        // Get yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        const monthStr = dateStr.substring(0, 7);

        // Get all daily records for yesterday
        const dailyRecords = await ctx.db
            .query('analytics')
            .withIndex('by_period', (q) =>
                q.eq('periodType', 'daily').eq('period', dateStr)
            )
            .collect();

        // Roll up into monthly records per creator
        for (const daily of dailyRecords) {
            const existing = await ctx.db
                .query('analytics')
                .withIndex('by_creator_period', (q) =>
                    q.eq('creatorId', daily.creatorId)
                        .eq('periodType', 'monthly')
                        .eq('period', monthStr)
                )
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    submissionsCount: existing.submissionsCount + daily.submissionsCount,
                    approvedCount: existing.approvedCount + daily.approvedCount,
                    rejectedCount: existing.rejectedCount + daily.rejectedCount,
                    leadsGenerated: existing.leadsGenerated + daily.leadsGenerated,
                    earningsTotal: existing.earningsTotal + daily.earningsTotal,
                    websitesLive: existing.websitesLive + daily.websitesLive,
                    referralsCount: existing.referralsCount + daily.referralsCount,
                    updatedAt: Date.now(),
                });
            } else {
                await ctx.db.insert('analytics', {
                    creatorId: daily.creatorId,
                    period: monthStr,
                    periodType: 'monthly',
                    submissionsCount: daily.submissionsCount,
                    approvedCount: daily.approvedCount,
                    rejectedCount: daily.rejectedCount,
                    leadsGenerated: daily.leadsGenerated,
                    earningsTotal: daily.earningsTotal,
                    websitesLive: daily.websitesLive,
                    referralsCount: daily.referralsCount,
                    updatedAt: Date.now(),
                });
            }
        }
    },
});
