import { NextRequest, NextResponse } from 'next/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: submissionId } = await params

        // Get generated website from Convex
        const website = await fetchQuery(api.generatedWebsites.getBySubmissionId, {
            submissionId: submissionId as any
        })

        if (!website || !website.htmlContent) {
            return new NextResponse('Website not found', { status: 404 })
        }

        // Return HTML content
        return new NextResponse(website.htmlContent, {
            headers: {
                'Content-Type': 'text/html',
            },
        })
    } catch (error) {
        console.error('Error loading website preview:', error)
        return new NextResponse('Error loading website', { status: 500 })
    }
}
