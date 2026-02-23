import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

// ==================== MUTATIONS ====================

/**
 * Add a follow-up note to a lead
 */
export const create = mutation({
    args: {
        leadId: v.id('leads'),
        creatorId: v.id('creators'),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('leadNotes', {
            leadId: args.leadId,
            creatorId: args.creatorId,
            content: args.content,
            createdAt: Date.now(),
        });
    },
});

/**
 * Delete a note
 */
export const remove = mutation({
    args: { id: v.id('leadNotes') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// ==================== QUERIES ====================

/**
 * Get all notes for a lead (newest first)
 */
export const getByLead = query({
    args: { leadId: v.id('leads') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('leadNotes')
            .withIndex('by_lead', (q) => q.eq('leadId', args.leadId))
            .order('desc')
            .collect();
    },
});
