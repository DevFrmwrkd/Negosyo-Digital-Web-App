import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { deployHoldingPage } from '@/lib/holding-page'

/**
 * Take a published website offline.
 * POST /api/unpublish-website
 *
 * This used to DELETE a Cloudflare Pages project. Sites are deployed as
 * Workers, so that call 404'd on every site this platform has ever published,
 * the 404 was treated as success, and the site stayed live while the admin was
 * told it had been unpublished.
 *
 * It now redeploys the same Worker with a holding page: the content genuinely
 * stops being served, and the Worker, its URL and any attached custom domain
 * survive so that publishing again restores the exact site at the same address.
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

        const website = await fetchQuery(api.generatedWebsites.getBySubmissionId, {
            submissionId: submissionId as Id<"submissions">
        })

        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 })
        }

        // cfPagesProjectName holds the Worker script name despite the field's
        // name (see convex/domains.ts, which attaches custom domains to it).
        const workerName = website.cfPagesProjectName
        if (!workerName) {
            return NextResponse.json({ error: 'Website is not published' }, { status: 400 })
        }

        const cfApiToken = process.env.CLOUDFLARE_API_TOKEN
        const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID

        // Refuse rather than report a takedown that cannot have happened.
        if (!cfApiToken || !cfAccountId) {
            return NextResponse.json(
                { error: 'Cloudflare credentials not configured — cannot take the site offline. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.' },
                { status: 500 }
            )
        }

        const submission = await fetchQuery(api.submissions.getById, {
            id: submissionId as Id<"submissions">
        })

        // Any failure here throws and is reported. The database is only touched
        // once Cloudflare has confirmed the holding page is live.
        await deployHoldingPage(cfApiToken, cfAccountId, workerName, submission?.businessName || '')

        await fetchMutation(api.generatedWebsites.markOffline, {
            submissionId: submissionId as Id<"submissions">
        })

        // 'unpublished', matching what the non-payment cron sets — so a site
        // taken down by hand and one pulled for non-payment land in the same
        // place in the admin queue. It used to be set to 'approved', which hid
        // manual takedowns among the in-progress submissions.
        try {
            await fetchMutation(api.submissions.setUnpublished, {
                id: submissionId as Id<"submissions">
            })
        } catch (statusError) {
            console.error('Status update error:', statusError)
        }

        return NextResponse.json({
            success: true,
            message: 'Website taken offline. Publish again to restore it at the same address.'
        })

    } catch (error) {
        console.error('Unpublish error:', error)
        const message = error instanceof Error ? error.message : ''
        return NextResponse.json(
            { error: message || 'Failed to take the website offline' },
            { status: 500 }
        )
    }
}
