"use client";

/**
 * /start form primitives, in the brand-gold language.
 *
 * Deliberately NOT the creator funnel's `.editorial` shell (app/submit/*) and
 * NOT components/ui/*. /start is linked from /for-business, so it has to look
 * like the page that sent the owner here: warm paper (--khaki), near-black ink,
 * one gold accent (--rust), Fraunces for display type, mono for the eyebrows.
 * Straddling the two design systems would read as two different companies
 * between the price and the form.
 *
 * The progress header is the STEP N OF 4 markup from
 * app/submit/info/page.tsx:226-249, re-skinned: the gray-200/amber-500 pair
 * becomes ink/10 and --rust, and the target sizes grow — the real user is on a
 * phone, one-handed, in a shop.
 */

import type { ReactNode } from "react";

/** Inputs are h-14, not h-12: this form is filled with a thumb. */
export const INPUT_CLASS =
    "h-14 w-full rounded-xl border border-ink/15 bg-white px-4 text-base text-ink placeholder:text-ink-soft/45 transition-colors focus:border-rust focus:outline-none";

export const SELECT_CLASS = `${INPUT_CLASS} appearance-none pr-10`;

export const TEXTAREA_CLASS =
    "min-h-[9.5rem] w-full rounded-xl border border-ink/15 bg-white p-4 text-base leading-relaxed text-ink placeholder:text-ink-soft/45 transition-colors focus:border-rust focus:outline-none";

export function ProgressHeader({
    step,
    totalSteps,
    onBack,
    backLabel,
}: {
    step: number;
    totalSteps: number;
    onBack: () => void;
    backLabel: string;
}) {
    return (
        <header className="sticky top-0 z-20 border-b border-ink/10 bg-khaki/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 py-3">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label={backLabel}
                    className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                    Step {step} of {totalSteps}
                </span>
            </div>
            <div className="mx-auto max-w-xl px-5 pb-3">
                <div
                    className="h-1.5 overflow-hidden rounded-full bg-ink/10"
                    role="progressbar"
                    aria-valuenow={step}
                    aria-valuemin={1}
                    aria-valuemax={totalSteps}
                >
                    <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${(step / totalSteps) * 100}%`, background: "var(--rust)" }}
                    />
                </div>
            </div>
        </header>
    );
}

export function StepTitle({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
    return (
        <div className="mb-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-rust">{eyebrow}</p>
            <h1
                className="mt-2.5 font-fraunces text-[clamp(1.6rem,6vw,2.1rem)] leading-[1.15] tracking-[-0.015em] text-ink"
                style={{ fontWeight: 560, fontOpticalSizing: "auto" }}
            >
                {title}
            </h1>
            {lede ? <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{lede}</p> : null}
        </div>
    );
}

export function Field({
    label,
    htmlFor,
    hint,
    optional,
    error,
    children,
}: {
    label: string;
    htmlFor: string;
    hint?: string;
    optional?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
                {label}
                {optional ? <span className="ml-1.5 font-normal text-ink-soft/70">(optional)</span> : null}
            </label>
            {hint ? <p className="-mt-1 text-[13px] leading-snug text-ink-soft">{hint}</p> : null}
            {children}
            {error ? <p className="text-[13px] font-medium text-[#B3261E]">{error}</p> : null}
        </div>
    );
}

/** Errors the owner has to act on. Red, but on paper — not a browser alert. */
export function Notice({ children }: { children: ReactNode }) {
    return (
        <div role="alert" className="rounded-xl border border-[#B3261E]/25 bg-[#B3261E]/[0.06] px-4 py-3">
            <p className="text-sm leading-snug text-[#B3261E]">{children}</p>
        </div>
    );
}

/**
 * The action bar. Sticky to the bottom of the viewport so the way forward is
 * always under the thumb, however long the step is — and above the iOS home
 * indicator, via env(safe-area-inset-bottom).
 */
export function ActionBar({ children }: { children: ReactNode }) {
    return (
        <div
            className="sticky bottom-0 z-20 border-t border-ink/10 bg-khaki/92 backdrop-blur-md"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-3.5">{children}</div>
        </div>
    );
}

export function PrimaryButton({
    children,
    onClick,
    disabled,
    type = "button",
}: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit";
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-6 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-35"
        >
            {children}
        </button>
    );
}

export function GhostButton({
    children,
    onClick,
    disabled,
}: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="inline-flex h-14 items-center justify-center rounded-xl border border-ink/15 bg-white px-5 text-[15px] font-semibold text-ink transition-colors hover:border-ink/35 disabled:pointer-events-none disabled:opacity-35"
        >
            {children}
        </button>
    );
}

export function Spinner() {
    return (
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
