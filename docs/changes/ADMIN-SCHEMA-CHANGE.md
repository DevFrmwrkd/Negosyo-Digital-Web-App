# Admin Web App — Schema Sync Prompt

**Problem:** The mobile app and admin web app share the same Convex deployment (`energetic-panther-693`) but have separate `convex/` directories. When one team runs `npx convex deploy`, it overwrites the other team's functions. The schema must be identical in both projects or schema validation fails.

**Use this prompt** in the admin web app project to update its `convex/schema.ts` so it matches the mobile app's schema exactly.

---

## AI Prompt (copy-paste this into the admin web app's Claude Code session)

```
The mobile app team has deployed this schema to our shared Convex production deployment (energetic-panther-693). Our admin web app's schema.ts must include ALL of these tables with the EXACT same field definitions and indexes, or `npx convex deploy` will fail with schema validation errors.

Please update our convex/schema.ts to include every table and field below. If our admin app has EXTRA fields or tables that the mobile app doesn't have, ADD THEM to this schema as v.optional() — do NOT remove them. The goal is a SUPERSET schema that satisfies both codebases.

Also make sure our admin app still exports all functions the admin dashboard needs (like admin:checkBackfillNeeded, analytics:getAllAnalytics, creators:isDeletedByEmail, etc.). The mobile deploy wiped those — they need to be restored.

Here is the mobile app's complete schema that must be included:

---BEGIN SCHEMA---

creators: defineTable({
  clerkId: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()),
  middleName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  phone: v.optional(v.string()),
  balance: v.optional(v.number()),
  totalEarnings: v.optional(v.number()),
  totalWithdrawn: v.optional(v.number()),
  submissionCount: v.optional(v.number()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  lastActiveAt: v.optional(v.number()),
  referralCode: v.optional(v.string()),
  referredByCode: v.optional(v.string()),
  role: v.optional(v.string()),
  status: v.optional(v.string()),
  profileImage: v.optional(v.string()),
  wiseEmail: v.optional(v.string()),
  certifiedAt: v.optional(v.number()),
  isDeleted: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
}).index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"])
  .index("by_referral_code", ["referralCode"])
  .index("by_status", ["status"]),

submissions: defineTable({
  creatorId: v.id("creators"),
  businessName: v.string(),
  businessType: v.string(),
  ownerName: v.string(),
  ownerPhone: v.string(),
  ownerEmail: v.optional(v.string()),
  address: v.string(),
  city: v.string(),
  photos: v.optional(v.array(v.string())),
  videoStorageId: v.optional(v.string()),
  videoUrl: v.optional(v.string()),
  audioStorageId: v.optional(v.string()),
  audioUrl: v.optional(v.string()),
  transcript: v.optional(v.string()),
  transcriptionStatus: v.optional(v.string()),
  transcriptionError: v.optional(v.string()),
  aiGeneratedContent: v.optional(v.any()),
  status: v.string(),
  rejectionReason: v.optional(v.string()),
  reviewedBy: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  websiteUrl: v.optional(v.string()),
  creatorPayout: v.optional(v.number()),
  creatorPaidAt: v.optional(v.number()),
  amount: v.optional(v.number()),
  airtableRecordId: v.optional(v.string()),
  airtableSyncStatus: v.optional(v.string()),
  sentEmailAt: v.optional(v.number()),
  transcriptionUpdatedAt: v.optional(v.number()),
  requestedDomain: v.optional(v.string()),
  submissionType: v.optional(v.union(v.literal("standard"), v.literal("with_custom_domain"))),
  domainStatus: v.optional(v.union(
    v.literal("not_requested"), v.literal("pending_payment"), v.literal("registering"),
    v.literal("configuring_dns"), v.literal("provisioning_ssl"), v.literal("live"), v.literal("failed")
  )),
  domainFailureReason: v.optional(v.string()),
  registrarOrderId: v.optional(v.string()),
  domainExpiresAt: v.optional(v.number()),
  cloudflareZoneId: v.optional(v.string()),
}).index("by_creator_id", ["creatorId"])
  .index("by_status", ["status"])
  .index("by_airtable_sync", ["airtableSyncStatus"])
  .index("by_creator_status", ["creatorId", "status"])
  .index("by_city", ["city"]),

withdrawals: defineTable({
  creatorId: v.id("creators"),
  amount: v.number(),
  payoutMethod: v.union(v.literal("wise_email"), v.literal("bank_transfer")),
  accountDetails: v.string(),
  wiseEmail: v.optional(v.string()),
  accountHolderName: v.string(),
  status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
  failureReason: v.optional(v.string()),
  transactionRef: v.optional(v.string()),
  createdAt: v.number(),
  processedAt: v.optional(v.number()),
  wiseTransferId: v.optional(v.string()),
  wiseRecipientId: v.optional(v.string()),
  wiseDetailedState: v.optional(v.string()),
  lastStatusCheckAt: v.optional(v.number()),
  lastStatusEmailAt: v.optional(v.number()),
}).index("by_creator", ["creatorId"])
  .index("by_status", ["status"])
  .index("by_transactionRef", ["transactionRef"]),

paymentTokens: defineTable({
  submissionId: v.id("submissions"),
  token: v.string(),
  referenceCode: v.string(),
  amount: v.number(),
  status: v.union(v.literal("pending"), v.literal("paid"), v.literal("expired"), v.literal("cancelled")),
  createdAt: v.number(),
  expiresAt: v.number(),
  usedAt: v.optional(v.number()),
  emailSentAt: v.optional(v.number()),
  paymentReceivedAt: v.optional(v.number()),
  wiseTransactionId: v.optional(v.string()),
  adminNotes: v.optional(v.string()),
}).index("by_token", ["token"])
  .index("by_reference", ["referenceCode"])
  .index("by_submissionId", ["submissionId"])
  .index("by_status", ["status"])
  .index("by_expiresAt", ["expiresAt"]),

rateLimits: defineTable({
  key: v.string(),
  count: v.number(),
  windowStart: v.number(),
}).index("by_key", ["key"]),

// Plus these tables that are identical in both codebases (keep as-is):
// earnings, payoutMethods, leads, leadNotes, notifications, pushTokens,
// referrals, analytics, websiteAnalytics, auditLogs, settings,
// generatedWebsites, websiteContent

---END SCHEMA---

IMPORTANT RULES:
1. If the admin app has tables that the mobile app doesn't have (e.g. paymentReferences, migrations, unpublish), KEEP THEM — add them alongside the mobile tables.
2. If the admin app has extra fields on a shared table (e.g. submissions.payoutRequestedAt), add them as v.optional() to the mobile schema above.
3. Index names MUST match exactly — e.g. "by_clerk_id" not "by_clerkId".
4. The admin app must also restore any functions that got wiped (admin:checkBackfillNeeded, analytics:getAllAnalytics, creators:isDeletedByEmail, etc.) — these were lost when the mobile team deployed.
5. After merging, run `npx convex deploy` from the admin project to push the unified schema + functions.

The long-term fix is to use a shared convex/ directory (monorepo) so both projects always deploy the same schema. For now, manual sync is needed.
```

---

## Missing functions the admin web app needs to restore

When the mobile app deploys, these admin-specific functions get wiped because they don't exist in the mobile codebase:

| Function | Purpose |
|---|---|
| `admin:checkBackfillNeeded` | Check if data migration is needed |
| `admin:isAdmin` | Check if current user is admin |
| `admin:getPendingPayouts` | Get pending payouts for dashboard |
| `admin:getPayoutStats` | Payout statistics |
| `admin:getDashboardStats` | Admin dashboard stats |
| `admin:markEmailSent` | Mark payment email as sent |
| `admin:deleteSubmissionRecords` | Delete submission records |
| `admin:deleteCreatorRecords` | Delete creator records |
| `admin:markPayoutPaid` | Mark payout as paid |
| `admin:backfillWebsiteUrls` | Backfill website URLs |
| `admin:bulkMarkPayoutsPaid` | Bulk mark payouts |
| `analytics:getAllAnalytics` | All analytics for admin |
| `creators:isDeletedByEmail` | Check if email belongs to deleted account |
| `creators:getAll` | Get all creators (admin) |
| `creators:getAllWithStats` | Get all creators with stats |
| `creators:getById` | Get creator by ID |
| `creators:getByEmail` | Get creator by email |
| `creators:updateStatus` | Update creator status |
| `creators:updateRole` | Update creator role |
| `creators:updateBalance` | Update creator balance |
| `payments:creditCreatorForPayment` | Credit creator for payment |
| `payments:processDeposit` | Process incoming deposit |
| `unpublish:*` | Website unpublish logic |
| `migrations:*` | Data migration functions |

These need to be re-added to the admin project's `convex/` directory.

---

## Long-term fix: shared convex directory

The real fix is to make both projects use the same `convex/` directory so deploying from either side pushes ALL functions + one unified schema. Options:

1. **Monorepo**: Put both projects in one repo with a shared `convex/` at the root
2. **Git submodule**: Share the `convex/` directory as a submodule
3. **Symlink**: Symlink `admin-web/convex/` → `mobile/convex/` (fragile)
4. **Separate deployments**: Give each project its own Convex deployment (requires data sync)

**Recommended: Option 1 (monorepo)** — simplest, no sync issues.
