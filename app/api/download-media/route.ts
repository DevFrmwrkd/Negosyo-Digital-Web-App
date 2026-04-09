import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { validateFetchUrl, sanitizeFilename, checkRateLimit, RATE_LIMITS } from '@/lib/security'

export async function GET(request: NextRequest) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: standard
    const { allowed } = checkRateLimit(`download:${userId}`, RATE_LIMITS.standard.maxRequests, RATE_LIMITS.standard.windowMs)
    if (!allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const url = request.nextUrl.searchParams.get('url')
    const filename = request.nextUrl.searchParams.get('filename') || 'recording'

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL against allowed domains (prevents SSRF)
    try {
        validateFetchUrl(url)
    } catch {
        return NextResponse.json({ error: 'Invalid or disallowed URL' }, { status: 400 })
    }

    const response = await fetch(url)
    if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch file' }, { status: 502 })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const safeFilename = sanitizeFilename(filename)

    return new NextResponse(response.body, {
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${safeFilename}"`,
        },
    })
}
