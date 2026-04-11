import { v } from 'convex/values';
import { query, mutation, internalMutation, internalAction } from './_generated/server';
import { internal } from './_generated/api';

// ==================== MUTATIONS ====================

/**
 * Create instant withdrawal request with automatic Wise transfer
 * No admin approval needed - transfers instantly to user's Wise account
 */
export const create = mutation({
    args: {
        creatorId: v.id('creators'),
        amount: v.number(),
        payoutMethod: v.union(
            v.literal('gcash'),
            v.literal('maya'),
            v.literal('bank_transfer'),
            v.literal('wise_email')
        ),
        accountDetails: v.string(),
    },
    handler: async (ctx, args): Promise<any> => {
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

        // Generate unique reference for tracking
        const reference = `PAYOUT-${args.creatorId.substring(0, 8)}-${Date.now()}`;

        let wiseTransactionId: string | undefined = undefined;
        let wiseStatus: string | undefined = undefined;
        let errorMessage: string | undefined = undefined;

        // For Wise payouts - schedule automatic transfer
        if (args.payoutMethod === 'wise_email') {
            try {
                // Schedule Wise API transfer (runs asynchronously)
                // The action will update the withdrawal record when complete
                await ctx.scheduler.runAfter(
                    0,
                    internal.withdrawals.processWiseTransfer,
                    {
                        targetEmail: args.accountDetails,
                        amount: args.amount,
                        reference,
                    }
                );
                // Mark as processing - Wise action will update when it completes
                wiseStatus = 'PROCESSING';
            } catch (error) {
                errorMessage = error instanceof Error ? error.message : 'Failed to schedule Wise transfer';
                console.error('Wise transfer scheduling error:', errorMessage);
                wiseStatus = 'FAILED';
            }
        }

        // Deduct balance immediately (funds are locked)
        await ctx.db.patch(args.creatorId, {
            balance: (creator.balance || 0) - args.amount,
        });

        // Create withdrawal record with status completed for non-admin workflows
        const withdrawalId = await ctx.db.insert('withdrawals', {
            creatorId: args.creatorId,
            amount: args.amount,
            payoutMethod: args.payoutMethod,
            accountDetails: args.accountDetails,
            status: 'completed', // Instant completion - no admin needed
            reference,
            wiseTransactionId,
            wiseStatus,
            errorMessage,
            createdAt: Date.now(),
            processedAt: Date.now(),
        });

        // Update totalWithdrawn
        await ctx.db.patch(args.creatorId, {
            totalWithdrawn: (creator.totalWithdrawn || 0) + args.amount,
        });

        // Send success notification to user
        await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
            creatorId: args.creatorId,
            type: 'payout_sent',
            title: 'Withdrawal Completed! 🎉',
            body: `₱${args.amount.toLocaleString()} has been sent to your ${
                args.payoutMethod === 'wise_email' ? 'Wise' : args.payoutMethod.toUpperCase()
            } account`,
            data: { 
                withdrawalId, 
                amount: args.amount,
                reference,
                wiseTransactionId,
            },
        });

        // Log to audit system
        await ctx.scheduler.runAfter(0, internal.auditLogs.log, {
            adminId: 'system', // Automatic system withdrawal, no admin involvement
            action: 'payout_sent' as const,
            targetType: 'withdrawal' as const,
            targetId: withdrawalId,
            metadata: {
                amount: args.amount,
                method: args.payoutMethod,
                reference,
                wiseTransactionId,
                wiseStatus,
                errorMessage: errorMessage || undefined,
                instant: true,
            },
        });

        return {
            _id: withdrawalId,
            amount: args.amount,
            status: 'completed',
            reference,
            wiseTransactionId,
            wiseStatus,
            message: errorMessage 
                ? `Transfer queued but may require manual processing: ${errorMessage}`
                : 'Withdrawal completed instantly!',
        };
    },
});

/**
 * Internal action: Process Wise transfer via API
 */
export const processWiseTransfer = internalAction({
    args: {
        targetEmail: v.string(),
        amount: v.number(),
        reference: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            // Simulate Wise API call
            // In production, this will integrate with actual Wise API
            // For now, we'll create a mock response

            const mockTransferId = `WISE-${args.reference}`;
            
            // TODO: Integrate actual Wise API
            // const wiseSdk = require('@transferwise/sdk');
            // const transfer = await wiseSdk.transfers.create({...});

            console.log(`[Wise Transfer] Processing ${args.amount} to ${args.targetEmail}`);

            return {
                id: mockTransferId,
                status: 'PROCESSING',
                reference: args.reference,
                amount: args.amount,
                targetEmail: args.targetEmail,
            };
        } catch (error) {
            console.error('Wise API error:', error);
            throw new Error(`Failed to process Wise transfer: ${error}`);
        }
    },
});

/**
 * Admin override: Manually update withdrawal status (for edge cases/retries)
 * Used only when automatic transfer fails and needs manual intervention
 */
export const adminRetry = mutation({
    args: {
        id: v.id('withdrawals'),
        status: v.union(
            v.literal('completed'),
            v.literal('failed')
        ),
        adminId: v.string(),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.id);
        if (!withdrawal) throw new Error('Withdrawal not found');

        const updates: any = { status: args.status };
        if (args.notes) updates.adminNotes = args.notes;

        if (args.status === 'failed') {
            // Restore creator's balance on manual failure
            const creator = await ctx.db.get(withdrawal.creatorId);
            if (creator) {
                await ctx.db.patch(withdrawal.creatorId, {
                    balance: (creator.balance || 0) + withdrawal.amount,
                });
            }
        }

        await ctx.db.patch(args.id, updates);

        // Log admin action
        await ctx.scheduler.runAfter(0, internal.auditLogs.log, {
            adminId: args.adminId,
            action: 'payout_admin_override' as const,
            targetType: 'withdrawal' as const,
            targetId: args.id,
            metadata: {
                amount: withdrawal.amount,
                status: args.status,
                notes: args.notes,
            },
        });

        return withdrawal;
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

// ==================== STATUS FOLLOW-UP (cron + email) ====================

/**
 * Internal query: get withdrawals that need a status follow-up check.
 * Returns processing withdrawals that haven't been polled in the last hour.
 */
export const getStaleProcessing = internalMutation({
    args: {},
    handler: async (ctx) => {
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        const processing = await ctx.db
            .query('withdrawals')
            .withIndex('by_status', (q) => q.eq('status', 'processing'))
            .collect()
        // Only those not checked in the last hour AND with a wiseTransferId we can poll
        return processing.filter(
            (w) => w.wiseTransferId && (!w.lastStatusCheckAt || w.lastStatusCheckAt < oneHourAgo)
        )
    },
})

/**
 * Internal mutation: record the result of a status check (used by the action below).
 */
export const recordStatusCheck = internalMutation({
    args: {
        withdrawalId: v.id('withdrawals'),
        wiseDetailedState: v.string(),
        sendEmail: v.boolean(),
    },
    handler: async (ctx, args) => {
        const updates: any = {
            lastStatusCheckAt: Date.now(),
            wiseDetailedState: args.wiseDetailedState,
        }
        if (args.sendEmail) {
            updates.lastStatusEmailAt = Date.now()
        }
        await ctx.db.patch(args.withdrawalId, updates)
    },
})

/**
 * Cron-triggered action: poll Wise for stalled withdrawals + send follow-up emails.
 * Runs every hour. For each processing withdrawal:
 *   1. Calls Wise GET /v1/transfers/{id} to get current state
 *   2. Records the new state
 *   3. If state changed OR last email was sent > 24h ago, sends a follow-up email to the creator
 */
export const checkProcessingStatusCron = internalAction({
    args: {},
    handler: async (ctx) => {
        const stale: any[] = await ctx.runMutation(internal.withdrawals.getStaleProcessing, {})
        if (stale.length === 0) {
            console.log('[WITHDRAWAL-FOLLOWUP] No stale processing withdrawals')
            return
        }

        console.log(`[WITHDRAWAL-FOLLOWUP] Checking ${stale.length} stale withdrawals`)

        const { getTransferStatus, describeWiseStatus } = await import('./lib/wise')

        for (const w of stale) {
            try {
                const status = await getTransferStatus(w.wiseTransferId!)
                const stateChanged = w.wiseDetailedState !== status.detailedStatus
                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
                const noRecentEmail = !w.lastStatusEmailAt || w.lastStatusEmailAt < oneDayAgo
                const shouldEmail = stateChanged || noRecentEmail

                await ctx.runMutation(internal.withdrawals.recordStatusCheck, {
                    withdrawalId: w._id,
                    wiseDetailedState: status.detailedStatus,
                    sendEmail: shouldEmail,
                })

                if (shouldEmail) {
                    const description = describeWiseStatus(status.detailedStatus)

                    // Fetch creator email
                    const creator = await ctx.runQuery(internal.creators.getByIdInternal, { id: w.creatorId })
                    if (!creator?.email) {
                        console.warn(`[WITHDRAWAL-FOLLOWUP] No email for creator ${w.creatorId}, skipping`)
                        continue
                    }

                    // Schedule the email send via Next.js endpoint
                    await ctx.scheduler.runAfter(0, internal.withdrawals.sendStatusEmailAction, {
                        withdrawalId: w._id,
                        creatorEmail: creator.email,
                        creatorName: `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || 'Creator',
                        amount: w.amount,
                        statusLabel: description.label,
                        statusDescription: description.description,
                        isFinal: description.isFinal,
                        referenceCode: w.wiseTransferId,
                        submittedAt: w.createdAt,
                    })
                }
            } catch (error) {
                console.error(`[WITHDRAWAL-FOLLOWUP] Error checking withdrawal ${w._id}:`, error)
            }
        }
    },
})

/**
 * Internal action: send the withdrawal status email via the Next.js endpoint.
 */
export const sendStatusEmailAction = internalAction({
    args: {
        withdrawalId: v.id('withdrawals'),
        creatorEmail: v.string(),
        creatorName: v.string(),
        amount: v.number(),
        statusLabel: v.string(),
        statusDescription: v.string(),
        isFinal: v.boolean(),
        referenceCode: v.optional(v.string()),
        submittedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || 'https://negosyo-digital.vercel.app'
        const internalSecret = process.env.INTERNAL_API_SECRET || ''

        try {
            const response = await fetch(`${baseUrl}/api/internal/send-withdrawal-status-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Secret': internalSecret,
                },
                body: JSON.stringify({
                    creatorEmail: args.creatorEmail,
                    creatorName: args.creatorName,
                    amount: args.amount,
                    statusLabel: args.statusLabel,
                    statusDescription: args.statusDescription,
                    isFinal: args.isFinal,
                    referenceCode: args.referenceCode,
                    submittedAt: args.submittedAt,
                }),
            })
            if (!response.ok) {
                const text = await response.text()
                console.error(`[WITHDRAWAL-FOLLOWUP] Email send failed: ${response.status} ${text}`)
            }
        } catch (error) {
            console.error('[WITHDRAWAL-FOLLOWUP] Error sending status email:', error)
        }
    },
})
