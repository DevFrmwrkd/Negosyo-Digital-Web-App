import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendApprovalEmail } from '@/lib/email/service'

export async function POST(request: NextRequest) {
    try {
        // Check admin auth using server-side client
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const { data: creator, error: creatorError } = await supabase
            .from('creators')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (creatorError) {
            console.error('Error checking creator role:', creatorError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (!creator || creator?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
        }

        const { submissionId } = await request.json()

        if (!submissionId) {
            return NextResponse.json({ error: 'Submission ID required' }, { status: 400 })
        }

        // Get submission details directly
        const { data: submission, error: submissionError } = await supabase
            .from('submissions')
            .select('*')
            .eq('id', submissionId)
            .maybeSingle()

        if (submissionError) {
            console.error('Error fetching submission:', submissionError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
        }

        // Get published URL from generated_websites table
        const { data: website } = await supabase
            .from('generated_websites')
            .select('published_url')
            .eq('submission_id', submissionId)
            .single()

        const publishedUrl = website?.published_url || submission.website_url || 'https://your-website.netlify.app'

        // Send approval email
        await sendApprovalEmail({
            businessName: submission.business_name,
            businessOwnerName: submission.owner_name,
            businessOwnerEmail: submission.owner_email,
            websiteUrl: publishedUrl,
            amount: submission.amount,
            submissionId: submission.id
        })

        return NextResponse.json({ success: true, message: 'Approval email sent' })
    } catch (error: any) {
        console.error('Error sending approval email:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to send email' },
            { status: 500 }
        )
    }
}
