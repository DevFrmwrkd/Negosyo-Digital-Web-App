import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchAction } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { checkRateLimit, RATE_LIMITS, validateString } from '@/lib/security'

/**
 * POST /api/admin/check-domain
 * Body: { domain: string, maxBudgetPHP?: number }
 *
 * Admin-only endpoint to check domain availability via Porkbun.
 * Returns availability, price, and alternative suggestions.
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Admin role check
        const creator = await fetchQuery(api.creators.getByClerkId, { clerkId: userId })
        if (!creator || creator.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Rate limit: standard (avoid hammering Porkbun)
        const { allowed } = checkRateLimit(
            `domain-check:${userId}`,
            RATE_LIMITS.standard.maxRequests,
            RATE_LIMITS.standard.windowMs
        )
        if (!allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }

        const body = await request.json()
        const domain = validateString(body.domain, 'domain', { maxLength: 253 })
        const maxBudgetPHP = typeof body.maxBudgetPHP === 'number' ? body.maxBudgetPHP : 500

        const result = await fetchAction(api.domains.checkDomainAvailability, {
            domain,
            maxBudgetPHP,
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Check domain error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to check domain' },
            { status: 500 }
        )
    }
}
