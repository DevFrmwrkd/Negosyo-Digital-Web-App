"use client";

import Link from "next/link";
import { Logo } from "./landingPrimitives";
import { useT, type Lang } from "./i18n";

export default function Navbar() {
    const { lang, setLang, t } = useT();

    // Anchors are home-anchored (/#id) so they work from the sub-pages too, and
    // render as plain <a> (Next <Link> doesn't reliably scroll to same-page hashes).
    const links = [
        { href: "/#how-it-works", label: t("nav.how") },
        { href: "/#proof", label: t("nav.sites") },
        { href: "/#pricing", label: t("nav.pricing") },
        { href: "/for-creators", label: t("nav.creators") },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-ink/10 bg-khaki/85 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
                <Link href="/" aria-label="Tendso home" className="flex-shrink-0">
                    <Logo />
                </Link>

                <nav className="hidden items-center gap-7 md:flex">
                    {links.map((l) =>
                        l.href.includes("#") ? (
                            <a
                                key={l.href}
                                href={l.href}
                                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                            >
                                {l.label}
                            </a>
                        ) : (
                            <Link
                                key={l.href}
                                href={l.href}
                                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                            >
                                {l.label}
                            </Link>
                        ),
                    )}
                </nav>

                <div className="flex items-center gap-2 sm:gap-3">
                    <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value as Lang)}
                        aria-label="Language"
                        className="hidden rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft sm:inline-block"
                    >
                        <option value="en">EN</option>
                        <option value="tl">TL</option>
                    </select>
                    {/* Straight into the intake funnel. This navbar also renders ON
                        /for-business, where pointing back at /for-business was a
                        self-link that read as a broken site. */}
                    <Link
                        href="/start"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                    >
                        {t("hero.ctaBusiness")}
                    </Link>
                </div>
            </div>
        </header>
    );
}
