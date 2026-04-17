# Schema Updates for Mobile Platform

This document details the recent schema updates and function additions made on the web platform (Admin/Creator Dashboard). 

**Attention Mobile AI Agent**: When running `npx convex deploy` on the mobile repository, you may encounter schema validation errors like:
> `Object contains extra field domainCostPHP that is not in the validator.`

This happens because the production Convex database now expects or contains new fields added from the web branch. You must update your local `convex/schema.ts` to include these missing fields (most importantly as `v.optional(...)`) so that your deploy succeeds without rejecting the existing production data.

## 1. `creators` Table Changes
Several fields were added to track creator status, payouts, and referrals:
- `email`: `v.string()` — Made required.
- `firstName`, `lastName`, `balance`, `referralCode`: Changed to `v.optional(...)`.
- `role`, `status`: Changed from `v.union(...)` to `v.optional(v.string())` for cross-deploy safety.
- **New Fields Added**:
  - `profileImage`: `v.optional(v.string())`
  - `wiseEmail`: `v.optional(v.string())`
  - `certifiedAt`: `v.optional(v.number())`
  - `isDeleted`: `v.optional(v.boolean())`
  - `deletedAt`: `v.optional(v.number())`
  - `referredByName`: `v.optional(v.string())`
  - `payoutMethod`: `v.optional(v.string())`
  - `payoutDetails`: `v.optional(v.string())`
  - `totalWithdrawn`, `submissionCount`, `lastActiveAt`, `referredByCode`: `v.optional(...)`
- **Indexes**: 
  - Renamed index `by_clerkId` to `by_clerk_id` to match the mobile schema.

## 2. `submissions` Table Changes
The `submissions` table received extensive changes, largely to support custom domain workflow, Airtable syncing, and transcription metadata.
- `photos`, `videoStorageId`, `audioStorageId`: Changed to `v.optional(...)` strings instead of unions.
- `amount`, `creatorPayout`: Changed to `v.optional(v.number())`.
- `status`: Changed from a strict union to `v.string()` for cross-deploy safety.
- **New General Fields**:
  - `transcriptionError`: `v.optional(v.string())`
  - `transcriptionUpdatedAt`: `v.optional(v.number())`
  - `province`, `barangay`, `postalCode`: `v.optional(v.string())`
  - `coordinates`: `v.optional(v.object({ lat: v.number(), lng: v.number() }))`
  - `businessDescription`: `v.optional(v.string())`
  - `hasProducts`: `v.optional(v.boolean())`
  - `aiGeneratedContent`: `v.optional(v.any())`
- **Admin & Review Tracking Fields**:
  - `reviewedBy`: `v.optional(v.string())`
  - `reviewedAt`: `v.optional(v.number())`
  - `rejectionReason`: `v.optional(v.string())`
  - `platformFee`: `v.optional(v.number())`
  - `sentEmailAt`: `v.optional(v.number())`
  - `unpublishedAt`: `v.optional(v.number())`
- **Airtable Sync Fields**:
  - `airtableRecordId`: `v.optional(v.string())`
  - `airtableSyncStatus`: `v.optional(v.string())`
- **CUSTOM DOMAIN FIELDS (Crucial for Deploy Error)**:
  - `submissionType`: `v.optional(v.union(v.literal('standard'), v.literal('with_custom_domain')))`
  - `requestedDomain`: `v.optional(v.string())`
  - `domainStatus`: `v.optional(v.union(v.literal('not_requested'), v.literal('pending_payment'), v.literal('registering'), v.literal('configuring_dns'), v.literal('provisioning_ssl'), v.literal('live'), v.literal('failed')))`
  - `domainFailureReason`: `v.optional(v.string())`
  - `registrarOrderId`: `v.optional(v.string())`
  - `domainExpiresAt`: `v.optional(v.number())`
  - `domainCostPHP`: `v.optional(v.number())` *(This caused the deploy error!)*
  - `cloudflareZoneId`: `v.optional(v.string())`
- **Indexes**:
  - Added indexes: `by_payoutRequested`, `by_airtable_sync`, `by_creator_status`, `by_city`, `by_domainStatus`. Rename `by_creatorId` to `by_creator_id`.

## 3. `generatedWebsites` Table Changes
- Status became `v.optional(v.union(v.literal('draft'), v.literal('published')))`.
- Added Cloudflare fields: `cfPagesProjectName`, `subdomain`, `customDomain` (all optional strings).
- Merged content fields from mobile branch direct into `generatedWebsites`.

## 4. `websiteContent` Table Changes
- Added customization schema styles like `galleryStyle`, `contactStyle` and legacy fields (`heroSubHeadline`, `airtableSyncedAt`).

## 5. newly defined tables
- `auditLogs`
- `earnings`
- `withdrawals`
- `payoutMethods`
- `leads` and `leadNotes`
- `notifications`
- `pushTokens`
- `referrals`
- `analytics` and `websiteAnalytics`
- `settings`
- `paymentTokens`
- `rateLimits`

## New Functions (Overview)
- **`submissions.ts`**:
  - `updateStatus`: Now accepts `unpublished`.
  - `setDomainTier`: New mutation for users/admins to choose standard vs. custom domain tier, assigning costs.
  - `submit`: Refactored to fire Airtable syncing and analytical updates automatically upon submission.
  - `getByIdInternal`: Internal helper to skip auth/public blocks.
- **`analytics.ts`**:
  - `getAllAnalytics`: Ensure this public function is not deleted, as the admin dashboard relies on it.
- **`admin.ts`**:
  - `checkBackfillNeeded`: Ensure this public function is preserved for admin features.
- **`domains.ts`**:
  - `getTotalHostingerDomainCostsPHP`: Ensure this public function is preserved.
  - Multiple function updates to support the new submission review process (`approveSubmission`), tracking domain pricing (`domainCostPHP`), and integration with Cloudflare/hostinger via the new `domainStatus` lifecycle.

### Important Environment Variables
The web platform relies on certain environment variables to function correctly. When deploying or updating backend logic (like in `submissions.ts`), ensure the `ADMIN_CLERK_IDS` environment variable is checked or gracefully handled to prevent crashes like `Uncaught Error: No admin users configured. Set ADMIN_CLERK_IDS environment variable.`.

### Action Items for Mobile Agent
Copy the exact `domainCostPHP: v.optional(v.number()),` and related custom domain fields into the `submissions` validator in the mobile `convex/schema.ts` file to allow `npx convex deploy` to pass. Treat all newly introduced structure fields from the web as `v.optional(...)` if mobile doesn't populate them directly.

**CRITICAL**: Do not remove the following files or their exported public functions when syncing backend code from mobile to production, as they will break the Admin Web Platform. Here is the exact code for the functions that must be included or restored:

1. **`convex/analytics.ts`**
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAllAnalytics = query({
    args: {
        periodType: v.optional(v.union(v.literal('daily'), v.literal('monthly'))),
    },
    handler: async (ctx, args) => {
        if (args.periodType) {
            return await ctx.db
                .query('analytics')
                .withIndex('by_period', (q) => q.eq('periodType', args.periodType!))
                .collect();
        }
        return await ctx.db.query('analytics').collect();
    },
});
```

2. **`convex/admin.ts`**
```typescript
import { query } from "./_generated/server";

export const checkBackfillNeeded = query({
    args: {},
    handler: async (ctx) => {
        try {
            const targetStatuses = ['deployed', 'pending_payment', 'paid', 'completed'] as const;

            for (const status of targetStatuses) {
                let submission = await ctx.db
                    .query('submissions')
                    .withIndex('by_status', (q) => q.eq('status', status))
                    .first();

                if (submission) {
                    const website = await ctx.db
                        .query('generatedWebsites')
                        .withIndex('by_submissionId', (q) => q.eq('submissionId', submission._id))
                        .first();

                    if (!submission.websiteUrl && website?.publishedUrl) {
                        return true;
                    }

                    if (website && !website.publishedUrl && submission.websiteUrl) {
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            console.error('Error in checkBackfillNeeded:', error);
            return false;
        }
    },
});
```

3. **`convex/domains.ts`**
```typescript
import { query } from "./_generated/server";

export const getTotalHostingerDomainCostsPHP = query({
    args: {},
    handler: async (ctx) => {
        const submissions = await ctx.db
            .query('submissions')
            .withIndex('by_domainStatus')
            .collect();
            
        let total = 0;
        for (const s of submissions) {
            const cost = (s as any).domainCostPHP;
            if (typeof cost === 'number' && cost > 0) total += cost;
        }
        return total;
    },
});
```

4. **`ADMIN_CLERK_IDS` Environment Variable Handle**
When porting user/admin checking logic (like inside `convex/submissions.ts`), avoid unconditionally throwing an error if the environment variable is missing on a new project or branch. Either ensure you have `ADMIN_CLERK_IDS` set in the convex dashboard environment variables, or wrap the error check safely, like:

5. **`convex/r2.ts`**
(If the R2 storage integrations for apk generation are missing from the mobile repository, you must restore these public endpoints for AWS SDK compatibility):
```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// NOTE: Make sure getR2Client, getBucketName, and getPublicUrlPrefix are defined in your module

export const deleteFile = action({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const client = getR2Client(); // defined in your internal r2 utils
        const bucketName = getBucketName();

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: args.key,
        });

        await client.send(command);
        return { success: true };
    },
});

export const generateApkUploadUrl = action({
    args: {
        fileName: v.string(),
        fileType: v.string(),
    },
    handler: async (ctx, args) => {
        const client = getR2Client();
        const bucketName = getBucketName();
        const publicUrlPrefix = getPublicUrlPrefix();

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 10);
        const extension = args.fileName.split('.').pop() || 'apk';
        const key = `releases/${timestamp}-${randomStr}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: args.fileType || 'application/vnd.android.package-archive',
        });

        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
        const publicUrl = `${publicUrlPrefix}/${key}`;

        return { uploadUrl, publicUrl, key };
    },
});
```

---

### Wise & Hostinger Integrations (Schema Verification Check)
To make your deployment succeed and handle web features safely, double-check that your `convex/schema.ts` on mobile includes both the **Hostinger custom domain properties** and **Wise payout properties**.

1. **Hostinger (in `submissions`)**: Double check the above list under `submissions` is exactly replicated. In particular: `domainStatus`, `domainFailureReason`, `registrarOrderId`, `domainCostPHP`, `domainExpiresAt`, `cloudflareZoneId`, `requestedDomain`, `submissionType`.
2. **Wise (in `creators`, `withdrawals`, `earnings`, and `paymentTokens`)**: Ensure `wiseEmail` exists in `creators`. The `withdrawals` and `earnings` schema must include tracking attributes: `wiseRecipientId`, `wiseTransferId`, `wiseTransactionId`, `wiseStatus`, `wiseDetailedState`, and `lastStatusCheckAt`. All these must be mapped safely as `v.optional(...)` fields on the mobile side.