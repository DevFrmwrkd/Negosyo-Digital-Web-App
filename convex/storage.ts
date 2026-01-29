import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

/**
 * Generate an upload URL for file storage
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

/**
 * Get file URL from storage ID
 */
export const getUrl = query({
    args: { storageId: v.id('_storage') },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

/**
 * Get multiple file URLs
 */
export const getUrls = query({
    args: { storageIds: v.array(v.id('_storage')) },
    handler: async (ctx, args) => {
        const urls = await Promise.all(
            args.storageIds.map(async (id) => ({
                id,
                url: await ctx.storage.getUrl(id),
            }))
        );
        return urls;
    },
});

/**
 * Delete a file from storage
 */
export const deleteFile = mutation({
    args: { storageId: v.id('_storage') },
    handler: async (ctx, args) => {
        await ctx.storage.delete(args.storageId);
    },
});
