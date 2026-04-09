import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Require authentication to view previews
        const { userId } = await auth()
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { id: submissionId } = await params

        if (!submissionId || !/^[a-zA-Z0-9_]+$/.test(submissionId)) {
            return new NextResponse('Invalid ID', { status: 400 })
        }

        // Get generated website from Convex
        const website = await fetchQuery(api.generatedWebsites.getBySubmissionId, {
            submissionId: submissionId as any
        })

        if (!website || !website.htmlContent) {
            return new NextResponse('Website not found', { status: 404 })
        }

        // Return HTML content with security headers
        return new NextResponse(website.htmlContent, {
            headers: {
                'Content-Type': 'text/html',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'SAMEORIGIN',
            },
        })
    } catch (error) {
        console.error('Error loading website preview:', error)
        return new NextResponse('Error loading website', { status: 500 })
    }
}
