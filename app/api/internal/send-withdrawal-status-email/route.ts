import { NextRequest, NextResponse } from 'next/server'
import { sendWithdrawalStatusEmail } from '@/lib/email/service'

/**
 * POST /api/internal/send-withdrawal-status-email
 *
 * Internal endpoint called by Convex action `withdrawals.sendStatusEmailAction` when the
 * withdrawal status follow-up cron detects a stale or changed transfer state.
 *
 * Auth: shared secret in X-Internal-Secret header (matches INTERNAL_API_SECRET env var)
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
            statusLabel,
            statusDescription,
            isFinal,
            referenceCode,
            submittedAt,
        } = body

        if (!creatorEmail || !creatorName || typeof amount !== 'number' || !statusLabel) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        await sendWithdrawalStatusEmail({
            creatorName,
            creatorEmail,
            amount,
            statusLabel,
            statusDescription: statusDescription || '',
            isFinal: !!isFinal,
            referenceCode,
            submittedAt: submittedAt || Date.now(),
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('send-withdrawal-status-email error:', error)
        return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
    }
}
