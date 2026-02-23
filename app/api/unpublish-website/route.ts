import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

/**
 * Unpublish a website from Cloudflare Pages
 * POST /api/unpublish-website
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
            return NextResponse.json({ error: 'Website not found' }, { status: 404 })
        }

        if (!website.cfPagesProjectName && !website.netlifySiteId) {
            return NextResponse.json({ error: 'Website is not published' }, { status: 400 })
        }

        // Delete the Cloudflare Pages project (if it exists)
        if (website.cfPagesProjectName) {
            const cfApiToken = process.env.CLOUDFLARE_API_TOKEN
            const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID

            if (cfApiToken && cfAccountId) {
                try {
                    const deleteResponse = await fetch(
                        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${website.cfPagesProjectName}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${cfApiToken}`,
                            },
                        }
                    )

                    if (!deleteResponse.ok && deleteResponse.status !== 404) {
                        console.error('CF Pages delete error:', await deleteResponse.text())
                    }
                } catch (cfError) {
                    console.error('CF Pages API error:', cfError)
                }
            }
        }

        // Delete the legacy Netlify site (if it exists)
        if (website.netlifySiteId) {
            const netlifyToken = process.env.NETLIFY_ACCESS_TOKEN
            if (netlifyToken) {
                try {
                    const deleteResponse = await fetch(
                        `https://api.netlify.com/api/v1/sites/${website.netlifySiteId}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${netlifyToken}`,
                            },
                        }
                    )
                    if (!deleteResponse.ok && deleteResponse.status !== 404) {
                        console.error('Netlify delete error:', await deleteResponse.text())
                    }
                } catch (netlifyError) {
                    console.error('Netlify API error:', netlifyError)
                }
            }
        }

        // Update the website record in Convex to remove publishing info
        await fetchMutation(api.generatedWebsites.unpublish, {
            submissionId: submissionId as Id<"submissions">
        })

        // Update submission status back to approved
        try {
            await fetchMutation(api.submissions.updateStatus, {
                id: submissionId as Id<"submissions">,
                status: 'approved'
            })
        } catch (statusError) {
            console.error('Status update error:', statusError)
        }

        return NextResponse.json({
            success: true,
            message: 'Website unpublished successfully'
        })

    } catch (error: any) {
        console.error('Unpublish error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to unpublish website' },
            { status: 500 }
        )
    }
}
