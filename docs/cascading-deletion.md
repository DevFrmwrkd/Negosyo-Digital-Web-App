# Cascading Deletion with Integrated Audit Logging

## Overview

Admin-level cascading deletion that removes a submission and **all** associated assets across platforms in a single operation. Every deletion is audit-logged for accountability.

---

## What Gets Deleted

| Asset | Location | How |
|---|---|---|
| Submission record | Convex `submissions` table | `ctx.db.delete()` |
| Generated website record | Convex `generatedWebsites` table | `ctx.db.delete()` |
| Website content record | Convex `websiteContent` table | `ctx.db.delete()` |
| HTML storage file | Convex `_storage` | `ctx.storage.delete()` |
| Video/audio storage files | Convex `_storage` (legacy) | `ctx.storage.delete()` |
| Photo/video/audio files | Cloudflare R2 bucket | `DeleteObjectCommand` via AWS SDK |
| Enhanced images (AI-generated) | Cloudflare R2 bucket | `DeleteObjectCommand` via AWS SDK |
| Section images (hero/about/etc) | Cloudflare R2 bucket | `DeleteObjectCommand` via AWS SDK |
| Published website | Cloudflare Pages | `DELETE /pages/projects/{name}` |
| Airtable record | Airtable | `DELETE /v0/{base}/{table}/{record}` |
| Creator submission count | Convex `creators` table | Decremented by 1 |

**Not deleted** (kept for accounting): earnings, referrals, analytics, audit logs, lead records.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Admin UI (Dashboard / Detail Page)         │
│  [Delete Button] → Confirmation Modal       │
│  → fetch('/api/delete-submission')          │
└──────────────────┬──────────────────────────┘
                   │ POST { submissionId }
                   ▼
┌─────────────────────────────────────────────┐
│  API Route: /api/delete-submission          │
│                                             │
│  1. Auth: Clerk → admin role check          │
│  2. Resource Discovery (Convex queries)     │
│  2b. Fetch websiteContent (for images)      │
│  3. External Cleanup (parallel):            │
│     ├─ Cloudflare Pages DELETE              │
│     ├─ Airtable record DELETE               │
│     └─ R2 file DELETE (all sources):        │
│        ├─ submission photos/video/audio     │
│        ├─ enhanced images (AI-generated)    │
│        └─ section images (website content)  │
│  4. DB Cleanup → Convex mutation            │
└──────────────────┬──────────────────────────┘
                   │ fetchMutation()
                   ▼
┌─────────────────────────────────────────────┐
│  Convex: admin.deleteSubmissionRecords      │
│                                             │
│  1. Delete generatedWebsites + HTML storage │
│  2. Delete websiteContent records           │
│  3. Delete legacy Convex storage files      │
│  4. Decrement creator.submissionCount       │
│  5. Delete submission record                │
│  6. Schedule audit log                      │
└─────────────────────────────────────────────┘
```

---

## API Route

### `POST /api/delete-submission`

**Request:**
```json
{
  "submissionId": "j97etbn7327v9dn7yxmwmpx64581w54c"
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "Successfully deleted submission \"Juan's Bakery\"",
  "deletedAssets": ["cloudflare_pages", "airtable_record", "r2_files (5)", "submission_record", "generated_website", "website_content"],
  "failedAssets": []
}
```

**Response (partial failure):**
```json
{
  "success": true,
  "message": "Successfully deleted submission \"Juan's Bakery\"",
  "deletedAssets": ["r2_files (5)", "submission_record", "generated_website", "website_content"],
  "failedAssets": [
    { "asset": "cloudflare_pages", "error": "Missing Cloudflare credentials" },
    { "asset": "airtable_record", "error": "HTTP 403: Forbidden" }
  ]
}
```

**Auth:** Requires Clerk session with admin role.

---

## Audit Log Entry

```json
{
  "adminId": "user_2abc...",
  "action": "submission_deleted",
  "targetType": "submission",
  "targetId": "j97etbn7327v9dn7yxmwmpx64581w54c",
  "metadata": {
    "businessName": "Juan's Bakery",
    "deletedAssets": {
      "deleted": ["cloudflare_pages", "r2_files (5)"],
      "failed": [{ "asset": "airtable_record", "error": "Missing credentials" }]
    }
  },
  "timestamp": 1709312400000
}
```

---

## Error Handling / Resilience

Each external service deletion is wrapped in `try/catch`:

- **If R2 deletion fails:** The specific file key and error are logged in `failedAssets`. Other files still get deleted. DB records are still removed. R2 URLs are collected from all sources (submission photos/video/audio, enhanced images from `generatedWebsites` and `websiteContent`, section images) and deduplicated before deletion.
- **If Cloudflare Pages deletion fails:** Logged in `failedAssets`. The project may become orphaned — check CF dashboard manually.
- **If Airtable deletion fails:** Logged in `failedAssets`. The Airtable record will remain — delete manually from Airtable.
- **If DB mutation fails:** The API route returns a 500 error. External assets may already be deleted — check audit logs for the `deletedAssets` metadata.

The principle: **always delete DB records**, log external failures for manual cleanup.

All external operations are logged to the server console with `[delete-submission]` prefix for easy diagnosis.

---

## Environment Variables

Required for full cleanup (all are optional — missing credentials skip that service):

| Variable | Service | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages | Delete published website project |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Pages | Account identifier |
| `R2_ACCOUNT_ID` | Cloudflare R2 | R2 endpoint |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 | S3-compatible auth |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | S3-compatible auth |
| `R2_BUCKET_NAME` | Cloudflare R2 | Bucket name |
| `R2_PUBLIC_URL` | Cloudflare R2 | Public URL prefix for key extraction |
| `AIRTABLE_PAT` | Airtable | Personal access token |
| `AIRTABLE_BASE_ID` | Airtable | Base identifier |
| `AIRTABLE_TABLE_ID` | Airtable | Table identifier |

---

## UI Locations

### Submission Detail Page (`/admin/submissions/[id]`)
- Red "Delete" button in the header action bar (always visible for admins)
- Confirmation modal with full asset list + business name/status summary
- Redirects to `/admin` on successful deletion

### Admin Dashboard (`/admin`)
- Red trash icon button in each table row's Actions column
- Same confirmation modal pattern
- Success/error banner displayed at the top of the page

---

## Files Changed

| File | Change |
|---|---|
| `app/api/delete-submission/route.ts` | **NEW** — API route orchestrating cascading deletion |
| `convex/admin.ts` | **MODIFIED** — Added `deleteSubmissionRecords` mutation |
| `app/admin/submissions/[id]/page.tsx` | **MODIFIED** — Delete button + confirmation modal |
| `app/admin/page.tsx` | **MODIFIED** — Delete row action + confirmation modal + result banner |
