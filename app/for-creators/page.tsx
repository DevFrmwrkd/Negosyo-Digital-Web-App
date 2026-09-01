"use client";

import Link from "next/link";

import { LanguageProvider, useT } from "@/components/landing/i18n";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollToTop from "@/components/landing/ScrollToTop";
import ChatBot from "@/components/landing/ChatBot";
import ScrollReveal from "@/components/landing/ScrollReveal";

import CreatorTeaserSection from "@/components/landing/CreatorTeaserSection";
import AppDownloadSection from "@/components/landing/AppDownloadSection";
import ProcessSection from "@/components/landing/ProcessSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import { Eyebrow, SectionHeading, Lead } from "@/components/landing/ui";
import { PRICE_CEILING, UNLOCK_THRESHOLD, commissionFor, formatPHP } from "@/lib/pricing";

/** Creator hero — WP style, the one <h1>. Keeps the real Clerk signup CTA. */
function CreatorHero() {
    const { t } = useT();
    return (
        <section className="bg-khaki">
            <div className="mx-auto max-w-4xl px-6 pt-10 pb-16 text-center sm:pt-14 sm:pb-20">
                <Link href="/" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink">
                    <span aria-hidden>←</span> {t("biz.back")}
                </Link>
                <div className="mt-8">
                    <Eyebrow>{t("how.creatorLabel")}</Eyebrow>
                    <h1
                        className="mx-auto mt-4 max-w-3xl font-fraunces text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.05] tracking-[-0.02em] text-ink"
                        style={{ fontWeight: 560, fontOpticalSizing: "auto" }}
                    >
                        {t("creator.h1a")}{" "}
                        <span className="italic" style={{ color: "var(--rust)", fontWeight: 560 }}>{t("creator.h1em")}</span>
                    </h1>
                    <Lead className="mx-auto mt-5 max-w-xl">{t("creator.lede")}</Lead>
                    <div className="mt-8">
                        <a href="#app" className="inline-flex items-center gap-2 rounded-xl bg-rust px-6 py-3.5 text-sm font-semibold text-khaki transition-transform hover:-translate-y-0.5">
                            {t("nav.getApp")} <span aria-hidden>→</span>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

/** How to apply — 4 honest steps (no "pin yourself on the map", no invented cert specifics). */
function ApplySection() {
    const { t } = useT();
    const steps = [t("how.creator1"), t("how.creator2"), t("how.creator3"), t("how.creator4")];
    const tags = [t("creator.apply.tag1"), t("creator.apply.tag2"), t("creator.apply.tag3")];
    return (
        <section id="apply" className="bg-khaki-deep">
            <div className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
                <div className="mx-auto max-w-2xl text-center">
                    <Eyebrow>{t("creator.apply.eyebrow")}</Eyebrow>
                    <SectionHeading className="mt-4">
                        {t("creator.apply.title")}{" "}
                        <span className="italic" style={{ color: "var(--rust)", fontWeight: 560 }}>{t("creator.apply.titleEm")}</span>
                    </SectionHeading>
                    <Lead className="mx-auto mt-5 max-w-xl">{t("creator.apply.lede")}</Lead>
                </div>
                <ol className="mx-auto mt-12 flex max-w-2xl flex-col rounded-2xl border border-ink/10 bg-khaki p-6 sm:p-8">
                    {steps.map((s, i) => (
                        <li key={i} className="grid grid-cols-[2.5rem_1fr] items-baseline gap-3 border-t border-ink/10 py-5 first:border-t-0 first:pt-0">
                            <span className="font-mono text-sm text-rust">0{i + 1}</span>
                            <span className="text-[15px] leading-snug text-ink sm:text-base">{s}</span>
                        </li>
                    ))}
                </ol>
                <div className="mt-8 flex flex-col items-center gap-6">
                    <div className="flex flex-wrap justify-center gap-2">
                        {tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-ink/15 bg-white px-3 py-1 text-sm text-ink-soft">{tag}</span>
                        ))}
                    </div>
                    <a href="#app" className="inline-flex items-center gap-2 rounded-xl bg-rust px-6 py-3.5 text-sm font-semibold text-khaki transition-transform hover:-translate-y-0.5">
                        {t("nav.getApp")} <span aria-hidden>→</span>
                    </a>
                </div>
            </div>
        </section>
    );
}

/** Earnings — the honest CreatorTeaser, with the creator-only price-ceiling note. */
function CreatorEarnings() {
    const { t } = useT();
    const note = t("creator.ceilingNote")
        .replace("{c}", formatPHP(commissionFor(PRICE_CEILING)))
        .replace("{n}", String(UNLOCK_THRESHOLD));
    return <CreatorTeaserSection id="earn" ctaHref="#app" ceilingNote={note} />;
}

export default function ForCreatorsPage() {
    return (
        <LanguageProvider>
            <div className="reveal-scope min-h-screen overflow-x-clip bg-khaki text-ink">
                <Navbar />
                <main>
                    <CreatorHero />
                    <ApplySection />
                    {/* The creator app (real Play Store + APK download) — the primary
                        action; every creator CTA on this page scrolls here (app-first). */}
                    <AppDownloadSection id="app" />
                    <CreatorEarnings />
                    {/* Creator-side copy: the visit is theirs, the build is ours.
                        `/` renders the same shell with the owner-facing default. */}
                    <ProcessSection variant="creator" />
                    <FaqSection defaultTab="creators" />
                    <CtaSection focus="creator" />
                </main>
                <Footer />
                <ChatBot />
                <ScrollToTop />
                <ScrollReveal />
            </div>
        </LanguageProvider>
    );
}
