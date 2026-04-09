"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

export default function ReviewSubmissionPage() {
    const router = useRouter()
    const { user, isLoaded, isSignedIn } = useUser()

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [agreed, setAgreed] = useState(false)
    const [submissionId, setSubmissionId] = useState<string | null>(null)

    // Get creator from Convex
    const creator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )

    // Get submission from Convex
    const submission = useQuery(
        api.submissions.getById,
        submissionId ? { id: submissionId as Id<"submissions"> } : "skip"
    )

    // Get resolved photo URLs
    const photoUrls = useQuery(
        api.files.getMultipleUrls,
        submission?.photos?.length ? { storageIds: submission.photos } : "skip"
    )

    // Get interview URL (video or audio)
    // First check R2 URLs (new), then fall back to storage IDs (legacy)
    const hasR2Video = !!submission?.videoUrl
    const hasR2Audio = !!submission?.audioUrl
    const interviewStorageId = submission?.videoStorageId || submission?.audioStorageId
    const legacyInterviewUrl = useQuery(
        api.files.getUrlByString,
        interviewStorageId && !hasR2Video && !hasR2Audio ? { storageId: interviewStorageId.toString() } : "skip"
    )
    // Use R2 URL if available, otherwise use legacy storage URL
    const interviewUrl = submission?.videoUrl || submission?.audioUrl || legacyInterviewUrl

    // Mutations
    const submitSubmission = useMutation(api.submissions.submit)

    // Redirect if not authenticated
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/login")
        }
    }, [isLoaded, isSignedIn, router])

    // Load submission ID from session
    useEffect(() => {
        const id = sessionStorage.getItem('current_submission_id')
        if (!id) {
            router.push('/submit/info')
            return
        }
        setSubmissionId(id)
    }, [router])

    const handleSubmit = async () => {
        if (!submission || !agreed || !submissionId) return

        setSubmitting(true)
        setError(null)

        try {
            // Update status to submitted
            await submitSubmission({ id: submissionId as Id<"submissions"> })

            // Navigate to success page
            router.push('/submit/success')
        } catch (err: any) {
            console.error('Error submitting:', err)
            setError(err.message || 'Failed to submit. Please try again.')
            setSubmitting(false)
        }
    }

    // Loading state
    if (!isLoaded || !isSignedIn || creator === undefined || submission === undefined) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    if (!submission) return null

    // Determine interview type and payout
    // Check both R2 URLs (new) and storage IDs (legacy)
    const hasVideo = !!submission.videoUrl || !!submission.videoStorageId
    const hasAudio = !!submission.audioUrl || !!submission.audioStorageId
    const payout = hasVideo ? 500 : (hasAudio ? 300 : 0)

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <span className="text-sm text-gray-500 font-medium">STEP 4 OF 4</span>
            </div>

            {/* Progress Bar */}
            <div className="px-4 mb-6">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-6 pb-6">
                <div className="max-w-md mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h1>
                        <p className="text-sm text-gray-500">
                            Please review all information before submitting.
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Business Info Section */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-900">Business Info</h3>
                            <Link href="/submit/info" className="text-sm text-green-600 font-medium hover:text-green-700">
                                Edit
                            </Link>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-medium">Business</label>
                                <p className="text-gray-900 font-medium">{submission.businessName}</p>
                                <p className="text-sm text-gray-500">{submission.businessType}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-medium">Owner</label>
                                <p className="text-gray-900">{submission.ownerName}</p>
                                <p className="text-sm text-gray-500">{submission.ownerPhone}</p>
                                {submission.ownerEmail && (
                                    <p className="text-sm text-gray-500">{submission.ownerEmail}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-medium">Location</label>
                                <p className="text-gray-900">{submission.address}</p>
                                <p className="text-sm text-gray-500">{submission.city}</p>
                            </div>
                        </div>
                    </div>

                    {/* Photos Section */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-900">Photos</h3>
                            <Link href="/submit/photos" className="text-sm text-green-600 font-medium hover:text-green-700">
                                Edit
                            </Link>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {(photoUrls || submission.photos || []).slice(0, 4).map((url: any, i: any) => (
                                    <div key={i} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                        {url && !url.startsWith('convex:') ? (
                                            <img
                                                src={url}
                                                alt={`Photo ${i + 1}`}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-gray-500">
                                {submission.photos?.length || 0} photos uploaded
                            </p>
                        </div>
                    </div>

                    {/* Interview Section */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-900">Interview</h3>
                            <Link href="/submit/interview" className="text-sm text-green-600 font-medium hover:text-green-700">
                                Edit
                            </Link>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                    {hasVideo ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    ) : hasAudio ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {hasVideo ? 'Video Interview' : hasAudio ? 'Audio Interview' : 'No interview uploaded'}
                                    </p>
                                    <p className="text-sm text-green-600 font-bold">
                                        Payout: ₱{payout}
                                    </p>
                                </div>
                            </div>

                            {/* Media Player */}
                            {interviewUrl && (
                                <div className="mt-4">
                                    {hasVideo ? (
                                        <video
                                            src={interviewUrl}
                                            controls
                                            className="w-full rounded-lg bg-black max-h-64"
                                            preload="metadata"
                                        />
                                    ) : hasAudio ? (
                                        <audio
                                            src={interviewUrl}
                                            controls
                                            className="w-full"
                                            preload="metadata"
                                        />
                                    ) : null}
                                </div>
                            )}
                            {(hasVideo || hasAudio) && !interviewUrl && (
                                <div className="mt-4 flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    <span className="ml-2 text-sm text-gray-500">Loading preview...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-3 p-4 bg-gray-100 rounded-xl">
                        <Checkbox
                            id="terms"
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white"
                            checked={agreed}
                            onCheckedChange={(checked) => setAgreed(checked as boolean)}
                        />
                        <div className="space-y-1">
                            <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I confirm this is a real business
                            </Label>
                            <p className="text-xs text-gray-500">
                                By submitting, I confirm that the business owner has agreed to the ₱1000 service fee and that all information provided is accurate.
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !agreed}
                        className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-500/20"
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-5 w-5" />
                                Submitting...
                            </span>
                        ) : (
                            'Submit Application'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
