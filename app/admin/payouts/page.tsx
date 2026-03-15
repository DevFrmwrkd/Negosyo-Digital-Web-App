"use client"

import { useState, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import AdminLayout from "../components/AdminLayout"

type PayoutStatus = 'all' | 'pending' | 'paid'

export default function PayoutsPage() {
    const { user, isLoaded } = useUser()

    const currentCreator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )

    const isAdmin = currentCreator?.role === 'admin'

    const payouts = useQuery(
        api.admin.getPendingPayouts,
        isAdmin ? {} : "skip"
    )

    const stats = useQuery(
        api.admin.getPayoutStats,
        isAdmin ? {} : "skip"
    )

    const markPaidWired = useMutation(api.admin.markPaid)
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

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    const handleMarkAsPaid = async (id: string) => {
        if (!user) return
        setProcessing(true)
        setError(null)
        try {
            await markPaidWired({
                submissionId: id as Id<"submissions">,
                adminId: user.id,
            })
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        )
    }

    if (!isAdmin) return null

    return (
        <AdminLayout>
            {/* Page Title */}
            <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payout Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Process and track creator payouts.</p>
                </div>
                {selectedIds.size > 0 && (
                    <button
                        onClick={handleBulkMarkAsPaid}
                        disabled={processing}
                        className="px-4 py-2.5 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                    >
                        {processing ? 'Processing...' : `Mark ${selectedIds.size} as Paid`}
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 lg:mb-8">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-2">Pending Requests</p>
                    <p className="text-3xl font-bold text-amber-600">{stats?.totalPending || 0}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-2">Pending Amount</p>
                    <p className="text-3xl font-bold text-gray-900">₱{(stats?.totalPendingAmount || 0).toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-2">Paid This Week</p>
                    <p className="text-3xl font-bold text-green-600">{stats?.paidThisWeek || 0}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-2">Paid Amount (Week)</p>
                    <p className="text-3xl font-bold text-green-600">₱{(stats?.paidThisWeekAmount || 0).toLocaleString()}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
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
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700">
                                    {stats?.totalPending}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-4 sm:mb-6 flex items-center justify-between">
                    <p className="text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Payouts Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-4 py-3.5 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size > 0 && selectedIds.size === filteredPayouts.filter(p => !p.creatorPaidAt).length}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                                    />
                                </th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Creator</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Business</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Payout Method</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Requested</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-sm text-gray-400">
                                        {statusFilter === 'pending' ? 'No pending payouts' : 'No payouts found'}
                                    </td>
                                </tr>
                            ) : (
                                filteredPayouts.map((payout) => (
                                    <tr key={payout._id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${selectedIds.has(payout._id) ? 'bg-green-50/50' : ''}`}>
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
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold text-green-700">
                                                        {payout.creator?.firstName?.charAt(0) || '?'}{payout.creator?.lastName?.charAt(0) || ''}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {payout.creator?.firstName} {payout.creator?.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {payout.creator?.email || payout.creator?.phone || '\u2014'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-900">{payout.businessName}</p>
                                            <p className="text-xs text-gray-500">{payout.businessType}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-base font-bold text-green-600">
                                                ₱{(payout.creatorPayout || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-900">{payout.creator?.payoutMethod || 'Not set'}</p>
                                            <p className="text-xs text-gray-500 font-mono">{payout.creator?.payoutDetails || '\u2014'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {payout.creatorPaidAt ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700">Paid</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {payout.payoutRequestedAt
                                                ? new Date(payout.payoutRequestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                : '\u2014'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {!payout.creatorPaidAt ? (
                                                <button
                                                    onClick={() => handleMarkAsPaid(payout._id)}
                                                    disabled={processing}
                                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    Mark Paid
                                                </button>
                                            ) : (
                                                <span className="text-xs text-green-600">
                                                    Paid {new Date(payout.creatorPaidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
                <div className="px-6 py-4 border-t border-gray-100">
                    <p className="text-xs sm:text-sm text-gray-500">
                        Showing {filteredPayouts.length} payouts
                        {selectedIds.size > 0 && ` \u00b7 ${selectedIds.size} selected`}
                    </p>
                </div>
            </div>
        </AdminLayout>
    )
}
