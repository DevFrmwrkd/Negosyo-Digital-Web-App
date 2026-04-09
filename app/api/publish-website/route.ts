import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { createHash } from 'crypto'

/**
 * Publish a generated website to Cloudflare Pages
 * Uses free .pages.dev subdomains (projectname.pages.dev)
 * POST /api/publish-website
 */
export async function POST(request: NextRequest) {
    try {
        // Verify Clerk authentication
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify admin role using Convex
        const creator = await fetchQuery(api.creators.getByClerkId, { clerkId: userId })
        if (!creator || creator.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { submissionId } = body

        if (!submissionId) {
            return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 })
        }

        // Get the generated website from Convex
        const website = await fetchQuery(api.generatedWebsites.getBySubmissionId, {
            submissionId: submissionId as Id<"submissions">
        })

        if (!website) {
            return NextResponse.json({ error: 'Website not found. Generate it first.' }, { status: 404 })
        }

        if (!website.htmlContent) {
            return NextResponse.json({ error: 'No HTML content to deploy' }, { status: 400 })
        }

        // Get the submission for business name
        const submission = await fetchQuery(api.submissions.getById, {
            id: submissionId as Id<"submissions">
        })

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
        }

        // Get Cloudflare credentials
        const cfApiToken = process.env.CLOUDFLARE_API_TOKEN
        const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID

        if (!cfApiToken || !cfAccountId) {
            return NextResponse.json(
                { error: 'Cloudflare credentials not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.' },
                { status: 500 }
            )
        }

        // Generate project name from business name
        const businessName = submission.businessName || 'business'
        const projectName = generateProjectName(businessName)

        // Use existing project or create/find one
        let cfProject = website.cfPagesProjectName

        if (!cfProject) {
            // Try to use the base project name first (check if it exists)
            cfProject = await findOrCreateCfPagesProject(cfApiToken, cfAccountId, projectName)
        }

        // Deploy via Cloudflare Pages Direct Upload API (no wrangler CLI dependency)
        try {
            await deployToCfPages(cfApiToken, cfAccountId, cfProject, website.htmlContent)
        } catch (deployError: any) {
            if (deployError.message?.includes('Project not found') || deployError.message?.includes('could not find project') || deployError.message?.includes('not found')) {
                cfProject = await findOrCreateCfPagesProject(cfApiToken, cfAccountId, projectName)
                await deployToCfPages(cfApiToken, cfAccountId, cfProject, website.htmlContent)
            } else {
                throw deployError
            }
        }

        const publishedUrl = `https://${cfProject}.pages.dev`

        // Update generated website in Convex with published info
        try {
            await fetchMutation(api.generatedWebsites.publish, {
                submissionId: submissionId as Id<"submissions">,
                publishedUrl,
                cfPagesProjectName: cfProject,
            })
        } catch (updateError: any) {
            console.error('Database update error:', updateError?.message || updateError)
        }

        // Update submission status to deployed and set websiteUrl
        try {
            await fetchMutation(api.submissions.updateStatus, {
                id: submissionId as Id<"submissions">,
                status: 'deployed'
            })
        } catch (statusError: any) {
            console.error('Status update error:', statusError?.message || statusError)
        }

        try {
            await fetchMutation(api.submissions.update, {
                id: submissionId as Id<"submissions">,
                websiteUrl: publishedUrl,
            })
        } catch (urlError: any) {
            console.error('Submission websiteUrl update error:', urlError?.message || urlError)
        }

        return NextResponse.json({
            success: true,
            url: publishedUrl,
            projectName: cfProject,
            message: `Website published successfully to ${publishedUrl}`
        })

    } catch (error: any) {
        console.error('Publish error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to publish website' },
            { status: 500 }
        )
    }
}

/**
 * Generate a URL-safe project name from business name.
 * CF Pages project names: lowercase, alphanumeric + hyphens, max 58 chars.
 */
function generateProjectName(businessName: string): string {
    return businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 58)
        || 'business'
}

/**
 * Find an existing Cloudflare Pages project or create a new one.
 * Avoids creating duplicate projects with random suffixes.
 */
async function findOrCreateCfPagesProject(
    token: string,
    accountId: string,
    name: string,
): Promise<string> {
    // Check if project already exists
    const checkResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${name}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    )
    if (checkResponse.ok) {
        console.log(`[CF Pages] Found existing project: ${name}`)
        return name
    }
    // Project doesn't exist, create it
    return createCfPagesProject(token, accountId, name)
}

/**
 * Create a new Cloudflare Pages project via REST API.
 * Returns the actual project name (may have suffix if name was taken).
 */
async function createCfPagesProject(
    token: string,
    accountId: string,
    name: string,
): Promise<string> {
    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                production_branch: 'main',
            }),
        }
    )

    const data = await response.json()

    if (!response.ok) {
        // If name is taken, retry with timestamp suffix
        if (response.status === 409 || data?.errors?.some((e: any) => e.code === 8000007)) {
            const uniqueName = `${name}-${Date.now().toString(36)}`.substring(0, 58)
            return createCfPagesProject(token, accountId, uniqueName)
        }
        throw new Error(`Failed to create CF Pages project: ${JSON.stringify(data.errors || data)}`)
    }

    return data.result.name
}

/**
 * Deploy HTML content to Cloudflare Pages via the Create Deployment API.
 * Constructs multipart body manually to avoid Node.js FormData/Blob encoding issues.
 * https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/
 */
async function deployToCfPages(
    token: string,
    accountId: string,
    projectName: string,
    htmlContent: string,
): Promise<void> {
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8')
    const base64Content = htmlBuffer.toString('base64')
    const fileHash = createHash('sha256').update(base64Content + 'html').digest('hex').slice(0, 32)
    const manifest = JSON.stringify({ '/index.html': fileHash })

    console.log(`[CF Pages] Deploying to ${projectName}, hash: ${fileHash}, size: ${htmlBuffer.length}B`)

    // Build multipart body manually — Node.js FormData+Blob has encoding issues with Cloudflare
    const boundary = `----CFDeploy${Date.now()}`
    const parts: Buffer[] = []

    // Part 1: manifest
    parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="manifest"\r\n\r\n` +
        `${manifest}\r\n`
    ))

    // Part 2: the HTML file (keyed by hash, with filename)
    parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fileHash}"; filename="index.html"\r\n` +
        `Content-Type: text/html\r\n\r\n`
    ))
    parts.push(htmlBuffer)
    parts.push(Buffer.from(`\r\n`))

    // Closing boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`))

    const body = Buffer.concat(parts)

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body,
        }
    )

    const data = await response.json() as any

    if (!response.ok) {
        const errorMsg = data?.errors?.map((e: any) => e.message).join(', ') || JSON.stringify(data)
        throw new Error(`CF Pages deploy failed (${response.status}): ${errorMsg}`)
    }

    const deployUrl = data.result?.url || `https://${projectName}.pages.dev`
    console.log(`[CF Pages] Deployed: ${deployUrl} (id: ${data.result?.id})`)
}
