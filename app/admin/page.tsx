"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useClerk } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAdminAuth, useSubmissions } from "@/hooks/useAdmin"

export default function AdminDashboard() {
    const router = useRouter()
    const { signOut } = useClerk()
    const { isAdmin, loading: authLoading } = useAdminAuth()
    const { submissions, loading: submissionsLoading, refresh } = useSubmissions()
    const [filter, setFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [backfilling, setBackfilling] = useState(false)
    const [backfillResult, setBackfillResult] = useState<{ updatedSubmissions: number; updatedWebsites: number } | null>(null)
    const backfillWebsiteUrls = useMutation(api.admin.backfillWebsiteUrls)

    // Delete submission state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [deleteTargetName, setDeleteTargetName] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [deleteResult, setDeleteResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const handleBackfill = async () => {
        setBackfilling(true)
        setBackfillResult(null)
        try {
            const result = await backfillWebsiteUrls({})
            setBackfillResult(result)
        } finally {
            setBackfilling(false)
        }
    }

    const handleLogout = async () => {
        await signOut()
        router.push('/login')
    }

    const handleDeleteSubmission = async () => {
        if (!deleteTargetId) return
        setDeleting(true)
        try {
            const response = await fetch('/api/delete-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId: deleteTargetId }),
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to delete submission')
            }
            setDeleteResult({ type: 'success', message: `"${deleteTargetName}" deleted successfully.` })
        } catch (error: any) {
            setDeleteResult({ type: 'error', message: error.message || 'Failed to delete submission.' })
        } finally {
            setDeleting(false)
            setShowDeleteModal(false)
            setDeleteTargetId(null)
        }
    }

    // Filter and search submissions
    const filteredSubmissions = useMemo(() => {
        let result = submissions

        // Apply status filter
        if (filter !== 'all') {
            result = result.filter(s => s.status === filter)
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(s =>
                s.business_name.toLowerCase().includes(query) ||
                s.owner_name.toLowerCase().includes(query) ||
                s.business_type.toLowerCase().includes(query)
            )
        }

        return result
    }, [submissions, filter, searchQuery])

    // Pagination
    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage)
    const paginatedSubmissions = filteredSubmissions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Reset to page 1 when filter or search changes
    useMemo(() => {
        setCurrentPage(1)
    }, [filter, searchQuery])

    // Needs attention items
    const needsAttention = submissions.filter(s =>
        s.status === 'submitted' || s.status === 'in_review'
    )

    const getStatusBadge = (status: string) => {
        const styles = {
            draft: 'bg-gray-100 text-gray-700',
            submitted: 'bg-blue-100 text-blue-700',
            in_review: 'bg-yellow-100 text-yellow-700',
            approved: 'bg-green-100 text-green-700',
            rejected: 'bg-red-100 text-red-700',
            deployed: 'bg-cyan-100 text-cyan-700',
            pending_payment: 'bg-orange-100 text-orange-700',
            paid: 'bg-emerald-100 text-emerald-700',
            unpublished: 'bg-rose-100 text-rose-700',
        }
        return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'
    }

    if (authLoading || submissionsLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        )
    }

    if (!isAdmin) return null

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                            <p className="text-sm text-gray-500">Manage all submissions</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/admin/creators">
                                <Button
                                    variant="outline"
                                    className="text-gray-600 hover:text-gray-900"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Creators
                                </Button>
                            </Link>
                            <Link href="/admin/payouts">
                                <Button
                                    variant="outline"
                                    className="text-gray-600 hover:text-gray-900"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Payouts
                                </Button>
                            </Link>
                            <Link href="/admin/audit">
                                <Button
                                    variant="outline"
                                    className="text-gray-600 hover:text-gray-900"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Audit Logs
                                </Button>
                            </Link>
                            <Button
                                onClick={handleLogout}
                                variant="outline"
                                className="text-gray-600 hover:text-gray-900"
                            >
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Result Banner */}
            {deleteResult && (
                <div className={`border-b ${deleteResult.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                        <p className={`text-sm font-medium ${deleteResult.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                            {deleteResult.message}
                        </p>
                        <button onClick={() => setDeleteResult(null)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Delete &ldquo;{deleteTargetName}&rdquo;</h3>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                            <p className="text-sm font-semibold text-red-800 mb-2">This action is permanent and cannot be undone. The following will be deleted:</p>
                            <ul className="text-sm text-red-700 space-y-1">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                    Business submission record
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                    Generated website &amp; content
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                    All media files (images, audio, video)
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                    Cloudflare Pages deployment &amp; Airtable record
                                </li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteTargetId(null) }}
                                disabled={deleting}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteSubmission}
                                disabled={deleting}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50"
                            >
                                {deleting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Processing...
                                    </span>
                                ) : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Total Submissions</p>
                        <p className="text-3xl font-bold text-gray-900">{submissions.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Pending Review</p>
                        <p className="text-3xl font-bold text-yellow-600">
                            {submissions.filter(s => ['draft', 'submitted', 'in_review'].includes(s.status)).length}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Approved</p>
                        <p className="text-3xl font-bold text-green-600">
                            {submissions.filter(s => ['approved', 'deployed', 'pending_payment', 'paid', 'completed', 'website_generated'].includes(s.status)).length}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Rejected</p>
                        <p className="text-3xl font-bold text-red-600">
                            {submissions.filter(s => s.status === 'rejected').length}
                        </p>
                    </div>
                </div>

                {/* Needs Attention Alert */}
                {needsAttention.length > 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-xl">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-yellow-800">
                                    {needsAttention.length} submission{needsAttention.length !== 1 ? 's' : ''} need{needsAttention.length === 1 ? 's' : ''} your attention
                                </p>
                                <p className="text-xs text-yellow-700 mt-1">
                                    {submissions.filter(s => s.status === 'submitted').length} new submissions, {submissions.filter(s => s.status === 'in_review').length} in review
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Maintenance Tools */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">Backfill Website URLs</p>
                        <p className="text-xs text-gray-500">Sync missing <code>websiteUrl</code> / <code>publishedUrl</code> for deployed, pending_payment, paid, and completed submissions.</p>
                        {backfillResult && (
                            <p className="text-xs text-green-600 mt-1">
                                Done — {backfillResult.updatedSubmissions} submission(s) updated, {backfillResult.updatedWebsites} website record(s) updated.
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={handleBackfill}
                        disabled={backfilling}
                        variant="outline"
                        className="text-gray-700 shrink-0"
                    >
                        {backfilling ? 'Running...' : 'Run Backfill'}
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <Input
                            type="text"
                            placeholder="Search by business name, owner, or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
                    <div className="flex gap-2 overflow-x-auto">
                        {['all', 'submitted', 'in_review', 'approved', 'deployed', 'pending_payment', 'paid', 'rejected'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filter === status
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submissions Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Business
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Creator
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Payout
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            {searchQuery ? 'No submissions match your search' : 'No submissions found'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedSubmissions.map((submission: any) => (
                                        <tr key={submission.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {submission.business_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {submission.owner_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {submission.creators?.first_name} {submission.creators?.last_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{submission.business_type}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(submission.status)}`}>
                                                    {submission.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                ₱{submission.creator_payout || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(submission.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Link
                                                        href={`/admin/submissions/${submission.id}`}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        View Details
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            setDeleteTargetId(submission.id)
                                                            setDeleteTargetName(submission.business_name)
                                                            setShowDeleteModal(true)
                                                        }}
                                                        className="text-red-400 hover:text-red-600 transition-colors"
                                                        title="Delete submission"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <Button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                    size="sm"
                                >
                                    Previous
                                </Button>
                                <Button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                    size="sm"
                                >
                                    Next
                                </Button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                                        <span className="font-medium">
                                            {Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}
                                        </span> of{' '}
                                        <span className="font-medium">{filteredSubmissions.length}</span> results
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Previous
                                    </Button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <Button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            className={currentPage === page ? "bg-green-500 hover:bg-green-600" : ""}
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                    <Button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
