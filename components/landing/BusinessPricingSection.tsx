"use client";

import Link from "next/link";
import { useT } from "./i18n";
import { Eyebrow, SectionHeading, Lead } from "./ui";
import { BASE_PRICE, formatPHP } from "@/lib/pricing";

/**
 * Business pricing — a single ₱999+ tier. TRUE to lib/pricing.ts: ₱999 gets a
 * real website, live forever. The custom domain (lib/pricing CUSTOM_DOMAIN_PRICE)
 * is an OPTIONAL add-on, so per Theo's feedback it's demoted to a note under the
 * one tier rather than shown as a co-equal pricing card — the "+" signals the
 * optional upgrade honestly without headlining it. One-time, no monthly, pay only
 * when live. The CTA points at /start, the owner-intake funnel — this section
 * renders on both `/` and `/for-business`, so it is the price and the entrance in
 * the same card. Owners still never "sign up": /start is anonymous end to end and
 * no account exists at any point.
 */

function Check() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 flex-shrink-0" style={{ color: "var(--rust)" }}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

export default function BusinessPricingSection() {
    const { t } = useT();

    const features = [
        t("price.stdF1"), t("price.stdF2"), t("price.stdF3"),
        t("price.stdF4"), t("price.stdF5"), t("price.stdF6"),
    ];

    return (
        <section id="pricing" className="bg-khaki">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
                <div className="mx-auto max-w-2xl text-center">
                    <Eyebrow>{t("price.eyebrow")}</Eyebrow>
                    <SectionHeading className="mt-4">
                        {formatPHP(BASE_PRICE)}
                        <span style={{ color: "var(--rust)", fontWeight: 560 }}>+</span> {t("price.once")}{" "}
                        <span className="italic" style={{ color: "var(--rust)", fontWeight: 560 }}>
                            {t("price.liveForever")}
                        </span>
                    </SectionHeading>
                    <Lead className="mx-auto mt-5 max-w-xl">{t("price.lede")}</Lead>
                </div>

                <div className="mx-auto mt-12 max-w-md">
                    <div className="relative flex flex-col rounded-2xl border-2 border-rust bg-khaki p-7 sm:p-8">
                        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                            {t("price.tierStandard")}
                        </div>
                        <p className="mt-3 max-w-[22ch] text-[15px] leading-snug text-ink-soft">{t("price.taglineStandard")}</p>

                        <div className="mt-6 font-fraunces text-5xl text-ink" style={{ fontWeight: 560, fontOpticalSizing: "auto" }}>
                            {formatPHP(BASE_PRICE)}
                            <span style={{ color: "var(--rust)" }}>+</span>
                        </div>
                        <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                            {t("price.oneTime")}
                        </div>

                        <ul className="mt-6 flex flex-col gap-3">
                            {features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm leading-snug text-ink">
                                    <Check />
                                    <span>{f}</span>
                                </li>
                            ))}
                        </ul>

                        <Link
                            href="/start"
                            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                        >
                            {t("hero.ctaBusiness")}
                            <span aria-hidden>→</span>
                        </Link>
                    </div>

                    {/* Custom domain — optional add-on, deliberately a quiet note under the
                        single tier (not a co-equal card) per Theo's feedback that the domain
                        is optional and shouldn't headline the pricing. */}
                    <p className="mt-5 rounded-xl border border-dashed border-ink/20 px-5 py-4 text-center text-[13px] leading-relaxed text-ink-soft">
                        {t("price.domainAddon")}
                    </p>
                </div>

                <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-ink-soft">
                    {t("price.footnote")}
                </p>
            </div>
        </section>
    );
}
