import { v } from 'convex/values';
import { query, action } from './_generated/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Get the R2 client instance
 */
function getR2Client() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error('R2 credentials not configured');
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

/**
 * Get bucket name from environment
 */
function getBucketName() {
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
        throw new Error('R2_BUCKET_NAME not configured');
    }
    return bucketName;
}

/**
 * Get public URL prefix for R2 bucket
 */
function getPublicUrlPrefix() {
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!publicUrl) {
        throw new Error('R2_PUBLIC_URL not configured');
    }
    // Ensure no trailing slash
    return publicUrl.replace(/\/$/, '');
}

/**
 * Get a streamable (public) URL for an R2 file key.
 * Returns the public URL directly without signing.
 */
export const getStreamableUrl = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const publicUrl = process.env.R2_PUBLIC_URL;
        if (!publicUrl) {
            return null;
        }
        const prefix = publicUrl.replace(/\/$/, '');
        return `${prefix}/${args.key}`;
    },
});

/**
 * Generate a presigned URL for uploading a file to R2
 */
export const generateUploadUrl = action({
    args: {
        fileName: v.string(),
        fileType: v.string(),
        submissionId: v.string(),
        mediaType: v.union(v.literal('photo'), v.literal('video'), v.literal('audio')),
    },
    handler: async (ctx, args) => {
        const client = getR2Client();
        const bucketName = getBucketName();
        const publicUrlPrefix = getPublicUrlPrefix();

        // Generate unique file key using root folders (images/, videos/, audio/)
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 10);
        const extension = args.fileName.split('.').pop() || 'bin';
        // Map mediaType to folder name: photo -> images, video -> videos, audio -> audio
        const folderMap = { photo: 'images', video: 'videos', audio: 'audio' };
        const folder = folderMap[args.mediaType];
        const key = `${folder}/${timestamp}-${randomStr}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: args.fileType,
        });

        // Generate presigned URL valid for 1 hour
        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
        const publicUrl = `${publicUrlPrefix}/${key}`;

        return {
            uploadUrl,
            publicUrl,
            key,
        };
    },
});

/**
 * Delete a file from R2
 */
export const deleteFile = action({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const client = getR2Client();
        const bucketName = getBucketName();

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: args.key,
        });

        await client.send(command);
        return { success: true };
    },
});

/**
 * Get a presigned URL for downloading a file (for private buckets)
 */
export const getDownloadUrl = action({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const client = getR2Client();
        const bucketName = getBucketName();

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: args.key,
        });

        // Generate presigned URL valid for 1 hour
        const url = await getSignedUrl(client, command, { expiresIn: 3600 });
        return { url };
    },
});
