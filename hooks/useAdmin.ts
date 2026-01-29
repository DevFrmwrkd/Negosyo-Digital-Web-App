"use client"

import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Hook to check if user is admin and redirect if not
 * Uses Clerk for auth and Convex for role check
 */
export function useAdminAuth() {
    const router = useRouter()
    const { user, isLoaded, isSignedIn } = useUser()
    const [hasRedirected, setHasRedirected] = useState(false)

    // Get creator profile from Convex
    const creator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )

    // Determine if user is admin
    const isAdmin = creator?.role === 'admin'
    const loading = !isLoaded || (isSignedIn && creator === undefined)

    // Handle redirects - only for truly unauthorized users
    useEffect(() => {
        if (hasRedirected) return // Prevent multiple redirects

        if (isLoaded && !isSignedIn) {
            setHasRedirected(true)
            router.push('/login')
            return
        }

        // Wait for creator data to load
        if (isSignedIn && creator !== undefined) {
            if (creator === null) {
                // No profile, redirect to onboarding
                setHasRedirected(true)
                router.push('/onboarding')
            }
            // Note: Non-admins are NOT redirected here anymore
            // The admin page will just show unauthorized message
        }
    }, [isLoaded, isSignedIn, creator, router, hasRedirected])

    return { isAdmin, loading, creator }
}

/**
 * Hook to fetch all submissions (using Convex)
 */
export function useSubmissions() {
    const { isAdmin } = useAdminAuth()

    // Get all submissions from Convex
    const submissions = useQuery(
        api.submissions.getAllWithCreator,
        isAdmin ? {} : "skip"
    )

    const loading = submissions === undefined
    const error = null

    // Transform to match expected format
    const formattedSubmissions = (submissions || []).map((s: any) => ({
        id: s._id,
        business_name: s.businessName,
        owner_name: s.ownerName,
        business_type: s.businessType,
        status: s.status,
        creator_payout: s.creatorPayout || 0,
        created_at: s._creationTime,
        creators: s.creator ? {
            first_name: s.creator.firstName,
            last_name: s.creator.lastName,
        } : null,
    }))

    const refresh = () => {
        // Convex queries auto-refresh, this is just for API compatibility
    }

    return { submissions: formattedSubmissions, loading, error, refresh }
}

/**
 * Hook to fetch single submission with creator info (using Convex)
 */
export function useSubmission(id: string) {
    const { isAdmin } = useAdminAuth()

    // We won't use this hook for now - use Convex directly in components
    return {
        submission: null,
        creator: null,
        loading: false,
        error: 'Use Convex queries directly',
        refresh: () => { }
    }
}

/**
 * Hook to update submission status (using Convex)
 */
export function useSubmissionStatus(submissionId: string) {
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const updateStatus = async (newStatus: string): Promise<boolean> => {
        // This should use Convex mutations directly in the component
        return false
    }

    return { updateStatus, updating, error }
}
