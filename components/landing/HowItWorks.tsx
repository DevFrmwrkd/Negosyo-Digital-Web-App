"use client";

import Link from "next/link";
import { useT } from "./i18n";
import { Eyebrow, SectionHeading, Lead } from "./ui";

/**
 * How it works — two honest tracks side by side (business owner vs creator).
 * WP-style: paper band, quiet bordered cards, mono step numbers, one gold accent
 * (the per-track CTA link). Content is TRUE: owners never "sign up" (a creator
 * comes to them; they only review + pay when live); the creator track is the one
 * real signup. Turnaround is framed as typical, not guaranteed.
 *
 * NOTE: nothing imports this today — ProcessSection replaced it on `/` and owns
 * the same id="how-it-works" anchor. Kept in sync anyway so it isn't a trap for
 * whoever renders it next.
 */

function Track({
    label,
    steps,
    ctaLabel,
    ctaHref,
}: {
    label: string;
    steps: string[];
    ctaLabel: string;
    ctaHref: string;
}) {
    return (
        <div className="flex flex-col rounded-2xl border border-ink/10 bg-khaki p-7 sm:p-8">
            <span className="inline-flex w-fit items-center rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                {label}
            </span>
            <ol className="mt-6 flex flex-col">
                {steps.map((s, i) => (
                    <li
                        key={i}
                        className="grid grid-cols-[2.25rem_1fr] items-baseline gap-2 border-t border-ink/10 py-4 first:border-t-0 first:pt-0"
                    >
                        <span className="font-mono text-xs text-ink-soft">0{i + 1}</span>
                        <span className="text-[15px] leading-snug text-ink sm:text-base">{s}</span>
                    </li>
                ))}
            </ol>
            <Link
                href={ctaHref}
                className="mt-7 inline-flex w-fit items-center gap-1 text-sm font-semibold text-rust transition-opacity hover:opacity-70"
            >
                {ctaLabel}
                <span aria-hidden>→</span>
            </Link>
        </div>
    );
}

export default function HowItWorks() {
    const { t } = useT();

    const business = [t("how.biz1"), t("how.biz2"), t("how.biz3"), t("how.biz4")];
    const creator = [t("how.creator1"), t("how.creator2"), t("how.creator3"), t("how.creator4")];

    return (
        <section id="how-it-works" className="bg-khaki">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
                <div className="mx-auto max-w-2xl text-center">
                    <Eyebrow>{t("how.eyebrow")}</Eyebrow>
                    <SectionHeading className="mt-4">
                        {t("how.titleA")}{" "}
                        <span className="italic" style={{ color: "var(--rust)", fontWeight: 560 }}>
                            {t("how.titleB")}
                        </span>
                    </SectionHeading>
                    <Lead className="mx-auto mt-5 max-w-xl">{t("how.lede")}</Lead>
                </div>

                <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
                    {/* The owner track ends in the funnel, not in another pitch:
                        by the last step the reader has just been told exactly how
                        it works, and "Get a website" is the thing itself. */}
                    <Track
                        label={t("how.bizLabel")}
                        steps={business}
                        ctaLabel={t("how.bizCta")}
                        ctaHref="/start"
                    />
                    <Track
                        label={t("how.creatorLabel")}
                        steps={creator}
                        ctaLabel={t("how.creatorCta")}
                        ctaHref="/for-creators"
                    />
                </div>
            </div>
        </section>
    );
}
