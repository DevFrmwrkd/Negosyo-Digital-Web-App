import { v } from 'convex/values'
import { mutation, query, internalMutation, internalQuery } from './_generated/server'
import { Id } from './_generated/dataModel'

// Safe alphabet matching lib/payments/referenceCode.ts
const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generateCode(): string {
    const chars: string[] = []
    for (let i = 0; i < 8; i++) {
        chars.push(SAFE_ALPHABET[Math.floor(Math.random() * SAFE_ALPHABET.length)])
    }
    return `ND-${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

/**
 * Generate a payment reference code for a submission.
 * Called when sending the payment email to the business owner.
 */
export const generate = internalMutation({
    args: {
        submissionId: v.id('submissions'),
        expectedAmount: v.number(),
    },
    handler: async (ctx, args) => {
        // Check if a reference already exists for this submission
        const existing = await ctx.db
            .query('paymentReferences')
            .withIndex('by_submissionId', (q) => q.eq('submissionId', args.submissionId))
            .first()

        if (existing && existing.status === 'pending') {
            return existing.code
        }

        // Generate unique code (retry on collision)
        let code = ''
        for (let attempt = 0; attempt < 5; attempt++) {
            code = generateCode()
            const collision = await ctx.db
                .query('paymentReferences')
                .withIndex('by_code', (q) => q.eq('code', code))
                .first()
            if (!collision) break
        }

        await ctx.db.insert('paymentReferences', {
            submissionId: args.submissionId,
            code,
            expectedAmount: args.expectedAmount,
            status: 'pending',
            createdAt: Date.now(),
        })

        // Also store reference on the submission for quick lookup
        await ctx.db.patch(args.submissionId, { paymentReference: code } as any)

        return code
    },
})

/**
 * Look up a payment reference by code.
 */
export const getByCode = internalQuery({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const normalized = args.code.trim().toUpperCase()
        return await ctx.db
            .query('paymentReferences')
            .withIndex('by_code', (q) => q.eq('code', normalized))
            .first()
    },
})

/**
 * Mark a payment reference as matched (or partial/overpaid).
 */
export const markMatched = internalMutation({
    args: {
        code: v.string(),
        receivedAmount: v.number(),
        currency: v.string(),
        wiseTransactionId: v.string(),
        senderName: v.optional(v.string()),
        status: v.union(v.literal('matched'), v.literal('partial'), v.literal('overpaid')),
    },
    handler: async (ctx, args) => {
        const ref = await ctx.db
            .query('paymentReferences')
            .withIndex('by_code', (q) => q.eq('code', args.code.trim().toUpperCase()))
            .first()

        if (!ref) throw new Error(`Payment reference not found: ${args.code}`)

        await ctx.db.patch(ref._id, {
            receivedAmount: args.receivedAmount,
            currency: args.currency,
            wiseTransactionId: args.wiseTransactionId,
            senderName: args.senderName,
            status: args.status,
            matchedAt: Date.now(),
        })

        return { submissionId: ref.submissionId, paymentRefId: ref._id }
    },
})

/**
 * Get payment reference for a submission (admin UI).
 */
export const getBySubmission = query({
    args: { submissionId: v.id('submissions') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('paymentReferences')
            .withIndex('by_submissionId', (q) => q.eq('submissionId', args.submissionId))
            .first()
    },
})
