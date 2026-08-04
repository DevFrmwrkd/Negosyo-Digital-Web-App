"use client";

import { useT } from "./i18n";
import { Eyebrow } from "./ui";

function Beat({ label, big, sub }: { label: string; big: string; sub: string }) {
    return (
        <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{label}</div>
            <div className="mt-2 font-fraunces text-4xl text-ink" style={{ fontWeight: 560, fontOpticalSizing: "auto" }}>
                {big}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{sub}</p>
        </div>
    );
}

/** Manifesto — WP narrow editorial column, one gold accent, three supporting beats. */
export default function ManifestoSection() {
    const { t } = useT();
    return (
        <section className="bg-khaki-deep">
            <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
                <Eyebrow>{t("manifesto.eyebrow")}</Eyebrow>
                <p
                    className="mx-auto mt-6 max-w-2xl font-fraunces text-[clamp(1.9rem,4vw,3.25rem)] leading-[1.12] tracking-[-0.02em] text-ink"
                    style={{ fontWeight: 560, fontOpticalSizing: "auto" }}
                >
                    {t("manifesto.line1")}{" "}
                    <span className="italic" style={{ color: "var(--rust)" }}>{t("manifesto.line2")}</span>
                </p>
                <div className="mt-12 grid gap-8 border-t border-ink/10 pt-10 text-left sm:grid-cols-3">
                    <Beat label={t("manifesto.b1label")} big={t("manifesto.b1big")} sub={t("manifesto.b1sub")} />
                    <Beat label={t("manifesto.b2label")} big={t("manifesto.b2big")} sub={t("manifesto.b2sub")} />
                    <Beat label={t("manifesto.b3label")} big={t("manifesto.b3big")} sub={t("manifesto.b3sub")} />
                </div>
            </div>
        </section>
    );
}
