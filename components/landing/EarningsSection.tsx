"use client";

import Link from "next/link";
import { CREATOR_EARNINGS } from "./landingData";
import { ArrowUpRightIcon } from "./landingPrimitives";

export default function EarningsSection() {
    return (
        <section
            id="for-creators"
            style={{
                background: "var(--neo-ink)",
                color: "var(--neo-paper)",
                paddingTop: 120,
                paddingBottom: 120,
            }}
        >
            <div className="container-wide">
                <div className="sect-h">
                    <div className="eyebrow" style={{ color: "var(--neo-creator)" }}>For creators</div>
                    <div>
                        <h2 className="display-2" style={{ color: "var(--neo-paper)" }}>
                            Earn while bringing them <em style={{ fontStyle: "italic", color: "var(--neo-creator)" }}>online</em>.
                        </h2>
                        <p
                            className="lede"
                            style={{ marginTop: 12, color: "oklch(80% 0.008 85)", maxWidth: "62ch" }}
                        >
                            The platform pays creators for the work they ship. It also pays them for the creators and businesses they bring along. Plain numbers, no fine print.
                        </p>
                    </div>
                </div>

                {/* Payout rates — 50%-of-sale model + referral bonus (see lib/pricing.ts) */}
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12"
                    style={{}}
                >
                    {CREATOR_EARNINGS.map((rate) => {
                        const featured = rate.featured;
                        return (
                            <div
                                key={rate.slug}
                                style={{
                                    padding: "32px 28px",
                                    background: featured
                                        ? "oklch(62% 0.115 80 / .15)"
                                        : "oklch(20% 0.015 260)",
                                    border: featured
                                        ? "1px solid oklch(62% 0.115 80 / .5)"
                                        : "1px solid oklch(40% 0.015 260)",
                                    borderRadius: "var(--neo-r-lg)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 14,
                                }}
                            >
                                <div className="label" style={{ color: "oklch(72% 0.008 85)" }}>
                                    {rate.title}
                                </div>
                                <div
                                    className="counter-num"
                                    style={{
                                        fontSize: 64,
                                        lineHeight: 1.0,
                                        color: featured ? "var(--neo-creator)" : "var(--neo-paper)",
                                    }}
                                >
                                    ₱{rate.amount.toLocaleString()}
                                </div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        color: "oklch(80% 0.008 85)",
                                        lineHeight: 1.55,
                                    }}
                                >
                                    {rate.desc}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div
                    style={{
                        paddingTop: 32,
                        borderTop: "1px solid oklch(40% 0.015 260)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 16,
                    }}
                >
                    <div
                        className="display-3"
                        style={{ color: "var(--neo-paper)", maxWidth: "32ch" }}
                    >
                        Your referral link lives in the app. Free to apply, paid via Wise.
                    </div>
                    <Link
                        href="/for-creators"
                        className="door door-creator"
                        style={{
                            padding: "20px 28px",
                            display: "inline-flex",
                            textDecoration: "none",
                        }}
                    >
                        <span>See full creator breakdown</span>
                        <span className="arrow">
                            <ArrowUpRightIcon />
                        </span>
                    </Link>
                </div>
            </div>
        </section>
    );
}
