"use client";

/**
 * useEditorDraft — the shared draft/customizations model for the sandbox editors.
 *
 * Extracts v2's proven batching contract (SandboxEditorV2.tsx:104-331) into a
 * reusable hook so v3 (and, later, a v2 retrofit) can't drift on it, and layers
 * on two v3 enhancements that live purely over the draft object:
 *   • undo / redo — a bounded history of {draft, customizations} snapshots,
 *     coalescing rapid same-field edits into one step.
 *   • local draft recovery — autosaves {draft, customizations} (content JSON
 *     only, never HTML) to localStorage; on mount, if the cache differs from the
 *     server content it OFFERS a restore (never auto-adopts — that would clobber
 *     newer server content).
 *
 * State only — no DOM/iframe work. The component owns the preview iframe, theme
 * injection, inline-editing wiring, click routing, toolbar, and the actual Save
 * orchestration (toast/spinner); it drives them off this hook's state + mutators.
 *
 * INVARIANTS preserved from v2 (do not weaken — they're load-bearing):
 *   • draftRef mirrors draft synchronously so a blur-commit right before Save is
 *     readable without a re-render.
 *   • clean-sync guard: adopt incoming server content/customizations ONLY when
 *     the editor is clean, else in-progress edits survive a reactive prop re-push.
 *   • setDeepDraft never clobbers an object leaf and preserves a non-empty string
 *     parent as { lead } when a dotted write upgrades it to an object.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { SandboxEditorProps } from "./SandboxEditor";
import { TEMPLATE_BUCKETS } from "./templateCatalog";
import { familyOf, templateByCode, BLOCK_TIER, type TemplateFamily } from "./templateCatalog";
import { ALL_BLOCKS } from "./editorConstants";

// The 12 per-section style keys a template pick stamps (mirrors v2:46-50).
const STYLE_KEYS = [
    "aboutStyle", "servicesStyle", "galleryStyle", "contactStyle", "trustStyle",
    "whyUsStyle", "howItWorksStyle", "testimonialsStyle", "faqStyle",
    "serviceAreaStyle", "credentialsStyle", "ctaBandStyle",
] as const;

const HISTORY_CAP = 60;          // max undo steps
const COALESCE_MS = 500;         // merge same-field edits within this window into one step
const CACHE_PREFIX = "tendso.editorDraft.v3.";
const CACHE_DEBOUNCE_MS = 800;

type Snapshot = { draft: any; cust: any };

function deepGet(obj: any, path: string): any {
    let cur = obj;
    for (const p of path.split(".")) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}

const j = (v: any) => JSON.stringify(v ?? null);

/**
 * Normalise Why / How / Testimonials / FAQ / Credentials on the way INTO the
 * draft.
 *
 * The AI extraction (lib/services/groq.service.ts) emits these five as BARE
 * ARRAYS with its own field names, while the sidebar schema reads
 * `why.items`, `how.steps`, `faq.items` … So without this the five panels
 * render "No items yet" beside an iframe showing three reasons and five FAQs.
 *
 * Worse, WRITING was destructive: setValue('why.items', …) clones the bare
 * array and hangs an `.items` property on it, and JSON.stringify drops
 * non-index properties of an array — so the edit vanished between the success
 * toast and Convex. Normalising at the seed is what makes the shape survive
 * the round trip.
 *
 * Mirrors lib/astro-builder.ts#normalizeBlock (render-time) and the copy that
 * lived only in SandboxEditor.tsx (v1). Keep the three in step.
 */
const normalizeBlockEditor = (
    input: any,
    itemsKey: 'items' | 'steps' = 'items',
    aliases: Record<string, string> = {},
    altItemsKey?: string,
): any => {
    if (input == null) return input;
    let arr: any[] | null = null;
    let wrapper: Record<string, any> = {};
    if (Array.isArray(input)) {
        arr = input;
    } else if (typeof input === 'object') {
        wrapper = { ...input };
        if (Array.isArray(input[itemsKey])) {
            arr = input[itemsKey];
        } else if (altItemsKey && Array.isArray(input[altItemsKey])) {
            arr = input[altItemsKey];
        }
    }
    if (!arr) return input;
    const mapped = arr.map((it: any) => {
        if (!it || typeof it !== 'object') return it;
        const out: Record<string, any> = { ...it };
        for (const [from, to] of Object.entries(aliases)) {
            if (out[from] != null && out[to] == null) out[to] = out[from];
        }
        return out;
    });
    delete wrapper[itemsKey];
    if (altItemsKey) delete wrapper[altItemsKey];
    return { ...wrapper, [itemsKey]: mapped };
};

export const normalizeDraft = (raw: any): any => {
    if (!raw || typeof raw !== 'object') return raw ?? {};
    return {
        ...raw,
        // services is the ROOMS list in the hospitality family. Groq emits it
        // nested, but the LEGACY shape is a bare array of {name, description}
        // and astro-builder used to discard that outright. Normalising it here
        // means an edit writes services.items on a real wrapper instead of
        // hanging a property on an Array, which JSON.stringify would drop.
        services: normalizeBlockEditor(raw.services, 'items', { name: 'title', description: 'desc' }),
        why: normalizeBlockEditor(raw.why, 'items', { description: 'body' }),
        how: normalizeBlockEditor(raw.how, 'steps', { description: 'body' }, 'items'),
        testimonials: normalizeBlockEditor(raw.testimonials, 'items', { name: 'who', author: 'who', context: 'role' }),
        faq: normalizeBlockEditor(raw.faq, 'items', { question: 'q', answer: 'a' }),
        // label/detail are what the AI actually emits (groq.service.ts:949) while
        // the sidebar schema edits title/body — without these two the panel showed
        // blank rows over content the page was rendering fine, because the .astro
        // components fall back to .label/.detail themselves. description/body ->
        // desc stay first so an already-correct row is untouched.
        // ORDER MATTERS: body -> desc must come LAST. detail -> body then
        // body -> desc is a chain, and with body -> desc first the second pass
        // derives a desc the first pass did not, so normalizeDraft stops being
        // idempotent — which silently breaks the clean-sync equality test and
        // makes the editor stop adopting server updates. Covered by a test.
        credentials: normalizeBlockEditor(raw.credentials, 'items', { description: 'desc', label: 'title', detail: 'body', body: 'desc' }),
    };
};

export function useEditorDraft(props: SandboxEditorProps) {
    const { content, customizations, businessType, submissionId } = props;

    // ── Content draft (+ visibility) ──────────────────────────────────────
    const [draft, setDraft] = useState<any>(() => normalizeDraft(content));
    // Tracks the content prop every render so isDirtyNow() can recompute without
    // waiting for the clean-sync effect.
    const contentPropRef = useRef<any>(content);
    contentPropRef.current = content;
    const draftRef = useRef<any>(draft);
    draftRef.current = draft;

    // ── Customizations (template/theme/per-block *Style picks) ────────────
    const [pendingCustomizations, setPendingCustomizations] = useState<any>(customizations);
    const pendingCustRef = useRef<any>(pendingCustomizations);
    pendingCustRef.current = pendingCustomizations;

    // ── Undo/redo history over {draft, cust} snapshots ────────────────────
    const historyRef = useRef<{ stack: Snapshot[]; index: number }>({
        stack: [{ draft: draftRef.current, cust: pendingCustRef.current }],
        index: 0,
    });
    const lastPushRef = useRef<{ at: number; key: string } | null>(null);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const refreshUndoFlags = () => {
        const h = historyRef.current;
        setCanUndo(h.index > 0);
        setCanRedo(h.index < h.stack.length - 1);
    };

    // ── Local draft recovery ──────────────────────────────────────────────
    const cacheKey = CACHE_PREFIX + submissionId;
    const cacheTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cachedRef = useRef<Snapshot | null>(null);
    const [hasCachedDraft, setHasCachedDraft] = useState(false);

    const clearCache = useCallback(() => {
        try { window.localStorage.removeItem(cacheKey); } catch { /* ignore */ }
        cachedRef.current = null;
        setHasCachedDraft(false);
    }, [cacheKey]);

    const scheduleCache = useCallback((d: any, c: any) => {
        if (cacheTimer.current) clearTimeout(cacheTimer.current);
        cacheTimer.current = setTimeout(() => {
            try {
                // Only cache when it actually diverges from the server — a clean
                // editor shouldn't leave a stale cache to offer next time.
                if (j(d) === j(content) && j(c ?? null) === j(customizations ?? null)) {
                    window.localStorage.removeItem(cacheKey);
                } else {
                    window.localStorage.setItem(cacheKey, JSON.stringify({ draft: d, cust: c, at: Date.now() }));
                }
            } catch { /* quota / disabled — non-fatal */ }
        }, CACHE_DEBOUNCE_MS);
    }, [cacheKey, content, customizations]);

    // On mount: if a cache exists and diverges from the current server content,
    // OFFER a restore. Never auto-adopt (a stale cache must not beat newer data).
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(cacheKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Snapshot & { at?: number };
            if (parsed && j(parsed.draft) !== j(content)) {
                cachedRef.current = { draft: parsed.draft, cust: parsed.cust };
                setHasCachedDraft(true);
            } else {
                window.localStorage.removeItem(cacheKey);
            }
        } catch { /* ignore */ }
        // mount-only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Central commit — updates state, records history, schedules cache ──
    const commitState = useCallback((nextDraft: any, nextCust: any, opts?: { coalesceKey?: string; noHistory?: boolean }) => {
        draftRef.current = nextDraft;
        pendingCustRef.current = nextCust;
        setDraft(nextDraft);
        setPendingCustomizations(nextCust);

        if (!opts?.noHistory) {
            const h = historyRef.current;
            const snap: Snapshot = { draft: nextDraft, cust: nextCust };
            const now = Date.now();
            const last = lastPushRef.current;
            const canCoalesce = !!opts?.coalesceKey && !!last && last.key === opts.coalesceKey
                && now - last.at < COALESCE_MS && h.index === h.stack.length - 1;
            if (canCoalesce) {
                h.stack[h.index] = snap; // replace top — collapse a typing burst
            } else {
                h.stack = h.stack.slice(0, h.index + 1);
                h.stack.push(snap);
                if (h.stack.length > HISTORY_CAP) h.stack.shift();
                h.index = h.stack.length - 1;
            }
            lastPushRef.current = { at: now, key: opts?.coalesceKey ?? "" };
            refreshUndoFlags();
        }
        scheduleCache(nextDraft, nextCust);
    }, [scheduleCache]);

    const applySnapshot = useCallback((s: Snapshot) => {
        draftRef.current = s.draft;
        pendingCustRef.current = s.cust;
        setDraft(s.draft);
        setPendingCustomizations(s.cust);
        lastPushRef.current = null; // never coalesce across an undo/redo boundary
        refreshUndoFlags();
        scheduleCache(s.draft, s.cust);
    }, [scheduleCache]);

    const undo = useCallback(() => {
        const h = historyRef.current;
        if (h.index <= 0) return;
        h.index -= 1;
        applySnapshot(h.stack[h.index]);
    }, [applySnapshot]);

    const redo = useCallback(() => {
        const h = historyRef.current;
        if (h.index >= h.stack.length - 1) return;
        h.index += 1;
        applySnapshot(h.stack[h.index]);
    }, [applySnapshot]);

    const restoreCachedDraft = useCallback(() => {
        const c = cachedRef.current;
        if (!c) return;
        // Normalised on restore too: a draft cached before this fix landed
        // still carries the bare-array shape.
        commitState(normalizeDraft(c.draft), c.cust);
        setHasCachedDraft(false);
    }, [commitState]);

    // ── Clean-sync guards: adopt server props only when the editor is clean ─
    const syncedContentRef = useRef<any>(content);
    useEffect(() => {
        // Compare like with like: draftRef holds a NORMALISED draft, so the
        // synced props must be normalised before the equality test. Comparing
        // a normalised draft against raw content reads as permanently dirty,
        // and the editor silently stops adopting server updates.
        const clean = j(draftRef.current) === j(normalizeDraft(syncedContentRef.current));
        syncedContentRef.current = content;
        if (clean) {
            const next = normalizeDraft(content);
            commitState(next, pendingCustRef.current, { noHistory: true });
            historyRef.current = { stack: [{ draft: next, cust: pendingCustRef.current }], index: 0 };
            refreshUndoFlags();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    const syncedCustRef = useRef<any>(customizations);
    useEffect(() => {
        // Improve on v2's unconditional adopt: keep pending theme/template picks
        // if the editor is mid-edit; only take server customizations when clean.
        const clean = j(pendingCustRef.current ?? null) === j(syncedCustRef.current ?? null);
        syncedCustRef.current = customizations;
        if (clean) {
            pendingCustRef.current = customizations;
            setPendingCustomizations(customizations);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customizations]);

    // ── setDeepDraft — dotted-path writer (v2:166-187, guards preserved) ──
    const setDeepDraft = useCallback((path: string, value: any) => {
        const prev = draftRef.current;
        const parts = path.split(".");
        // Clobber guard: never write a scalar over an existing OBJECT leaf.
        let peek: any = prev;
        for (const p of parts) { if (peek == null) break; peek = peek[p]; }
        if (peek !== null && typeof peek === "object") return;
        const root = prev ? { ...prev } : {};
        let cur: any = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const k = parts[i];
            const numeric = /^\d+$/.test(parts[i + 1]);
            if (Array.isArray(cur[k])) cur[k] = [...cur[k]];
            else if (cur[k] && typeof cur[k] === "object") cur[k] = { ...cur[k] };
            else if (typeof cur[k] === "string" && cur[k].trim()) cur[k] = numeric ? [] : { lead: cur[k] };
            else cur[k] = numeric ? [] : {};
            cur = cur[k];
        }
        cur[parts[parts.length - 1]] = value;
        commitState(root, pendingCustRef.current, { coalesceKey: `field:${path}` });
    }, [commitState]);

    // Unguarded dotted-path writer for the sidebar FORM / link popover / image
    // picker — these legitimately write arrays and objects (list add/remove/
    // reorder, image URLs), so unlike setDeepDraft they must NOT bail on an
    // existing object leaf. (setDeepDraft's clobber guard exists only to protect
    // the conservative inline-contenteditable path.) Mirrors v1's setDeepDraft.
    const setValue = useCallback((path: string, value: any) => {
        const prev = draftRef.current;
        const parts = path.split(".");
        const root = prev ? { ...prev } : {};
        let cur: any = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const k = parts[i];
            const numeric = /^\d+$/.test(parts[i + 1]);
            if (Array.isArray(cur[k])) cur[k] = [...cur[k]];
            else if (cur[k] && typeof cur[k] === "object") cur[k] = { ...cur[k] };
            else if (typeof cur[k] === "string" && cur[k].trim()) cur[k] = numeric ? [] : { lead: cur[k] };
            else cur[k] = numeric ? [] : {};
            cur = cur[k];
        }
        cur[parts[parts.length - 1]] = value;
        commitState(root, pendingCustRef.current, { coalesceKey: `field:${path}` });
    }, [commitState]);

    const getValue = useCallback((path: string) => deepGet(draftRef.current, path), []);

    /**
     * Discard every unsaved change — content AND customizations — back to what
     * the server last gave us. replaceDraft cannot do this: it deliberately
     * carries pendingCustRef forward, so it can never roll back a template pick.
     * Callers must re-run their iframe appliers afterwards or the preview keeps
     * showing the discarded look.
     */
    const resetDraft = useCallback(() => {
        commitState(normalizeDraft(contentPropRef.current), syncedCustRef.current);
    }, [commitState]);

    // Commit a whole new draft object (used by image-slot writes / normalization
    // that rebuild the draft rather than set one dotted path).
    const replaceDraft = useCallback((nextDraft: any, coalesceKey?: string) => {
        commitState(nextDraft, pendingCustRef.current, coalesceKey ? { coalesceKey } : undefined);
    }, [commitState]);

    // ── Section visibility (v2:256-263) ───────────────────────────────────
    const isBlockEnabled = useCallback((visKey: string): boolean => (draftRef.current?.visibility ?? {})[visKey] !== false, []);
    const toggleBlock = useCallback((visKey: string) => {
        // Essential sections are not switchable. Until now this was enforced only
        // by a `disabled` attribute on a button, so any other caller — a keyboard
        // shortcut, a preview-side control — could strip HERO, SERVICES, LOCATION
        // or FOOTER from a customer's site silently. Keyed on the TIER, not on the
        // per-block `tag`: LOCATION's tag is merely 'recommended', which is exactly
        // how it stayed switchable in v3.
        const blockName = ALL_BLOCKS.find((b) => b.visKey === visKey)?.name;
        if (blockName && BLOCK_TIER[blockName] === 'essential') return;
        const prev = draftRef.current;
        const next = {
            ...(prev ?? {}),
            visibility: { ...(prev?.visibility ?? {}), [visKey]: (prev?.visibility ?? {})[visKey] === false ? true : false },
        };
        commitState(next, pendingCustRef.current, { coalesceKey: `block:${visKey}` });
    }, [commitState]);

    // ── Theme + template pickers (v2:210-233) ─────────────────────────────
    const setThemeField = useCallback((field: "colorScheme" | "fontPairing", value: string) => {
        const base = pendingCustRef.current ?? customizations ?? {};
        const next = { ...base, [field]: value, [`${field}Id`]: value };
        commitState(draftRef.current, next, { coalesceKey: `theme:${field}` });
    }, [commitState, customizations]);

    // Per-role colour override (click-to-recolour). Stored under
    // customizations.roleColors keyed by "<role>:<prop>"; pass color=null to clear.
    const setRoleColor = useCallback((key: string, color: string | null) => {
        const base = pendingCustRef.current ?? customizations ?? {};
        const roleColors = { ...(((base as any).roleColors as Record<string, string>) ?? {}) };
        if (color) roleColors[key] = color;
        else delete roleColors[key];
        const next = { ...base, roleColors };
        commitState(draftRef.current, next, { coalesceKey: `roleColor:${key}` });
    }, [commitState, customizations]);

    const savedHero = String((customizations as any)?.heroStyle ?? "");
    const onPickTemplate = useCallback((code: string) => {
        if (!code) {
            // "Auto / placeholder" — clear heroStyle and every sibling *Style key.
            // Deliberately does NOT stamp navbarStyle or force colorScheme/
            // fontPairing to auto: familyOf('') is null, so the isBranded test
            // below would treat "no template" as branded and wipe the admin's
            // palette on the way out.
            const cleared = { ...(pendingCustRef.current ?? customizations ?? {}) } as Record<string, any>;
            cleared.heroStyle = "";
            for (const k of STYLE_KEYS) cleared[k] = "";
            commitState(draftRef.current, cleared);
            return;
        }
        const tpl = templateByCode(code);
        const letter = tpl?.letter ?? "A";
        const isBranded = familyOf(code) !== "generic";
        const base = pendingCustRef.current ?? customizations ?? {};
        const styles = Object.fromEntries(STYLE_KEYS.map((k) => [k, code]));
        const next = {
            ...base,
            heroStyle: code,
            ...styles,
            navbarStyle: letter,
            ...(isBranded ? { colorScheme: "auto", colorSchemeId: "auto", fontPairing: "auto", fontPairingId: "auto" } : {}),
        };
        // Picking a template only updates the pending customizations (the grid
        // highlights it). The real WYSIWYG preview happens when the admin clicks
        // "Preview my site" in the editor, which builds the draft into real HTML —
        // no placeholder swap here.
        commitState(draftRef.current, next);
    }, [commitState, customizations]);

    // ── Derived (mirror v2:91-99) ─────────────────────────────────────────
    const effectiveCustomizations = pendingCustomizations ?? customizations ?? {};
    const currentHeroStyle = String((effectiveCustomizations as any)?.heroStyle ?? "");
    const activeFamily: TemplateFamily | null = familyOf(currentHeroStyle);
    const currentScheme = String((effectiveCustomizations as any)?.colorScheme ?? (effectiveCustomizations as any)?.colorSchemeId ?? "auto");
    const currentFont = String((effectiveCustomizations as any)?.fontPairing ?? (effectiveCustomizations as any)?.fontPairingId ?? "modern");
    const btForTheme = businessType || (content as any)?.business_type || "";

    const selectedBucket = (() => {
        const initial = (businessType || (content as any)?.business_type || "").toLowerCase();
        const match = TEMPLATE_BUCKETS.find((b) => b.id === initial || b.label.toLowerCase() === initial);
        return match?.id ?? "services";
    })();

    // Normalise the right-hand side too. The draft is normalised at every seed
    // point, so comparing it against the RAW prop reported every Groq-shaped
    // submission as permanently dirty — which would defeat any dirty-gated Save.
    // Fresh dirty state read from the REFS. Render-time contentDirty below is
    // captured in a closure, so a caller that has just committed something
    // synchronously (blurring an inline edit commits it) would otherwise test
    // pre-mutation state and wrongly conclude there is nothing to save.
    const isDirtyNow = useCallback(() => {
        const content = j(draftRef.current) !== j(normalizeDraft(contentPropRef.current));
        const cust = j(pendingCustRef.current ?? null) !== j(syncedCustRef.current ?? null);
        return { contentDirty: content, customizationsDirty: cust, dirty: content || cust };
    }, []);

    const contentDirty = j(draft) !== j(normalizeDraft(content));
    const customizationsDirty = j(pendingCustomizations ?? null) !== j(customizations ?? null);
    const dirty = contentDirty || customizationsDirty;

    // Cleanup the debounce timer on unmount.
    useEffect(() => () => { if (cacheTimer.current) clearTimeout(cacheTimer.current); }, []);

    return {
        // state
        draft, draftRef, pendingCustomizations,
        // mutators
        setDeepDraft, setValue, replaceDraft, resetDraft, getValue, isBlockEnabled, toggleBlock, setThemeField, setRoleColor, onPickTemplate,
        // derived
        effectiveCustomizations, currentHeroStyle, activeFamily, currentScheme, currentFont,
        savedHero, btForTheme, selectedBucket,
        contentDirty, customizationsDirty, dirty, isDirtyNow,
        // undo/redo
        undo, redo, canUndo, canRedo,
        // draft recovery
        hasCachedDraft, restoreCachedDraft, dismissCachedDraft: clearCache, clearCache,
    };
}
