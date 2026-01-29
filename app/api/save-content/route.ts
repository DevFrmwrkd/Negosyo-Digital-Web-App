import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export async function POST(request: NextRequest) {
    try {
        // Check Clerk authentication
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin using Convex
        const creator = await fetchQuery(api.creators.getByClerkId, { clerkId: userId })
        if (!creator || creator.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { submissionId, content, customizations } = await request.json()

        if (!submissionId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get existing website to get current template and other data
        const existingWebsite = await fetchQuery(api.generatedWebsites.getBySubmissionId, {
            submissionId: submissionId
        })

        if (!existingWebsite) {
            return NextResponse.json({ error: 'Website not found. Generate it first.' }, { status: 404 })
        }

        // Update the website's extracted content in Convex
        await fetchMutation(api.generatedWebsites.upsert, {
            submissionId: submissionId,
            templateName: existingWebsite.templateName,
            extractedContent: content,
            customizations: customizations || existingWebsite.customizations,
            htmlContent: existingWebsite.htmlContent,
            status: existingWebsite.status,
        })

        // Regenerate the website with new content
        const regenerateResponse = await fetch(`${request.nextUrl.origin}/api/generate-website`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || ''
            },
            body: JSON.stringify({
                submissionId,
                customizations: customizations || existingWebsite.customizations
            })
        })

        if (!regenerateResponse.ok) {
            const errorData = await regenerateResponse.json()
            console.error('Regeneration failed:', errorData)
            return NextResponse.json({ error: 'Content saved but regeneration failed', details: errorData }, { status: 500 })
        }

        const regenerateData = await regenerateResponse.json()

        return NextResponse.json({
            success: true,
            message: 'Content updated and website regenerated',
            htmlContent: regenerateData.htmlContent
        })
    } catch (error) {
        console.error('Save content error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
