import { v } from 'convex/values';
import { query, mutation, action, internalMutation, internalAction, internalQuery } from './_generated/server';
import { api, internal } from './_generated/api';
import { settlementBlockReason } from './lib/settlement';
import { greetingName } from '../lib/email/greeting';

/**
 * Resolve an adminId to a real admin row. The withdrawal mutations below take
 * adminId as a plain argument and, before this, used it only as an audit-log
 * label — so `updateStatus` and `adminRetry` were public mutations that moved
 * money for any caller who supplied any string. Mirrors admin.markComped.
 */
async function assertAdmin(ctx: any, adminId: string) {
    const actor = await ctx.db
        .query('creators')
        .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', adminId))
        .first();
    if (!actor || actor.role !== 'admin') throw new Error('Forbidden: admin access required');
    return actor;
}

// ==================== MUTATIONS ====================

/**
 * Create a withdrawal request. Row is inserted as 'pending', then moved to
 * 'processing' once Wise recipient/quote/transfer have been created (see
 * processWiseTransfer). It only flips to 'completed' when Wise fires the
 * outgoing_payment_sent webhook — at which point totalWithdrawn is incremented
 * and the success notification is sent. This matches WISE-PAYMENT-FLOW-MOBILE.md.
 *
 * Mobile-referenced — accepts BOTH arg shapes:
 *
 *   Web (this repo's wallet UI):
 *     { creatorId, amount, payoutMethod: 'wise_email', accountDetails: <email> }
 *
 *   Mobile (Google Play APK):
 *     { creatorId, amount, wiseEmail: <email> }
 *
 * Mobile only knows about Wise email payouts; web's signature was the legacy
 * one that supported gcash/maya/bank_transfer/wise_email. The handler normalizes
 * either shape into a `wise_email` withdrawal. Do NOT remove `wiseEmail` from
 * the validator — that's how mobile reaches this mutation. See
 * docs/changes/MOBILE-WITHDRAWAL-FIX.md for the incident on 2026-04-23.
 */
export const create = mutation({
    args: {
        creatorId: v.id('creators'),
        amount: v.number(),
        // Web-style args (legacy)
        payoutMethod: v.optional(v.union(
            v.literal('gcash'),
            v.literal('maya'),
            v.literal('bank_transfer'),
            v.literal('wise_email')
        )),
        accountDetails: v.optional(v.string()),
        // Mobile-style arg (Wise refactor)
        wiseEmail: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<any> => {
        // No fixed minimum — only floor is amount > 0. Fee absorption (createQuote
        // uses targetAmount) means the platform pays Wise's per-transfer fee, not
        // the creator. Reintroducing a hardcoded floor would contradict the UI.
        // See docs/changes/WISE-WITHDRAWAL-FIX-MIN.md.
        if (args.amount <= 0) {
            throw new Error('Withdrawal amount must be greater than zero');
        }

        // Normalize web/mobile call shapes into one canonical {payoutMethod, accountDetails, wiseEmail}.
        // Mobile sends only wiseEmail → derive everything from it. Web sends payoutMethod+accountDetails.
        let payoutMethod: 'gcash' | 'maya' | 'bank_transfer' | 'wise_email' | undefined = args.payoutMethod;
        let accountDetails: string | undefined = args.accountDetails;
        let wiseEmail: string | undefined = args.wiseEmail?.trim().toLowerCase() || undefined;

        if (wiseEmail) {
            // Mobile path — wiseEmail wins; payoutMethod is wise_email by definition.
            payoutMethod = 'wise_email';
            accountDetails = accountDetails || wiseEmail;
        } else if (payoutMethod === 'wise_email' && accountDetails) {
            // Web path on the wise_email branch — accountDetails IS the email.
            wiseEmail = accountDetails.trim().toLowerCase();
        }

        if (!payoutMethod || !accountDetails) {
            throw new Error(
                'Withdrawal requires either { wiseEmail } (mobile) or { payoutMethod, accountDetails } (web)'
            );
        }

        const creator = await ctx.db.get(args.creatorId);
        if (!creator) throw new Error('Creator not found');
        if ((creator.balance || 0) < args.amount) {
            throw new Error('Insufficient balance');
        }

        const reference = `PAYOUT-${args.creatorId.substring(0, 8)}-${Date.now()}`;

        // Deduct balance immediately (funds are locked until Wise completes or refunds)
        await ctx.db.patch(args.creatorId, {
            balance: (creator.balance || 0) - args.amount,
        });

        // Row starts as 'pending' — will move to 'processing' once Wise IDs exist.
        const withdrawalId = await ctx.db.insert('withdrawals', {
            creatorId: args.creatorId,
            amount: args.amount,
            payoutMethod,
            accountDetails,
            wiseEmail: payoutMethod === 'wise_email' ? wiseEmail : undefined,
            accountHolderName: `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.email || 'Creator',
            status: 'pending',
            reference,
            createdAt: Date.now(),
        });

        // Schedule the async Wise transfer creation.
        if (payoutMethod === 'wise_email') {
            await ctx.scheduler.runAfter(0, internal.withdrawals.processWiseTransfer, {
                withdrawalId,
            });

            // First contact. Until now create() dispatched nothing at all — no
            // email, no push, no in-app row — so the first thing a creator heard
            // about their own payout was Wise's invitation, sent under our
            // registered company name rather than "Tendso". One creator read
            // that as spam, never claimed it, and the transfer auto-refunded
            // after seven days.
            if (creator.email && wiseEmail) {
                await ctx.scheduler.runAfter(0, internal.withdrawals.sendRequestedEmailAction, {
                    creatorEmail: creator.email,
                    creatorName: greetingName(creator),
                    amount: args.amount,
                    wiseEmail,
                    reference,
                    requestedAt: Date.now(),
                });
            }
        }

        return {
            _id: withdrawalId,
            amount: args.amount,
            status: 'pending',
            reference,
            message: 'Withdrawal queued. We\'ll notify you when it\'s sent.',
        };
    },
});

// ==================== WISE TRANSFER CREATION (real) ====================

/**
 * Internal query used by processWiseTransfer to load the withdrawal + creator
 * without racing the commit of the create() mutation.
 */
export const getByIdInternal = internalQuery({
    args: { id: v.id('withdrawals') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/**
 * Internal mutation: persist the Wise IDs and flip status to 'processing'.
 * Called from processWiseTransfer once recipient/quote/transfer all succeed.
 */
export const setWiseTransferIds = internalMutation({
    args: {
        withdrawalId: v.id('withdrawals'),
        wiseTransferId: v.string(),
        wiseRecipientId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.withdrawalId, {
            wiseTransferId: args.wiseTransferId,
            wiseRecipientId: args.wiseRecipientId,
            wiseStatus: 'PROCESSING',
            status: 'processing',
        });
    },
});

/**
 * Internal mutation: mark a withdrawal as failed, restore the creator's balance,
 * and notify them. Used when the Wise API call fails before a transfer ID exists.
 */
export const markFailed = internalMutation({
    args: {
        withdrawalId: v.id('withdrawals'),
        reason: v.string(),
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) return;

        const blocked = settlementBlockReason(withdrawal.status, 'failed');
        if (blocked) {
            // Internal caller: warn and no-op rather than throw. This runs from
            // processWiseTransfer's error path, which must not retry-loop.
            console.warn(`[WITHDRAWAL] markFailed ${args.withdrawalId}: ${blocked}`);
            return;
        }

        // Restore balance
        const creator = await ctx.db.get(withdrawal.creatorId);
        if (creator) {
            await ctx.db.patch(withdrawal.creatorId, {
                balance: (creator.balance || 0) + withdrawal.amount,
            });
        }

        await ctx.db.patch(args.withdrawalId, {
            status: 'failed',
            wiseStatus: 'FAILED',
            failureReason: args.reason,
            errorMessage: args.reason,
        });

        // Notify creator
        await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
            creatorId: withdrawal.creatorId,
            type: 'system',
            title: 'Withdrawal Failed',
            body: `Your withdrawal of ₱${withdrawal.amount} could not be sent. The amount has been returned to your balance.`,
            data: { withdrawalId: args.withdrawalId, amount: withdrawal.amount, reason: args.reason },
        });
    },
});

/**
 * Internal action: create the Wise recipient → quote → transfer, then persist IDs.
 * On any failure, mark the withdrawal failed and restore the balance.
 * The funding step is intentionally NOT called — admin approves/funds manually in
 * the Wise dashboard (per WISE-PAYMENT-FLOW-MOBILE.md Stage 4).
 */
export const processWiseTransfer = internalAction({
    args: {
        withdrawalId: v.id('withdrawals'),
    },
    handler: async (ctx, args) => {
        const withdrawal: any = await ctx.runQuery(internal.withdrawals.getByIdInternal, {
            id: args.withdrawalId,
        });
        if (!withdrawal) {
            console.error(`[WISE] Withdrawal ${args.withdrawalId} not found`);
            return;
        }
        if (withdrawal.status !== 'pending') {
            console.warn(`[WISE] Withdrawal ${args.withdrawalId} already ${withdrawal.status}, skipping`);
            return;
        }

        const email: string = withdrawal.wiseEmail || withdrawal.accountDetails;
        const holderName: string = withdrawal.accountHolderName || 'Creator';
        const amount: number = withdrawal.amount;
        const reference: string = withdrawal.reference || `PAYOUT-${args.withdrawalId}`;

        try {
            const { createEmailRecipient, createQuote, createTransfer } = await import('./lib/wise');

            const recipient = await createEmailRecipient({ accountHolderName: holderName, email });
            const quote = await createQuote({ amountPHP: amount });
            const customerTransactionId = crypto.randomUUID();
            const transfer = await createTransfer({
                recipientId: recipient.id,
                quoteId: quote.id,
                customerTransactionId,
                reference,
            });

            await ctx.runMutation(internal.withdrawals.setWiseTransferIds, {
                withdrawalId: args.withdrawalId,
                wiseTransferId: transfer.id,
                wiseRecipientId: recipient.id,
            });

            // Audit log: transfer created (awaiting manual funding in Wise dashboard)
            await ctx.runMutation(internal.auditLogs.log, {
                adminId: 'system:wise',
                action: 'payout_sent',
                targetType: 'withdrawal',
                targetId: args.withdrawalId,
                metadata: {
                    amount,
                    method: 'wise_email',
                    reference,
                    wiseTransferId: transfer.id,
                    wiseRecipientId: recipient.id,
                    stage: 'transfer_created_awaiting_funding',
                },
            });

            console.log(`[WISE] Transfer ${transfer.id} created for withdrawal ${args.withdrawalId}`);
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'Unknown Wise API error';
            console.error(`[WISE] Failed to create transfer for withdrawal ${args.withdrawalId}:`, reason);
            await ctx.runMutation(internal.withdrawals.markFailed, {
                withdrawalId: args.withdrawalId,
                reason,
            });
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
        await assertAdmin(ctx, args.adminId);

        const withdrawal = await ctx.db.get(args.id);
        if (!withdrawal) throw new Error('Withdrawal not found');

        const blocked = settlementBlockReason(withdrawal.status, args.status);
        if (blocked) throw new Error(blocked);

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

/**
 * Admin override — public mutation name mobile expects. Behaviour mirrors
 * adminRetry() but the arg shape matches docs/00-Overview-Mobile.md §withdrawals
 * (id, status, transactionRef?, adminId) so the mobile admin UI keeps working.
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
        adminId: v.string(),
        failureReason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx, args.adminId);

        const withdrawal = await ctx.db.get(args.id);
        if (!withdrawal) throw new Error('Withdrawal not found');

        const blocked = settlementBlockReason(withdrawal.status, args.status);
        if (blocked) throw new Error(blocked);

        const updates: Record<string, unknown> = { status: args.status };
        if (args.transactionRef !== undefined) updates.transactionRef = args.transactionRef;
        if (args.failureReason !== undefined) updates.failureReason = args.failureReason;

        if (args.status === 'completed') {
            updates.processedAt = Date.now();
            const creator = await ctx.db.get(withdrawal.creatorId);
            if (creator) {
                await ctx.db.patch(withdrawal.creatorId, {
                    totalWithdrawn: (creator.totalWithdrawn || 0) + withdrawal.amount,
                });
            }
            await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
                creatorId: withdrawal.creatorId,
                type: 'payout_sent',
                title: 'Withdrawal Completed',
                body: `Your withdrawal of ₱${withdrawal.amount} has been sent!`,
                data: { withdrawalId: args.id, amount: withdrawal.amount },
            });
        } else if (args.status === 'failed') {
            const creator = await ctx.db.get(withdrawal.creatorId);
            if (creator) {
                await ctx.db.patch(withdrawal.creatorId, {
                    balance: (creator.balance || 0) + withdrawal.amount,
                });
            }
            await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
                creatorId: withdrawal.creatorId,
                type: 'system',
                title: 'Withdrawal Failed',
                body: `Your withdrawal of ₱${withdrawal.amount} could not be processed. Balance restored.`,
                data: { withdrawalId: args.id, amount: withdrawal.amount },
            });
        }

        await ctx.db.patch(args.id, updates);

        await ctx.scheduler.runAfter(0, internal.auditLogs.log, {
            adminId: args.adminId,
            action: 'payout_admin_override',
            targetType: 'withdrawal',
            targetId: args.id,
            metadata: {
                amount: withdrawal.amount,
                status: args.status,
                transactionRef: args.transactionRef,
                failureReason: args.failureReason,
            },
        });

        return args.id;
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
 * Alias for mobile webhook handler — mobile's http.ts looks up withdrawals by
 * `transactionRef` rather than `wiseTransferId`. Kept as a separate export so
 * the deployed mobile binary's webhook path stays intact.
 */
export const updateByTransactionRef = internalMutation({
    args: {
        transactionRef: v.string(),
        status: v.union(
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
        ),
    },
    handler: async (ctx, args) => {
        // Search by transactionRef OR wiseTransferId — platforms have used both
        // field names historically. This keeps the webhook working regardless
        // of which field the transfer ID got persisted under.
        const byRef = await ctx.db
            .query('withdrawals')
            .filter((q) => q.eq(q.field('transactionRef'), args.transactionRef))
            .collect();
        const byTransferId = byRef.length === 0
            ? await ctx.db
                  .query('withdrawals')
                  .filter((q) => q.eq(q.field('wiseTransferId'), args.transactionRef))
                  .collect()
            : [];
        const withdrawal = byRef[0] ?? byTransferId[0];
        if (!withdrawal) {
            console.error(`No withdrawal found for transactionRef: ${args.transactionRef}`);
            return;
        }

        const blocked = settlementBlockReason(withdrawal.status, args.status);
        if (blocked) {
            // Webhook path: 200-and-ignore. Wise retries on error, and a retry
            // that credited again is the exact failure this guards.
            console.warn(`[WITHDRAWAL] updateByTransactionRef ${withdrawal._id}: ${blocked}`);
            return;
        }

        const updates: Record<string, unknown> = { status: args.status };

        if (args.status === 'completed') {
            updates.processedAt = Date.now();
            const creator = await ctx.db.get(withdrawal.creatorId);
            if (creator) {
                await ctx.db.patch(withdrawal.creatorId, {
                    totalWithdrawn: (creator.totalWithdrawn || 0) + withdrawal.amount,
                });
            }
            await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
                creatorId: withdrawal.creatorId,
                type: 'payout_sent',
                title: 'Withdrawal Completed',
                body: `Your withdrawal of ₱${withdrawal.amount} has been sent!`,
                data: { withdrawalId: withdrawal._id, amount: withdrawal.amount },
            });
        }

        if (args.status === 'failed') {
            const creator = await ctx.db.get(withdrawal.creatorId);
            if (creator) {
                await ctx.db.patch(withdrawal.creatorId, {
                    balance: (creator.balance || 0) + withdrawal.amount,
                });
            }
            await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
                creatorId: withdrawal.creatorId,
                type: 'system',
                title: 'Withdrawal Failed',
                body: `Your withdrawal of ₱${withdrawal.amount} could not be processed. Balance restored.`,
                data: { withdrawalId: withdrawal._id, amount: withdrawal.amount },
            });
        }

        await ctx.db.patch(withdrawal._id, updates);
    },
});

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

        const blocked = settlementBlockReason(withdrawal.status, args.status);
        if (blocked) {
            console.warn(`[WITHDRAWAL] updateByWiseTransferId ${withdrawal._id}: ${blocked}`);
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
 * Poll Wise for ONE withdrawal, right now, on an admin's request.
 *
 * WHY THIS EXISTS: wiseDetailedState is written only by the hourly cron, and the
 * admin payouts page decides whether to show "Fund in Wise" from that field. So
 * an admin who funds a transfer and returns to the page sees an unchanged badge
 * for up to an hour and reasonably concludes the funding failed — the one
 * conclusion that leads to paying the same creator twice. This closes that
 * window: fund, refresh, see the truth.
 *
 * Admin-gated by resolving adminId to a real admin row rather than trusting the
 * string, the same way admin.markPaid does — this reaches the Wise API and can
 * move a withdrawal into a terminal state that credits totalWithdrawn.
 *
 * Deliberately does NOT email the creator. The cron owns creator comms and
 * throttles them to one a day; an admin clicking refresh three times while
 * checking their work must not send three emails.
 */
export const refreshFromWise = action({
    args: {
        withdrawalId: v.id('withdrawals'),
        adminId: v.string(),
    },
    handler: async (ctx, args): Promise<{
        refreshed: boolean
        reason?: string
        wiseDetailedState?: string
        statusChangedTo?: string
    }> => {
        const actor = await ctx.runQuery(api.creators.getByClerkId, { clerkId: args.adminId });
        if (!actor || actor.role !== 'admin') throw new Error('Forbidden: admin access required');

        const withdrawal: any = await ctx.runQuery(internal.withdrawals.getByIdInternal, {
            id: args.withdrawalId,
        });
        if (!withdrawal) throw new Error('Withdrawal not found');
        if (!withdrawal.wiseTransferId) {
            // Still 'pending': processWiseTransfer has not created the transfer
            // yet, so there is nothing at Wise to ask about.
            return { refreshed: false, reason: 'No Wise transfer has been created for this withdrawal yet.' };
        }

        const { getTransferStatus } = await import('./lib/wise');
        const status = await getTransferStatus(withdrawal.wiseTransferId);

        await ctx.runMutation(internal.withdrawals.recordStatusCheck, {
            withdrawalId: args.withdrawalId,
            wiseDetailedState: status.detailedStatus,
            sendEmail: false,
        });

        // Apply the terminal transition the webhook would have applied, but ONLY
        // from 'processing'. updateByWiseTransferId adds to totalWithdrawn and
        // notifies on completion, and restores balance on failure — none of it
        // guarded against running twice, so re-refreshing an already-completed
        // row would credit the creator's withdrawn total again.
        let statusChangedTo: string | undefined;
        if (status.isFinal && withdrawal.status === 'processing') {
            statusChangedTo = status.isCompleted ? 'completed' : 'failed';
            await ctx.runMutation(internal.withdrawals.updateByWiseTransferId, {
                wiseTransferId: withdrawal.wiseTransferId,
                status: statusChangedTo as 'completed' | 'failed',
            });
        }

        return { refreshed: true, wiseDetailedState: status.detailedStatus, statusChangedTo };
    },
});

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
                        creatorName: greetingName(creator),
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
 * Internal action: tell the creator we received their withdrawal, before Wise
 * emails them from a company name they will not recognise.
 *
 * Every failure is logged and swallowed. The balance is already deducted and
 * the Wise transfer already scheduled by the time this runs, so a bounced
 * notification must never be able to fail the withdrawal itself.
 */
export const sendRequestedEmailAction = internalAction({
    args: {
        creatorEmail: v.string(),
        creatorName: v.string(),
        amount: v.number(),
        wiseEmail: v.string(),
        reference: v.optional(v.string()),
        requestedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || 'https://www.tendso.com'
        const internalSecret = process.env.INTERNAL_API_SECRET || ''

        try {
            const response = await fetch(`${baseUrl}/api/internal/send-withdrawal-requested-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Secret': internalSecret,
                },
                body: JSON.stringify({
                    ...args,
                    // Our registered Wise payer name, e.g. "VONAS, OPC". Left
                    // undefined when unset rather than guessed: naming the wrong
                    // company teaches creators to distrust the real email.
                    wiseSenderName: process.env.WISE_SENDER_NAME || undefined,
                }),
            })
            if (!response.ok) {
                const text = await response.text()
                console.error(`[WITHDRAWAL-REQUESTED] Email send failed: ${response.status} ${text}`)
            }
        } catch (error) {
            console.error('[WITHDRAWAL-REQUESTED] Error sending email:', error)
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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || 'https://tendso.vercel.app'
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
