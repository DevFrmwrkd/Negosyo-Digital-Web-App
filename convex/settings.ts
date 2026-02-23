import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

// ==================== QUERIES ====================

/**
 * Get a single setting by key
 */
export const get = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const setting = await ctx.db
            .query('settings')
            .withIndex('by_key', (q) => q.eq('key', args.key))
            .first();
        return setting?.value ?? null;
    },
});

/**
 * Get all settings as a key-value map
 */
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const settings = await ctx.db.query('settings').collect();
        const map: Record<string, any> = {};
        for (const s of settings) {
            map[s.key] = s.value;
        }
        return map;
    },
});

// ==================== MUTATIONS ====================

/**
 * Upsert a setting
 */
export const set = mutation({
    args: {
        key: v.string(),
        value: v.any(),
        description: v.optional(v.string()),
        adminId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('settings')
            .withIndex('by_key', (q) => q.eq('key', args.key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                description: args.description ?? existing.description,
                updatedAt: Date.now(),
                updatedBy: args.adminId,
            });
            return existing._id;
        }

        return await ctx.db.insert('settings', {
            key: args.key,
            value: args.value,
            description: args.description,
            updatedAt: Date.now(),
            updatedBy: args.adminId,
        });
    },
});

/**
 * Delete a setting
 */
export const remove = mutation({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const setting = await ctx.db
            .query('settings')
            .withIndex('by_key', (q) => q.eq('key', args.key))
            .first();
        if (setting) {
            await ctx.db.delete(setting._id);
        }
    },
});
