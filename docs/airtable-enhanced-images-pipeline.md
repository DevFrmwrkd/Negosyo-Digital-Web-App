# Airtable Enhanced Images Pipeline

## Overview

The Airtable pipeline generates AI-enhanced images for business submissions. These enhanced images replace the original raw photos in the generated website, providing professional-quality visuals for each section (hero, about, services, gallery).

## Image Categories

The enhanced images are stored as a structured object with these keys:

| Key | Used In | Description |
|---|---|---|
| `headshot` | Hero, About | Owner/business headshot |
| `exterior` | Hero, Services | Exterior shot of the business |
| `interior_1` | About, Services | Interior shot 1 |
| `interior_2` | About | Interior shot 2 |
| `product_1` | Featured/Gallery | Product photo 1 |
| `product_2` | Featured/Gallery | Product photo 2 |

Each entry has the structure: `{ url: string, storageId?: string }`

## Where Enhanced Images Are Stored in Convex

The generate-website route checks these locations in priority order:

1. **`generatedWebsites.enhancedImages`** — Top-level field (preferred, mobile branch writes here)
2. **`generatedWebsites.extractedContent.enhancedImages`** — Nested in extractedContent
3. **`websiteContent.enhancedImages`** — Via generatedWebsites → websiteContent chain
4. **`websiteContent.enhancedImages`** — Direct lookup by submissionId (fallback)

## How It Works

1. Submission is created in the app with raw photos
2. The Airtable automation picks up the submission (synced via `airtableRecordId`)
3. Airtable pipeline generates enhanced images (AI upscaling/editing)
4. Enhanced images are saved back to Convex in `generatedWebsites.enhancedImages`
5. When "Generate Website" is triggered, the route reads enhanced images and uses them instead of raw photos

## Diagnosing Issues

### Check submission state
```bash
npx convex run submissions:getById '{"id": "<SUBMISSION_ID>"}'
```

### Check if enhanced images exist
```bash
npx convex run generatedWebsites:getBySubmissionId '{"submissionId": "<SUBMISSION_ID>"}'
```

```bash
npx convex run websiteContent:getBySubmissionId '{"submissionId": "<SUBMISSION_ID>"}'
```

Look for:
- `enhancedImages` field — should be a non-null object with image entries
- `airtableSyncStatus` — should be `"synced"` (if `"pending"`, the sync hasn't completed)
- `airtableSyncedAt` — timestamp of last sync

### Re-trigger website generation
Once enhanced images are confirmed in Convex, re-generate the website from the admin panel:

1. Go to `/admin/submissions/<SUBMISSION_ID>`
2. Click "Generate Website" button
3. The route will automatically pick up the enhanced images

Or via API (requires admin auth):
```bash
curl -X POST http://localhost:3000/api/generate-website \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-clerk-session-cookie>" \
  -d '{"submissionId": "<SUBMISSION_ID>"}'
```

## Relevant Files

| File | Purpose |
|---|---|
| `app/api/generate-website/route.ts` | Main website generation — fetches enhanced images from all sources |
| `app/admin/submissions/[id]/page.tsx` | Admin detail page — displays enhanced images preview |
| `convex/generatedWebsites.ts` | CRUD for generated websites (stores enhancedImages) |
| `convex/websiteContent.ts` | Legacy content table (also stores enhancedImages) |
| `convex/schema.ts` | Schema definitions — `enhancedImages: v.optional(v.any())` on both tables |

## Schema Fields (Airtable-related)

**On `submissions` table:**
- `airtableRecordId` — Airtable record ID for the submission
- `airtableSyncStatus` — Sync status: `"pending"` | `"synced"` | `"failed"`

**On `generatedWebsites` table:**
- `enhancedImages` — The enhanced image object (see structure above)
- `airtableSyncedAt` — Timestamp of last Airtable sync

**On `websiteContent` table (legacy/deprecated):**
- `enhancedImages` — Same structure as above
- `airtableSyncedAt` — Timestamp of last sync
