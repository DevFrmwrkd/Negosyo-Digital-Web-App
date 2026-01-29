"use client"

import { useUser, SignOutButton } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Profile from '@/public/profile.png'
import Image from "next/image"
import Link from "next/link"
import { Wallet, Store, Plus, Clock, Loader2, LogOut } from "lucide-react"

export default function DashboardPage() {
    const router = useRouter()
    const { user, isLoaded, isSignedIn } = useUser()

    // Get creator profile from Convex
    const creator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )

    // Get submissions from Convex
    const submissions = useQuery(
        api.submissions.getByCreatorId,
        creator?._id ? { creatorId: creator._id } : "skip"
    )

    // Redirect to login if not authenticated
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/login")
        }
    }, [isLoaded, isSignedIn, router])

    // Redirect to onboarding if no creator profile
    useEffect(() => {
        if (isLoaded && isSignedIn && creator === null) {
            router.push("/onboarding")
        }
    }, [isLoaded, isSignedIn, creator, router])

    // Redirect admin users to admin dashboard
    useEffect(() => {
        if (isLoaded && isSignedIn && creator && creator.role === 'admin') {
            router.push("/admin")
        }
    }, [isLoaded, isSignedIn, creator, router])

    // Loading state - also keep loading for admins until they redirect
    if (!isLoaded || !isSignedIn || creator === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    // Still loading creator, redirecting to onboarding, OR admin redirecting
    if (!creator || creator.role === 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    // Get recent submissions (limit to 3)
    const recentSubmissions = submissions?.slice(0, 3) || []

    return (
        <div className="min-h-screen bg-white font-sans pb-24 overflow-x-hidden">
            {/* Header */}
            <header className="px-4 pt-6 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center overflow-hidden border border-zinc-200">
                            <Image src={Profile} alt="Profile" width={40} height={40} />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">Welcome back</p>
                            <h1 className="text-lg font-bold text-zinc-900 leading-none">
                                Mabuhay, {creator.firstName || "Creator"}!
                            </h1>
                        </div>
                    </div>
                    <SignOutButton redirectUrl="/login">
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900 p-2">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </SignOutButton>
                </div>
            </header>

            <main className="px-4 space-y-5">
                {/* Balance Card */}
                <div className="bg-zinc-900 text-white rounded-3xl p-5 relative overflow-hidden shadow-xl shadow-zinc-900/20">
                    {/* Abstract background effect */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className="text-zinc-400 text-xs font-medium">Available Balance</span>
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-400">
                            <Wallet className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    <div className="mb-5 relative z-10">
                        <span className="text-3xl font-bold tracking-tight">
                            ₱ {creator.balance?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </span>
                    </div>
                </div>

                {/* Submission Status */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-zinc-900">Submission Status</h2>
                        <Link href="/submissions" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">View All</Link>
                    </div>
                    <div className="space-y-3">
                        {recentSubmissions.map((sub) => {
                            const isIncomplete = (!sub.photos || sub.photos.length === 0) || (!sub.videoStorageId && !sub.audioStorageId && !sub.videoUrl && !sub.audioUrl)
                            const isDraft = sub.status === 'draft' || isIncomplete

                            const getStatusBg = () => {
                                if (sub.status === 'approved') return 'bg-emerald-100 text-emerald-600'
                                if (sub.status === 'rejected') return 'bg-red-100 text-red-600'
                                if (isDraft) return 'bg-zinc-100 text-zinc-500'
                                return 'bg-yellow-100 text-yellow-600'
                            }

                            const getStatusBadge = () => {
                                if (sub.status === 'approved') return { bg: 'bg-emerald-100 text-emerald-700', text: 'Verified' }
                                if (sub.status === 'rejected') return { bg: 'bg-red-100 text-red-700', text: 'Rejected' }
                                if (isDraft) return { bg: 'bg-zinc-100 text-zinc-600', text: 'Draft' }
                                return { bg: 'bg-yellow-100 text-yellow-700', text: 'Pending' }
                            }

                            const badge = getStatusBadge()

                            return (
                                <Link key={sub._id} href={`/submissions/${sub._id}`}>
                                    <div className="bg-white rounded-xl p-3 border border-zinc-100 shadow-sm flex items-center justify-between hover:border-zinc-200 hover:shadow-md transition-all cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getStatusBg()}`}>
                                                {isDraft ? <Clock className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-zinc-900">{sub.businessName}</h3>
                                                <p className="text-[10px] text-zinc-500">
                                                    Submitted {new Date(sub._creationTime).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badge.bg}`}>
                                            {badge.text}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                        {recentSubmissions.length === 0 && (
                            <div className="text-center py-6 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                                <p className="text-zinc-500 text-xs">No submissions yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-2 pb-6 flex items-center justify-center z-50">
                {/* Floating Action Button */}
                <div className="relative -top-6">
                    <Link
                        href="/submit/info"
                        className="group flex items-center gap-0 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/50 transition-all duration-300 ease-out overflow-hidden"
                    >
                        <div className="w-14 h-14 flex items-center justify-center shrink-0">
                            <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
                        </div>
                        <span className="max-w-0 overflow-hidden whitespace-nowrap font-bold text-sm group-hover:max-w-[120px] group-hover:pr-5 transition-all duration-300 ease-out">
                            Add Submission
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
