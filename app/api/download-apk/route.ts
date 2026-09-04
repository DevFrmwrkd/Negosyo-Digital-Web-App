import { NextRequest, NextResponse } from 'next/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

/**
 * GET /api/download-apk
 *
 * Kept only for links that predate the Play Store listing — Discord posts,
 * messages, bookmarks. There is no APK any more: the app ships through Google
 * Play, so this sends the visitor to the listing, which is what someone
 * following an "install the Android app" link actually wants.
 *
 * Not deleted, because a 404 would strand every one of those old links. It can
 * go once they have aged out.
 */
export async function GET(_request: NextRequest) {
    try {
        const playStoreUrl = (await fetchQuery(api.settings.get, {
            key: 'play_store_url',
        })) as string | null | undefined

        if (!playStoreUrl || !playStoreUrl.trim()) {
            return NextResponse.json(
                { error: 'The Android app listing is not configured.' },
                { status: 404 },
            )
        }

        return NextResponse.redirect(playStoreUrl.trim(), { status: 302 })
    } catch (err) {
        console.error('download-apk redirect error:', err)
        const message = err instanceof Error ? err.message : ''
        return NextResponse.json(
            { error: message || 'Internal server error' },
            { status: 500 },
        )
    }
}
