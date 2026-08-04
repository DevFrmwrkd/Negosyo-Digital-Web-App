/**
 * Landing primitives — the small, shared building blocks of the redesigned
 * ("WordPress-informed") landing page. One accent (gold), calm ink-on-paper
 * body, a warm-serif display face (Fraunces) for headings only.
 *
 * These are used ONLY by sections that live OUTSIDE the legacy `.neo` wrapper.
 * Keep them dependency-light and token-driven (brand utilities from globals.css).
 */

import type { ReactNode } from "react";

/** Small uppercase kicker above a section heading. Gold by default (the accent). */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <p className={`font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-rust ${className}`}>
            {children}
        </p>
    );
}

/**
 * WP-tight display heading — Fraunces, refined ~560 weight, optical sizing on,
 * negative tracking. Defaults to <h2>; the hero owns the only <h1>.
 */
export function SectionHeading({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <h2
            className={`font-fraunces text-[clamp(1.9rem,3.6vw,2.75rem)] leading-[1.12] tracking-[-0.015em] text-ink ${className}`}
            style={{ fontWeight: 560, fontOpticalSizing: "auto" }}
        >
            {children}
        </h2>
    );
}

/** Calm lead paragraph under a heading — the quiet half of the type contrast. */
export function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <p className={`text-[clamp(1.0625rem,1.4vw,1.25rem)] leading-relaxed text-ink-soft ${className}`}>
            {children}
        </p>
    );
}
