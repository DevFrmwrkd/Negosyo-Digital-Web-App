"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAdminAuth } from "@/hooks/useAdmin"
import AdminLayout from "../components/AdminLayout"
import { SHOWCASE_SITES } from "@/components/landing/landingData"

/**
 * Featured Sites — curation screen for the landing page "Real Sites" proof grid.
 *
 * The landing reads the Convex setting `featured_sites` (an array of
 * {name, category, city, url}); if it's unset/empty it falls back to the
 * hardcoded SHOWCASE_SITES. This page lets an admin hand-pick that list — add,
 * edit, reorder, remove — without touching code or redeploying. Each card on
 * the landing renders a LIVE preview of the site at its URL.
 */

type FeaturedSite = { name: string; category: string; city: string; url: string }

const FEATURED_KEY = "featured_sites"

// Editor starts pre-filled with what the landing already shows, so nothing
// changes until an admin saves.
const DEFAULTS: FeaturedSite[] = SHOWCASE_SITES.filter((s) => !!s.url).map((s) => ({
    name: s.name,
    category: s.category,
    city: s.city,
    url: s.url as string,
}))

export default function FeaturedSitesPage() {
    const { isAdmin, loading: authLoading, creator } = useAdminAuth()
    const saved = useQuery(api.settings.get, { key: FEATURED_KEY }) as
        | FeaturedSite[]
        | null
        | undefined
    const setSetting = useMutation(api.settings.set)

    const [sites, setSites] = useState<FeaturedSite[]>([])
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [savedFlash, setSavedFlash] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Seed the editor once the setting resolves (fall back to the hardcoded set).
    useEffect(() => {
        if (saved === undefined) return // still loading
        setSites(Array.isArray(saved) && saved.length > 0 ? saved : DEFAULTS)
    }, [saved])

    const update = (i: number, patch: Partial<FeaturedSite>) => {
        setSites((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
        setDirty(true)
    }
    const add = () => {
        setSites((p) => [...p, { name: "", category: "", city: "", url: "" }])
        setDirty(true)
    }
    const remove = (i: number) => {
        setSites((p) => p.filter((_, idx) => idx !== i))
        setDirty(true)
    }
    const move = (i: number, dir: -1 | 1) => {
        setSites((p) => {
            const j = i + dir
            if (j < 0 || j >= p.length) return p
            const next = [...p]
            const tmp = next[i]
            next[i] = next[j]
            next[j] = tmp
            return next
        })
        setDirty(true)
    }

    const handleSave = async () => {
        setError(null)
        const cleaned = sites
            .map((s) => ({
                name: s.name.trim(),
                category: s.category.trim(),
                city: s.city.trim(),
                url: s.url.trim(),
            }))
            .filter((s) => s.name && s.url)
        const badUrl = cleaned.find((s) => !/^https?:\/\//i.test(s.url))
        if (badUrl) {
            setError(`"${badUrl.name || "A site"}" needs a full URL starting with https://`)
            return
        }
        setSaving(true)
        try {
            const adminId = creator?._id ? String(creator._id) : undefined
            await setSetting({
                key: FEATURED_KEY,
                value: cleaned,
                description: "Curated live sites shown in the landing 'Real Sites' proof grid",
                adminId,
            })
            setSites(cleaned)
            setDirty(false)
            setSavedFlash(true)
            setTimeout(() => setSavedFlash(false), 2500)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to save")
        } finally {
            setSaving(false)
        }
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
                <div className="text-center py-20 text-gray-500">Access denied</div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="max-w-3xl">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Featured Sites</h1>
                <p className="text-sm text-gray-500 mb-8">
                    These real client sites appear in the &quot;Real Sites&quot; section of the landing page.
                    Add, edit, reorder, or remove them here — each card shows a <strong>live preview</strong> of the
                    site, so it&apos;s never out of date. Changes go live when you press <strong>Save</strong>.
                </p>

                <div className="space-y-4">
                    {sites.map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Site {i + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => move(i, -1)}
                                        disabled={i === 0}
                                        title="Move up"
                                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        onClick={() => move(i, 1)}
                                        disabled={i === sites.length - 1}
                                        title="Move down"
                                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        ↓
                                    </button>
                                    <button
                                        onClick={() => remove(i)}
                                        title="Remove"
                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block sm:col-span-2">
                                    <span className="text-xs font-medium text-gray-600">Live URL</span>
                                    <div className="mt-1 flex items-center gap-2">
                                        <input
                                            type="url"
                                            value={s.url}
                                            onChange={(e) => update(i, { url: e.target.value })}
                                            placeholder="https://example.com/"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        />
                                        {/^https?:\/\//i.test(s.url) && (
                                            <a
                                                href={s.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-shrink-0 text-xs font-medium text-amber-600 hover:underline"
                                            >
                                                Open ↗
                                            </a>
                                        )}
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="text-xs font-medium text-gray-600">Business name</span>
                                    <input
                                        type="text"
                                        value={s.name}
                                        onChange={(e) => update(i, { name: e.target.value })}
                                        placeholder="Ben-Joe Tire Supply"
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-medium text-gray-600">Category</span>
                                    <input
                                        type="text"
                                        value={s.category}
                                        onChange={(e) => update(i, { category: e.target.value })}
                                        placeholder="Auto · Tire Supply"
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    />
                                </label>
                                <label className="block sm:col-span-2">
                                    <span className="text-xs font-medium text-gray-600">City</span>
                                    <input
                                        type="text"
                                        value={s.city}
                                        onChange={(e) => update(i, { city: e.target.value })}
                                        placeholder="Makati"
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={add}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    + Add a site
                </button>

                {sites.length === 0 && (
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-500">
                        No featured sites. The landing page will fall back to the built-in default set until you add and save some.
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Sticky action bar */}
                <div className="sticky bottom-0 mt-8 -mx-4 px-4 py-4 bg-gradient-to-t from-[var(--ed-paper)] via-[var(--ed-paper)] to-transparent sm:mx-0 sm:px-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            disabled={!dirty || saving}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {saving ? "Saving..." : savedFlash ? "Saved ✓" : "Save changes"}
                        </button>
                        <button
                            onClick={() => {
                                setSites(DEFAULTS)
                                setDirty(true)
                            }}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                            Reset to defaults
                        </button>
                        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
