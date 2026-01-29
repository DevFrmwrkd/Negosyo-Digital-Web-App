import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

// ==================== QUERIES ====================

/**
 * Get current creator by Clerk ID
 */
export const getByClerkId = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('creators')
            .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
            .unique();
    },
});

/**
 * Get creator by ID
 */
export const getById = query({
    args: { id: v.id('creators') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/**
 * Get creator by email
 */
export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('creators')
            .withIndex('by_email', (q) => q.eq('email', args.email))
            .unique();
    },
});

/**
 * Get creator by referral code
 */
export const getByReferralCode = query({
    args: { referralCode: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('creators')
            .withIndex('by_referralCode', (q) => q.eq('referralCode', args.referralCode))
            .unique();
    },
});

/**
 * Get all creators (admin only)
 */
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query('creators').collect();
    },
});

/**
 * Get all creators with submission counts
 */
export const getAllWithStats = query({
    args: {},
    handler: async (ctx) => {
        const creators = await ctx.db.query('creators').collect();

        const creatorsWithStats = await Promise.all(
            creators.map(async (creator) => {
                const submissions = await ctx.db
                    .query('submissions')
                    .withIndex('by_creatorId', (q) => q.eq('creatorId', creator._id))
                    .collect();

                return {
                    ...creator,
                    submissionCount: submissions.length,
                };
            })
        );

        return creatorsWithStats;
    },
});

// ==================== MUTATIONS ====================

/**
 * Create a new creator (called after Clerk signup)
 */
export const create = mutation({
    args: {
        clerkId: v.string(),
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        referralCode: v.string(),
        referredBy: v.optional(v.id('creators')),
    },
    handler: async (ctx, args) => {
        // Check if creator already exists
        const existing = await ctx.db
            .query('creators')
            .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
            .unique();

        if (existing) {
            return existing._id;
        }

        const creatorId = await ctx.db.insert('creators', {
            clerkId: args.clerkId,
            firstName: args.firstName,
            middleName: args.middleName,
            lastName: args.lastName,
            email: args.email,
            phone: args.phone,
            referralCode: args.referralCode,
            referredBy: args.referredBy,
            balance: 0,
            totalEarnings: 0,
            status: 'active',
            role: 'creator',
        });

        return creatorId;
    },
});

/**
 * Update creator profile
 */
export const update = mutation({
    args: {
        id: v.id('creators'),
        firstName: v.optional(v.string()),
        middleName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        payoutMethod: v.optional(v.string()),
        payoutDetails: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;

        // Filter out undefined values
        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([, value]) => value !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);
    },
});

/**
 * Update creator status (admin only)
 */
export const updateStatus = mutation({
    args: {
        id: v.id('creators'),
        status: v.union(
            v.literal('pending'),
            v.literal('active'),
            v.literal('suspended')
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: args.status });
    },
});

/**
 * Update creator role (admin only)
 */
export const updateRole = mutation({
    args: {
        id: v.id('creators'),
        role: v.union(v.literal('creator'), v.literal('admin')),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { role: args.role });
    },
});

/**
 * Update creator balance
 */
export const updateBalance = mutation({
    args: {
        id: v.id('creators'),
        balance: v.number(),
        totalEarnings: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const updates: { balance: number; totalEarnings?: number } = {
            balance: args.balance,
        };
        if (args.totalEarnings !== undefined) {
            updates.totalEarnings = args.totalEarnings;
        }
        await ctx.db.patch(args.id, updates);
    },
});
