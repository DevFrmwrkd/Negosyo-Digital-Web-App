"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Input } from "@/components/ui/input"
import AdminLayout from "../components/AdminLayout"

type CreatorStatus = 'pending' | 'active' | 'suspended'

function getInitials(first: string, last: string) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export default function CreatorsPage() {
    const { user, isLoaded } = useUser()

    const currentCreator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )

    const creators = useQuery(
        api.creators.getAllWithStats,
        currentCreator?.role === 'admin' ? {} : "skip"
    )

    const isAdmin = currentCreator?.role === 'admin'
    const loading = !isLoaded || (user && currentCreator === undefined) || (isAdmin && creators === undefined)

    // Filters
    const [statusFilter, setStatusFilter] = useState<CreatorStatus | 'all'>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Filtered creators
    const filteredCreators = useMemo(() => {
        if (!creators) return []

        return creators.filter(creator => {
            if (statusFilter !== 'all' && creator.status !== statusFilter) {
                return false
            }

            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const fullName = `${creator.firstName} ${creator.lastName}`.toLowerCase()
                const email = (creator.email || '').toLowerCase()
                const phone = (creator.phone || '').toLowerCase()

                if (!fullName.includes(query) && !email.includes(query) && !phone.includes(query)) {
                    return false
                }
            }

            return true
        })
    }, [creators, statusFilter, searchQuery])

    // Stats
    const stats = useMemo(() => ({
        total: creators?.length || 0,
        active: creators?.filter(c => c.status === 'active').length || 0,
        pending: creators?.filter(c => c.status === 'pending').length || 0,
        suspended: creators?.filter(c => c.status === 'suspended').length || 0,
    }), [creators])

    const getStatusBadge = (status: CreatorStatus | undefined) => {
        const safeStatus = status || 'pending'
        const config: Record<string, { bg: string; text: string }> = {
            active: { bg: 'bg-green-50', text: 'text-green-700' },
            pending: { bg: 'bg-amber-50', text: 'text-amber-700' },
            suspended: { bg: 'bg-red-50', text: 'text-red-700' },
        }
        const style = config[safeStatus] || config.pending
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
                {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
            </span>
        )
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
            <div className="mb-6 lg:mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Creator Management</h1>
                <p className="text-sm text-gray-500 mt-1">Manage platform creators and their accounts.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 lg:mb-8">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`bg-white rounded-2xl p-5 border shadow-sm text-left transition-all cursor-pointer ${statusFilter === 'all' ? "border-green-400 ring-2 ring-green-100" : "border-gray-100 hover:border-gray-200"}`}
                >
                    <p className="text-xs font-medium text-gray-500 mb-2">Total Creators</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </button>

                <button
                    onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                    className={`bg-white rounded-2xl p-5 border shadow-sm text-left transition-all cursor-pointer ${statusFilter === 'active' ? "border-green-400 ring-2 ring-green-100" : "border-gray-100 hover:border-gray-200"}`}
                >
                    <p className="text-xs font-medium text-gray-500 mb-2">Active</p>
                    <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                </button>

                <button
                    onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                    className={`bg-white rounded-2xl p-5 border shadow-sm text-left transition-all cursor-pointer ${statusFilter === 'pending' ? "border-amber-400 ring-2 ring-amber-100" : "border-gray-100 hover:border-gray-200"}`}
                >
                    <p className="text-xs font-medium text-gray-500 mb-2">Pending</p>
                    <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                </button>

                <button
                    onClick={() => setStatusFilter(statusFilter === 'suspended' ? 'all' : 'suspended')}
                    className={`bg-white rounded-2xl p-5 border shadow-sm text-left transition-all cursor-pointer ${statusFilter === 'suspended' ? "border-red-400 ring-2 ring-red-100" : "border-gray-100 hover:border-gray-200"}`}
                >
                    <p className="text-xs font-medium text-gray-500 mb-2">Suspended</p>
                    <p className="text-3xl font-bold text-red-600">{stats.suspended}</p>
                </button>
            </div>

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
                        placeholder="Search by name, email, or phone..."
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

            {/* Creators Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Creator</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Submissions</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Earnings</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
                                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCreators.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">
                                        {searchQuery || statusFilter !== 'all'
                                            ? 'No creators match your filters'
                                            : 'No creators found'}
                                    </td>
                                </tr>
                            ) : (
                                filteredCreators.map((creator) => (
                                    <tr key={creator._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold text-green-700">
                                                        {getInitials(creator.firstName, creator.lastName)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {creator.firstName} {creator.middleName ? `${creator.middleName} ` : ''}{creator.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {creator.role === 'admin' ? 'Admin' : 'Creator'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-900">{creator.email || '\u2014'}</p>
                                            <p className="text-xs text-gray-500">{creator.phone || '\u2014'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(creator.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700">
                                                {creator.submissionCount || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            ₱{(creator.totalEarnings || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            ₱{(creator.balance || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/creators/${creator._id}`}
                                                className="text-gray-400 hover:text-green-600 transition-colors"
                                                title="View details"
                                            >
                                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </Link>
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
                        Showing {filteredCreators.length} of {creators?.length || 0} creators
                    </p>
                </div>
            </div>
        </AdminLayout>
    )
}
