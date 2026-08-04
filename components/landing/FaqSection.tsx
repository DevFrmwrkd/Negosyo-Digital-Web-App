"use client";

import { useEffect, useState } from "react";
import { FAQ_BUSINESS, FAQ_CREATOR, FAQ_BUSINESS_TL, FAQ_CREATOR_TL } from "./landingData";
import { useT } from "./i18n";
import { Eyebrow, SectionHeading } from "./ui";

/** FAQ — WP accordion, tabbed (business / creator), hairline dividers.
 *  `businessOnly` hides the tab switcher and shows only the business Q&A
 *  (used on the owner-facing pages). */
export default function FaqSection({
    defaultTab = "business",
    businessOnly = false,
}: {
    defaultTab?: "business" | "creators";
    businessOnly?: boolean;
} = {}) {
    const { t, lang } = useT();
    const [tab, setTab] = useState<"business" | "creators">(businessOnly ? "business" : defaultTab);
    const [open, setOpen] = useState(0);
    const list =
        lang === "tl"
            ? tab === "creators"
                ? FAQ_CREATOR_TL
                : FAQ_BUSINESS_TL
            : tab === "creators"
              ? FAQ_CREATOR
              : FAQ_BUSINESS;

    useEffect(() => {
        setOpen(0);
    }, [tab]);

    return (
        <section id="faq" className="bg-khaki">
            <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
                <div className="text-center">
                    <Eyebrow>{t("faq.eyebrow")}</Eyebrow>
                    <SectionHeading className="mt-4">{t("faq.title")}</SectionHeading>
                    {!businessOnly && (
                        <div className="mt-6 inline-flex gap-1 rounded-full border border-ink/10 bg-khaki-deep p-1">
                            {(["business", "creators"] as const).map((k) => (
                                <button
                                    key={k}
                                    onClick={() => setTab(k)}
                                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                        tab === k ? "bg-ink text-khaki" : "text-ink-soft hover:text-ink"
                                    }`}
                                >
                                    {k === "business" ? t("faq.tabBusiness") : t("faq.tabCreators")}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-10 border-t border-ink/10">
                    {list.map((qa, i) => {
                        const isOpen = open === i;
                        return (
                            <div key={i} className="border-b border-ink/10">
                                <button
                                    onClick={() => setOpen(isOpen ? -1 : i)}
                                    aria-expanded={isOpen}
                                    className="flex w-full items-baseline justify-between gap-6 py-5 text-left"
                                >
                                    <span className="font-fraunces text-lg text-ink sm:text-xl" style={{ fontWeight: 560, fontOpticalSizing: "auto" }}>
                                        {qa.q}
                                    </span>
                                    <span
                                        aria-hidden
                                        className={`font-mono text-lg text-ink-soft transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                                    >
                                        +
                                    </span>
                                </button>
                                {isOpen && <p className="pb-5 pr-8 text-[15px] leading-relaxed text-ink-soft">{qa.a}</p>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
