import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

// ==================== MUTATIONS ====================

/**
 * Save a new payout method
 */
export const save = mutation({
    args: {
        creatorId: v.id('creators'),
        type: v.union(v.literal('gcash'), v.literal('maya'), v.literal('bank_transfer')),
        accountName: v.string(),
        accountNumber: v.string(),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // Check if this is the first method (auto-default)
        const existing = await ctx.db
            .query('payoutMethods')
            .withIndex('by_creator', (q) => q.eq('creatorId', args.creatorId))
            .collect();

        const shouldBeDefault = existing.length === 0 || args.isDefault === true;

        // If setting as default, unset previous default
        if (shouldBeDefault) {
            for (const method of existing) {
                if (method.isDefault) {
                    await ctx.db.patch(method._id, { isDefault: false });
                }
            }
        }

        return await ctx.db.insert('payoutMethods', {
            creatorId: args.creatorId,
            type: args.type,
            accountName: args.accountName,
            accountNumber: args.accountNumber,
            isDefault: shouldBeDefault,
        });
    },
});

/**
 * Update account details
 */
export const update = mutation({
    args: {
        id: v.id('payoutMethods'),
        accountName: v.optional(v.string()),
        accountNumber: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: any = {};
        if (args.accountName !== undefined) updates.accountName = args.accountName;
        if (args.accountNumber !== undefined) updates.accountNumber = args.accountNumber;
        await ctx.db.patch(args.id, updates);
    },
});

/**
 * Set a method as the default
 */
export const setDefault = mutation({
    args: { id: v.id('payoutMethods') },
    handler: async (ctx, args) => {
        const method = await ctx.db.get(args.id);
        if (!method) throw new Error('Payout method not found');

        // Unset previous default
        const allMethods = await ctx.db
            .query('payoutMethods')
            .withIndex('by_creator', (q) => q.eq('creatorId', method.creatorId))
            .collect();

        for (const m of allMethods) {
            if (m.isDefault) {
                await ctx.db.patch(m._id, { isDefault: false });
            }
        }

        await ctx.db.patch(args.id, { isDefault: true });
    },
});

/**
 * Remove a payout method
 */
export const remove = mutation({
    args: { id: v.id('payoutMethods') },
    handler: async (ctx, args) => {
        const method = await ctx.db.get(args.id);
        if (!method) throw new Error('Payout method not found');

        await ctx.db.delete(args.id);

        // If default was deleted, set next available as default
        if (method.isDefault) {
            const remaining = await ctx.db
                .query('payoutMethods')
                .withIndex('by_creator', (q) => q.eq('creatorId', method.creatorId))
                .first();
            if (remaining) {
                await ctx.db.patch(remaining._id, { isDefault: true });
            }
        }
    },
});

// ==================== QUERIES ====================

/**
 * Get all payout methods for a creator
 */
export const getByCreator = query({
    args: { creatorId: v.id('creators') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('payoutMethods')
            .withIndex('by_creator', (q) => q.eq('creatorId', args.creatorId))
            .collect();
    },
});

/**
 * Get the default payout method for a creator
 */
export const getDefault = query({
    args: { creatorId: v.id('creators') },
    handler: async (ctx, args) => {
        const methods = await ctx.db
            .query('payoutMethods')
            .withIndex('by_creator', (q) => q.eq('creatorId', args.creatorId))
            .filter((q) => q.eq(q.field('isDefault'), true))
            .first();
        return methods;
    },
});
