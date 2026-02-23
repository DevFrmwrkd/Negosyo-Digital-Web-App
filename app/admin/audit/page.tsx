"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { useAdminAuth } from "@/hooks/useAdmin"

type AuditAction =
    | 'submission_approved'
    | 'submission_rejected'
    | 'website_generated'
    | 'website_deployed'
    | 'payment_sent'
    | 'submission_deleted'
    | 'creator_updated'
    | 'manual_override'

const ACTION_LABELS: Record<AuditAction, string> = {
    submission_approved: 'Approved',
    submission_rejected: 'Rejected',
    website_generated: 'Website Generated',
    website_deployed: 'Deployed',
    payment_sent: 'Payment Sent',
    submission_deleted: 'Deleted',
    creator_updated: 'Creator Updated',
    manual_override: 'Manual Override',
}

const ACTION_COLORS: Record<AuditAction, string> = {
    submission_approved: 'bg-green-100 text-green-700',
    submission_rejected: 'bg-red-100 text-red-700',
    website_generated: 'bg-purple-100 text-purple-700',
    website_deployed: 'bg-blue-100 text-blue-700',
    payment_sent: 'bg-orange-100 text-orange-700',
    submission_deleted: 'bg-gray-100 text-gray-700',
    creator_updated: 'bg-cyan-100 text-cyan-700',
    manual_override: 'bg-yellow-100 text-yellow-700',
}

const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'approvals', label: 'Approvals', actions: ['submission_approved'] },
    { key: 'rejections', label: 'Rejections', actions: ['submission_rejected'] },
    { key: 'deployments', label: 'Deployments', actions: ['website_deployed', 'website_generated'] },
    { key: 'payments', label: 'Payments', actions: ['payment_sent'] },
]

function timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
}

export default function AuditLogsPage() {
    const { isAdmin, loading: authLoading } = useAdminAuth()
    const [activeFilter, setActiveFilter] = useState('all')

    const auditLogs = useQuery(
        api.auditLogs.getRecent,
        isAdmin ? { limit: 200 } : "skip"
    )

    const filteredLogs = useMemo(() => {
        if (!auditLogs) return []
        if (activeFilter === 'all') return auditLogs

        const tab = FILTER_TABS.find(t => t.key === activeFilter)
        if (!tab || !tab.actions) return auditLogs
        return auditLogs.filter(log => tab.actions!.includes(log.action))
    }, [auditLogs, activeFilter])

    if (authLoading || auditLogs === undefined) {
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
                            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                            <p className="text-sm text-gray-500">Track all admin actions</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/admin">
                                <Button variant="outline" className="text-gray-600 hover:text-gray-900">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to Dashboard
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filter Tabs */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
                    <div className="flex gap-2 overflow-x-auto">
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveFilter(tab.key)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                                    activeFilter === tab.key
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Admin
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Target
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Details
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No audit logs found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log: any) => (
                                        <tr key={log._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {timeAgo(log.timestamp)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 font-medium">
                                                    {log.adminName || log.adminId.substring(0, 12) + '...'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    ACTION_COLORS[log.action as AuditAction] || 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {ACTION_LABELS[log.action as AuditAction] || log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {log.targetType}
                                                </div>
                                                {log.targetType === 'submission' && (
                                                    <Link
                                                        href={`/admin/submissions/${log.targetId}`}
                                                        className="text-xs text-green-600 hover:text-green-800"
                                                    >
                                                        View Submission
                                                    </Link>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-700 max-w-xs truncate">
                                                    {log.metadata?.businessName && (
                                                        <span className="font-medium">{log.metadata.businessName}</span>
                                                    )}
                                                    {log.metadata?.reason && (
                                                        <span className="text-red-600 ml-1">
                                                            — {log.metadata.reason}
                                                        </span>
                                                    )}
                                                    {log.metadata?.amount !== undefined && (
                                                        <span className="text-orange-600 ml-1">
                                                            ₱{log.metadata.amount}
                                                        </span>
                                                    )}
                                                    {log.metadata?.websiteUrl && (
                                                        <a
                                                            href={log.metadata.websiteUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline ml-1"
                                                        >
                                                            {log.metadata.websiteUrl}
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
