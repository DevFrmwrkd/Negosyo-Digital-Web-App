"use client";

import { useT } from "./i18n";
import { Eyebrow, SectionHeading, Lead } from "./ui";

/* Plain, literal marks: a camera means photos, a speech bubble means questions.
   They sit small beside the step number to support it, not take over the card. */
const ICONS: Record<string, React.ReactElement> = {
    "01": (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2" y="6" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 6 L9.5 3 L14.5 3 L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    ),
    "02": (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 5.5 A2 2 0 0 1 5 3.5 H19 A2 2 0 0 1 21 5.5 V15 A2 2 0 0 1 19 17 H9 L4 21 V17 A2 2 0 0 1 3 15 Z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9.6 8.4 A2.4 2.4 0 1 1 12 11.4 V12.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="14.8" r="1" fill="currentColor" />
        </svg>
    ),
    "03": (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 8 H21" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 12 H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6.5 16 H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    "04": (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3.2 9.5 H20.8 M3.2 14.5 H20.8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 3 C9 6.5 9 17.5 12 21 M12 3 C15 6.5 15 17.5 12 21" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    ),
};

export default function ProcessSection() {
    const { t } = useT();

    const steps = [
        { k: "01", h: t("process.s1h"), cost: t("process.s1cost"), sub: t("process.s1sub") },
        { k: "02", h: t("process.s2h"), cost: t("process.s2cost"), sub: t("process.s2sub") },
        { k: "03", h: t("process.s3h"), cost: t("process.s3cost"), sub: t("process.s3sub") },
        { k: "04", h: t("process.s4h"), cost: t("process.s4cost"), sub: t("process.s4sub") },
    ];
    const kit = [
        t("process.kit1"), t("process.kit2"), t("process.kit3"), t("process.kit4"),
        t("process.kit5"), t("process.kit6"), t("process.kit7"),
    ];

    return (
        <section id="how-it-works" className="bg-khaki-deep">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
                <div className="mx-auto max-w-2xl text-center">
                    <Eyebrow>{t("process.eyebrow")}</Eyebrow>
                    <SectionHeading className="mt-4">
                        {t("process.titleA")}{" "}
                        <span className="italic" style={{ color: "var(--rust)", fontWeight: 560 }}>
                            {t("process.titleB")}
                        </span>
                    </SectionHeading>
                    <Lead className="mx-auto mt-5 max-w-xl">{t("process.lede")}</Lead>
                </div>

                <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" role="list">
                    {steps.map((s) => (
                        <li key={s.k} className="rounded-2xl border border-ink/10 bg-khaki p-6">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="inline-flex text-ink-soft [&_svg]:h-5 [&_svg]:w-5">{ICONS[s.k]}</span>
                                    <span className="font-mono text-xs text-rust">{s.k}</span>
                                </span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                                    {s.cost}
                                </span>
                            </div>
                            <h3 className="mt-4 font-sans text-[17px] font-semibold leading-snug text-ink">{s.h}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.sub}</p>
                        </li>
                    ))}
                </ol>

                {/* What you get + turnaround */}
                <div className="mt-8 flex flex-col gap-6 rounded-2xl border border-ink/10 bg-khaki p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                    <div>
                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                            {t("process.kitLabel")}
                        </span>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {kit.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full border border-ink/10 bg-khaki-deep px-3 py-1 text-sm text-ink"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex-shrink-0 border-t border-ink/10 pt-4 text-center sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0 sm:text-right">
                        <div className="font-fraunces text-3xl text-ink" style={{ fontWeight: 560, fontOpticalSizing: "auto" }}>
                            48–72h
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                            {t("process.turnaroundLabel")}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
