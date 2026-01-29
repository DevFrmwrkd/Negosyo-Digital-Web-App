import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

interface NetlifySiteResponse {
    id: string
    name: string
    url: string
    ssl_url: string
    admin_url: string
    deploy_url: string
    state: string
}

interface NetlifyDeployResponse {
    id: string
    site_id: string
    state: string
    url: string
    ssl_url: string
    deploy_url: string
}

/**
 * Publish a generated website to Netlify
 * Uses free .netlify.app subdomains (businessname.netlify.app)
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

        // Get Netlify credentials
        const netlifyToken = process.env.NETLIFY_ACCESS_TOKEN
        const teamSlug = process.env.NETLIFY_TEAM_SLUG

        if (!netlifyToken) {
            return NextResponse.json(
                { error: 'Netlify access token not configured. Check NETLIFY_SETUP.md' },
                { status: 500 }
            )
        }

        // Generate subdomain from business name
        const businessName = submission.businessName || 'business'
        const subdomain = generateSubdomain(businessName)

        // Check if site already exists (for re-publishing)
        let siteId = website.netlifySiteId
        let siteName = subdomain
        let existingPublishedUrl = website.publishedUrl

        // Validate existing URL - must not have spaces and must be proper format
        const isValidUrl = existingPublishedUrl &&
            !existingPublishedUrl.includes(' ') &&
            /^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(existingPublishedUrl)

        if (!siteId) {
            // Create new Netlify site
            const siteResponse = await createNetlifySite(netlifyToken, subdomain, teamSlug)
            siteId = siteResponse.id
            siteName = siteResponse.name  // Get the actual name (might have suffix if taken)
        } else if (isValidUrl && existingPublishedUrl) {
            // Site already exists with valid URL - extract site name from existing URL
            const urlMatch = existingPublishedUrl.match(/https?:\/\/([^.]+)\.netlify\.app/)
            if (urlMatch) {
                siteName = urlMatch[1]
            }
        } else if (siteId) {
            // Site exists but URL is invalid - fetch actual site info from Netlify
            try {
                const siteInfoResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
                    headers: {
                        'Authorization': `Bearer ${netlifyToken}`,
                    }
                })
                if (siteInfoResponse.ok) {
                    const siteInfo = await siteInfoResponse.json()
                    siteName = siteInfo.name || subdomain
                }
            } catch (e) {
                console.error('Failed to fetch site info from Netlify:', e)
            }
        }

        // Deploy the HTML content
        const deployResponse = await deployToNetlify(
            netlifyToken,
            siteId,
            website.htmlContent,
            businessName
        )

        // Construct proper URL (never use invalid existing URL)
        const publishedUrl = isValidUrl && existingPublishedUrl
            ? existingPublishedUrl
            : `https://${siteName}.netlify.app`

        // Update generated website in Convex with published info
        try {
            await fetchMutation(api.generatedWebsites.publish, {
                submissionId: submissionId as Id<"submissions">,
                publishedUrl,
                netlifySiteId: siteId,
            })
        } catch (updateError: any) {
            console.error('Database update error:', updateError?.message || updateError)
        }

        // Update submission status to deployed
        try {
            await fetchMutation(api.submissions.updateStatus, {
                id: submissionId as Id<"submissions">,
                status: 'deployed'
            })
        } catch (statusError: any) {
            console.error('Status update error:', statusError?.message || statusError)
        }

        return NextResponse.json({
            success: true,
            url: publishedUrl,
            siteId,
            deployId: deployResponse.id,
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
 * Generate a URL-safe subdomain from business name
 */
function generateSubdomain(businessName: string): string {
    return businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
        .substring(0, 63)              // Netlify subdomain max length
        || 'business'                  // Fallback
}

/**
 * Create a new Netlify site
 */
async function createNetlifySite(
    token: string,
    name: string,
    teamSlug?: string
): Promise<NetlifySiteResponse> {
    const endpoint = teamSlug
        ? `https://api.netlify.com/api/v1/accounts/${teamSlug}/sites`
        : 'https://api.netlify.com/api/v1/sites'

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
    })

    if (!response.ok) {
        const error = await response.text()

        // If site name/subdomain is taken, try with a suffix
        if (response.status === 422 && (error.includes('subdomain') || error.includes('name') || error.includes('unique'))) {
            const uniqueName = `${name}-${Date.now().toString(36)}`
            return createNetlifySite(token, uniqueName, teamSlug)
        }

        throw new Error(`Failed to create Netlify site: ${error}`)
    }

    return response.json()
}

/**
 * Deploy HTML content to Netlify using direct file upload
 */
async function deployToNetlify(
    token: string,
    siteId: string,
    htmlContent: string,
    title: string
): Promise<NetlifyDeployResponse> {
    // Use the simpler deploy approach - deploy with file content directly
    // Netlify accepts deploys with file hashes, then we upload the files

    // Calculate SHA1 hash of the content (Netlify uses this for file addressing)
    const encoder = new TextEncoder()
    const data = encoder.encode(htmlContent)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const sha1 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Create deploy with file manifest
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: `Deploy: ${title}`,
            files: {
                '/index.html': sha1
            }
        })
    })

    if (!response.ok) {
        throw new Error(`Failed to create deploy: ${await response.text()}`)
    }

    const deploy = await response.json()

    // Check if index.html needs to be uploaded (it will be in required array)
    if (deploy.required && deploy.required.includes(sha1)) {
        // Upload the file
        const uploadResponse = await fetch(
            `https://api.netlify.com/api/v1/deploys/${deploy.id}/files/index.html`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream'
                },
                body: htmlContent
            }
        )

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${await uploadResponse.text()}`)
        }
    }

    return deploy
}
