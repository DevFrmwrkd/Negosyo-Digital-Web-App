import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { sendApprovalEmail } from '@/lib/email/service'

/**
 * Send website URL to business owner via email
 * Uses existing nodemailer configuration with Convex for data
 * POST /api/send-website-email
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
        const { submissionId, websiteUrl } = body

        if (!submissionId) {
            return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 })
        }

        // Get the submission from Convex
        const submission = await fetchQuery(api.submissions.getById, {
            id: submissionId as Id<"submissions">
        })

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
        }

        if (!submission.ownerEmail) {
            return NextResponse.json({ error: 'Business owner email not found' }, { status: 400 })
        }

        // Get published URL from generated_websites if not provided
        let publishedUrl = websiteUrl
        if (!publishedUrl) {
            const website = await fetchQuery(api.generatedWebsites.getBySubmissionId, {
                submissionId: submissionId as Id<"submissions">
            })
            publishedUrl = website?.publishedUrl
        }

        if (!publishedUrl) {
            return NextResponse.json({ error: 'Website URL is required. Publish the website first.' }, { status: 400 })
        }

        // Send email using existing nodemailer service
        await sendApprovalEmail({
            businessName: submission.businessName,
            businessOwnerName: submission.ownerName,
            businessOwnerEmail: submission.ownerEmail,
            websiteUrl: publishedUrl,
            amount: submission.amount ?? 0,
            submissionId: submissionId
        })

        // Mark email as sent: sets status → pending_payment and records sentEmailAt timestamp
        await fetchMutation(api.admin.markEmailSent, {
            submissionId: submissionId as Id<"submissions">,
            adminId: userId,
        })

        return NextResponse.json({
            success: true,
            message: `Email sent successfully to ${submission.ownerEmail}`
        })

    } catch (error: any) {
        console.error('Send email error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to send email' },
            { status: 500 }
        )
    }
}
