"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { injectEditorBridge } from "./editorBridge";
import type { SandboxEditorProps } from "./SandboxEditor";
import {
    TEMPLATE_FAMILIES,
    TEMPLATE_BUCKETS,
    familyOf,
    templateByCode,
    type TemplateFamily,
} from "./templateCatalog";

// Compact toolbar button style shared across the action bar.
const TB = "inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:border-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed";
import {
    COLOR_SCHEMES,
    FONT_PAIRINGS,
    ALL_BLOCKS,
    STATE_TO_BRIDGE,
    CURATED,
} from "./editorConstants";

/**
 * SandboxEditorV2 — the redesigned "v2" template editor.
 *
 * Same `SandboxEditorProps` contract + same production pipeline as v1: it
 * previews the astro-built `htmlContent` in an iframe with the ed:* bridge, and
 * batches template/theme/visibility picks into `pendingCustomizations` +
 * `draft`, rebuilding ONCE on Save via the parent's `onSaveContent`. There is no
 * live `?hero=` rendering (production builds static HTML).
 *
 * This phase covers design editing — template thumbnail grid, curated palettes,
 * fonts, section toggles, action toolbar, single Save. (Inline content
 * click-to-edit lands in a follow-up on the same bridge.)
 */

// Representative accent per scheme id for the palette swatches.
const SCHEME_SWATCH: Record<string, string> = {
    auto: "#94a3b8", blue: "#2563eb", green: "#16a34a", purple: "#7c3aed",
    orange: "#ea580c", dark: "#1f2937", pink: "#db2777", brown: "#92400e",
    red: "#dc2626", yellow: "#eab308", maroon: "#7f1d1d", black: "#111111",
    gold: "#b8860b", whitegold: "#d4af37", professional: "#334155",
};

const STYLE_KEYS = [
    "aboutStyle", "servicesStyle", "galleryStyle", "contactStyle", "trustStyle",
    "whyUsStyle", "howItWorksStyle", "testimonialsStyle", "faqStyle",
    "serviceAreaStyle", "credentialsStyle", "ctaBandStyle",
] as const;

export default function SandboxEditorV2(props: SandboxEditorProps) {
    const {
        businessName, businessType, htmlContent, content, customizations,
        onSaveContent, websitePublishedUrl, submissionId,
        websiteGenerated, generatingWebsite, publishingWebsite, republishingWebsite,
        unpublishingWebsite, enhancing, sendingEmail,
        onSendToClient, onEnhanceImages, onRegenerate, onPublish, onRepublish,
        onUnpublish, onDelete, onApprove, onReject, onToggleDetails,
    } = props;

    // ── State (mirrors v1's batched model) ───────────────────────────────
    const [draft, setDraft] = useState<any>(() => ({ ...(content ?? {}) }));
    useEffect(() => { setDraft({ ...(content ?? {}) }); }, [content]);

    const [pendingCustomizations, setPendingCustomizations] = useState<any>(customizations);
    useEffect(() => { setPendingCustomizations(customizations); }, [customizations]);

    const [selectedBucket] = useState<string>(() => {
        const initial = (businessType || (content as any)?.business_type || "").toLowerCase();
        const match = TEMPLATE_BUCKETS.find((b) => b.id === initial || b.label.toLowerCase() === initial);
        return match?.id ?? "services";
    });

    const [saving, setSaving] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const railRef = useRef<HTMLDivElement | null>(null);

    const effectiveCustomizations = pendingCustomizations ?? customizations ?? {};
    const currentHeroStyle = String((effectiveCustomizations as any)?.heroStyle ?? "");
    const activeFamily: TemplateFamily | null = familyOf(currentHeroStyle);
    const currentScheme = String((effectiveCustomizations as any)?.colorScheme ?? (effectiveCustomizations as any)?.colorSchemeId ?? "auto");
    const currentFont = String((effectiveCustomizations as any)?.fontPairing ?? (effectiveCustomizations as any)?.fontPairingId ?? "modern");

    const contentDirty = JSON.stringify(draft) !== JSON.stringify(content);
    const customizationsDirty = JSON.stringify(pendingCustomizations ?? null) !== JSON.stringify(customizations ?? null);
    const dirty = contentDirty || customizationsDirty;
    const busy = generatingWebsite || saving;

    // ── Live update: patch draft + push to iframe (no rebuild) ────────────
    const liveUpdate = useCallback((statePath: string, value: any) => {
        setDraft((prev: any) => {
            const next = { ...(prev ?? {}) };
            const parts = statePath.split(".");
            let cur: any = next;
            for (let i = 0; i < parts.length - 1; i++) {
                cur[parts[i]] = { ...(cur[parts[i]] ?? {}) };
                cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = value;
            return next;
        });
        const bridgeField = STATE_TO_BRIDGE[statePath] ?? statePath;
        try {
            iframeRef.current?.contentWindow?.postMessage({ type: "ed:update", field: bridgeField, value }, "*");
        } catch { /* sandboxed — ignore */ }
    }, []);

    // ── Blocks ─────────────────────────────────────────────────────────
    const isBlockEnabled = (visKey: string): boolean => (draft?.visibility ?? {})[visKey] !== false;
    const toggleBlock = (visKey: string) => {
        const required = ALL_BLOCKS.find((b) => b.visKey === visKey)?.tag === "required";
        if (required) return;
        setDraft((prev: any) => ({
            ...(prev ?? {}),
            visibility: { ...(prev?.visibility ?? {}), [visKey]: !isBlockEnabled(visKey) ? true : false },
        }));
    };

    // ── Theme + template pickers (batched into pendingCustomizations) ─────
    const setThemeField = (field: "colorScheme" | "fontPairing", value: string) => {
        setPendingCustomizations((prev: any) => ({
            ...(prev ?? customizations ?? {}),
            [field]: value,
            [`${field}Id`]: value,
        }));
    };

    const onPickTemplate = (code: string) => {
        const tpl = templateByCode(code);
        const letter = tpl?.letter ?? "A";
        const isBranded = familyOf(code) !== "generic";
        setPendingCustomizations((prev: any) => {
            const base = prev ?? customizations ?? {};
            const styles = Object.fromEntries(STYLE_KEYS.map((k) => [k, code]));
            return {
                ...base,
                heroStyle: code,
                ...styles,
                navbarStyle: letter,
                ...(isBranded ? { colorScheme: "auto", colorSchemeId: "auto", fontPairing: "auto", fontPairingId: "auto" } : {}),
            };
        });
    };

    async function handleSave() {
        if (busy || !dirty) return;
        setSaving(true);
        const toastId = toast.loading(
            customizationsDirty ? "Saving changes · regenerating site…" : "Saving content…",
            { duration: Infinity },
        );
        try {
            await onSaveContent(
                { ...draft, business_type: selectedBucket },
                customizationsDirty ? pendingCustomizations : undefined,
            );
            toast.success("Changes saved", {
                id: toastId,
                description: customizationsDirty ? "Theme + content applied. Refreshing preview." : "Content updated.",
            });
        } catch (err: any) {
            toast.error("Save failed", { id: toastId, description: err?.message ?? "Please try again." });
        } finally {
            setSaving(false);
        }
    }

    // ── Preview (same built HTML + bridge as v1) ──────────────────────────
    const previewHtml = useMemo(() => injectEditorBridge(htmlContent || ""), [htmlContent]);

    // ── Lazy-load template thumbnails (scaled iframes), rooted on the rail ──
    useEffect(() => {
        const root = railRef.current;
        if (!root) return;
        const W = 1280;
        const fill = (thumb: HTMLElement) => {
            if (thumb.dataset.done) return;
            const src = thumb.dataset.src;
            if (!src) return;
            thumb.dataset.done = "1";
            const scale = (thumb.clientWidth || 150) / W;
            const ifr = document.createElement("iframe");
            ifr.setAttribute("scrolling", "no");
            ifr.setAttribute("tabindex", "-1");
            ifr.setAttribute("aria-hidden", "true");
            ifr.style.transform = `scale(${scale.toFixed(4)})`;
            ifr.addEventListener("load", () => {
                const ph = thumb.querySelector(".v2-ph");
                if (ph) ph.remove();
            });
            ifr.src = src;
            thumb.appendChild(ifr);
        };
        const thumbs = Array.from(root.querySelectorAll<HTMLElement>(".v2-thumb"));
        if (!("IntersectionObserver" in window)) { thumbs.forEach(fill); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); fill(e.target as HTMLElement); } });
        }, { root, rootMargin: "260px 0px" });
        thumbs.forEach((t) => io.observe(t));
        return () => io.disconnect();
        // Thumbnails are static DOM; observe once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const curatedSchemes = activeFamily ? CURATED[activeFamily] : COLOR_SCHEMES.map((c) => c.id).filter((id) => id !== "auto");

    return (
        <div className="flex h-[calc(100vh-8rem)] min-h-[560px] overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {/* ── Left rail ───────────────────────────────────────────── */}
            <aside ref={railRef} className="w-[320px] flex-shrink-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50">
                <div className="border-b border-neutral-200 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-600">Editor v2</div>
                    <h2 className="truncate text-sm font-bold text-neutral-900">{businessName}</h2>
                </div>

                {/* Templates */}
                <section className="border-b border-neutral-200 p-4">
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Template</h3>
                    {TEMPLATE_FAMILIES.map((fam) => (
                        <div key={fam.family} className="mb-3 last:mb-0">
                            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{fam.label}</div>
                            <div className="grid grid-cols-2 gap-2">
                                {fam.templates.map((t) => {
                                    const active = t.code === currentHeroStyle;
                                    return (
                                        <button
                                            key={t.code}
                                            type="button"
                                            title={t.tagline}
                                            aria-pressed={active}
                                            onClick={() => onPickTemplate(t.code)}
                                            className={`flex flex-col gap-1.5 overflow-hidden rounded-lg border p-1.5 text-left transition-all ${
                                                active
                                                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                                                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:-translate-y-px"
                                            }`}
                                        >
                                            <div
                                                className="v2-thumb relative aspect-[16/10] w-full overflow-hidden rounded-md border border-neutral-200 bg-white [&>iframe]:pointer-events-none [&>iframe]:absolute [&>iframe]:left-0 [&>iframe]:top-0 [&>iframe]:h-[800px] [&>iframe]:w-[1280px] [&>iframe]:origin-top-left [&>iframe]:border-0"
                                                data-src={t.preview}
                                            >
                                                <span className="v2-ph absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-wide text-neutral-300">preview</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-neutral-800">{t.label}</span>
                                                <span className="flex-shrink-0 font-mono text-[8px] uppercase text-neutral-400">{t.letter}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </section>

                {/* Colors */}
                <section className="border-b border-neutral-200 p-4">
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                        Colors {activeFamily && <span className="font-normal normal-case tracking-normal text-neutral-400">· suggested for {activeFamily}</span>}
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                        {["auto", ...curatedSchemes].filter((v, i, a) => a.indexOf(v) === i).map((id) => {
                            const active = currentScheme === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    title={COLOR_SCHEMES.find((c) => c.id === id)?.label ?? id}
                                    aria-pressed={active}
                                    onClick={() => setThemeField("colorScheme", id)}
                                    className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors ${
                                        active ? "border-amber-500 ring-1 ring-amber-500" : "border-neutral-200 hover:border-neutral-300"
                                    }`}
                                >
                                    <span className="h-5 w-full rounded" style={{ background: SCHEME_SWATCH[id] ?? "#999" }} />
                                    <span className="w-full truncate text-center text-[8.5px] capitalize text-neutral-500">{id}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Fonts */}
                <section className="border-b border-neutral-200 p-4">
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Font</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {FONT_PAIRINGS.map((f) => {
                            const active = currentFont === f.id;
                            return (
                                <button
                                    key={f.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setThemeField("fontPairing", f.id)}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                                        active ? "border-amber-500 bg-amber-50 font-semibold text-amber-700" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Sections */}
                <section className="p-4">
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Sections</h3>
                    <div className="space-y-0.5">
                        {ALL_BLOCKS.map((b) => {
                            const on = isBlockEnabled(b.visKey);
                            const required = b.tag === "required";
                            return (
                                <button
                                    key={b.visKey}
                                    type="button"
                                    disabled={required}
                                    onClick={() => toggleBlock(b.visKey)}
                                    aria-checked={on}
                                    role="switch"
                                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                                        required ? "cursor-not-allowed opacity-60" : "hover:bg-neutral-100"
                                    }`}
                                >
                                    <span className={`relative h-4 w-7 flex-shrink-0 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-neutral-300"}`}>
                                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${on ? "translate-x-3.5" : "translate-x-0.5"}`} />
                                    </span>
                                    <span className={`flex-1 text-[11px] font-medium ${on ? "text-neutral-700" : "text-neutral-400"}`}>{b.name}</span>
                                    {required && <span className="font-mono text-[8px] uppercase text-neutral-400">req</span>}
                                </button>
                            );
                        })}
                    </div>
                </section>
            </aside>

            {/* ── Preview + toolbar ───────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Action toolbar */}
                <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={busy || !dirty}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
                    </button>
                    <button type="button" onClick={onRegenerate} disabled={busy} className={TB}>Regenerate</button>
                    <a
                        href={websitePublishedUrl || `/api/preview/${submissionId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-300"
                    >
                        View site
                    </a>
                    <button type="button" onClick={onEnhanceImages} disabled={enhancing} className={TB}>{enhancing ? "Enhancing…" : "Enhance"}</button>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {onApprove && <button type="button" onClick={onApprove} className={TB}>Approve</button>}
                        {onReject && <button type="button" onClick={onReject} className={`${TB} !text-red-600`}>Reject</button>}
                        {websitePublishedUrl ? (
                            <>
                                <button type="button" onClick={onRepublish} disabled={republishingWebsite} className={TB}>{republishingWebsite ? "Republishing…" : "Republish"}</button>
                                <button type="button" onClick={onUnpublish} disabled={unpublishingWebsite} className={TB}>{unpublishingWebsite ? "Unpublishing…" : "Unpublish"}</button>
                            </>
                        ) : (
                            <button type="button" onClick={onPublish} disabled={publishingWebsite || !websiteGenerated} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-40">{publishingWebsite ? "Publishing…" : "Publish"}</button>
                        )}
                        <button type="button" onClick={onSendToClient} disabled={sendingEmail} className={TB}>{sendingEmail ? "Sending…" : "Send to client"}</button>
                        {onToggleDetails && <button type="button" onClick={onToggleDetails} className={TB}>Details</button>}
                        <button type="button" onClick={onDelete} className={`${TB} !text-red-600`}>Delete</button>
                    </div>
                </div>

                {/* Preview */}
                <div className="relative flex-1 bg-neutral-100">
                    {busy && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                            <div className="flex items-center gap-3 text-sm font-medium text-neutral-600">
                                <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-amber-500" />
                                {saving ? "Saving + rebuilding…" : "Rebuilding website…"}
                            </div>
                        </div>
                    )}
                    {htmlContent ? (
                        <iframe
                            ref={iframeRef}
                            srcDoc={previewHtml}
                            title="Website preview (v2)"
                            className="h-full w-full border-0 bg-white"
                            sandbox="allow-same-origin allow-scripts allow-popups"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-neutral-400">No website generated yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
