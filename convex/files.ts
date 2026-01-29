import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';

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
 * Get a URL for a stored file
 */
export const getUrl = query({
    args: { storageId: v.id('_storage') },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

/**
 * Get a URL for a stored file by string ID
 */
export const getUrlByString = query({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        try {
            return await ctx.storage.getUrl(args.storageId as Id<"_storage">);
        } catch {
            return null;
        }
    },
});

/**
 * Get URLs for multiple storage IDs (accepts strings like "convex:xyz")
 */
export const getMultipleUrls = query({
    args: { storageIds: v.array(v.string()) },
    handler: async (ctx, args) => {
        const urls: (string | null)[] = [];

        for (const idString of args.storageIds) {
            try {
                // Handle "convex:storageId" format
                const storageId = idString.startsWith('convex:')
                    ? idString.replace('convex:', '')
                    : idString;

                // Check if it's a valid storage ID format
                if (storageId.length > 10) {
                    const url = await ctx.storage.getUrl(storageId as Id<"_storage">);
                    urls.push(url);
                } else {
                    // Treat as a regular URL
                    urls.push(idString);
                }
            } catch {
                // If it fails, return as-is (might be a regular URL)
                urls.push(idString);
            }
        }

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
