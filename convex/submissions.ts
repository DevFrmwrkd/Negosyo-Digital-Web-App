import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';

// ==================== QUERIES ====================

/**
 * Get submission by ID
 */
export const getById = query({
    args: { id: v.id('submissions') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/**
 * Get submission by ID with creator info
 */
export const getByIdWithCreator = query({
    args: { id: v.id('submissions') },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.id);
        if (!submission) return null;

        const creator = await ctx.db.get(submission.creatorId);

        // Resolve reviewedBy Clerk ID to a name
        let reviewedByName: string | null = null;
        if (submission.reviewedBy) {
            const reviewer = await ctx.db
                .query('creators')
                .withIndex('by_clerkId', (q) => q.eq('clerkId', submission.reviewedBy!))
                .unique();
            reviewedByName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : null;
        }

        return {
            ...submission,
            reviewedByName,
            creator: creator
                ? {
                    firstName: creator.firstName,
                    lastName: creator.lastName,
                    email: creator.email,
                    phone: creator.phone,
                }
                : null,
        };
    },
});

/**
 * Get all submissions by creator
 */
export const getByCreatorId = query({
    args: { creatorId: v.id('creators') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('submissions')
            .withIndex('by_creatorId', (q) => q.eq('creatorId', args.creatorId))
            .order('desc')
            .collect();
    },
});

/**
 * Get draft submission by creator (for continuing an unfinished submission)
 */
export const getDraftByCreatorId = query({
    args: { creatorId: v.id('creators') },
    handler: async (ctx, args) => {
        const drafts = await ctx.db
            .query('submissions')
            .withIndex('by_creatorId', (q) => q.eq('creatorId', args.creatorId))
            .filter((q) => q.eq(q.field('status'), 'draft'))
            .order('desc')
            .take(1);
        return drafts[0] || null;
    },
});

/**
 * Get all submissions (admin only)
 */
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query('submissions').order('desc').collect();
    },
});

/**
 * Get all submissions with creator info (admin only)
 */
export const getAllWithCreator = query({
    args: {},
    handler: async (ctx) => {
        const submissions = await ctx.db.query('submissions').order('desc').collect();

        // Cache reviewer lookups to avoid repeated queries
        const reviewerCache = new Map<string, string | null>();

        const submissionsWithCreator = await Promise.all(
            submissions.map(async (submission) => {
                const creator = await ctx.db.get(submission.creatorId);

                // Resolve reviewedBy Clerk ID to a name
                let reviewedByName: string | null = null;
                if (submission.reviewedBy) {
                    if (!reviewerCache.has(submission.reviewedBy)) {
                        const reviewer = await ctx.db
                            .query('creators')
                            .withIndex('by_clerkId', (q) => q.eq('clerkId', submission.reviewedBy!))
                            .unique();
                        reviewerCache.set(
                            submission.reviewedBy,
                            reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : null
                        );
                    }
                    reviewedByName = reviewerCache.get(submission.reviewedBy) ?? null;
                }

                return {
                    ...submission,
                    reviewedByName,
                    creator: creator
                        ? {
                            firstName: creator.firstName,
                            lastName: creator.lastName,
                            email: creator.email,
                            phone: creator.phone,
                        }
                        : null,
                };
            })
        );

        return submissionsWithCreator;
    },
});

/**
 * Get submissions by status
 */
export const getByStatus = query({
    args: {
        status: v.union(
            v.literal('draft'),
            v.literal('submitted'),
            v.literal('in_review'),
            v.literal('approved'),
            v.literal('rejected'),
            v.literal('deployed'),
            v.literal('pending_payment'),
            v.literal('paid'),
            v.literal('completed'),
            v.literal('website_generated')
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('submissions')
            .withIndex('by_status', (q) => q.eq('status', args.status))
            .order('desc')
            .collect();
    },
});

// ==================== MUTATIONS ====================

/**
 * Create a new submission
 */
export const create = mutation({
    args: {
        creatorId: v.id('creators'),
        businessName: v.string(),
        businessType: v.string(),
        ownerName: v.string(),
        ownerPhone: v.string(),
        ownerEmail: v.optional(v.string()),
        address: v.string(),
        city: v.string(),
        province: v.optional(v.string()),
        barangay: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })),
        hasProducts: v.optional(v.boolean()),
        photos: v.optional(v.array(v.string())),
        videoStorageId: v.optional(v.id('_storage')),
        audioStorageId: v.optional(v.id('_storage')),
        transcript: v.optional(v.string()),
        amount: v.optional(v.number()),
        creatorPayout: v.optional(v.number()),
        status: v.optional(v.union(
            v.literal('draft'),
            v.literal('submitted'),
            v.literal('in_review'),
            v.literal('approved'),
            v.literal('rejected'),
            v.literal('deployed'),
            v.literal('pending_payment'),
            v.literal('paid'),
            v.literal('completed'),
            v.literal('website_generated')
        )),
    },
    handler: async (ctx, args) => {
        const submissionId = await ctx.db.insert('submissions', {
            creatorId: args.creatorId,
            businessName: args.businessName,
            businessType: args.businessType,
            ownerName: args.ownerName,
            ownerPhone: args.ownerPhone,
            ownerEmail: args.ownerEmail,
            address: args.address,
            city: args.city,
            province: args.province,
            barangay: args.barangay,
            postalCode: args.postalCode,
            coordinates: args.coordinates,
            hasProducts: args.hasProducts,
            photos: args.photos ?? [],
            videoStorageId: args.videoStorageId,
            audioStorageId: args.audioStorageId,
            transcript: args.transcript,
            status: args.status ?? 'draft',
            amount: args.amount ?? 1000,
            creatorPayout: args.creatorPayout ?? 500,
        });

        // Increment creator's submissionCount and lastActiveAt
        const creator = await ctx.db.get(args.creatorId);
        if (creator) {
            await ctx.db.patch(args.creatorId, {
                submissionCount: (creator.submissionCount || 0) + 1,
                lastActiveAt: Date.now(),
            });
        }

        return submissionId;
    },
});

/**
 * Update submission
 */
export const update = mutation({
    args: {
        id: v.id('submissions'),
        businessName: v.optional(v.string()),
        businessType: v.optional(v.string()),
        ownerName: v.optional(v.string()),
        ownerPhone: v.optional(v.string()),
        ownerEmail: v.optional(v.string()),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        province: v.optional(v.string()),
        barangay: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })),
        businessDescription: v.optional(v.string()),
        hasProducts: v.optional(v.boolean()),
        photos: v.optional(v.array(v.string())),
        videoStorageId: v.optional(v.id('_storage')),
        audioStorageId: v.optional(v.id('_storage')),
        // R2 URLs (preferred for new uploads)
        videoUrl: v.optional(v.string()),
        audioUrl: v.optional(v.string()),
        transcript: v.optional(v.string()),
        transcriptionStatus: v.optional(v.string()), // processing, complete, failed
        transcriptionError: v.optional(v.string()),
        transcriptionUpdatedAt: v.optional(v.number()),
        websiteUrl: v.optional(v.string()),
        websiteCode: v.optional(v.string()),
        amount: v.optional(v.number()),
        creatorPayout: v.optional(v.number()),
        platformFee: v.optional(v.number()),
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
 * Update submission status
 * Workflow: submitted -> in_review -> approved -> deployed -> pending_payment -> paid
 */
export const updateStatus = mutation({
    args: {
        id: v.id('submissions'),
        status: v.union(
            v.literal('draft'),
            v.literal('submitted'),
            v.literal('in_review'),
            v.literal('approved'),
            v.literal('rejected'),
            v.literal('deployed'),
            v.literal('pending_payment'),
            v.literal('paid'),
            v.literal('completed'),
            v.literal('website_generated'),
            v.literal('unpublished')
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: args.status });
    },
});

/**
 * Submit a draft submission.
 * Sets status to "submitted", creates a lead, increments analytics,
 * and triggers the Airtable AI content pipeline.
 */
export const submit = mutation({
    args: { id: v.id('submissions') },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.id);
        if (!submission) throw new Error('Submission not found');

        // Validate: at least 3 photos
        if (!submission.photos || submission.photos.length < 3) {
            throw new Error('At least 3 photos are required');
        }

        // 1. Update submission status
        await ctx.db.patch(args.id, {
            status: 'submitted',
            amount: 1000,
            airtableSyncStatus: 'pending_push',
        });

        // 2. Create a lead record from business owner info
        await ctx.db.insert('leads', {
            submissionId: args.id,
            creatorId: submission.creatorId,
            source: 'direct',
            name: submission.ownerName,
            phone: submission.ownerPhone,
            email: submission.ownerEmail,
            status: 'new',
            createdAt: Date.now(),
        });

        // 3. Increment analytics (daily + monthly)
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: today,
            periodType: 'daily',
            field: 'submissionsCount',
            delta: 1,
        });
        await ctx.scheduler.runAfter(0, internal.analytics.incrementStat, {
            creatorId: submission.creatorId,
            period: month,
            periodType: 'monthly',
            field: 'submissionsCount',
            delta: 1,
        });

        // 4. Trigger Airtable AI pipeline
        await ctx.scheduler.runAfter(0, internal.airtable.pushToAirtableInternal, {
            submissionId: args.id,
        });
    },
});

/**
 * Save generated website
 */
export const saveWebsite = mutation({
    args: {
        id: v.id('submissions'),
        websiteUrl: v.string(),
        websiteCode: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            websiteUrl: args.websiteUrl,
            websiteCode: args.websiteCode,
            status: 'website_generated',
        });
    },
});

/**
 * Mark submission as paid
 */
export const markPaid = mutation({
    args: {
        id: v.id('submissions'),
        paymentReference: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            status: 'paid',
            paymentReference: args.paymentReference,
            paidAt: Date.now(),
        });
    },
});

/**
 * Request payout
 */
export const requestPayout = mutation({
    args: { id: v.id('submissions') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            payoutRequestedAt: Date.now(),
        });
    },
});

/**
 * Mark payout as complete
 */
export const markPayoutComplete = mutation({
    args: { id: v.id('submissions') },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.id);
        if (!submission) throw new Error('Submission not found');

        // Update submission
        await ctx.db.patch(args.id, {
            creatorPaidAt: Date.now(),
            status: 'completed',
        });

        // Update creator balance
        const creator = await ctx.db.get(submission.creatorId);
        if (creator) {
            await ctx.db.patch(submission.creatorId, {
                balance: (creator.balance || 0) - (submission.creatorPayout ?? 0),
                totalEarnings: (creator.totalEarnings || 0) + (submission.creatorPayout ?? 0),
            });
        }
    },
});

/**
 * Delete submission (draft only)
 */
export const remove = mutation({
    args: { id: v.id('submissions') },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.id);
        if (!submission) throw new Error('Submission not found');

        if (submission.status !== 'draft') {
            throw new Error('Can only delete draft submissions');
        }

        await ctx.db.delete(args.id);
    },
});
