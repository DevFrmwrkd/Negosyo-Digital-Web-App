import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = request.nextUrl.searchParams.get('url')
    const filename = request.nextUrl.searchParams.get('filename') || 'recording'

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const response = await fetch(url)
    if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch file' }, { status: 502 })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    return new NextResponse(response.body, {
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
}
