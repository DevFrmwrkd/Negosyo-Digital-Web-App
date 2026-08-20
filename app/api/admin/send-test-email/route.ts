import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import {
    getMailerDiagnostics,
    sendPromoWebsiteLiveEmail,
    sendPaymentConfirmationEmail,
    sendPaymentLinkEmail,
    sendIntakeReceivedEmail,
} from '@/lib/email/service'
import { BASE_PRICE } from '@/lib/pricing'

/**
 * Send one of the real customer emails to the logged-in admin, to prove mail
 * actually leaves this deployment.
 *
 * GET  /api/admin/send-test-email                  → diagnostics only, sends nothing
 * POST /api/admin/send-test-email  {template?}     → renders and sends
 *
 * THE RECIPIENT IS NOT A PARAMETER. It is resolved from the caller's own
 * creator row, so this endpoint can only ever mail the person invoking it.
 * Every other sender in this app is bound to a submission and mails that
 * submission's real business owner — which makes all of them unusable as a
 * test, because a "test" that reaches a customer is not a test. Taking a `to`
 * address here would have re-introduced exactly that risk behind an admin
 * check; not accepting one removes it structurally.
 *
 * The sample data below is deliberately obvious nonsense. If one of these ever
 * escapes to a real inbox it should be unmistakable that nobody was billed and
 * nobody was given a website.
 */

const TEMPLATES = ['promo_free', 'payment_confirmation', 'payment_link', 'intake_received'] as const
type TemplateKey = (typeof TEMPLATES)[number]

const SAMPLE = {
    businessName: '[TEST] Sample Sari-Sari Store',
    businessOwnerName: 'Test Recipient',
    creatorName: 'Test Creator',
    websiteUrl: 'https://tendso.com',
}

export async function GET() {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const creator = await fetchQuery(api.creators.getByClerkId, { clerkId: userId })
    if (!creator || creator.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    return NextResponse.json({
        mailer: getMailerDiagnostics(),
        wouldSendTo: creator.email ?? null,
        templates: TEMPLATES,
    })
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const creator = await fetchQuery(api.creators.getByClerkId, { clerkId: userId })
        if (!creator || creator.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const to = creator.email
        if (!to) {
            return NextResponse.json(
                { error: 'Your admin account has no email address on file, so there is nowhere to send the test.' },
                { status: 400 }
            )
        }

        const body = await request.json().catch(() => ({}))
        const template: TemplateKey = TEMPLATES.includes(body?.template)
            ? body.template
            : 'promo_free'

        const diagnostics = getMailerDiagnostics()
        if (!diagnostics.apiKeyConfigured) {
            return NextResponse.json(
                {
                    error: 'RESEND_API_KEY is not set on this deployment, so no email can be sent from it.',
                    mailer: diagnostics,
                },
                { status: 503 }
            )
        }

        // Call the SAME named senders production uses, rather than re-rendering
        // here — a test that goes down its own code path proves nothing about
        // the one customers are on.
        switch (template) {
            case 'promo_free':
                await sendPromoWebsiteLiveEmail({
                    businessName: SAMPLE.businessName,
                    businessOwnerName: SAMPLE.businessOwnerName,
                    businessOwnerEmail: to,
                    websiteUrl: SAMPLE.websiteUrl,
                    creatorName: SAMPLE.creatorName,
                })
                break
            case 'payment_confirmation':
                await sendPaymentConfirmationEmail({
                    businessName: SAMPLE.businessName,
                    businessOwnerName: SAMPLE.businessOwnerName,
                    businessOwnerEmail: to,
                    websiteUrl: SAMPLE.websiteUrl,
                    amount: BASE_PRICE,
                })
                break
            case 'payment_link':
                await sendPaymentLinkEmail({
                    businessName: SAMPLE.businessName,
                    businessOwnerName: SAMPLE.businessOwnerName,
                    businessOwnerEmail: to,
                    websiteUrl: SAMPLE.websiteUrl,
                    amount: BASE_PRICE,
                    referenceCode: 'ND-TEST-TEST',
                })
                break
            case 'intake_received':
                await sendIntakeReceivedEmail({
                    businessName: SAMPLE.businessName,
                    businessOwnerName: SAMPLE.businessOwnerName,
                    businessOwnerEmail: to,
                    amount: BASE_PRICE,
                })
                break
        }

        return NextResponse.json({
            success: true,
            template,
            sentTo: to,
            mailer: diagnostics,
            // Surfaced as a result rather than a log line: this is the answer to
            // "why did my email look wrong / land in spam", and it is invisible
            // everywhere else.
            warnings: [
                diagnostics.usingTestSender &&
                    `Sent from ${diagnostics.from} — Resend's shared onboarding sender. It carries none of your domain's SPF/DKIM/DMARC alignment or reputation, so delivery to real customers is unreliable. Verify a domain in Resend and set RESEND_FROM_EMAIL.`,
                !diagnostics.replyTo &&
                    'RESEND_REPLY_TO is not set, so customer replies to this email will bounce — several templates explicitly invite a reply.',
            ].filter(Boolean),
        })
    } catch (error: any) {
        // The Resend error text is the useful part (unverified domain, invalid
        // key, recipient not allowed on the test sender), so pass it through.
        console.error('Test email error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to send test email', mailer: getMailerDiagnostics() },
            { status: 500 }
        )
    }
}
