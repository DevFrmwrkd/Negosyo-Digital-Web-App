import { v } from 'convex/values'
import { internalAction, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { Id } from './_generated/dataModel'
import { extractReferenceFromText } from '../lib/payments/referenceCode'
import { parseDepositWebhook, determinePaymentStatus, calculateCreditAmount } from '../lib/payments/webhookParser'

// ==================== SHARED CREDIT LOGIC ====================
// Used by both admin.markPaid (manual) and auto-payment (webhook)

/**
 * Credit a creator for a paid submission.
 * Shared logic: updates submission, credits balance, creates earnings,
 * sends notification, logs audit, checks referral qualification.
 */
export const creditCreatorForPayment = internalMutation({
    args: {
        submissionId: v.id('submissions'),
        triggeredBy: v.string(), // 'admin:<clerkId>' or 'system:auto-payment'
        paymentRefCode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.submissionId)
        if (!submission) throw new Error('Submission not found')

        // Don't double-pay
        if (submission.status === 'completed' || submission.creatorPaidAt) {
            console.log(`[PAYMENTS] Submission ${args.submissionId} already paid, skipping`)
            return
        }

        const payoutAmount = submission.creatorPayout ?? 0

        // 1. Update submission status
        await ctx.db.patch(args.submissionId, {
            creatorPaidAt: Date.now(),
            status: 'completed' as any,
        })

        // 2. Credit creator balance
        const creator = await ctx.db.get(submission.creatorId)
        if (creator) {
            await ctx.db.patch(submission.creatorId, {
                balance: (creator.balance || 0) + payoutAmount,
                totalEarnings: ((creator as any).totalEarnings || 0) + payoutAmount,
            })
        }

        // 3. Create earning record
        await ctx.scheduler.runAfter(0, internal.earnings.create, {
            creatorId: submission.creatorId,
            submissionId: args.submissionId,
            amount: payoutAmount,
            type: 'submission_approved',
        })

        // 4. Audit log
        const isAuto = args.triggeredBy.startsWith('system:')
        await ctx.scheduler.runAfter(0, internal.auditLogs.log, {
            adminId: args.triggeredBy,
            action: isAuto ? 'payment_auto_matched' as any : 'payment_sent',
            targetType: isAuto ? 'payment' as any : 'submission',
            targetId: args.submissionId,
            metadata: {
                businessName: submission.businessName,
                amount: payoutAmount,
                creatorId: submission.creatorId,
                paymentRefCode: args.paymentRefCode,
                automated: isAuto,
            },
        })

        // 5. Notification to creator
        await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
            creatorId: submission.creatorId,
            type: 'payout_sent',
            title: 'Payment Received!',
            body: `You received ₱${payoutAmount} for "${submission.businessName}".`,
            data: { submissionId: args.submissionId, amount: payoutAmount },
        })

        // 6. Analytics
        const today = new Date().toISOString().split('T')[0]
        const month = today.substring(0, 7)
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: today,
            periodType: 'daily',
            field: 'earningsTotal',
            delta: payoutAmount,
        })
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: month,
            periodType: 'monthly',
            field: 'earningsTotal',
            delta: payoutAmount,
        })

        // 7. Referral qualification check
        const referral = await ctx.db
            .query('referrals')
            .withIndex('by_referred', (q) => q.eq('referredId', submission.creatorId))
            .filter((q) => q.eq(q.field('status'), 'pending'))
            .first()

        if (referral) {
            const paidSubmissions = await ctx.db
                .query('submissions')
                .withIndex('by_creatorId', (q) => q.eq('creatorId', submission.creatorId))
                .filter((q) => q.eq(q.field('status'), 'completed'))
                .collect()

            if (paidSubmissions.length <= 1) {
                await ctx.scheduler.runAfter(0, internal.referrals.qualifyByCreator, {
                    referredId: submission.creatorId,
                    bonusAmount: 1000,
                })
            }
        }

        console.log(`[PAYMENTS] Credited ₱${payoutAmount} to creator ${submission.creatorId} for submission ${args.submissionId} (triggered by ${args.triggeredBy})`)
    },
})

// ==================== AUTO-PAYMENT PROCESSING ====================

/**
 * Process an incoming Wise deposit.
 * Called by the /wise-deposit-webhook handler.
 */
export const processDeposit = internalAction({
    args: {
        referenceText: v.string(),
        amount: v.number(),
        currency: v.string(),
        transactionId: v.string(),
        senderName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        console.log(`[PAYMENTS] Processing deposit: ₱${args.amount} ${args.currency}, ref="${args.referenceText}", txn=${args.transactionId}`)

        // 1. Extract reference code from free-text
        const refCode = extractReferenceFromText(args.referenceText)
        if (!refCode) {
            console.warn(`[PAYMENTS] No reference code found in: "${args.referenceText}"`)
            await ctx.runMutation(internal.auditLogs.log, {
                adminId: 'system:auto-payment',
                action: 'payment_unmatched' as any,
                targetType: 'payment' as any,
                targetId: args.transactionId,
                metadata: {
                    amount: args.amount,
                    currency: args.currency,
                    referenceText: args.referenceText,
                    senderName: args.senderName,
                    reason: 'No valid reference code found in payment note',
                },
            })
            return
        }

        // 2. Look up payment reference
        const paymentRef = await ctx.runQuery(internal.paymentReferences.getByCode, { code: refCode })
        if (!paymentRef) {
            console.warn(`[PAYMENTS] Reference code ${refCode} not found in database`)
            await ctx.runMutation(internal.auditLogs.log, {
                adminId: 'system:auto-payment',
                action: 'payment_unmatched' as any,
                targetType: 'payment' as any,
                targetId: args.transactionId,
                metadata: { refCode, amount: args.amount, reason: 'Reference code not found' },
            })
            return
        }

        // 3. Check if already matched (duplicate payment)
        if (paymentRef.status === 'matched' || paymentRef.status === 'overpaid') {
            console.warn(`[PAYMENTS] Reference ${refCode} already matched (duplicate deposit)`)
            await ctx.runMutation(internal.auditLogs.log, {
                adminId: 'system:auto-payment',
                action: 'payment_unmatched' as any,
                targetType: 'payment' as any,
                targetId: args.transactionId,
                metadata: { refCode, amount: args.amount, reason: 'Duplicate payment — reference already matched' },
            })
            return
        }

        // 4. Determine payment status
        const paymentStatus = determinePaymentStatus(args.amount, paymentRef.expectedAmount)

        // 5. Mark the reference as matched
        await ctx.runMutation(internal.paymentReferences.markMatched, {
            code: refCode,
            receivedAmount: args.amount,
            currency: args.currency,
            wiseTransactionId: args.transactionId,
            senderName: args.senderName,
            status: paymentStatus,
        })

        console.log(`[PAYMENTS] Reference ${refCode} matched: status=${paymentStatus}, expected=₱${paymentRef.expectedAmount}, received=₱${args.amount}`)

        // 6. Auto-complete if matched or overpaid
        if (paymentStatus === 'matched' || paymentStatus === 'overpaid') {
            await ctx.runMutation(internal.payments.creditCreatorForPayment, {
                submissionId: paymentRef.submissionId,
                triggeredBy: 'system:auto-payment',
                paymentRefCode: refCode,
            })
        } else {
            // Partial payment — log for admin review
            await ctx.runMutation(internal.auditLogs.log, {
                adminId: 'system:auto-payment',
                action: 'payment_partial' as any,
                targetType: 'payment' as any,
                targetId: args.transactionId,
                metadata: {
                    refCode,
                    expectedAmount: paymentRef.expectedAmount,
                    receivedAmount: args.amount,
                    submissionId: paymentRef.submissionId,
                },
            })
        }
    },
})
