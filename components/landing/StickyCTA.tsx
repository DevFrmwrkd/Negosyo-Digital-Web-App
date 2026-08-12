"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "./i18n";

/**
 * Persistent single-action CTA that fades in once you've scrolled past the hero.
 * Brand-token styled (the old version's styles were `.neo`-scoped and broke when
 * the landing left `.neo`). Focus-aware: owner pages push "Get a website", the
 * creator page pushes "Get the app". One clear action — no competing doors.
 */
export default function StickyCTA({ focus = "business" }: { focus?: "business" | "creator" } = {}) {
    const { t } = useT();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 640);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const isBiz = focus === "business";
    // The owner pill is the intake funnel itself. It only appears 640px down —
    // by then the reader has passed the hero and is being asked to act, not to
    // read another page (and the page it used to point at, /for-business, was
    // this one's content at a second URL).
    const href = isBiz ? "/start" : "#app";
    const label = isBiz ? t("hero.ctaBusiness") : t("nav.getApp");

    const pill = (
        <span className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_38px_-12px_rgba(27,28,36,0.55)] transition-transform hover:-translate-y-0.5">
            {label}
            <span aria-hidden>→</span>
        </span>
    );

    return (
        <div
            className={`fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 transition-all duration-300 ${
                visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
            }`}
        >
            {isBiz ? (
                <Link href={href} tabIndex={visible ? 0 : -1} aria-hidden={!visible}>
                    {pill}
                </Link>
            ) : (
                <a href={href} tabIndex={visible ? 0 : -1} aria-hidden={!visible}>
                    {pill}
                </a>
            )}
        </div>
    );
}
