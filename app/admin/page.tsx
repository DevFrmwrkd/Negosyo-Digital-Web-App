"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Input } from "@/components/ui/input"
import { useAdminAuth, useSubmissions } from "@/hooks/useAdmin"
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js"
import { Line } from "react-chartjs-2"
import AdminLayout from "./components/AdminLayout"

ChartJS.register(
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

function getInitials(name: string) {
    return name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

export default function AdminDashboard() {
    const { isAdmin, loading: authLoading } = useAdminAuth()
    const { submissions, loading: submissionsLoading } = useSubmissions()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5
    const [backfilling, setBackfilling] = useState(false)
    const [backfillResult, setBackfillResult] = useState<{ updatedSubmissions: number; updatedWebsites: number } | null>(null)
    const backfillWebsiteUrls = useMutation(api.admin.backfillWebsiteUrls)

    // Delete submission state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [deleteTargetName, setDeleteTargetName] = useState("")
    const [deleting, setDeleting] = useState(false)
    const [deleteResult, setDeleteResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

    // Analytics data
    const allAnalytics = useQuery(api.analytics.getAllAnalytics, {})

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

    const handleDeleteSubmission = async () => {
        if (!deleteTargetId) return
        setDeleting(true)
        try {
            const response = await fetch("/api/delete-submission", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ submissionId: deleteTargetId }),
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to delete submission")
            }
            setDeleteResult({ type: "success", message: `"${deleteTargetName}" deleted successfully.` })
        } catch (error: any) {
            setDeleteResult({ type: "error", message: error.message || "Failed to delete submission." })
        } finally {
            setDeleting(false)
            setShowDeleteModal(false)
            setDeleteTargetId(null)
        }
    }

    // Filter by stat card + search
    const filteredSubmissions = useMemo(() => {
        let result = submissions

        if (activeFilter === "pending") {
            result = result.filter((s) => ["draft", "submitted", "in_review"].includes(s.status))
        } else if (activeFilter === "approved") {
            result = result.filter((s) => ["approved", "deployed", "pending_payment", "paid", "completed", "website_generated"].includes(s.status))
        } else if (activeFilter === "rejected") {
            result = result.filter((s) => s.status === "rejected")
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(
                (s) =>
                    s.business_name.toLowerCase().includes(query) ||
                    s.owner_name.toLowerCase().includes(query) ||
                    s.business_type.toLowerCase().includes(query)
            )
        }

        return result
    }, [submissions, activeFilter, searchQuery])

    // Pagination
    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage)
    const paginatedSubmissions = filteredSubmissions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    useMemo(() => {
        setCurrentPage(1)
    }, [searchQuery, activeFilter])

    // Needs attention items
    const needsAttention = submissions.filter((s) => s.status === "submitted" || s.status === "in_review")

    // Stats
    const pendingCount = submissions.filter((s) => ["draft", "submitted", "in_review"].includes(s.status)).length
    const approvedCount = submissions.filter((s) => ["approved", "deployed", "pending_payment", "paid", "completed", "website_generated"].includes(s.status)).length
    const rejectedCount = submissions.filter((s) => s.status === "rejected").length
    const successRate = submissions.length > 0 ? Math.round((approvedCount / submissions.length) * 100) : 0
    const rejectionRate = submissions.length > 0 ? Math.round((rejectedCount / submissions.length) * 100) : 0

    // ==================== EARNINGS ANALYTICS ====================

    const earningsTimeSeries = useMemo(() => {
        if (!allAnalytics) return []
        const daily = allAnalytics.filter((r) => r.periodType === "daily")
        const source = daily.length > 0 ? daily : allAnalytics.filter((r) => r.periodType === "monthly")
        const byPeriod: Record<string, number> = {}
        for (const r of source) {
            byPeriod[r.period] = (byPeriod[r.period] ?? 0) + r.earningsTotal
        }
        return Object.entries(byPeriod)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([period, earnings]) => ({ period, earnings }))
    }, [allAnalytics])

    const earningsChartData = {
        labels: earningsTimeSeries.map((r) => {
            const d = new Date(r.period + "T00:00:00")
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        }),
        datasets: [
            {
                label: "Revenue",
                data: earningsTimeSeries.map((r) => r.earnings),
                borderColor: "rgb(34, 197, 94)",
                backgroundColor: "rgba(34, 197, 94, 0.08)",
                fill: true,
                tension: 0.4,
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "rgb(34, 197, 94)",
            },
        ],
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "white",
                titleColor: "#111827",
                bodyColor: "#111827",
                borderColor: "#e5e7eb",
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (ctx: any) => `₱${ctx.parsed.y.toLocaleString()}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: "#9ca3af", font: { size: 11 } },
                border: { display: false },
            },
            y: {
                beginAtZero: true,
                grid: { color: "#f3f4f6" },
                ticks: {
                    color: "#9ca3af",
                    font: { size: 11 },
                    callback: (val: any) => `₱${(val / 1000).toFixed(val >= 1000 ? 1 : 0)}K`,
                },
                border: { display: false },
            },
        },
    }

    const hasEarningsData = earningsTimeSeries.length > 0

    const getStatusBadge = (status: string) => {
        const config: Record<string, { bg: string; text: string; label: string }> = {
            draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
            submitted: { bg: "bg-blue-50", text: "text-blue-700", label: "Submitted" },
            in_review: { bg: "bg-amber-50", text: "text-amber-700", label: "In Review" },
            approved: { bg: "bg-green-50", text: "text-green-700", label: "Approved" },
            rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
            deployed: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Deployed" },
            pending_payment: { bg: "bg-orange-50", text: "text-orange-700", label: "Pending Payment" },
            paid: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Paid" },
            unpublished: { bg: "bg-rose-50", text: "text-rose-700", label: "Unpublished" },
            completed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Completed" },
            website_generated: { bg: "bg-teal-50", text: "text-teal-700", label: "Generated" },
        }
        return config[status] || { bg: "bg-gray-100", text: "text-gray-700", label: status }
    }

    if (authLoading || submissionsLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        )
    }

    if (!isAdmin) return null

    // Pagination display logic
    const getPageNumbers = () => {
        const pages: (number | string)[] = []
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            pages.push(1, 2, 3)
            if (currentPage > 4) pages.push("...")
            if (currentPage > 3 && currentPage < totalPages - 2) pages.push(currentPage)
            if (currentPage < totalPages - 3) pages.push("...")
            pages.push(totalPages)
        }
        return [...new Set(pages)]
    }

    return (
        <AdminLayout>
            {/* Delete Result Banner */}
            {deleteResult && (
                <div className={`-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 lg:-mt-8 mb-6 border-b ${deleteResult.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                        <p className={`text-sm font-medium ${deleteResult.type === "success" ? "text-green-800" : "text-red-800"}`}>
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
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Delete &ldquo;{deleteTargetName}&rdquo;</h3>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                            <p className="text-sm font-semibold text-red-800 mb-2">This action is permanent and cannot be undone:</p>
                            <ul className="text-sm text-red-700 space-y-1">
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>Business submission record</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>Generated website &amp; content</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>All media files (images, audio, video)</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>Cloudflare Pages deployment &amp; Airtable record</li>
                            </ul>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowDeleteModal(false); setDeleteTargetId(null) }} disabled={deleting} className="flex-1 py-2.5 px-4 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 text-sm">Cancel</button>
                            <button onClick={handleDeleteSubmission} disabled={deleting} className="flex-1 py-2.5 px-4 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 text-sm">
                                {deleting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Processing...
                                    </span>
                                ) : "Delete Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Title */}
            <div className="mb-6 lg:mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Submissions Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Manage and review business applications across the platform.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 lg:mb-8">
                <button
                    onClick={() => setActiveFilter(activeFilter === "all" ? "all" : "all")}
                    className={`bg-white rounded-2xl p-5 border shadow-sm text-left transition-all cursor-pointer ${activeFilter === "all" ? "border-green-400 ring-2 ring-green-100" : "border-gray-100 hover:border-gray-200"}`}
                >
                    <p className="text-xs font-medium text-gray-500 mb-2">Total Submissions</p>
                    <p className="text-3xl font-bold text-gray-900">{submissions.length.toLocaleString()}</p>
                </button>

                <button
                    onClick={() => setActiveFilter(activeFilter === "pending" ? "all" : "pending")}
                    className={`bg-white rounded-2xl p-5 border shadow-sm text-left transition-all cursor-pointer ${activeFilter === "pending" ? "border-amber-400 ring-2 ring-amber-100" : "border-gray-100 hover:border-gray-200"}`}
                >
                    <p className="text-xs font-medium text-gray-500 mb-2">Pending Review</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
                    {pendingCount > 0 && (
                        <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            Requires attention
                        </p>
                    )}
                </button>

                <button
                    onClick={() => setActiveFilter(activeFilter === "approved" ? "all" : "approved")}
                    className={`bg-white rounded-2xl p-5 border shadow-sm text-left transition-all cursor-pointer ${activeFilter === "approved" ? "border-green-400 ring-2 ring-green-100" : "border-gray-100 hover:border-gray-200"}`}
                >
                    <p className="text-xs font-medium text-gray-500 mb-2">Approved</p>
                    <p className="text-3xl font-bold text-gray-900">{approvedCount.toLocaleString()}</p>
                    <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {successRate}% Success Rate
                    </p>
                </button>

                <button
                    onClick={() => setActiveFilter(activeFilter === "rejected" ? "all" : "rejected")}
                    className={`bg-white rounded-2xl p-5 border shadow-sm text-left transition-all cursor-pointer ${activeFilter === "rejected" ? "border-red-400 ring-2 ring-red-100" : "border-gray-100 hover:border-gray-200"}`}
                >
                    <p className="text-xs font-medium text-gray-500 mb-2">Rejected</p>
                    <p className="text-3xl font-bold text-gray-900">{rejectedCount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 font-medium mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {rejectionRate}% rejection rate
                    </p>
                </button>
            </div>

            {/* Earnings Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6 lg:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Earnings Over Time</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Daily revenue generated from approved submissions</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                            <span className="text-xs font-medium text-gray-500">Revenue</span>
                        </div>
                    </div>
                </div>
                <div className="h-64 mt-4">
                    {hasEarningsData ? (
                        <Line data={earningsChartData} options={chartOptions} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-sm text-gray-400">
                            No earnings data yet. Data will appear as creators earn on the platform.
                        </div>
                    )}
                </div>
            </div>

            {/* Needs Attention + Backfill Row */}
            {(needsAttention.length > 0 || true) && (
                <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-amber-900">
                                {needsAttention.length} submission{needsAttention.length !== 1 ? "s" : ""} need{needsAttention.length === 1 ? "s" : ""} your attention
                            </p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Pending reviews require immediate action to maintain SLA.
                            </p>
                            {backfillResult && (
                                <p className="text-xs text-green-700 mt-1">
                                    Backfill done: {backfillResult.updatedSubmissions} submission(s), {backfillResult.updatedWebsites} website(s) updated.
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleBackfill}
                        disabled={backfilling}
                        className="px-4 py-2 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    >
                        {backfilling ? "Running..." : "Run Backfill"}
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <Input
                        type="text"
                        placeholder="Search business name, owner, or type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-gray-200 rounded-lg h-10 text-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                            <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Business Name</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Reviewed By</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">
                                        {searchQuery ? "No submissions match your search" : "No submissions found"}
                                    </td>
                                </tr>
                            ) : (
                                paginatedSubmissions.map((submission: any) => {
                                    const badge = getStatusBadge(submission.status)
                                    return (
                                        <tr key={submission.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-bold text-gray-500">
                                                            {getInitials(submission.business_name)}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{submission.business_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {submission.owner_name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {submission.business_type}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${badge.bg} ${badge.text}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {submission.reviewed_by || <span className="text-gray-300">&mdash;</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(submission.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/admin/submissions/${submission.id}`}
                                                        className="text-gray-400 hover:text-green-600 transition-colors"
                                                        title="View details"
                                                    >
                                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            setDeleteTargetId(submission.id)
                                                            setDeleteTargetName(submission.business_name)
                                                            setShowDeleteModal(true)
                                                        }}
                                                        className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                                                        title="Delete submission"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                        <p className="text-xs sm:text-sm text-gray-500">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                            {Math.min(currentPage * itemsPerPage, filteredSubmissions.length)} of{" "}
                            {filteredSubmissions.length.toLocaleString()} results
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            {getPageNumbers().map((page, i) =>
                                page === "..." ? (
                                    <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">...</span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page as number)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                            currentPage === page
                                                ? "bg-green-500 text-white"
                                                : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                )
                            )}
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
