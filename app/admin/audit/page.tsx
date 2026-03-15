"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAdminAuth } from "@/hooks/useAdmin"
import AdminLayout from "../components/AdminLayout"

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

const ACTION_COLORS: Record<AuditAction, { bg: string; text: string }> = {
    submission_approved: { bg: 'bg-green-50', text: 'text-green-700' },
    submission_rejected: { bg: 'bg-red-50', text: 'text-red-700' },
    website_generated: { bg: 'bg-purple-50', text: 'text-purple-700' },
    website_deployed: { bg: 'bg-blue-50', text: 'text-blue-700' },
    payment_sent: { bg: 'bg-orange-50', text: 'text-orange-700' },
    submission_deleted: { bg: 'bg-gray-100', text: 'text-gray-700' },
    creator_updated: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
    manual_override: { bg: 'bg-amber-50', text: 'text-amber-700' },
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

    // Stats
    const logStats = useMemo(() => {
        if (!auditLogs) return { total: 0, approvals: 0, rejections: 0, payments: 0 }
        return {
            total: auditLogs.length,
            approvals: auditLogs.filter(l => l.action === 'submission_approved').length,
            rejections: auditLogs.filter(l => l.action === 'submission_rejected').length,
            payments: auditLogs.filter(l => l.action === 'payment_sent').length,
        }
    }, [auditLogs])

    if (authLoading || auditLogs === undefined) {
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
            <div className="mb-6 lg:mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Audit Logs</h1>
                <p className="text-sm text-gray-500 mt-1">Track all admin actions and system events.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 lg:mb-8">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-2">Total Events</p>
                    <p className="text-3xl font-bold text-gray-900">{logStats.total}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-2">Approvals</p>
                    <p className="text-3xl font-bold text-green-600">{logStats.approvals}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-2">Rejections</p>
                    <p className="text-3xl font-bold text-red-600">{logStats.rejections}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-2">Payments</p>
                    <p className="text-3xl font-bold text-orange-600">{logStats.payments}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Admin</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Target</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log: any) => {
                                    const actionColor = ACTION_COLORS[log.action as AuditAction] || { bg: 'bg-gray-100', text: 'text-gray-700' }
                                    return (
                                        <tr key={log._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="text-sm text-gray-900">{timeAgo(log.timestamp)}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(log.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {log.adminName || log.adminId.substring(0, 12) + '...'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${actionColor.bg} ${actionColor.text}`}>
                                                    {ACTION_LABELS[log.action as AuditAction] || log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="text-sm text-gray-900">{log.targetType}</p>
                                                {log.targetType === 'submission' && (
                                                    <Link
                                                        href={`/admin/submissions/${log.targetId}`}
                                                        className="inline-flex text-gray-400 hover:text-green-600 transition-colors"
                                                        title="View submission"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
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
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Results count */}
                <div className="px-6 py-4 border-t border-gray-100">
                    <p className="text-xs sm:text-sm text-gray-500">
                        Showing {filteredLogs.length} of {auditLogs?.length || 0} events
                    </p>
                </div>
            </div>
        </AdminLayout>
    )
}
