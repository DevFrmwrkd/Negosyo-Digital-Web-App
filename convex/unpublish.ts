import { v } from 'convex/values';
import { internalQuery, internalMutation, internalAction } from './_generated/server';
import { internal } from './_generated/api';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Internal query: find pending_payment submissions whose sentEmailAt is older than 24 hours.
 */
export const getOverdueSubmissions = internalQuery({
    handler: async (ctx) => {
        const deadline = Date.now() - TWENTY_FOUR_HOURS;

        const submissions = await ctx.db
            .query('submissions')
            .withIndex('by_status', (q) => q.eq('status', 'pending_payment'))
            .collect();

        return submissions.filter(
            (s) => s.sentEmailAt !== undefined && s.sentEmailAt < deadline
        );
    },
});

/**
 * Internal mutation: mark a submission as unpublished and clear its Cloudflare project data.
 */
export const markSubmissionUnpublished = internalMutation({
    args: { submissionId: v.id('submissions') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.submissionId, {
            status: 'unpublished',
            unpublishedAt: Date.now(),
        });

        // Clear publishedUrl and cfPagesProjectName from generatedWebsites
        const website = await ctx.db
            .query('generatedWebsites')
            .withIndex('by_submissionId', (q) => q.eq('submissionId', args.submissionId))
            .first();

        if (website) {
            await ctx.db.patch(website._id, {
                publishedUrl: undefined,
                cfPagesProjectName: undefined,
                status: 'draft',
            });
        }
    },
});

/**
 * Internal action: delete a Cloudflare Pages project to unpublish the website.
 * Returns true if deletion succeeded or project didn't exist.
 */
export const deleteCfPagesProject = internalAction({
    args: {
        submissionId: v.id('submissions'),
        projectName: v.string(),
    },
    handler: async (ctx, args) => {
        const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
        const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

        if (!cfApiToken || !cfAccountId) {
            console.error('[unpublish] Missing Cloudflare credentials');
            // Still mark as unpublished in our DB even without CF creds
            await ctx.runMutation(internal.unpublish.markSubmissionUnpublished, {
                submissionId: args.submissionId,
            });
            return;
        }

        try {
            const res = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${args.projectName}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${cfApiToken}` },
                }
            );

            // 404 = project already gone, still fine
            if (!res.ok && res.status !== 404) {
                const body = await res.json().catch(() => ({}));
                console.error('[unpublish] CF delete failed:', res.status, JSON.stringify(body));
            } else {
                console.log(`[unpublish] Deleted CF project: ${args.projectName}`);
            }
        } catch (err) {
            console.error('[unpublish] CF API error:', err);
        }

        // Update DB regardless of CF API outcome
        await ctx.runMutation(internal.unpublish.markSubmissionUnpublished, {
            submissionId: args.submissionId,
        });
    },
});

/**
 * Main entry point called by the hourly cron.
 * Finds all overdue pending_payment submissions and unpublishes their websites.
 */
export const checkAndUnpublish = internalAction({
    handler: async (ctx) => {
        const overdue = await ctx.runQuery(internal.unpublish.getOverdueSubmissions);

        if (overdue.length === 0) {
            console.log('[unpublish] No overdue submissions found.');
            return;
        }

        console.log(`[unpublish] Found ${overdue.length} overdue submission(s). Processing...`);

        for (const submission of overdue) {
            // Get the CF Pages project name from the generatedWebsites table
            const website = await ctx.runQuery(internal.unpublish.getWebsiteForSubmission, {
                submissionId: submission._id,
            });

            if (website?.cfPagesProjectName) {
                // Schedule the deletion action (non-blocking per submission)
                await ctx.runAction(internal.unpublish.deleteCfPagesProject, {
                    submissionId: submission._id,
                    projectName: website.cfPagesProjectName,
                });
            } else {
                // No CF project — just mark as unpublished in our DB
                await ctx.runMutation(internal.unpublish.markSubmissionUnpublished, {
                    submissionId: submission._id,
                });
            }

            console.log(`[unpublish] Processed submission ${submission._id} (${submission.businessName})`);
        }
    },
});

/**
 * Internal query: get generatedWebsite record for a submission (used by checkAndUnpublish action).
 */
export const getWebsiteForSubmission = internalQuery({
    args: { submissionId: v.id('submissions') },
    handler: async (ctx, args) => {
        return ctx.db
            .query('generatedWebsites')
            .withIndex('by_submissionId', (q) => q.eq('submissionId', args.submissionId))
            .first();
    },
});
