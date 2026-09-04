"use client"

import { useState, useEffect } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAdminAuth } from "@/hooks/useAdmin"
import AdminLayout from "../components/AdminLayout"

/**
 * App Release — the store listings the landing page links to.
 *
 * This page used to host APK uploads: a 200MB drag-and-drop that wrote
 * `apk_download_url` to a stable R2 key, which the landing footer then handed
 * to visitors as a file download. That was the distribution channel before the
 * app was published. It is gone — the app ships through Google Play and the App
 * Store, and both links live here.
 *
 * The only trace left is the cleanup panel below, which appears solely while an
 * old APK is still sitting in R2 and removes itself once used.
 */
export default function AppReleasePage() {
    const { isAdmin, loading: authLoading, creator } = useAdminAuth()

    const setSetting = useMutation(api.settings.set)
    const deleteR2File = useAction(api.r2.deleteFile)

    // Store-link settings — these are what the landing page's "Get the app"
    // band and the footer read. Nothing is hardcoded: a blank field hides that
    // button on the site.
    const savedAppStoreUrl = useQuery(api.settings.get, { key: "app_store_url" }) as string | null
    const savedPlayStoreUrl = useQuery(api.settings.get, { key: "play_store_url" }) as string | null
    const [appStoreUrl, setAppStoreUrl] = useState("")
    const [playStoreUrl, setPlayStoreUrl] = useState("")
    const [savingLinks, setSavingLinks] = useState(false)
    const [linksSaved, setLinksSaved] = useState(false)
    useEffect(() => { if (savedAppStoreUrl != null) setAppStoreUrl(savedAppStoreUrl) }, [savedAppStoreUrl])
    useEffect(() => { if (savedPlayStoreUrl != null) setPlayStoreUrl(savedPlayStoreUrl) }, [savedPlayStoreUrl])

    // Legacy APK, still in R2 from before the store listings existed. Nothing
    // serves it any more, so this is purely about not paying to store a file
    // nobody can reach.
    const legacyApkUrl = useQuery(api.settings.get, { key: "apk_download_url" }) as string | null
    const legacyApkFileName = useQuery(api.settings.get, { key: "apk_file_name" }) as string | null
    const legacyApkKey = useQuery(api.settings.get, { key: "apk_r2_key" }) as string | null
    const [cleaning, setCleaning] = useState(false)
    const [cleanupError, setCleanupError] = useState<string | null>(null)

    const handleSaveLinks = async () => {
        setSavingLinks(true)
        try {
            const adminId = creator?._id ? String(creator._id) : undefined
            await setSetting({ key: "app_store_url", value: appStoreUrl.trim() || null, description: "App Store listing URL", adminId })
            await setSetting({ key: "play_store_url", value: playStoreUrl.trim() || null, description: "Google Play listing URL", adminId })
            setLinksSaved(true)
            setTimeout(() => setLinksSaved(false), 2500)
        } finally {
            setSavingLinks(false)
        }
    }

    const handleCleanupLegacyApk = async () => {
        setCleaning(true)
        setCleanupError(null)
        try {
            const adminId = creator?._id ? String(creator._id) : undefined
            if (legacyApkKey) {
                await deleteR2File({ key: legacyApkKey })
            }
            // Clear the settings even if there was no key left to delete —
            // otherwise this panel would never go away.
            await setSetting({ key: "apk_download_url", value: null, adminId })
            await setSetting({ key: "apk_file_name", value: null, adminId })
            await setSetting({ key: "apk_uploaded_at", value: null, adminId })
            await setSetting({ key: "apk_r2_key", value: null, adminId })
        } catch (err) {
            setCleanupError(err instanceof Error ? err.message : "Failed to remove the old APK.")
        } finally {
            setCleaning(false)
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
            <div className="max-w-2xl">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">App Release</h1>
                <p className="text-sm text-gray-500 mb-8">
                    Where the landing page sends people to install the app. Leave a field blank to hide
                    that button on the site.
                </p>

                {/* Store Links — App Store + Google Play buttons on the landing page */}
                <div className="bg-white rounded-2xl border border-amber-500 shadow-sm p-6">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1">Store links</h2>
                    <p className="text-xs text-gray-500 mb-4">
                        Used by the &quot;Get the app&quot; section, its QR code, and the footer. There is no
                        fallback — an empty field means that button disappears from the live site.
                    </p>
                    <label className="block mb-3">
                        <span className="text-xs font-medium text-gray-600">App Store URL (iOS)</span>
                        <input
                            type="url"
                            value={appStoreUrl}
                            onChange={(e) => setAppStoreUrl(e.target.value)}
                            placeholder="https://apps.apple.com/app/..."
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                    </label>
                    <label className="block mb-4">
                        <span className="text-xs font-medium text-gray-600">Google Play URL (Android)</span>
                        <input
                            type="url"
                            value={playStoreUrl}
                            onChange={(e) => setPlayStoreUrl(e.target.value)}
                            placeholder="https://play.google.com/store/apps/details?id=..."
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                    </label>
                    <button
                        onClick={handleSaveLinks}
                        disabled={savingLinks}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {savingLinks ? "Saving..." : linksSaved ? "Saved" : "Save links"}
                    </button>
                </div>

                {/* One-time cleanup. Renders only while an old APK release is
                    still recorded, and removes itself the moment it succeeds. */}
                {legacyApkUrl && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-6">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1">Old APK release</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Direct APK downloads were retired when the app went on the stores. Nothing on the
                            site links to this file any more — it is only taking up storage.
                        </p>
                        {legacyApkFileName && (
                            <p className="text-sm text-gray-600 mb-4">
                                File: <span className="font-medium text-gray-800">{legacyApkFileName}</span>
                            </p>
                        )}
                        {cleanupError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                                {cleanupError}
                            </div>
                        )}
                        <button
                            onClick={handleCleanupLegacyApk}
                            disabled={cleaning}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {cleaning ? "Removing..." : "Delete the old APK from storage"}
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
