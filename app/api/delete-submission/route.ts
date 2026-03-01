import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

/**
 * Extract R2 key from a public URL.
 * E.g., "https://pub-xxx.r2.dev/images/1234-abc.jpg" → "images/1234-abc.jpg"
 */
function extractR2Key(url: string, r2PublicUrl: string | undefined): string | null {
    if (!r2PublicUrl || !url.startsWith(r2PublicUrl)) return null
    return url.replace(r2PublicUrl + '/', '')
}

/**
 * Delete a file from R2 by key
 */
async function deleteR2File(client: S3Client, bucketName: string, key: string): Promise<{ key: string; success: boolean; error?: string }> {
    try {
        await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
        return { key, success: true }
    } catch (error: any) {
        return { key, success: false, error: error.message }
    }
}

/**
 * Extract R2 URLs from an enhancedImages object.
 * Structure: { headshot: { url: "..." }, exterior: { url: "..." }, interior_1: { url: "..." }, ... }
 */
function collectEnhancedImageUrls(enhancedImages: any): string[] {
    if (!enhancedImages || typeof enhancedImages !== 'object') return []
    const urls: string[] = []
    for (const [, img] of Object.entries(enhancedImages)) {
        const imgData = img as any
        if (imgData && typeof imgData === 'object') {
            const url = imgData.url || imgData.storageId
            if (typeof url === 'string' && url.startsWith('http')) {
                urls.push(url)
            }
        }
    }
    return urls
}

/**
 * Extract R2 URLs from a section images object.
 * Structure: { hero: [...urls], about: [...urls], services: [...urls], featured: [...urls], gallery: [...urls] }
 */
function collectSectionImageUrls(images: any): string[] {
    if (!images || typeof images !== 'object') return []
    const urls: string[] = []
    for (const [, sectionImages] of Object.entries(images)) {
        if (Array.isArray(sectionImages)) {
            for (const url of sectionImages) {
                if (typeof url === 'string' && url.startsWith('http')) {
                    urls.push(url)
                }
            }
        }
    }
    return urls
}

/**
 * Cascading Deletion API Route
 * Deletes a submission and all related assets across platforms:
 * 1. Cloudflare Pages deployment
 * 2. Airtable record
 * 3. R2 media files (images, audio, video)
 * 4. Convex DB records (generatedWebsites, websiteContent, submission)
 * 5. Creates audit log entry
 *
 * POST /api/delete-submission
 * Body: { submissionId: string }
 */
export async function POST(request: NextRequest) {
    try {
        // ── Auth ──
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const creator = await fetchQuery(api.creators.getByClerkId, { clerkId: userId })
        if (!creator || creator.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { submissionId } = body

        if (!submissionId) {
            return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 })
        }

        // ── Step 1: Resource Discovery ──
        const submission = await fetchQuery(api.submissions.getById, {
            id: submissionId as Id<"submissions">
        })

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
        }

        const website = await fetchQuery(api.generatedWebsites.getBySubmissionId, {
            submissionId: submissionId as Id<"submissions">
        })

        // Also fetch websiteContent for enhanced images and section images
        let websiteContent: any = null
        try {
            websiteContent = await fetchQuery(api.websiteContent.getBySubmissionId, {
                submissionId: submissionId as Id<"submissions">
            })
        } catch {
            // websiteContent may not exist
        }

        console.log(`[delete-submission] Deleting "${submission.businessName}" (${submissionId})`)
        console.log(`[delete-submission] Website record: ${website ? 'found' : 'none'}, WebsiteContent: ${websiteContent ? 'found' : 'none'}`)
        console.log(`[delete-submission] airtableRecordId: ${submission.airtableRecordId || 'none'}`)
        console.log(`[delete-submission] cfPagesProjectName: ${website?.cfPagesProjectName || 'none'}`)

        // Track what we attempt to delete and results
        const deletedAssets: string[] = []
        const failedAssets: { asset: string; error: string }[] = []

        // ── Step 2: External Asset Cleanup (parallel) ──
        const externalCleanupPromises: Promise<void>[] = []

        // 2a. Cloudflare Pages deletion
        if (website?.cfPagesProjectName) {
            externalCleanupPromises.push((async () => {
                const cfApiToken = process.env.CLOUDFLARE_API_TOKEN
                const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID

                if (!cfApiToken || !cfAccountId) {
                    console.warn(`[delete-submission] Skipping CF Pages deletion — missing credentials (CLOUDFLARE_API_TOKEN: ${cfApiToken ? 'set' : 'MISSING'}, CLOUDFLARE_ACCOUNT_ID: ${cfAccountId ? 'set' : 'MISSING'})`)
                    failedAssets.push({ asset: 'cloudflare_pages', error: 'Missing Cloudflare credentials' })
                    return
                }

                try {
                    console.log(`[delete-submission] Deleting CF Pages project: ${website.cfPagesProjectName}`)
                    const res = await fetch(
                        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${website.cfPagesProjectName}`,
                        { method: 'DELETE', headers: { 'Authorization': `Bearer ${cfApiToken}` } }
                    )
                    if (!res.ok && res.status !== 404) {
                        const errBody = await res.text().catch(() => 'Unknown error')
                        console.error(`[delete-submission] CF Pages deletion failed: HTTP ${res.status}: ${errBody}`)
                        failedAssets.push({ asset: 'cloudflare_pages', error: `HTTP ${res.status}: ${errBody}` })
                    } else {
                        console.log(`[delete-submission] CF Pages project deleted (status: ${res.status})`)
                        deletedAssets.push('cloudflare_pages')
                    }
                } catch (error: any) {
                    console.error(`[delete-submission] CF Pages deletion error:`, error.message)
                    failedAssets.push({ asset: 'cloudflare_pages', error: error.message })
                }
            })())
        } else {
            console.log(`[delete-submission] No CF Pages project to delete`)
        }

        // 2b. Airtable record deletion
        if (submission.airtableRecordId) {
            externalCleanupPromises.push((async () => {
                const airtablePat = process.env.AIRTABLE_PAT
                const airtableBaseId = process.env.AIRTABLE_BASE_ID
                const airtableTableId = process.env.AIRTABLE_TABLE_ID

                if (!airtablePat || !airtableBaseId || !airtableTableId) {
                    console.warn(`[delete-submission] Skipping Airtable deletion — missing credentials (PAT: ${airtablePat ? 'set' : 'MISSING'}, BASE_ID: ${airtableBaseId ? 'set' : 'MISSING'}, TABLE_ID: ${airtableTableId ? 'set' : 'MISSING'})`)
                    failedAssets.push({ asset: 'airtable_record', error: 'Missing Airtable credentials' })
                    return
                }

                try {
                    console.log(`[delete-submission] Deleting Airtable record: ${submission.airtableRecordId}`)
                    const res = await fetch(
                        `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableId}/${submission.airtableRecordId}`,
                        { method: 'DELETE', headers: { 'Authorization': `Bearer ${airtablePat}` } }
                    )
                    if (!res.ok && res.status !== 404) {
                        const errBody = await res.text().catch(() => 'Unknown error')
                        console.error(`[delete-submission] Airtable deletion failed: HTTP ${res.status}: ${errBody}`)
                        failedAssets.push({ asset: 'airtable_record', error: `HTTP ${res.status}: ${errBody}` })
                    } else {
                        console.log(`[delete-submission] Airtable record deleted (status: ${res.status})`)
                        deletedAssets.push('airtable_record')
                    }
                } catch (error: any) {
                    console.error(`[delete-submission] Airtable deletion error:`, error.message)
                    failedAssets.push({ asset: 'airtable_record', error: error.message })
                }
            })())
        } else {
            console.log(`[delete-submission] No Airtable record to delete (airtableRecordId not set)`)
        }

        // 2c. R2 file deletion
        const r2AccountId = process.env.R2_ACCOUNT_ID
        const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
        const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
        const r2BucketName = process.env.R2_BUCKET_NAME
        const r2PublicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')

        if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
            externalCleanupPromises.push((async () => {
                const r2Client = new S3Client({
                    region: 'auto',
                    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
                    credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
                    requestHandler: { requestTimeout: 10_000 },
                })

                // Collect all R2 URLs to delete from ALL sources
                const r2Urls: string[] = []

                // Source 1: Submission photos
                if (submission.photos && Array.isArray(submission.photos)) {
                    for (const photo of submission.photos) {
                        if (typeof photo === 'string' && photo.startsWith('http')) {
                            r2Urls.push(photo)
                        }
                    }
                }
                const submissionPhotoCount = r2Urls.length

                // Source 2: Submission video URL
                if (submission.videoUrl && submission.videoUrl.startsWith('http')) {
                    r2Urls.push(submission.videoUrl)
                }

                // Source 3: Submission audio URL
                if (submission.audioUrl && submission.audioUrl.startsWith('http')) {
                    r2Urls.push(submission.audioUrl)
                }

                // Source 4: Enhanced images from generatedWebsites (top-level)
                const enhancedFromWebsite = collectEnhancedImageUrls(website?.enhancedImages)
                r2Urls.push(...enhancedFromWebsite)

                // Source 5: Enhanced images from generatedWebsites.extractedContent
                const enhancedFromExtracted = collectEnhancedImageUrls((website?.extractedContent as any)?.enhancedImages)
                r2Urls.push(...enhancedFromExtracted)

                // Source 6: Enhanced images from websiteContent
                const enhancedFromContent = collectEnhancedImageUrls(websiteContent?.enhancedImages)
                r2Urls.push(...enhancedFromContent)

                // Source 7: Section images from generatedWebsites.images
                const sectionFromWebsite = collectSectionImageUrls(website?.images)
                r2Urls.push(...sectionFromWebsite)

                // Source 8: Section images from websiteContent.images
                const sectionFromContent = collectSectionImageUrls(websiteContent?.images)
                r2Urls.push(...sectionFromContent)

                // Source 9: Featured images from generatedWebsites
                if (website?.featuredImages && Array.isArray(website.featuredImages)) {
                    for (const img of website.featuredImages) {
                        if (typeof img === 'string' && img.startsWith('http')) {
                            r2Urls.push(img)
                        }
                    }
                }

                // Source 10: Featured images from websiteContent
                if (websiteContent?.featuredImages && Array.isArray(websiteContent.featuredImages)) {
                    for (const img of websiteContent.featuredImages) {
                        if (typeof img === 'string' && img.startsWith('http')) {
                            r2Urls.push(img)
                        }
                    }
                }

                // Deduplicate URLs
                const uniqueR2Urls = [...new Set(r2Urls)]

                console.log(`[delete-submission] R2 URLs collected: ${uniqueR2Urls.length} unique (${r2Urls.length} total before dedup)`)
                console.log(`[delete-submission]   - submission.photos: ${submissionPhotoCount}`)
                console.log(`[delete-submission]   - submission.videoUrl: ${submission.videoUrl ? 1 : 0}`)
                console.log(`[delete-submission]   - submission.audioUrl: ${submission.audioUrl ? 1 : 0}`)
                console.log(`[delete-submission]   - enhanced (website): ${enhancedFromWebsite.length}`)
                console.log(`[delete-submission]   - enhanced (extractedContent): ${enhancedFromExtracted.length}`)
                console.log(`[delete-submission]   - enhanced (websiteContent): ${enhancedFromContent.length}`)
                console.log(`[delete-submission]   - section images (website): ${sectionFromWebsite.length}`)
                console.log(`[delete-submission]   - section images (content): ${sectionFromContent.length}`)

                // Extract keys and delete
                const r2Results = await Promise.allSettled(
                    uniqueR2Urls
                        .map(url => extractR2Key(url, r2PublicUrl))
                        .filter((key): key is string => key !== null)
                        .map(key => deleteR2File(r2Client, r2BucketName, key))
                )

                let r2Deleted = 0
                for (const result of r2Results) {
                    if (result.status === 'fulfilled' && result.value.success) {
                        r2Deleted++
                    } else if (result.status === 'fulfilled' && !result.value.success) {
                        failedAssets.push({ asset: `r2:${result.value.key}`, error: result.value.error || 'Unknown' })
                    }
                }

                if (r2Deleted > 0) {
                    deletedAssets.push(`r2_files (${r2Deleted})`)
                }
                console.log(`[delete-submission] R2 deletion complete: ${r2Deleted} deleted, ${r2Results.length - r2Deleted} failed`)

                // Destroy S3 client to close open TCP connections
                r2Client.destroy()
            })())
        } else {
            console.warn(`[delete-submission] Skipping R2 deletion — missing credentials`)
        }

        // Wait for all external cleanup to complete
        await Promise.allSettled(externalCleanupPromises)

        // ── Step 3 & 4: DB Cleanup + Audit Log (via Convex mutation) ──
        // Retry once on transient network errors (ECONNRESET)
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                await fetchMutation(api.admin.deleteSubmissionRecords, {
                    submissionId: submissionId as Id<"submissions">,
                    adminId: userId,
                    deletedAssets: {
                        deleted: deletedAssets,
                        failed: failedAssets,
                    },
                })
                break
            } catch (err: any) {
                if (attempt === 1 && (err?.cause?.code === 'ECONNRESET' || err?.message?.includes('fetch failed'))) {
                    console.warn(`[delete-submission] Convex mutation failed (attempt 1), retrying...`, err.message)
                    continue
                }
                throw err
            }
        }

        deletedAssets.push('submission_record', 'generated_website', 'website_content')

        console.log(`[delete-submission] Deletion complete for "${submission.businessName}"`)
        console.log(`[delete-submission] Deleted: ${deletedAssets.join(', ')}`)
        if (failedAssets.length > 0) {
            console.warn(`[delete-submission] Failed: ${failedAssets.map(f => `${f.asset}: ${f.error}`).join(', ')}`)
        }

        return NextResponse.json({
            success: true,
            message: `Successfully deleted submission "${submission.businessName}"`,
            deletedAssets,
            failedAssets: failedAssets.length > 0 ? failedAssets : undefined,
        })

    } catch (error: any) {
        console.error('Delete submission error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete submission' },
            { status: 500 }
        )
    }
}
