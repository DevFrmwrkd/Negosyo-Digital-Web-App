"use client";

import Link from "next/link";

import { LanguageProvider, useT } from "@/components/landing/i18n";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollToTop from "@/components/landing/ScrollToTop";
import ChatBot from "@/components/landing/ChatBot";
import ScrollReveal from "@/components/landing/ScrollReveal";

import ProcessSection from "@/components/landing/ProcessSection";
import RealSitesSection from "@/components/landing/RealSitesSection";
import BusinessPricingSection from "@/components/landing/BusinessPricingSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import { Eyebrow, Lead } from "@/components/landing/ui";

function Check() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0" style={{ color: "var(--rust)" }}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

/**
 * BusinessHero — owner-facing, WP style, data-true. No "48 hours" (48–72h), no
 * "our subdomain" (that wildcard doesn't exist), no live-map. Reuses the home
 * hero copy + the pricing standard features as the deliverables list.
 *
 * The primary CTA is the entrance to the owner-intake funnel at /start. It used
 * to be an in-page anchor, back when there was nothing for an owner to do here
 * but read — still no signup, and still no account at any point, but the owner
 * now supplies their own intake instead of waiting for a creator to visit.
 */
function BusinessHero() {
    const { t } = useT();
    const deliverables = [
        t("price.stdF1"), t("price.stdF2"), t("price.stdF3"),
        t("price.stdF4"), t("price.stdF5"), t("price.stdF6"),
    ];
    return (
        <section className="bg-khaki">
            <div className="mx-auto max-w-6xl px-6 pt-10 pb-16 sm:pt-14 sm:pb-20">
                <Link href="/" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink">
                    <span aria-hidden>←</span> {t("biz.back")}
                </Link>

                <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--rust)" }} />
                            {t("hero.trustChip")}
                        </span>
                        <Eyebrow className="mt-6">{t("how.bizLabel")}</Eyebrow>
                        <h1
                            className="mt-3 max-w-2xl font-fraunces text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-ink"
                            style={{ fontWeight: 560, fontOpticalSizing: "auto" }}
                        >
                            {t("hero.h1a")}{" "}
                            <span className="whitespace-nowrap">
                                {t("hero.h1b")}
                                <span className="italic" style={{ color: "var(--rust)", fontWeight: 560 }}>{t("hero.h1c")}</span>
                            </span>
                        </h1>
                        <Lead className="mt-5 max-w-xl">{t("hero.lede")}</Lead>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Link href="/start" className="inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">
                                {t("hero.ctaBusiness")} <span aria-hidden>→</span>
                            </Link>
                            <a href="#proof" className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink/35">
                                {t("hero.ctaProof")}
                            </a>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-ink-soft">
                            {[t("hero.tag1"), t("hero.tag2"), t("hero.tag3")].map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1.5"><Check />{tag}</span>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-khaki-deep p-6 sm:p-7">
                        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{t("process.kitLabel")}</div>
                        <ul className="mt-4 flex flex-col">
                            {deliverables.map((d, i) => (
                                <li key={i} className="flex items-center gap-2.5 border-t border-ink/10 py-3 text-sm leading-snug text-ink first:border-t-0 first:pt-0">
                                    <Check /><span>{d}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function ForBusinessPage() {
    return (
        <LanguageProvider>
            <div className="reveal-scope min-h-screen overflow-x-clip bg-khaki text-ink">
                <Navbar />
                <main>
                    <BusinessHero />
                    <RealSitesSection />
                    <BusinessPricingSection />
                    <ProcessSection />
                    <FaqSection businessOnly />
                    <CtaSection focus="business" />
                </main>
                <Footer />
                <ChatBot />
                <ScrollToTop />
                <ScrollReveal />
            </div>
        </LanguageProvider>
    );
}
