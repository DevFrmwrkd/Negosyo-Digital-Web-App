import { NextRequest, NextResponse } from 'next/server'
import { sendAnnouncementEmail } from '@/lib/email/service'

/**
 * POST /api/internal/send-announcement-email
 *
 * One recipient of an admin broadcast. Called once per creator by the Convex
 * action `announcements.sendOneEmail`, which staggers the calls.
 *
 * Auth: shared secret in X-Internal-Secret header (matches INTERNAL_API_SECRET).
 * Must stay inside the `/api/internal(.*)` allowlist in proxy.ts, or
 * clerkMiddleware redirects the POST to /login and every send dies as a 405.
 */
export async function POST(request: NextRequest) {
    try {
        const providedSecret = request.headers.get('x-internal-secret')
        const expectedSecret = process.env.INTERNAL_API_SECRET
        if (!expectedSecret || providedSecret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { to, name, title, body } = await request.json()

        if (!to || !title || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        await sendAnnouncementEmail({ to, name: name || 'there', title, body })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('send-announcement-email error:', error)
        return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
    }
}
