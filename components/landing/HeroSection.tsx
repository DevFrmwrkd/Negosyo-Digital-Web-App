"use client";

import Link from "next/link";
import { useT } from "./i18n";
import { CAROUSEL_SITES } from "./landingData";
import LiveSitePreview from "./LiveSitePreview";

function Check() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--rust)" }}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

// The real client site shown in the hero preview (first curated site).
const HERO_SITE = CAROUSEL_SITES[0];
const HERO_HOST = (HERO_SITE?.url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");

export default function HeroSection() {
    const { t } = useT();

    return (
        <section className="flex min-h-[calc(100svh-3.75rem)] items-center bg-khaki">
            <div className="mx-auto w-full max-w-6xl px-6 py-16">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    {/* Left: the pitch */}
                    <div className="text-center lg:text-left">
                        <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--rust)" }} />
                            {t("hero.trustChip")}
                        </span>

                        <h1
                            className="mx-auto mt-7 max-w-xl font-fraunces text-[clamp(2.25rem,5.2vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-ink lg:mx-0"
                            style={{ fontWeight: 560, fontOpticalSizing: "auto" }}
                        >
                            {t("hero.h1a")}{" "}
                            <span className="whitespace-nowrap">
                                {t("hero.h1b")}
                                <span className="italic" style={{ color: "var(--rust)", fontWeight: 560 }}>
                                    {t("hero.h1c")}
                                </span>
                            </span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-ink-soft lg:mx-0">
                            {t("hero.lede")}
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                            <Link
                                href="/for-business"
                                className="inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(27,28,36,0.45)] transition-transform hover:-translate-y-0.5"
                            >
                                {t("hero.ctaBusiness")}
                                <span aria-hidden="true">→</span>
                            </Link>
                            <a
                                href="#proof"
                                className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink/35"
                            >
                                {t("hero.ctaProof")}
                            </a>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-sm text-ink-soft lg:justify-start">
                            {[t("hero.tag1"), t("hero.tag2"), t("hero.tag3")].map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1.5">
                                    <Check />
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <p className="mt-9 text-sm text-ink-soft">
                            {t("hero.creatorLead")}{" "}
                            <Link
                                href="/for-creators"
                                className="font-semibold text-ink underline decoration-2 underline-offset-4 transition-colors hover:opacity-70"
                                style={{ textDecorationColor: "var(--rust)" }}
                            >
                                {t("hero.creatorLink")}
                            </Link>
                        </p>
                    </div>

                    {/* Right: a framed live preview of a real client site */}
                    <div className="mx-auto w-full max-w-md lg:max-w-none">
                        <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-[0_34px_70px_-34px_rgba(27,28,36,0.5)]">
                            {/* Browser chrome */}
                            <div className="flex items-center gap-1.5 border-b border-ink/10 bg-khaki-deep px-3.5 py-2.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                                <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                                <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                                <span className="ml-2 truncate rounded-md bg-white px-2 py-0.5 font-mono text-[10px] text-ink-soft">
                                    {HERO_HOST}
                                </span>
                            </div>
                            {HERO_SITE?.url && <LiveSitePreview url={HERO_SITE.url} name={HERO_SITE.name} />}
                        </div>
                        <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft lg:text-left">
                            {t("hero.previewCaption")}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
