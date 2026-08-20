import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { sendPromoWebsiteLiveEmail } from '@/lib/email/service'

/**
 * PROMO — give the website away, pay the creator anyway.
 * POST /api/mark-comped
 *
 * The sibling of /api/mark-paid, and deliberately a separate route rather than
 * a `comped: true` flag on that one. The two differ in what they tell the
 * business owner — a receipt versus a gift notice — and a boolean deep in a
 * shared handler is one careless edit away from mailing the wrong one.
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify admin role
        const creator = await fetchQuery(api.creators.getByClerkId, { clerkId: userId })
        if (!creator || creator.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { submissionId, reason } = body

        if (!submissionId) {
            return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 })
        }

        // Read with the creator joined — the promo email names the person who
        // gave the site away, and this is the query that already resolves them.
        const submission = await fetchQuery(api.submissions.getByIdWithCreator, {
            id: submissionId as Id<'submissions'>,
        })

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
        }

        // Credit the creator and stamp the row as comped. Every refusal that
        // matters (already settled, custom-domain tier, no website yet) lives in
        // the mutation, so it applies to any caller and not just this route.
        await fetchMutation(api.admin.markComped, {
            submissionId: submissionId as Id<'submissions'>,
            adminId: userId,
            reason: typeof reason === 'string' && reason.trim() ? reason.trim() : undefined,
        })

        // Tell the owner their site is live and free. NOT the payment
        // confirmation email — see sendPromoWebsiteLiveEmail.
        let emailSent = false
        if (submission.ownerEmail) {
            let publishedUrl = ''
            try {
                const website = await fetchQuery(api.generatedWebsites.getBySubmissionId, {
                    submissionId: submissionId as Id<'submissions'>,
                })
                publishedUrl = website?.publishedUrl || ''
            } catch {
                // Non-fatal: the credit is already booked and the owner can be
                // mailed by hand. Never fail the comp over a missing URL.
            }

            // Only mail a link that actually resolves. The payment-confirmation
            // route falls back to the string 'Your website is live!' here, which
            // renders as a dead href — fine-ish on a receipt the owner expected,
            // wrong on an unsolicited "here is your free website" email, where a
            // broken link is the difference between a gift and a phishing smell.
            const creatorName = [submission.creator?.firstName, submission.creator?.lastName]
                .filter(Boolean)
                .join(' ')
                .trim()

            if (publishedUrl) {
                try {
                    await sendPromoWebsiteLiveEmail({
                        businessName: submission.businessName,
                        businessOwnerName: submission.ownerName,
                        businessOwnerEmail: submission.ownerEmail,
                        websiteUrl: publishedUrl,
                        creatorName: creatorName || undefined,
                    })
                    emailSent = true
                } catch (emailError: any) {
                    console.error('Failed to send promo website live email:', emailError)
                    // Don't fail the whole operation — the creator is already credited.
                }
            }
        }

        return NextResponse.json({
            success: true,
            emailSent,
            message: emailSent
                ? `Website given free. Creator credited, and ${submission.ownerEmail} was told it is live at no charge.`
                : 'Website given free and creator credited. No email went out — publish the site and/or add an owner email, then notify them manually.',
        })
    } catch (error: any) {
        console.error('Mark comped error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to give this website away' },
            { status: 500 }
        )
    }
}
