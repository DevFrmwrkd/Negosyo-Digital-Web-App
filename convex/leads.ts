import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { internal } from './_generated/api';

// ==================== MUTATIONS ====================

/**
 * Create a new lead
 */
export const create = mutation({
    args: {
        submissionId: v.optional(v.id('submissions')),
        creatorId: v.optional(v.id('creators')),
        source: v.union(v.literal('website'), v.literal('qr_code'), v.literal('direct')),
        name: v.string(),
        phone: v.string(),
        email: v.optional(v.string()),
        message: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const leadId = await ctx.db.insert('leads', {
            submissionId: args.submissionId,
            creatorId: args.creatorId,
            source: args.source,
            name: args.name,
            phone: args.phone,
            email: args.email,
            message: args.message,
            status: 'new',
            createdAt: Date.now(),
        });

        // Analytics + notification only if linked to a creator
        if (args.creatorId) {
            const today = new Date().toISOString().split('T')[0];
            const month = today.substring(0, 7);

            await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
                creatorId: args.creatorId,
                period: today,
                periodType: 'daily',
                field: 'leadsGenerated',
                delta: 1,
            });
            await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
                creatorId: args.creatorId,
                period: month,
                periodType: 'monthly',
                field: 'leadsGenerated',
                delta: 1,
            });

            // Send notification to creator
            const submission = args.submissionId ? await ctx.db.get(args.submissionId) : null;
            await ctx.scheduler.runAfter(0, internal.notifications.createAndSend, {
                creatorId: args.creatorId,
                type: 'new_lead',
                title: 'New Lead!',
                body: `${args.name} inquired about ${submission?.businessName ?? 'your business'}`,
                data: { submissionId: args.submissionId, leadId },
            });
        }

        return leadId;
    },
});

/**
 * Update lead status through the pipeline
 */
export const updateStatus = mutation({
    args: {
        id: v.id('leads'),
        status: v.union(
            v.literal('new'),
            v.literal('contacted'),
            v.literal('qualified'),
            v.literal('converted'),
            v.literal('lost')
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: args.status });
    },
});

/**
 * Update a lead's details (name, phone, email, message, status)
 */
export const update = mutation({
    args: {
        id: v.id('leads'),
        name: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        message: v.optional(v.string()),
        status: v.optional(v.union(
            v.literal('new'),
            v.literal('contacted'),
            v.literal('qualified'),
            v.literal('converted'),
            v.literal('lost')
        )),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args
        // Remove undefined fields so we don't overwrite with undefined
        const patch: Record<string, any> = {}
        if (updates.name !== undefined) patch.name = updates.name
        if (updates.phone !== undefined) patch.phone = updates.phone
        if (updates.email !== undefined) patch.email = updates.email
        if (updates.message !== undefined) patch.message = updates.message
        if (updates.status !== undefined) patch.status = updates.status
        if (Object.keys(patch).length > 0) {
            await ctx.db.patch(id, patch)
        }
    },
})

/**
 * Delete a lead and its notes
 */
export const remove = mutation({
    args: { id: v.id('leads') },
    handler: async (ctx, args) => {
        // Delete associated notes
        const notes = await ctx.db
            .query('leadNotes')
            .withIndex('by_lead', (q) => q.eq('leadId', args.id))
            .collect();

        for (const note of notes) {
            await ctx.db.delete(note._id);
        }

        await ctx.db.delete(args.id);
    },
});

// ==================== QUERIES ====================

/**
 * Get all leads for a business website
 */
export const getBySubmission = query({
    args: { submissionId: v.id('submissions') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('leads')
            .withIndex('by_submission', (q) => q.eq('submissionId', args.submissionId))
            .order('desc')
            .collect();
    },
});

/**
 * Get all leads in the system (admin)
 */
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const leads = await ctx.db.query('leads').order('desc').take(500)
        const enriched = await Promise.all(
            leads.map(async (lead) => {
                const submission = lead.submissionId ? await ctx.db.get(lead.submissionId) : null
                const creator = lead.creatorId ? await ctx.db.get(lead.creatorId) : null
                return {
                    ...lead,
                    businessName: submission?.businessName || 'Unlinked',
                    creatorName: creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() : 'N/A',
                }
            })
        )
        return enriched
    },
})

/**
 * Get all leads across all of a creator's businesses
 */
export const getByCreator = query({
    args: { creatorId: v.id('creators') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('leads')
            .withIndex('by_creator', (q) => q.eq('creatorId', args.creatorId))
            .order('desc')
            .collect();
    },
});

/**
 * Get leads by pipeline status
 */
export const getByStatus = query({
    args: {
        status: v.union(
            v.literal('new'),
            v.literal('contacted'),
            v.literal('qualified'),
            v.literal('converted'),
            v.literal('lost')
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('leads')
            .withIndex('by_status', (q) => q.eq('status', args.status))
            .order('desc')
            .collect();
    },
});

/**
 * Get lead count breakdown by status for a submission
 */
export const getCountBySubmission = query({
    args: { submissionId: v.id('submissions') },
    handler: async (ctx, args) => {
        const leads = await ctx.db
            .query('leads')
            .withIndex('by_submission', (q) => q.eq('submissionId', args.submissionId))
            .collect();

        return {
            total: leads.length,
            new: leads.filter((l) => l.status === 'new').length,
            contacted: leads.filter((l) => l.status === 'contacted').length,
            qualified: leads.filter((l) => l.status === 'qualified').length,
            converted: leads.filter((l) => l.status === 'converted').length,
            lost: leads.filter((l) => l.status === 'lost').length,
        };
    },
});
