"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import AdminLayout from "../components/AdminLayout"
import { useUser } from "@clerk/nextjs"
import { AlertCircle, CheckCircle, Clock, Eye } from "lucide-react"

/**
 * Admin Payout Management Dashboard
 * View all creator withdrawals (instant, no approval needed)
 * Shows transaction details in read-only modals
 */

interface WithdrawalRecord {
    _id: string
    creatorId: string
    amount: number
    payoutMethod: string
    accountDetails: string
    status: string
    reference?: string
    wiseTransactionId?: string
    wiseStatus?: string
    errorMessage?: string
    createdAt: number
    processedAt?: number
    creatorName?: string
    creatorEmail?: string
}

export default function WithdrawalsPage() {
    const { user } = useUser()
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRecord | null>(null)
    
    // Fetch current user admin status
    const currentCreator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )
    
    // Fetch all completed withdrawals
    const completedWithdrawals = useQuery(
        api.withdrawals.getByStatus,
        currentCreator?.role === 'admin' ? { status: 'completed' } : "skip"
    )
    
    // Fetch failed withdrawals
    const failedWithdrawals = useQuery(
        api.withdrawals.getByStatus,
        currentCreator?.role === 'admin' ? { status: 'failed' } : "skip"
    )

    const isAdmin = currentCreator?.role === 'admin'

    if (!isAdmin) {
        return (
            <AdminLayout>
                <div className="p-6 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-gray-500">You don't have permission to view this page</p>
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="p-6 max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Payout Management</h1>
                <p className="text-gray-600 mb-6">View all creator withdrawals and transactions</p>

                <div className="grid grid-cols-1 gap-6">
                    {/* Completed Withdrawals */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <h2 className="text-xl font-semibold">Completed Withdrawals</h2>
                            </div>
                            <p className="text-sm text-gray-600">
                                {completedWithdrawals?.length || 0} successful transfers
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-t border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Creator</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {completedWithdrawals?.map((w: WithdrawalRecord) => (
                                        <tr key={w._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{w.creatorName}</p>
                                                    <p className="text-sm text-gray-500">{w.creatorEmail}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-900">
                                                ₱{w.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                                    {w.payoutMethod.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-2 text-green-600">
                                                    <CheckCircle className="h-4 w-4" />
                                                    Completed
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(w.processedAt || w.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => setSelectedWithdrawal(w)}
                                                    className="inline-flex items-center gap-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!completedWithdrawals?.length && (
                                <div className="p-6 text-center text-gray-500">
                                    No completed withdrawals yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Failed/Pending Withdrawals */}
                    {(failedWithdrawals?.length ?? 0) > 0 && (
                        <div className="bg-white rounded-lg shadow">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <h2 className="text-xl font-semibold">Failed Transfers</h2>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {failedWithdrawals?.length ?? 0} transfers that need attention
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-red-50 border-t border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Creator</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Error</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {failedWithdrawals?.map((w: WithdrawalRecord) => (
                                            <tr key={w._id} className="hover:bg-red-50">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{w.creatorName}</p>
                                                        <p className="text-sm text-gray-500">{w.creatorEmail}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-semibold">₱{w.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm text-red-600">{w.errorMessage || 'Unknown error'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => setSelectedWithdrawal(w)}
                                                        className="inline-flex items-center gap-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Review
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal: Withdrawal Details */}
                {selectedWithdrawal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold">Withdrawal Details</h2>
                                        <p className="text-blue-100">Transaction ID: {selectedWithdrawal.reference}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedWithdrawal(null)}
                                        className="text-2xl font-bold leading-none"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6">
                                {/* Creator Information */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Creator Information</h3>
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                                        <div>
                                            <p className="text-sm text-gray-600">Name</p>
                                            <p className="font-medium text-gray-900">{selectedWithdrawal.creatorName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Email</p>
                                            <p className="font-medium text-gray-900">{selectedWithdrawal.creatorEmail}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction Details */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Transaction Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-green-50 p-4 rounded border border-green-200">
                                            <p className="text-sm text-gray-600">Amount</p>
                                            <p className="text-2xl font-bold text-green-600">₱{selectedWithdrawal.amount.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded border border-blue-200">
                                            <p className="text-sm text-gray-600">Status</p>
                                            <p className="text-lg font-semibold text-blue-600 capitalize">
                                                {selectedWithdrawal.status}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payout Method */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Payout Method</h3>
                                    <div className="bg-gray-50 p-4 rounded space-y-2">
                                        <div>
                                            <p className="text-sm text-gray-600">Method</p>
                                            <p className="font-medium">{selectedWithdrawal.payoutMethod.toUpperCase()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Account Details</p>
                                            <p className="font-mono text-sm bg-white p-2 rounded border border-gray-200">
                                                {selectedWithdrawal.accountDetails}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Wise Transfer Details (if applicable) */}
                                {selectedWithdrawal.wiseTransactionId && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-3">Wise Transfer Details</h3>
                                        <div className="bg-yellow-50 p-4 rounded space-y-2 border border-yellow-200">
                                            <div>
                                                <p className="text-sm text-gray-600">Transaction ID</p>
                                                <p className="font-mono text-sm">{selectedWithdrawal.wiseTransactionId}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Status</p>
                                                <p className="font-medium">{selectedWithdrawal.wiseStatus || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error Details (if failed) */}
                                {selectedWithdrawal.errorMessage && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-3">Error Details</h3>
                                        <div className="bg-red-50 p-4 rounded border border-red-200">
                                            <p className="text-sm text-red-600">{selectedWithdrawal.errorMessage}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Timestamps */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
                                    <div className="space-y-2 bg-gray-50 p-4 rounded">
                                        <div className="flex justify-between">
                                            <p className="text-sm text-gray-600">Created</p>
                                            <p className="text-sm font-medium">
                                                {new Date(selectedWithdrawal.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        {selectedWithdrawal.processedAt && (
                                            <div className="flex justify-between">
                                                <p className="text-sm text-gray-600">Processed</p>
                                                <p className="text-sm font-medium">
                                                    {new Date(selectedWithdrawal.processedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                                <button
                                    onClick={() => setSelectedWithdrawal(null)}
                                    className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
