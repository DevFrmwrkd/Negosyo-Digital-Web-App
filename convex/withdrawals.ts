import { v } from 'convex/values';
import { query, mutation, internalMutation } from './_generated/server';
import { internal } from './_generated/api';

// ==================== MUTATIONS ====================

/**
 * Create a withdrawal request
 */
export const create = mutation({
    args: {
        creatorId: v.id('creators'),
        amount: v.number(),
        payoutMethod: v.union(
            v.literal('gcash'),
            v.literal('maya'),
            v.literal('bank_transfer')
        ),
        accountDetails: v.string(),
    },
    handler: async (ctx, args) => {
        // Validate minimum withdrawal
        if (args.amount < 100) {
            throw new Error('Minimum withdrawal is ₱100');
        }

        // Check balance
        const creator = await ctx.db.get(args.creatorId);
        if (!creator) throw new Error('Creator not found');
        if ((creator.balance || 0) < args.amount) {
            throw new Error('Insufficient balance');
        }

        // Deduct balance immediately (optimistic)
        await ctx.db.patch(args.creatorId, {
            balance: (creator.balance || 0) - args.amount,
        });

        return await ctx.db.insert('withdrawals', {
            creatorId: args.creatorId,
            amount: args.amount,
            payoutMethod: args.payoutMethod,
            accountDetails: args.accountDetails,
            status: 'pending',
            createdAt: Date.now(),
        });
    },
});

/**
 * Update withdrawal status (admin)
 */
export const updateStatus = mutation({
    args: {
        id: v.id('withdrawals'),
        status: v.union(
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
        ),
        transactionRef: v.optional(v.string()),
        adminId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.id);
        if (!withdrawal) throw new Error('Withdrawal not found');

        const updates: any = { status: args.status };
        if (args.transactionRef) updates.transactionRef = args.transactionRef;

        if (args.status === 'completed') {
            updates.processedAt = Date.now();

            // Update creator's totalWithdrawn
            const creator = await ctx.db.get(withdrawal.creatorId);
            if (creator) {
                await ctx.db.patch(withdrawal.creatorId, {
                    totalWithdrawn: (creator.totalWithdrawn || 0) + withdrawal.amount,
                });
            }

            // Send notification
            await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
                creatorId: withdrawal.creatorId,
                type: 'payout_sent',
                title: 'Withdrawal Completed',
                body: `Your withdrawal of ₱${withdrawal.amount} has been sent!`,
                data: { withdrawalId: withdrawal._id, amount: withdrawal.amount },
            });
        }

        if (args.status === 'failed') {
            // Restore creator's balance
            const creator = await ctx.db.get(withdrawal.creatorId);
            if (creator) {
                await ctx.db.patch(withdrawal.creatorId, {
                    balance: (creator.balance || 0) + withdrawal.amount,
                });
            }
        }

        await ctx.db.patch(args.id, updates);

        // Audit log
        if (args.adminId) {
            await ctx.scheduler.runAfter(0, internal.auditLogs.log, {
                adminId: args.adminId,
                action: 'payment_sent' as const,
                targetType: 'withdrawal' as const,
                targetId: args.id,
                metadata: {
                    amount: withdrawal.amount,
                    status: args.status,
                    transactionRef: args.transactionRef,
                },
            });
        }
    },
});

// ==================== QUERIES ====================

/**
 * Get all withdrawals for a creator
 */
export const getByCreator = query({
    args: { creatorId: v.id('creators') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('withdrawals')
            .withIndex('by_creator', (q) => q.eq('creatorId', args.creatorId))
            .order('desc')
            .collect();
    },
});

/**
 * Get withdrawals by status (admin queue)
 */
export const getByStatus = query({
    args: {
        status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
        ),
    },
    handler: async (ctx, args) => {
        const withdrawals = await ctx.db
            .query('withdrawals')
            .withIndex('by_status', (q) => q.eq('status', args.status))
            .order('desc')
            .collect();

        return await Promise.all(
            withdrawals.map(async (w) => {
                const creator = await ctx.db.get(w.creatorId);
                return {
                    ...w,
                    creatorName: creator
                        ? `${creator.firstName} ${creator.lastName}`
                        : 'Unknown',
                    creatorEmail: creator?.email,
                };
            })
        );
    },
});

/**
 * Get all withdrawals (admin)
 */
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const withdrawals = await ctx.db
            .query('withdrawals')
            .order('desc')
            .collect();

        return await Promise.all(
            withdrawals.map(async (w) => {
                const creator = await ctx.db.get(w.creatorId);
                return {
                    ...w,
                    creatorName: creator
                        ? `${creator.firstName} ${creator.lastName}`
                        : 'Unknown',
                    creatorEmail: creator?.email,
                };
            })
        );
    },
});

// ==================== INTERNAL MUTATIONS ====================

/**
 * Update withdrawal status by Wise transfer ID.
 * Called by the /wise-webhook HTTP endpoint.
 */
export const updateByWiseTransferId = internalMutation({
    args: {
        wiseTransferId: v.string(),
        status: v.union(
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
        ),
    },
    handler: async (ctx, args) => {
        // Find withdrawal by wiseTransferId
        const withdrawals = await ctx.db
            .query('withdrawals')
            .filter((q) => q.eq(q.field('wiseTransferId'), args.wiseTransferId))
            .collect();

        const withdrawal = withdrawals[0];
        if (!withdrawal) {
            console.error(`No withdrawal found for Wise transfer ID: ${args.wiseTransferId}`);
            return;
        }

        const updates: Record<string, unknown> = { status: args.status };

        if (args.status === 'completed') {
            updates.processedAt = Date.now();

            // Update creator's totalWithdrawn
            const creator = await ctx.db.get(withdrawal.creatorId);
            if (creator) {
                await ctx.db.patch(withdrawal.creatorId, {
                    totalWithdrawn: (creator.totalWithdrawn || 0) + withdrawal.amount,
                });
            }

            // Notify creator
            await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
                creatorId: withdrawal.creatorId,
                type: 'payout_sent',
                title: 'Withdrawal Completed',
                body: `Your withdrawal of ₱${withdrawal.amount} has been sent!`,
                data: { withdrawalId: withdrawal._id, amount: withdrawal.amount },
            });
        }

        if (args.status === 'failed') {
            // Restore creator's balance
            const creator = await ctx.db.get(withdrawal.creatorId);
            if (creator) {
                await ctx.db.patch(withdrawal.creatorId, {
                    balance: (creator.balance || 0) + withdrawal.amount,
                });
            }

            // Notify creator
            await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
                creatorId: withdrawal.creatorId,
                type: 'system',
                title: 'Withdrawal Failed',
                body: `Your withdrawal of ₱${withdrawal.amount} could not be processed. The amount has been returned to your balance.`,
                data: { withdrawalId: withdrawal._id, amount: withdrawal.amount },
            });
        }

        await ctx.db.patch(withdrawal._id, updates);
    },
});
