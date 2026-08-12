"use client";

import Link from "next/link";
import { useT } from "./i18n";

/**
 * Final CTA — WP dark closing band.
 *
 * `focus`:
 *  - "business": owner-first — one primary "Get a website" CTA + a small
 *    secondary "want to earn instead?" creator link.
 *  - "creator": creator-first — one primary "Get the app" CTA (app-first) + a
 *    small secondary "own a business?" link.
 *  - "both" (default): the two-door marketplace close.
 */
export default function CtaSection({
    focus = "both",
}: {
    focus?: "business" | "creator" | "both";
} = {}) {
    const { t } = useT();

    const doors = [
        { href: "/for-business", kicker: t("cta.doorBiz"), label: t("cta.business"), sub: t("cta.bizSub") },
        { href: "/for-creators", kicker: t("cta.doorCreator"), label: t("cta.creator"), sub: t("cta.creatorSub") },
    ];

    const isBiz = focus === "business";
    // The owner CTA is the entrance to the intake funnel, not a link to
    // /for-business: this band renders at the BOTTOM of /for-business, where that
    // was a self-link — the page appeared to reload and do nothing. Same
    // destination BusinessPricingSection uses, which also renders on both pages.
    // The owner CTA is the entrance to the intake funnel, not a link back to the
    // page it usually renders on.
    const primaryHref = isBiz ? "/start" : "#app";
    const primaryLabel = isBiz ? t("hero.ctaBusiness") : t("nav.getApp");
    const secondaryLead = isBiz ? t("hero.creatorLead") : t("cta.altBizLead");
    const secondaryHref = isBiz ? "/for-creators" : "/for-business";
    const secondaryLabel = isBiz ? t("hero.creatorLink") : t("hero.ctaBusiness");

    return (
        <section className="bg-ink text-khaki">
            <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
                <div className="text-center">
                    <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--rust-soft)" }}>
                        {t("cta.eyebrow")}
                    </p>
                    <h2
                        className="mx-auto mt-5 max-w-3xl font-fraunces text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] tracking-[-0.02em]"
                        style={{ fontWeight: 560, fontOpticalSizing: "auto" }}
                    >
                        {t("cta.slogan1")}{" "}
                        <span className="italic" style={{ color: "var(--rust-soft)" }}>{t("cta.slogan2")}</span>
                    </h2>
                    <p className="mx-auto mt-5 max-w-lg text-[17px] text-khaki/70">{t("cta.subtitle")}</p>
                </div>

                {focus === "both" ? (
                    <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
                        {doors.map((d) => (
                            <Link
                                key={d.href}
                                href={d.href}
                                className="group flex flex-col rounded-2xl border border-khaki/15 bg-khaki/5 p-7 transition-colors hover:border-khaki/40"
                            >
                                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-khaki/60">{d.kicker}</span>
                                <span className="mt-4 font-fraunces text-2xl" style={{ fontWeight: 560, fontOpticalSizing: "auto" }}>
                                    {d.label}
                                </span>
                                <span className="mt-3 text-sm leading-relaxed text-khaki/65">{d.sub}</span>
                                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--rust-soft)" }}>
                                    {t("cta.go")}
                                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="mt-10 flex flex-col items-center gap-5">
                        {isBiz ? (
                            <Link
                                href={primaryHref}
                                className="inline-flex items-center gap-2 rounded-xl bg-rust px-7 py-3.5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
                            >
                                {primaryLabel}
                                <span aria-hidden>→</span>
                            </Link>
                        ) : (
                            <a
                                href={primaryHref}
                                className="inline-flex items-center gap-2 rounded-xl bg-rust px-7 py-3.5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
                            >
                                {primaryLabel}
                                <span aria-hidden>→</span>
                            </a>
                        )}
                        <p className="text-sm text-khaki/60">
                            {secondaryLead}{" "}
                            <Link
                                href={secondaryHref}
                                className="font-semibold underline underline-offset-4"
                                style={{ color: "var(--rust-soft)" }}
                            >
                                {secondaryLabel}
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
