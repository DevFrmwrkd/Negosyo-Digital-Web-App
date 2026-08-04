"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CAROUSEL_SITES } from "./landingData";
import { useT } from "./i18n";
import { Eyebrow, SectionHeading, Lead } from "./ui";
import LiveSitePreview from "./LiveSitePreview";

/**
 * RealSitesSection — the single honest "proof" band (replaces the old
 * ShowcaseSection live-map + DirectorySection at-scale counters, both of which
 * carried fabricated data: fake creators, invented counters, a "₱142k paid out"
 * claim).
 *
 * Everything here is TRUE:
 *  - The cards are the 4 real client sites in `CAROUSEL_SITES`, each showing a
 *    LIVE preview of the actual page and linking to it.
 *  - Counts come from live Convex queries. We never invent a number: the live-
 *    sites figure can never drop below the sites actually shown, and the creator
 *    stat only renders once the query resolves to a real, positive count.
 */
export default function RealSitesSection() {
    const { t } = useT();

    // Curated featured list from the admin (Featured Sites screen). Falls back to
    // the built-in SHOWCASE_SITES when unset, so the grid always has real proof.
    const featured = useQuery(api.settings.get, { key: "featured_sites" }) as
        | { name: string; category: string; city: string; url: string }[]
        | null
        | undefined;
    const publishedCount = useQuery(api.generatedWebsites.countPublished, {});
    const creatorCount = useQuery(api.creators.count, {});

    const sites =
        Array.isArray(featured) && featured.length > 0
            ? featured.filter((s) => !!s.url)
            : CAROUSEL_SITES.map((s) => ({
                  name: s.name,
                  category: s.category,
                  city: s.city,
                  url: s.url as string,
              }));

    const liveSites = Math.max(publishedCount ?? 0, sites.length);
    const showCreators = typeof creatorCount === "number" && creatorCount > 0;

    return (
        <section id="proof" className="bg-khaki-deep">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
                {/* Header */}
                <div className="mx-auto max-w-2xl text-center">
                    <Eyebrow>{t("proof.eyebrow")}</Eyebrow>
                    <SectionHeading className="mt-4">{t("proof.title")}</SectionHeading>
                    <Lead className="mx-auto mt-5 max-w-xl">{t("proof.lede")}</Lead>
                </div>

                {/* Honest stat row — static, real numbers only */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-ink-soft">
                    <span className="inline-flex items-baseline gap-1.5">
                        <span className="font-fraunces text-2xl text-ink" style={{ fontWeight: 560 }}>
                            {liveSites}
                        </span>
                        <span className="text-sm">{t("proof.statSitesLabel")}</span>
                    </span>
                    {showCreators && (
                        <>
                            <span aria-hidden className="hidden h-1 w-1 rounded-full bg-ink/25 sm:inline-block" />
                            <span className="inline-flex items-baseline gap-1.5">
                                <span className="font-fraunces text-2xl text-ink" style={{ fontWeight: 560 }}>
                                    {creatorCount}
                                </span>
                                <span className="text-sm">{t("proof.statCreatorsLabel")}</span>
                            </span>
                        </>
                    )}
                </div>

                {/* Card grid — the 4 real, live client sites (live preview, no stale screenshots) */}
                <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
                    {sites.map((site) => (
                        <a
                            key={site.url}
                            href={site.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group block overflow-hidden rounded-xl border border-ink/10 bg-khaki transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-[0_18px_40px_-24px_rgba(27,28,36,0.45)]"
                        >
                            <LiveSitePreview url={site.url} name={site.name} />
                            <div className="flex items-center justify-between gap-3 border-t border-ink/10 p-4">
                                <div className="min-w-0">
                                    <div className="truncate font-sans text-[17px] font-semibold text-ink">
                                        {site.name}
                                    </div>
                                    <div className="mt-0.5 truncate text-sm text-ink-soft">
                                        {[site.category, site.city].filter(Boolean).join(" · ")}
                                    </div>
                                </div>
                                <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-medium text-rust">
                                    {t("proof.visit")}
                                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                                        →
                                    </span>
                                </span>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
