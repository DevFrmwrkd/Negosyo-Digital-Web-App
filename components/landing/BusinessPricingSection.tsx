"use client";

import Link from "next/link";
import { useT } from "./i18n";
import { Eyebrow, SectionHeading, Lead } from "./ui";
import { BASE_PRICE, CUSTOM_DOMAIN_PRICE, formatPHP } from "@/lib/pricing";

/**
 * Business pricing — WP-style two-tier band. TRUE to lib/pricing.ts: ₱999
 * standard, ₱1,499 with a custom domain (a flat registrar pass-through, not
 * commissioned). One-time, no monthly, pay only when live. No fabricated
 * `*.tendso.ph` subdomain promise (that wildcard doesn't exist). CTAs point to
 * the info route /for-business — owners never "sign up".
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

    const tiers = [
        {
            key: "standard",
            name: t("price.tierStandard"),
            tagline: t("price.taglineStandard"),
            price: BASE_PRICE,
            features: [
                t("price.stdF1"), t("price.stdF2"), t("price.stdF3"),
                t("price.stdF4"), t("price.stdF5"), t("price.stdF6"),
            ],
            featured: false,
        },
        {
            key: "domain",
            name: t("price.tierDomain"),
            tagline: t("price.taglineDomain"),
            price: CUSTOM_DOMAIN_PRICE,
            features: [
                t("price.domF1"), t("price.domF2"), t("price.domF3"),
                t("price.domF4"), t("price.domF5"), t("price.domF6"),
            ],
            featured: true,
        },
    ];

    return (
        <section id="pricing" className="bg-khaki">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
                <div className="mx-auto max-w-2xl text-center">
                    <Eyebrow>{t("price.eyebrow")}</Eyebrow>
                    <SectionHeading className="mt-4">
                        {formatPHP(BASE_PRICE)} {t("price.once")}{" "}
                        <span className="italic" style={{ color: "var(--rust)", fontWeight: 560 }}>
                            {t("price.liveForever")}
                        </span>
                    </SectionHeading>
                    <Lead className="mx-auto mt-5 max-w-xl">{t("price.lede")}</Lead>
                </div>

                <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
                    {tiers.map((tier) => (
                        <div
                            key={tier.key}
                            className={`relative flex flex-col rounded-2xl bg-khaki p-7 sm:p-8 ${
                                tier.featured ? "border-2 border-rust" : "border border-ink/10"
                            }`}
                        >
                            {tier.featured && (
                                <span className="absolute right-5 top-6 rounded-full bg-rust-soft px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink">
                                    {t("price.badge")}
                                </span>
                            )}
                            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                                {tier.name}
                            </div>
                            <p className="mt-3 max-w-[22ch] text-[15px] leading-snug text-ink-soft">{tier.tagline}</p>

                            <div className="mt-6 font-fraunces text-5xl text-ink" style={{ fontWeight: 560, fontOpticalSizing: "auto" }}>
                                {formatPHP(tier.price)}
                            </div>
                            <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                                {t("price.oneTime")}
                            </div>

                            <ul className="mt-6 flex flex-col gap-3">
                                {tier.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm leading-snug text-ink">
                                        <Check />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="/for-business"
                                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all ${
                                    tier.featured
                                        ? "bg-rust text-khaki hover:-translate-y-0.5"
                                        : "border border-ink/20 text-ink hover:bg-khaki-deep"
                                }`}
                            >
                                {t("hero.ctaBusiness")}
                                <span aria-hidden>→</span>
                            </Link>
                        </div>
                    ))}
                </div>

                <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-ink-soft">
                    {t("price.footnote")}
                </p>
            </div>
        </section>
    );
}
