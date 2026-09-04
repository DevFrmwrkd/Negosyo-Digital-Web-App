"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAdminAuth } from "@/hooks/useAdmin"
import AdminLayout from "../components/AdminLayout"
import { formatPHP, isComped, ownerChargeFor } from "@/lib/pricing"
import {
    ArrowRight,
    ArrowUpDown,
    Calendar,
    Globe,
    Search,
    Trash2,
    X,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// This page is the submissions list that used to sit at the bottom of /admin,
// squeezed under the revenue chart at five rows a page. Moving it here is not a
// copy: the dashboard's version is gone, and this is the only one. What the
// extra room buys is what a dashboard widget could never fit — the status
// filters (the dashboard carried the filter code but had no UI to reach it),
// the money and custom-domain columns that were already on the wire, a page
// size worth paging with, and a card layout that survives a phone.
// ─────────────────────────────────────────────────────────────────────────────

/** Every status the schema documents (convex/schema.ts:132), grouped by what an
 *  admin actually does next. `status` is a v.string(), not a union, so unknown
 *  values must still render — they fall through to "All" and a grey badge. */
type TabKey = "all" | "review" | "drafts" | "progress" | "settled" | "rejected" | "unpublished"

const STATUS_TABS: { key: TabKey; label: string; statuses: string[] | null }[] = [
    { key: "all", label: "All", statuses: null },
    { key: "review", label: "Needs review", statuses: ["submitted", "in_review"] },
    { key: "drafts", label: "Drafts", statuses: ["draft"] },
    { key: "progress", label: "In progress", statuses: ["approved", "website_generated", "deployed", "pending_payment"] },
    { key: "settled", label: "Paid", statuses: ["paid", "completed"] },
    { key: "rejected", label: "Rejected", statuses: ["rejected"] },
    { key: "unpublished", label: "Unpublished", statuses: ["unpublished"] },
]

const SORT_OPTIONS = [
    { key: "newest", label: "Newest First" },
    { key: "oldest", label: "Oldest First" },
    { key: "az", label: "A - Z (Name)" },
    { key: "za", label: "Z - A (Name)" },
    { key: "status", label: "Workflow Status" },
    { key: "highest_value", label: "Highest Value" },
    { key: "highest_payout", label: "Highest Payout" },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]["key"]

const PAGE_SIZES = [10, 25, 50] as const

// Sort order for "Workflow Status" — the queue an admin works top-down.
const STATUS_ORDER: Record<string, number> = {
    submitted: 0, in_review: 1, draft: 2, approved: 3, website_generated: 4,
    deployed: 5, pending_payment: 6, paid: 7, completed: 8, rejected: 9, unpublished: 10,
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
    submitted: { bg: "bg-blue-50", text: "text-blue-700", label: "Submitted" },
    in_review: { bg: "bg-amber-50", text: "text-amber-700", label: "In Review" },
    approved: { bg: "bg-amber-50", text: "text-amber-700", label: "Approved" },
    rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
    deployed: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Deployed" },
    pending_payment: { bg: "bg-orange-50", text: "text-orange-700", label: "Pending Payment" },
    paid: { bg: "bg-amber-50", text: "text-amber-700", label: "Paid" },
    unpublished: { bg: "bg-rose-50", text: "text-rose-700", label: "Unpublished" },
    completed: { bg: "bg-amber-50", text: "text-amber-700", label: "Completed" },
    website_generated: { bg: "bg-teal-50", text: "text-teal-700", label: "Generated" },
}

function statusBadge(status: string) {
    return (
        STATUS_BADGES[status] || {
            bg: "bg-gray-100",
            text: "text-gray-700",
            label: status.replace(/_/g, " "),
        }
    )
}

// The domain lifecycle is independent of the submission status, so a custom
// domain row can be live long before the submission is marked paid — and can
// fail while everything else looks healthy. Only "failed" is worth alarming.
const DOMAIN_LABELS: Record<string, { label: string; tone: "ok" | "warn" | "bad" }> = {
    pending_payment: { label: "Domain · awaiting payment", tone: "warn" },
    registering: { label: "Domain · registering", tone: "warn" },
    configuring_dns: { label: "Domain · DNS", tone: "warn" },
    provisioning_ssl: { label: "Domain · SSL", tone: "warn" },
    live: { label: "Domain · live", tone: "ok" },
    failed: { label: "Domain · failed", tone: "bad" },
}

/** One derivation for both the table row and the phone card — a domain that
 *  failed has to look failed on whichever one the admin is triaging from. */
function domainChip(s: { submissionType?: string | null; domainStatus?: string | null }) {
    if (s.domainStatus && s.domainStatus !== "not_requested") {
        const known = DOMAIN_LABELS[s.domainStatus]
        if (known) return known
        return { label: `Domain · ${s.domainStatus.replace(/_/g, " ")}`, tone: "warn" as const }
    }
    if (s.submissionType === "with_custom_domain") return { label: "Custom domain", tone: "warn" as const }
    return undefined
}

const CHIP_TONES: Record<"ok" | "warn" | "bad", string> = {
    ok: "bg-teal-50 text-teal-700",
    warn: "bg-gray-100 text-gray-600",
    bad: "bg-red-50 text-red-700",
}

/** Both creator names are optional in the schema, and `ownerName` has arrived
 *  as an empty string from the mobile app. `''[0]` is undefined, not a crash,
 *  but it renders an empty circle — fall back to a visible glyph. */
function initialOf(name?: string | null) {
    const c = (name ?? "").trim().charAt(0)
    return c ? c.toUpperCase() : "?"
}

function creatorName(creator?: { firstName?: string | null; lastName?: string | null } | null) {
    if (!creator) return "Unknown Creator"
    const name = `${creator.firstName ?? ""} ${creator.lastName ?? ""}`.trim()
    return name || "Unknown Creator"
}

function pageWindow(current: number, total: number): (number | string)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | string)[] = [1]
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    if (start > 2) pages.push("…")
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < total - 1) pages.push("…")
    pages.push(total)
    return pages
}

// useSearchParams() forces a client bailout unless the tree is suspended — the
// same reason /admin/creators wraps itself (app/admin/creators/page.tsx:37).
export default function AdminSubmissionsPage() {
    return (
        <Suspense fallback={null}>
            <AdminSubmissionsPageInner />
        </Suspense>
    )
}

function AdminSubmissionsPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isAdmin, loading: authLoading } = useAdminAuth()

    // The raw query, not useSubmissions(): the hook flattens every row to eight
    // snake_case keys and drops the money, domain and owner-intake fields this
    // page shows. Convex shares one subscription per query+args, so reading the
    // same query the hook reads costs nothing extra.
    const submissions = useQuery(api.submissions.getAllWithCreator, isAdmin ? {} : "skip")

    // ?status= makes the queue deep-linkable — the dashboard's "needs your
    // attention" banner links straight into the review tab.
    const initialTab = (() => {
        const v = searchParams.get("status")
        return STATUS_TABS.some((t) => t.key === v) ? (v as TabKey) : ("all" as TabKey)
    })()
    const [tab, setTab] = useState<TabKey>(initialTab)
    useEffect(() => {
        const v = searchParams.get("status")
        const next: TabKey = STATUS_TABS.some((t) => t.key === v) ? (v as TabKey) : "all"
        setTab((cur) => (cur === next ? cur : next))
    }, [searchParams])

    function changeTab(next: TabKey) {
        setTab(next)
        const sp = new URLSearchParams(searchParams?.toString() ?? "")
        if (next === "all") sp.delete("status")
        else sp.set("status", next)
        const q = sp.toString()
        router.replace(q ? `/admin/submissions?${q}` : "/admin/submissions")
    }

    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState<SortKey>("newest")
    const [showSortDropdown, setShowSortDropdown] = useState(false)
    const [domainOnly, setDomainOnly] = useState(false)
    const [ownerOnly, setOwnerOnly] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState<number>(25)

    // Delete state — the API route cascades to Cloudflare Pages, Airtable, R2
    // and the Convex records, so the confirmation names the business.
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [deleteTargetName, setDeleteTargetName] = useState("")
    const [deleting, setDeleting] = useState(false)
    const [deleteResult, setDeleteResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

    const rows = useMemo(() => submissions ?? [], [submissions])

    // Tab counts are computed over everything, not over the current filter —
    // a tab that hides its own count when you leave it is useless.
    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = { all: rows.length }
        for (const t of STATUS_TABS) {
            const statuses = t.statuses
            if (!statuses) continue
            counts[t.key] = rows.filter((s) => statuses.includes(s.status)).length
        }
        return counts
    }, [rows])

    const filtered = useMemo(() => {
        const tabDef = STATUS_TABS.find((t) => t.key === tab)
        let result = tabDef?.statuses ? rows.filter((s) => tabDef.statuses!.includes(s.status)) : [...rows]

        if (domainOnly) result = result.filter((s) => s.submissionType === "with_custom_domain")
        if (ownerOnly) result = result.filter((s) => s.contentSource === "owner_intake")

        const q = searchQuery.trim().toLowerCase()
        if (q) {
            result = result.filter((s) =>
                [
                    s.businessName,
                    s.ownerName,
                    s.businessType,
                    s.city,
                    s.ownerEmail,
                    s.ownerPhone,
                    s.requestedDomain,
                    s.websiteUrl,
                    creatorName(s.creator),
                ]
                    .filter(Boolean)
                    .some((field) => String(field).toLowerCase().includes(q))
            )
        }

        const sorted = [...result]
        sorted.sort((a, b) => {
            switch (sortBy) {
                case "newest": return b._creationTime - a._creationTime
                case "oldest": return a._creationTime - b._creationTime
                case "az": return a.businessName.localeCompare(b.businessName)
                case "za": return b.businessName.localeCompare(a.businessName)
                case "status": return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
                case "highest_value": return ownerChargeFor(b) - ownerChargeFor(a)
                case "highest_payout": return (b.creatorPayout || 0) - (a.creatorPayout || 0)
                default: return 0
            }
        })
        return sorted
    }, [rows, tab, domainOnly, ownerOnly, searchQuery, sortBy])

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    // Changing what is being listed starts you at the top of it.
    useEffect(() => {
        setCurrentPage(1)
    }, [tab, searchQuery, sortBy, domainOnly, ownerOnly, pageSize])
    // The list also shrinks on its own — a delete, or another admin's edit
    // arriving over the Convex subscription. `safePage` keeps the render honest,
    // but the state has to follow it: left stale at 3 while only 2 pages exist,
    // it would silently jump the admin back to page 3 the moment a new
    // submission pushed the count over the line again.
    useEffect(() => {
        setCurrentPage((p) => (p > totalPages ? totalPages : p))
    }, [totalPages])
    const safePage = Math.min(currentPage, totalPages)
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

    const handleDelete = async () => {
        if (!deleteTargetId) return
        setDeleting(true)
        try {
            const response = await fetch("/api/delete-submission", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ submissionId: deleteTargetId }),
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.error || "Failed to delete submission")
            // The route returns success even when Cloudflare/Airtable/R2 cleanup
            // partly failed. Say so — a silent success leaves orphaned assets
            // nobody knows to go clean up.
            const failed: { asset: string; error?: string }[] = data?.failedAssets ?? []
            setDeleteResult({
                type: "success",
                message: failed.length
                    ? `"${deleteTargetName}" deleted, but these need manual cleanup: ${failed
                          .map((f) => (f.error ? `${f.asset} (${f.error})` : f.asset))
                          .join("; ")}.`
                    : `"${deleteTargetName}" deleted successfully.`,
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : ""
            setDeleteResult({ type: "error", message: message || "Failed to delete submission." })
        } finally {
            setDeleting(false)
            setShowDeleteModal(false)
            setDeleteTargetId(null)
            // The banner sits at the top of the page and the delete button is on
            // every row — at 50 rows a page the result would otherwise paint
            // thousands of pixels above the admin, who would see a failed delete
            // as a no-op.
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    }

    function askDelete(id: string, name: string) {
        setDeleteTargetId(id)
        setDeleteTargetName(name)
        setShowDeleteModal(true)
    }

    if (authLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
            </AdminLayout>
        )
    }

    if (!isAdmin) {
        return (
            <AdminLayout>
                <div className="text-center py-20 text-gray-500">Admin access required</div>
            </AdminLayout>
        )
    }

    const loadingRows = submissions === undefined
    const firstShown = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
    const lastShown = Math.min(safePage * pageSize, filtered.length)
    const isFiltered = Boolean(searchQuery.trim()) || tab !== "all" || domainOnly || ownerOnly

    return (
        <AdminLayout>
            {/* Delete Result Banner */}
            {deleteResult && (
                <div className={`-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 lg:-mt-6 mb-6 border-b ${deleteResult.type === "success" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                    <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                        <p className={`text-sm font-medium ${deleteResult.type === "success" ? "text-amber-800" : "text-red-800"}`}>
                            {deleteResult.message}
                        </p>
                        <button onClick={() => setDeleteResult(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Delete &ldquo;{deleteTargetName}&rdquo;</h3>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                            <p className="text-sm font-semibold text-red-800 mb-2">This action is permanent and cannot be undone:</p>
                            <ul className="text-sm text-red-700 space-y-1">
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full" />Business submission record</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full" />Generated website &amp; content</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full" />All media files (images, audio, video)</li>
                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full" />Cloudflare Pages deployment &amp; Airtable record</li>
                            </ul>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteTargetId(null) }}
                                disabled={deleting}
                                className="flex-1 py-2.5 px-4 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-2.5 px-4 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 text-sm"
                            >
                                {deleting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        Processing...
                                    </span>
                                ) : "Delete Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Title — editorial */}
            <div className="mb-8 lg:mb-10 flex items-start justify-between gap-6 flex-wrap">
                <div>
                    <div className="ed-eyebrow mb-3">Submissions · Business applications</div>
                    <h1 className="ed-display-md" style={{ color: "var(--ed-ink)" }}>
                        Every <em>submission</em>, in one place.
                    </h1>
                    <p className="ed-body mt-3" style={{ color: "var(--ed-ink-2)", maxWidth: "60ch" }}>
                        Search, filter and open any business application — from the drafts creators are still
                        recording to the sites that are live and paid.
                    </p>
                </div>
                <div className="text-right">
                    <div className="ed-display-md" style={{ color: "var(--ed-ink)", fontVariantNumeric: "tabular-nums" }}>
                        {loadingRows ? "—" : rows.length}
                    </div>
                    <div className="ed-label mt-1">total submissions</div>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="mb-5 flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
                {STATUS_TABS.map((t) => {
                    const active = tab === t.key
                    const count = tabCounts[t.key] ?? 0
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => changeTab(t.key)}
                            className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center gap-2 ${
                                active ? "text-amber-700" : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            {t.label}
                            {!loadingRows && count > 0 && (
                                <span
                                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                                        t.key === "rejected" || t.key === "unpublished"
                                            ? "bg-red-50 text-red-700"
                                            : "bg-amber-50 text-amber-700"
                                    }`}
                                >
                                    {count}
                                </span>
                            )}
                            {active && <span className="absolute -bottom-px left-3 right-3 h-0.5 bg-amber-600 rounded-full" />}
                        </button>
                    )
                })}
            </div>

            {/* Search + attribute filters + Sort */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 mb-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by business, owner, creator, city, email, phone or domain..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-10 h-12 bg-white border border-gray-100 rounded-2xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        aria-pressed={domainOnly}
                        onClick={() => setDomainOnly((v) => !v)}
                        className={`inline-flex items-center gap-1.5 px-3.5 h-12 rounded-2xl border text-xs font-bold uppercase tracking-tight transition-all whitespace-nowrap ${
                            domainOnly
                                ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                : "bg-white border-gray-100 text-gray-600 hover:border-amber-400 shadow-sm"
                        }`}
                    >
                        <Globe size={14} />
                        Custom domain
                    </button>
                    <button
                        type="button"
                        aria-pressed={ownerOnly}
                        onClick={() => setOwnerOnly((v) => !v)}
                        className={`inline-flex items-center gap-1.5 px-3.5 h-12 rounded-2xl border text-xs font-bold uppercase tracking-tight transition-all whitespace-nowrap ${
                            ownerOnly
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                : "bg-white border-gray-100 text-gray-600 hover:border-indigo-400 shadow-sm"
                        }`}
                    >
                        Owner-submitted
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowSortDropdown((v) => !v)}
                            className="flex items-center gap-2.5 px-5 h-12 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 hover:border-amber-400 transition-all shadow-sm whitespace-nowrap"
                        >
                            <ArrowUpDown size={16} className="text-gray-400" />
                            <span>Sort By</span>
                            <div className={`w-1.5 h-1.5 rounded-full bg-amber-500 transition-all ${sortBy !== "newest" ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
                        </button>
                        {showSortDropdown && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-[22px] shadow-2xl z-20 overflow-hidden p-1.5">
                                    {SORT_OPTIONS.map((option) => (
                                        <button
                                            key={option.key}
                                            onClick={() => { setSortBy(option.key); setShowSortDropdown(false) }}
                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-tight rounded-xl transition-all ${
                                                sortBy === option.key
                                                    ? "bg-amber-50 text-amber-700"
                                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Submissions Table (desktop) */}
            <div className="bg-white rounded-2xl border border-amber-500 shadow-sm overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Business Entity</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Owner Representative</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Workflow Status</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Creator</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Value</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Submission Date</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pr-10">Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingRows ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
                                        </div>
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="text-gray-200 w-10 h-10 mb-2" strokeWidth={1} />
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                                {isFiltered ? "No entries match your filters" : "No entries found"}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((s) => {
                                    const badge = statusBadge(s.status)
                                    const domain = domainChip(s)
                                    const comped = isComped(s)
                                    return (
                                        <tr
                                            key={s._id}
                                            className="border-b border-gray-50 hover:bg-gray-50/80 transition-all cursor-pointer group"
                                            onClick={() => router.push(`/admin/submissions/${s._id}`)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 group-hover:text-amber-600 transition-colors uppercase tracking-tight">{s.businessName}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                                        {s.businessType}{s.city ? ` · ${s.city}` : ""}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 uppercase border border-white shadow-sm shrink-0">
                                                        {initialOf(s.ownerName)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-gray-600">{s.ownerName || "—"}</span>
                                                        {s.ownerPhone && (
                                                            <span className="text-[10px] text-gray-400 font-medium">{s.ownerPhone}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight w-fit ${badge.bg} ${badge.text}`}>
                                                        <span className={`w-1 h-1 rounded-full bg-current ${s.status === "submitted" ? "animate-pulse" : ""}`} />
                                                        {badge.label}
                                                    </div>
                                                    {domain && (
                                                        <div
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight w-fit ${CHIP_TONES[domain.tone]}`}
                                                            title={s.requestedDomain || undefined}
                                                        >
                                                            <Globe size={10} />
                                                            {domain.label}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                                            {creatorName(s.creator)}
                                                        </span>
                                                    </div>
                                                    {/* The house creator makes an owner-originated row look like any
                                                        other, so say it out loud: no field visit, no recorded interview. */}
                                                    {s.contentSource === "owner_intake" && (
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight w-fit bg-indigo-50 text-indigo-700">
                                                            <span className="w-1 h-1 rounded-full bg-current" />
                                                            Owner-submitted
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-bold text-gray-900 tabular-nums">
                                                        {comped ? "Free" : formatPHP(ownerChargeFor(s))}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                                        {comped ? "Promo · " : ""}Payout {formatPHP(s.creatorPayout || 0)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-gray-400 font-bold text-[11px] uppercase tracking-tighter">
                                                    <Calendar size={12} strokeWidth={2.5} />
                                                    {new Date(s._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link
                                                        href={`/admin/submissions/${s._id}`}
                                                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                        aria-label={`Open ${s.businessName}`}
                                                    >
                                                        <ArrowRight size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => askDelete(s._id, s.businessName)}
                                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        aria-label={`Delete ${s.businessName}`}
                                                    >
                                                        <Trash2 size={16} />
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

                {/* Card list (mobile) — a seven-column table is unreadable on a
                    phone, and admins do triage from one. */}
                <div className="md:hidden divide-y divide-gray-50">
                    {loadingRows ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
                        </div>
                    ) : paginated.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-center">
                            <Search className="text-gray-200 w-10 h-10 mb-2" strokeWidth={1} />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest px-6">
                                {isFiltered ? "No entries match your filters" : "No entries found"}
                            </p>
                        </div>
                    ) : (
                        paginated.map((s) => {
                            const badge = statusBadge(s.status)
                            const domain = domainChip(s)
                            const comped = isComped(s)
                            return (
                                <div
                                    key={s._id}
                                    className="p-4 active:bg-gray-50 transition-colors"
                                    onClick={() => router.push(`/admin/submissions/${s._id}`)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight truncate">{s.businessName}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                                {s.businessType}{s.city ? ` · ${s.city}` : ""}
                                            </p>
                                        </div>
                                        <div className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${badge.bg} ${badge.text}`}>
                                            <span className={`w-1 h-1 rounded-full bg-current ${s.status === "submitted" ? "animate-pulse" : ""}`} />
                                            {badge.label}
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-3">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.15em]">Owner</p>
                                            <p className="text-xs font-semibold text-gray-600 truncate">{s.ownerName || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.15em]">Creator</p>
                                            <p className="text-xs font-semibold text-gray-600 truncate">{creatorName(s.creator)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.15em]">Value</p>
                                            <p className="text-xs font-semibold text-gray-600 tabular-nums">
                                                {comped ? "Free (promo)" : formatPHP(ownerChargeFor(s))}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.15em]">Submitted</p>
                                            <p className="text-xs font-semibold text-gray-600">
                                                {new Date(s._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {s.contentSource === "owner_intake" && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight bg-indigo-50 text-indigo-700">
                                                    Owner-submitted
                                                </span>
                                            )}
                                            {domain && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${CHIP_TONES[domain.tone]}`}>
                                                    <Globe size={9} /> {domain.label}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={`/admin/submissions/${s._id}`}
                                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                aria-label={`Open ${s.businessName}`}
                                            >
                                                <ArrowRight size={18} />
                                            </Link>
                                            <button
                                                onClick={() => askDelete(s._id, s.businessName)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                aria-label={`Delete ${s.businessName}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Pagination */}
                {!loadingRows && filtered.length > 0 && (
                    <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                            <p className="text-xs sm:text-sm text-gray-500">
                                Showing {firstShown} to {lastShown} of {filtered.length.toLocaleString()} results
                            </p>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400"
                                aria-label="Rows per page"
                            >
                                {PAGE_SIZES.map((n) => (
                                    <option key={n} value={n}>{n} / page</option>
                                ))}
                            </select>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                                    disabled={safePage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    aria-label="Previous page"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                {pageWindow(safePage, totalPages).map((page, i) =>
                                    typeof page === "string" ? (
                                        <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">{page}</span>
                                    ) : (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                                safePage === page ? "bg-amber-500 text-white" : "text-gray-600 hover:bg-gray-100"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                                    disabled={safePage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    aria-label="Next page"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
