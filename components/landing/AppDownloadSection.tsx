"use client";

import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useT } from "./i18n";

/**
 * AppDownloadSection — WP "dark punctuation" band for the Tendso app.
 *
 * The app is the CREATOR / field tool (get certified, capture businesses, track
 * earnings). It does NOT build or publish websites, and owners don't need it —
 * so the copy is framed for creators, not owners.
 *
 * - Google Play links to the Android listing; an admin can override the URL at
 *   /admin/app-release (setting `play_store_url`).
 * - App Store shows "Coming soon" until an iOS build ships (`app_store_url`).
 */

const DEFAULT_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.negosyodigital.app";

function AppleGlyph() {
    return (
        <svg viewBox="0 0 384 512" width="24" height="24" fill="currentColor" aria-hidden="true">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
    );
}

function PlayGlyph() {
    return (
        <svg viewBox="0 0 512 512" width="22" height="22" aria-hidden="true">
            <path fill="#00d4ff" d="M48 59.49v393a4.33 4.33 0 0 0 7.37 3.07L260 256 55.37 56.42A4.33 4.33 0 0 0 48 59.49z" />
            <path fill="#00f076" d="M345.8 174L89.62 32.61l-.09-.05c-4.66-2.55-9.25 3.71-5.42 7.42L281.4 231.85z" />
            <path fill="#f43249" d="M84.11 471.94c-3.83 3.71.76 10 5.42 7.42l.09-.05L345.8 338l-64.4-57.9z" />
            <path fill="#ffbd00" d="M449.66 231l-53.86-29.72-69.9 65.19 69.9 65.19L449.66 296c19.19-10.61 19.19-54.4 0-65z" />
        </svg>
    );
}

function StoreButton({ href, glyph, small, large }: { href: string; glyph: React.ReactNode; small: string; large: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-[220px] items-center gap-3 rounded-xl bg-khaki px-6 py-3.5 text-ink transition-transform hover:-translate-y-0.5"
        >
            <span className="flex flex-shrink-0">{glyph}</span>
            <span className="flex flex-col text-left leading-tight">
                <span className="text-[10.5px] uppercase tracking-wide opacity-70">{small}</span>
                <span className="text-xl font-semibold tracking-[-0.01em]">{large}</span>
            </span>
        </a>
    );
}

function ComingSoonButton({ glyph, label }: { glyph: React.ReactNode; label: string }) {
    return (
        <span
            aria-disabled="true"
            title={`${label} — coming soon`}
            className="inline-flex min-w-[220px] cursor-default items-center gap-3 rounded-xl border border-khaki/25 px-6 py-3.5 text-khaki/70"
        >
            <span className="flex flex-shrink-0">{glyph}</span>
            <span className="flex flex-col text-left leading-tight">
                <span className="text-[10.5px] uppercase tracking-wide opacity-70">Coming soon</span>
                <span className="text-xl font-semibold tracking-[-0.01em]">{label}</span>
            </span>
        </span>
    );
}

export default function AppDownloadSection({ id }: { id?: string } = {}) {
    const { t } = useT();
    const appStoreUrl = useQuery(api.settings.get, { key: "app_store_url" }) as string | null | undefined;
    const playStoreUrl = useQuery(api.settings.get, { key: "play_store_url" }) as string | null | undefined;

    const playHref = (playStoreUrl && playStoreUrl.trim()) || DEFAULT_PLAY_STORE_URL;
    const appLive = !!(appStoreUrl && appStoreUrl.trim());

    return (
        <section id={id} className="bg-ink text-khaki">
            <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-28">
                <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--rust-soft)" }}>
                    {t("app.eyebrow")}
                </p>
                <h2
                    className="mx-auto mt-5 max-w-2xl font-fraunces text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.02em]"
                    style={{ fontWeight: 560, fontOpticalSizing: "auto" }}
                >
                    {t("app.titleA")}{" "}
                    <span className="italic" style={{ color: "var(--rust-soft)" }}>{t("app.titleB")}</span>
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-khaki/70">{t("app.lede")}</p>

                <div className="mt-9 flex flex-wrap justify-center gap-4">
                    {appLive ? (
                        <StoreButton href={appStoreUrl as string} glyph={<AppleGlyph />} small={t("app.downloadOn")} large="App Store" />
                    ) : (
                        <ComingSoonButton glyph={<AppleGlyph />} label="App Store" />
                    )}
                    <StoreButton href={playHref} glyph={<PlayGlyph />} small={t("app.getOn")} large="Google Play" />
                </div>

                {/* QR to the Android listing — desktop only (tap the button on mobile) */}
                <div className="mt-11 hidden flex-col items-center gap-3 sm:flex">
                    <div className="rounded-2xl bg-white p-3 leading-none shadow-[0_12px_36px_-16px_rgba(0,0,0,.55)]">
                        <QRCodeSVG value={playHref} size={116} bgColor="#ffffff" fgColor="#111111" level="M" />
                    </div>
                    <span className="text-[11.5px] uppercase tracking-[0.08em] text-khaki/60">{t("app.scan")}</span>
                </div>

                <div className="mt-6 text-[11.5px] uppercase tracking-[0.08em] text-khaki/55">{t("app.status")}</div>
            </div>
        </section>
    );
}
