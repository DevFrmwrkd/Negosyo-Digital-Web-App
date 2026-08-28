import { NextRequest, NextResponse } from 'next/server'
import { sendWithdrawalRequestedEmail } from '@/lib/email/service'

/**
 * POST /api/internal/send-withdrawal-requested-email
 *
 * Internal endpoint called by Convex action `withdrawals.sendRequestedEmailAction`
 * the moment a creator submits a withdrawal.
 *
 * Auth: shared secret in X-Internal-Secret header (matches INTERNAL_API_SECRET env var).
 * Must stay inside the `/api/internal(.*)` allowlist in proxy.ts, or clerkMiddleware
 * redirects the POST to /login and the send fails with a silent 405.
 */
export async function POST(request: NextRequest) {
    try {
        const providedSecret = request.headers.get('x-internal-secret')
        const expectedSecret = process.env.INTERNAL_API_SECRET
        if (!expectedSecret || providedSecret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            creatorEmail,
            creatorName,
            amount,
            wiseEmail,
            reference,
            requestedAt,
            wiseSenderName,
        } = body

        if (!creatorEmail || !creatorName || typeof amount !== 'number' || !wiseEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        await sendWithdrawalRequestedEmail({
            creatorName,
            creatorEmail,
            amount,
            wiseEmail,
            reference,
            requestedAt: requestedAt || Date.now(),
            wiseSenderName,
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('send-withdrawal-requested-email error:', error)
        return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
    }
}
