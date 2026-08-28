"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Megaphone, Send, Loader2, CheckCircle, AlertCircle, Users } from "lucide-react"
import AdminLayout from "../components/AdminLayout"
import { AUDIENCES, type AudienceKey } from "@/lib/announcements/audience"

/**
 * Admin broadcasts.
 *
 * The only admin screen whose primary button cannot be undone, so the whole
 * layout is built around answering "who exactly is about to receive this?"
 * before the send is reachable:
 *
 *   * the live recipient count comes from the SAME selection rule the sender
 *     uses (lib/announcements/audience.ts), not a second implementation
 *   * a sample of real names is shown, because a bare number hides a wrong filter
 *   * "Send test to me" is offered first, and costs one email
 *   * the send itself is two-step — the button restates the count before it arms
 */
export default function AnnouncementsPage() {
    const { user, isLoaded } = useUser()
    const adminId = user?.id

    const [title, setTitle] = useState("")
    const [body, setBody] = useState("")
    const [audience, setAudience] = useState<AudienceKey>("certified")
    const [armed, setArmed] = useState(false)
    const [busy, setBusy] = useState<null | "test" | "send">(null)
    const [result, setResult] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

    const preview = useQuery(
        api.announcements.previewAudience,
        adminId ? { adminId, audience } : "skip"
    )
    const past = useQuery(api.announcements.list, adminId ? { adminId } : "skip")
    const send = useAction(api.announcements.send)

    const ready = title.trim().length > 0 && body.trim().length > 0
    const count = preview?.count ?? 0

    // Any edit disarms the confirm: the count on the armed button must never
    // describe a different message than the one about to go out.
    function edit<T>(setter: (v: T) => void) {
        return (v: T) => {
            setArmed(false)
            setResult(null)
            setter(v)
        }
    }

    async function doSend(testOnly: boolean) {
        if (!adminId) return
        setBusy(testOnly ? "test" : "send")
        setResult(null)
        try {
            const r = await send({ adminId, title, body, audience, testOnly })
            if (testOnly) {
                setResult({ kind: "ok", text: "Test sent to your own inbox. Nobody else received it." })
            } else {
                setResult({ kind: "ok", text: `Sent to ${r.sent} creator${r.sent === 1 ? "" : "s"}.` })
                setTitle("")
                setBody("")
            }
        } catch (e: any) {
            setResult({ kind: "err", text: e?.data ?? e?.message ?? "Something went wrong." })
        } finally {
            setBusy(null)
            setArmed(false)
        }
    }

    if (!isLoaded) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-24 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="mx-auto max-w-3xl px-4 py-8">
                <div className="mb-8 flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-2.5">
                        <Megaphone className="h-6 w-6 text-amber-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                        <p className="text-sm text-gray-500">
                            Send an email and an in-app notification to your creators.
                        </p>
                    </div>
                </div>

                {/* Compose */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Title</label>
                    <input
                        value={title}
                        onChange={(e) => edit(setTitle)(e.target.value)}
                        maxLength={120}
                        placeholder="New: give a free website to someone you know"
                        className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
                    />
                    <p className="mb-5 text-right text-xs text-gray-400">{title.length}/120</p>

                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Message</label>
                    <textarea
                        value={body}
                        onChange={(e) => edit(setBody)(e.target.value)}
                        maxLength={4000}
                        rows={9}
                        placeholder={"Write it the way you'd say it.\n\nLeave a blank line between paragraphs."}
                        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-amber-400"
                    />
                    <p className="mt-1 text-right text-xs text-gray-400">{body.length}/4000</p>
                </div>

                {/* Audience */}
                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <h2 className="text-sm font-bold text-gray-900">Who receives it</h2>
                    </div>

                    <div className="space-y-2">
                        {AUDIENCES.map((a) => (
                            <label
                                key={a.key}
                                className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors ${
                                    audience === a.key
                                        ? "border-amber-400 bg-amber-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="audience"
                                    className="mt-1"
                                    checked={audience === a.key}
                                    onChange={() => edit(setAudience)(a.key)}
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-gray-900">{a.label}</span>
                                    <span className="block text-xs leading-relaxed text-gray-500">{a.description}</span>
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="mt-4 rounded-xl bg-gray-50 p-4">
                        {preview === undefined ? (
                            <p className="text-sm text-gray-500">Counting…</p>
                        ) : (
                            <>
                                <p className="text-sm font-bold text-gray-900">
                                    {count} recipient{count === 1 ? "" : "s"}
                                </p>
                                {preview.sample.length > 0 && (
                                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                        e.g. {preview.sample.map((s: any) => s.name).join(", ")}
                                        {count > preview.sample.length ? ` and ${count - preview.sample.length} more` : ""}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Send */}
                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
                    {result && (
                        <div
                            className={`mb-4 flex items-start gap-2 rounded-xl p-3.5 text-sm ${
                                result.kind === "ok"
                                    ? "bg-green-50 text-green-800"
                                    : "bg-red-50 text-red-700"
                            }`}
                        >
                            {result.kind === "ok" ? (
                                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            ) : (
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            )}
                            <span>{result.text}</span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            disabled={!ready || busy !== null}
                            onClick={() => doSend(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
                        >
                            {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Send test to me
                        </button>

                        {!armed ? (
                            <button
                                type="button"
                                disabled={!ready || busy !== null || count === 0}
                                onClick={() => setArmed(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-40"
                            >
                                <Send className="h-4 w-4" />
                                Send to {count} creator{count === 1 ? "" : "s"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() => doSend(false)}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
                            >
                                {busy === "send" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                Yes — email {count} {count === 1 ? "person" : "people"} now
                            </button>
                        )}

                        {armed && (
                            <button
                                type="button"
                                onClick={() => setArmed(false)}
                                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                            >
                                Cancel
                            </button>
                        )}
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                        This cannot be undone. Send a test to yourself first — it costs one email.
                    </p>
                </div>

                {/* History */}
                {past && past.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
                        <h2 className="mb-4 text-sm font-bold text-gray-900">Recent announcements</h2>
                        <div className="space-y-3">
                            {past.map((a: any) => (
                                <div key={a._id} className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-gray-900">{a.title}</p>
                                        <p className="text-xs text-gray-500">
                                            {a.audience} · {a.recipientCount} recipient{a.recipientCount === 1 ? "" : "s"} ·{" "}
                                            {new Date(a.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                                            a.status === "sent"
                                                ? "bg-green-50 text-green-700"
                                                : a.status === "failed"
                                                  ? "bg-red-50 text-red-700"
                                                  : "bg-amber-50 text-amber-700"
                                        }`}
                                    >
                                        {a.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
