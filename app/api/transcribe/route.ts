import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { groqService } from '@/lib/services/groq.service'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
    let submissionId: string | undefined

    try {
        // Check Clerk authentication
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { audioUrl, useConvexStorage, videoStorageId, audioStorageId, videoUrl } = body
        submissionId = body.submissionId

        // Priority: R2 URLs (videoUrl/audioUrl from body) > Convex storage URLs
        let mediaUrl = videoUrl || audioUrl

        // If no direct URL and using Convex storage, get the actual URL
        if (!mediaUrl && useConvexStorage && (videoStorageId || audioStorageId)) {
            const storageId = videoStorageId || audioStorageId
            try {
                // Get URL from Convex storage
                const url = await convex.query(api.files.getUrlByString, {
                    storageId: storageId.toString()
                })
                if (url) {
                    mediaUrl = url
                }
            } catch (err) {
                console.error('Error getting Convex storage URL:', err)
                return NextResponse.json({ error: 'Failed to get media URL' }, { status: 500 })
            }
        }

        if (!mediaUrl) {
            return NextResponse.json({ error: 'Audio/Video URL is required' }, { status: 400 })
        }

        // Set transcription status to processing
        if (submissionId) {
            try {
                await convex.mutation(api.submissions.update, {
                    id: submissionId as Id<"submissions">,
                    transcriptionStatus: 'processing',
                })
            } catch (err) {
                console.error('Error setting transcription status:', err)
            }
        }

        // Transcribe audio
        const transcript = await groqService.transcribeAudioFromUrl(mediaUrl)

        // Update submission with transcript and status if submissionId provided
        if (submissionId) {
            try {
                await convex.mutation(api.submissions.update, {
                    id: submissionId as Id<"submissions">,
                    transcript: transcript,
                    transcriptionStatus: 'complete',
                })
            } catch (err) {
                console.error('Error updating submission:', err)
                return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 })
            }
        }

        return NextResponse.json({
            success: true,
            transcript,
        })
    } catch (error: any) {
        console.error('Transcription API error:', error)

        // Set transcription status to failed
        if (submissionId) {
            try {
                await convex.mutation(api.submissions.update, {
                    id: submissionId as Id<"submissions">,
                    transcriptionStatus: 'failed',
                })
            } catch (updateErr) {
                console.error('Error setting failed status:', updateErr)
            }
        }

        return NextResponse.json(
            { error: error.message || 'Failed to transcribe audio' },
            { status: 500 }
        )
    }
}
