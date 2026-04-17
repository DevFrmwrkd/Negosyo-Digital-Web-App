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
import { Loader2, Globe, CheckCircle2, XCircle, Search } from "lucide-react"

interface DomainCheckResult {
    valid: boolean
    available?: boolean
    domain?: string
    priceUSD?: number
    pricePHP?: number
    withinBudget?: boolean
    reason?: string
    error?: string
    suggestions?: Array<{ domain: string; pricePHP: number; withinBudget: boolean }>
}

export default function ReviewSubmissionPage() {
    const router = useRouter()
    const { user, isLoaded, isSignedIn } = useUser()

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [agreed, setAgreed] = useState(false)
    const [submissionId, setSubmissionId] = useState<string | null>(null)

    // Custom domain state — tier is auto-derived from whether the input has content
    const [domainInput, setDomainInput] = useState('')
    const [domainCheck, setDomainCheck] = useState<DomainCheckResult | null>(null)
    const [checkingDomain, setCheckingDomain] = useState(false)
    // Auto-derived: if user typed something, tier is "with_custom_domain"
    const wantsCustomDomain = domainInput.trim().length > 0
    const tier: 'standard' | 'with_custom_domain' = wantsCustomDomain ? 'with_custom_domain' : 'standard'
    const totalAmount = wantsCustomDomain ? 1500 : 1000

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
    const setDomainTier = useMutation(api.submissions.setDomainTier)

    // Debounced domain availability check (500ms after typing stops)
    useEffect(() => {
        if (!domainInput.trim()) {
            setDomainCheck(null)
            return
        }
        const timer = setTimeout(async () => {
            setCheckingDomain(true)
            try {
                const response = await fetch('/api/check-domain', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domain: domainInput.trim().toLowerCase(), maxBudgetPHP: 500 }),
                })
                const data = await response.json()
                setDomainCheck(data)
            } catch (err) {
                setDomainCheck({ valid: false, error: 'Network error' })
            } finally {
                setCheckingDomain(false)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [domainInput])

    // Pre-fill from existing submission if it has a saved domain
    useEffect(() => {
        if (submission) {
            const subAny = submission as any
            if (subAny.requestedDomain) setDomainInput(subAny.requestedDomain)
        }
    }, [submission])

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

        // If user typed a domain, it must be valid + within budget
        if (wantsCustomDomain) {
            if (!domainCheck?.available || !domainCheck?.withinBudget) {
                setError('The custom domain you typed is not available or exceeds the ₱500 budget. Either pick a different domain or clear the field to submit without a custom domain.')
                return
            }
        }

        setSubmitting(true)
        setError(null)

        try {
            // Save tier + domain choice (auto-derived from input)
            await setDomainTier({
                id: submissionId as Id<"submissions">,
                submissionType: tier,
                requestedDomain: wantsCustomDomain ? domainInput.trim().toLowerCase() : undefined,
            })

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

                    {/* Custom Domain (optional) — typing here auto-flags submission as ₱1,500 */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Globe size={18} className="text-emerald-600" />
                                Custom Domain (Optional)
                            </h3>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${wantsCustomDomain ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                {wantsCustomDomain ? '+₱500' : 'Not included'}
                            </span>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-gray-500">
                                Leave this blank for the standard package (₱1,000, free subdomain). Type a domain to add a custom domain — your fee automatically becomes ₱1,500 and includes year 1 of the domain.
                            </p>

                            <div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={domainInput}
                                        onChange={(e) => setDomainInput(e.target.value)}
                                        placeholder="e.g. yourbusiness.com (leave blank for standard)"
                                        className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {checkingDomain ? (
                                            <Loader2 className="animate-spin text-gray-400" size={18} />
                                        ) : domainCheck?.available && domainCheck?.withinBudget ? (
                                            <CheckCircle2 className="text-green-600" size={18} />
                                        ) : domainCheck && !domainCheck.available ? (
                                            <XCircle className="text-red-600" size={18} />
                                        ) : (
                                            <Search className="text-gray-400" size={18} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Result */}
                            {wantsCustomDomain && domainCheck && !checkingDomain && (
                                <div className="text-xs">
                                    {domainCheck.available && domainCheck.withinBudget && (
                                        <p className="text-green-700 font-semibold">
                                            ✓ Available · ₱{domainCheck.pricePHP} (within budget — included in your ₱1,500 fee)
                                        </p>
                                    )}
                                    {domainCheck.available && !domainCheck.withinBudget && (
                                        <p className="text-amber-700 font-semibold">
                                            ⚠ Available but ₱{domainCheck.pricePHP} exceeds the ₱500 included budget. Pick another domain.
                                        </p>
                                    )}
                                    {!domainCheck.available && (
                                        <p className="text-red-700 font-semibold">
                                            ✗ {domainCheck.reason || 'Not available'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Suggestions */}
                            {wantsCustomDomain && domainCheck?.suggestions && domainCheck.suggestions.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Try these alternatives:</p>
                                    <div className="space-y-1.5">
                                        {domainCheck.suggestions.slice(0, 5).map((sug) => (
                                            <button
                                                key={sug.domain}
                                                type="button"
                                                onClick={() => setDomainInput(sug.domain)}
                                                disabled={!sug.withinBudget}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition-all ${
                                                    sug.withinBudget
                                                        ? 'bg-white hover:border-emerald-400 border-gray-200'
                                                        : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                                                }`}
                                            >
                                                <span className="font-mono font-semibold text-gray-900">{sug.domain}</span>
                                                <span className={`font-semibold ${sug.withinBudget ? 'text-green-700' : 'text-amber-700'}`}>
                                                    ₱{sug.pricePHP} {sug.withinBudget ? '✓' : '(over)'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Renewal disclaimer (only when domain is being added) */}
                            {wantsCustomDomain && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        <strong>Year 1 included free.</strong> After year 1, the domain renewal is approximately
                                        <strong> ₱1,120/year ($20)</strong> and is the business owner's responsibility.
                                        We do <strong>NOT</strong> auto-renew — full control stays with you. We'll send a reminder
                                        30 days before expiry.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Total amount summary */}
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="text-sm font-semibold text-gray-700">Total business owner fee</span>
                        <span className="text-2xl font-black text-emerald-700">₱{totalAmount.toLocaleString()}</span>
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
                                By submitting, I confirm that the business owner has agreed to the ₱{totalAmount.toLocaleString()} service fee and that all information provided is accurate.
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
