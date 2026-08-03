"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal for the landing bands. Each section's content (`main > section > div`
 * inside a `.reveal-scope`) fades + rises as it enters the viewport.
 *
 * Safe by design:
 *  - The hero (first band) animates on load via pure CSS — no JS wait, no blank.
 *  - Only bands that are genuinely BELOW the fold are hidden (off-screen, so no
 *    visible flash) and then revealed on scroll; anything already visible on load
 *    is left untouched.
 *  - Respects prefers-reduced-motion (does nothing → content just shows).
 */
export default function ScrollReveal() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

        // Skip the first band (the hero) — CSS handles its load entrance.
        const nodes = Array.from(
            document.querySelectorAll<HTMLElement>(".reveal-scope main > section > div"),
        ).slice(1);
        if (!nodes.length) return;

        const io = new IntersectionObserver(
            (entries, obs) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add("reveal-in");
                        obs.unobserve(e.target);
                    }
                }
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
        );

        const vh = window.innerHeight;
        for (const n of nodes) {
            // Only hide + animate bands that start below the fold.
            if (n.getBoundingClientRect().top > vh * 0.85) {
                n.classList.add("reveal-pending");
                io.observe(n);
            }
        }

        return () => io.disconnect();
    }, []);

    return null;
}
