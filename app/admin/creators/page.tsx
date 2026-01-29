"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CreatorStatus = 'pending' | 'active' | 'suspended'

export default function CreatorsPage() {
    const { user, isLoaded } = useUser()

    // Get current user's creator profile to check admin status
    const currentCreator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )

    // Get all creators with stats
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
            // Status filter
            if (statusFilter !== 'all' && creator.status !== statusFilter) {
                return false
            }

            // Search filter
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
        const styles = {
            active: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            suspended: 'bg-red-100 text-red-800',
        }
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[safeStatus]}`}>
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
                                <h1 className="text-2xl font-bold text-gray-900">Creator Management</h1>
                                <p className="text-sm text-gray-500">Manage platform creators</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-500">Total Creators</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-500">Active</p>
                        <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-500">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-500">Suspended</p>
                        <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Search */}
                        <div className="flex-1 min-w-[250px]">
                            <Input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as CreatorStatus | 'all')}
                                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Creators Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Creator
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Submissions
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Earnings
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Balance
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredCreators.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        {searchQuery || statusFilter !== 'all'
                                            ? 'No creators match your filters'
                                            : 'No creators found'}
                                    </td>
                                </tr>
                            ) : (
                                filteredCreators.map((creator) => (
                                    <tr key={creator._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                                                    {creator.firstName.charAt(0)}{creator.lastName.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {creator.firstName} {creator.middleName ? `${creator.middleName} ` : ''}{creator.lastName}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {creator.role === 'admin' ? '👑 Admin' : 'Creator'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{creator.email || '—'}</div>
                                            <div className="text-sm text-gray-500">{creator.phone || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(creator.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {creator.submissionCount || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ₱{(creator.totalEarnings || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ₱{(creator.balance || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link
                                                href={`/admin/creators/${creator._id}`}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Results count */}
                <div className="mt-4 text-sm text-gray-500">
                    Showing {filteredCreators.length} of {creators?.length || 0} creators
                </div>
            </div>
        </div>
    )
}
