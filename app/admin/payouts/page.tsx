"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Id } from "@/convex/_generated/dataModel"

type PayoutStatus = 'all' | 'pending' | 'paid'

export default function PayoutsPage() {
    const { user, isLoaded } = useUser()

    // Get current user's creator profile to check admin status
    const currentCreator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )

    const isAdmin = currentCreator?.role === 'admin'

    // Get pending payouts and stats
    const payouts = useQuery(
        api.admin.getPendingPayouts,
        isAdmin ? {} : "skip"
    )

    const stats = useQuery(
        api.admin.getPayoutStats,
        isAdmin ? {} : "skip"
    )

    // Mutations
    const markPayoutPaid = useMutation(api.admin.markPayoutPaid)
    const bulkMarkPayoutsPaid = useMutation(api.admin.bulkMarkPayoutsPaid)

    const loading = !isLoaded || (user && currentCreator === undefined) || (isAdmin && (payouts === undefined || stats === undefined))

    // Filters & Selection
    const [statusFilter, setStatusFilter] = useState<PayoutStatus>('all')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Filtered payouts
    const filteredPayouts = useMemo(() => {
        if (!payouts) return []

        return payouts.filter(payout => {
            if (statusFilter === 'pending') return !payout.creatorPaidAt
            if (statusFilter === 'paid') return !!payout.creatorPaidAt
            return true
        })
    }, [payouts, statusFilter])

    // Select all visible
    const handleSelectAll = () => {
        if (selectedIds.size === filteredPayouts.filter(p => !p.creatorPaidAt).length) {
            setSelectedIds(new Set())
        } else {
            const pendingIds = filteredPayouts
                .filter(p => !p.creatorPaidAt)
                .map(p => p._id)
            setSelectedIds(new Set(pendingIds))
        }
    }

    // Toggle single selection
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    // Mark single as paid
    const handleMarkAsPaid = async (id: string) => {
        setProcessing(true)
        setError(null)
        try {
            await markPayoutPaid({ submissionId: id as Id<"submissions"> })
            setSelectedIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(id)
                return newSet
            })
        } catch (err: any) {
            setError(err.message || 'Failed to mark as paid')
        } finally {
            setProcessing(false)
        }
    }

    // Bulk mark as paid
    const handleBulkMarkAsPaid = async () => {
        if (selectedIds.size === 0) return

        setProcessing(true)
        setError(null)
        try {
            await bulkMarkPayoutsPaid({
                submissionIds: Array.from(selectedIds) as Id<"submissions">[]
            })
            setSelectedIds(new Set())
        } catch (err: any) {
            setError(err.message || 'Failed to process bulk action')
        } finally {
            setProcessing(false)
        }
    }

    const getPayoutStatusBadge = (payout: { creatorPaidAt?: number }) => {
        if (payout.creatorPaidAt) {
            return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Paid</span>
        }
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>
    }

    if (loading) {
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
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <Link href="/admin">
                                <Button variant="outline" size="sm">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Payout Management</h1>
                                <p className="text-sm text-gray-500">Process creator payouts</p>
                            </div>
                        </div>
                        {selectedIds.size > 0 && (
                            <Button
                                onClick={handleBulkMarkAsPaid}
                                disabled={processing}
                                className="bg-green-500 hover:bg-green-600 text-white"
                            >
                                {processing ? 'Processing...' : `Mark ${selectedIds.size} as Paid`}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Pending Requests</p>
                        <p className="text-3xl font-bold text-yellow-600">{stats?.totalPending || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Pending Amount</p>
                        <p className="text-3xl font-bold text-gray-900">₱{(stats?.totalPendingAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Paid This Week</p>
                        <p className="text-3xl font-bold text-green-600">{stats?.paidThisWeek || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Paid Amount (Week)</p>
                        <p className="text-3xl font-bold text-green-600">₱{(stats?.paidThisWeekAmount || 0).toLocaleString()}</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
                    <div className="flex gap-2">
                        {(['all', 'pending', 'paid'] as PayoutStatus[]).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${statusFilter === status
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                {status === 'pending' && (stats?.totalPending || 0) > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                        {stats?.totalPending}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                        <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700">✕</button>
                    </div>
                )}

                {/* Payouts Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size > 0 && selectedIds.size === filteredPayouts.filter(p => !p.creatorPaidAt).length}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Creator
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Business
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payout Method
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Requested
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        {statusFilter === 'pending' ? 'No pending payouts' : 'No payouts found'}
                                    </td>
                                </tr>
                            ) : (
                                filteredPayouts.map((payout) => (
                                    <tr key={payout._id} className={`hover:bg-gray-50 ${selectedIds.has(payout._id) ? 'bg-green-50' : ''}`}>
                                        <td className="px-4 py-4">
                                            {!payout.creatorPaidAt && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(payout._id)}
                                                    onChange={() => toggleSelect(payout._id)}
                                                    className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                                                />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-semibold">
                                                    {payout.creator?.firstName?.charAt(0) || '?'}{payout.creator?.lastName?.charAt(0) || ''}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {payout.creator?.firstName} {payout.creator?.lastName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {payout.creator?.email || payout.creator?.phone || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{payout.businessName}</div>
                                            <div className="text-xs text-gray-500">{payout.businessType}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-lg font-bold text-green-600">
                                                ₱{(payout.creatorPayout || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{payout.creator?.payoutMethod || 'Not set'}</div>
                                            <div className="text-xs text-gray-500 font-mono">{payout.creator?.payoutDetails || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getPayoutStatusBadge(payout)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payout.payoutRequestedAt
                                                ? new Date(payout.payoutRequestedAt).toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {!payout.creatorPaidAt ? (
                                                <Button
                                                    onClick={() => handleMarkAsPaid(payout._id)}
                                                    disabled={processing}
                                                    size="sm"
                                                    className="bg-green-500 hover:bg-green-600 text-white"
                                                >
                                                    Mark Paid
                                                </Button>
                                            ) : (
                                                <span className="text-green-600 text-xs">
                                                    Paid {new Date(payout.creatorPaidAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Results count */}
                <div className="mt-4 text-sm text-gray-500">
                    Showing {filteredPayouts.length} payouts
                    {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
                </div>
            </div>
        </div>
    )
}
