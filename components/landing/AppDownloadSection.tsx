"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * AppDownloadSection — priority "Get the app" band (placed right after the
 * hero to drive downloads).
 *
 * - Google Play links to the Tendso Android listing; an admin can override the
 *   URL at /admin/app-release (setting `play_store_url`).
 * - App Store shows "Coming soon" until an iOS build ships (set `app_store_url`
 *   at /admin/app-release to turn it into a live download).
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

const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    minWidth: 220,
    padding: "14px 26px",
    borderRadius: 14,
    textDecoration: "none",
    transition: "transform .15s ease",
};

function StoreButton({ href, glyph, small, large }: { href: string; glyph: React.ReactNode; small: string; large: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{ ...btnBase, background: "var(--neo-paper)", color: "var(--neo-ink)", border: "1px solid var(--neo-paper)" }}
        >
            <span style={{ display: "inline-flex", flex: "0 0 auto" }}>{glyph}</span>
            <span style={{ display: "flex", flexDirection: "column", textAlign: "left", lineHeight: 1.1 }}>
                <span style={{ fontSize: 10.5, letterSpacing: ".05em", textTransform: "uppercase", opacity: 0.7 }}>{small}</span>
                <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.01em" }}>{large}</span>
            </span>
        </a>
    );
}

/** Outlined, non-interactive badge for a store that isn't live yet. */
function ComingSoonButton({ glyph, label }: { glyph: React.ReactNode; label: string }) {
    return (
        <span
            aria-disabled="true"
            title={`${label} — coming soon`}
            style={{
                ...btnBase,
                background: "transparent",
                color: "var(--neo-paper)",
                border: "1px solid color-mix(in srgb, var(--neo-paper) 32%, transparent)",
                opacity: 0.75,
                cursor: "default",
            }}
        >
            <span style={{ display: "inline-flex", flex: "0 0 auto" }}>{glyph}</span>
            <span style={{ display: "flex", flexDirection: "column", textAlign: "left", lineHeight: 1.1 }}>
                <span style={{ fontSize: 10.5, letterSpacing: ".05em", textTransform: "uppercase", opacity: 0.7 }}>Coming soon</span>
                <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.01em" }}>{label}</span>
            </span>
        </span>
    );
}

export default function AppDownloadSection() {
    const appStoreUrl = useQuery(api.settings.get, { key: "app_store_url" }) as string | null | undefined;
    const playStoreUrl = useQuery(api.settings.get, { key: "play_store_url" }) as string | null | undefined;

    const playHref = (playStoreUrl && playStoreUrl.trim()) || DEFAULT_PLAY_STORE_URL;
    const appLive = !!(appStoreUrl && appStoreUrl.trim());

    return (
        <section style={{ position: "relative", background: "var(--neo-ink)", color: "var(--neo-paper)", padding: "clamp(96px, 12vw, 150px) 0", overflow: "hidden" }}>
            {/* Accent glow behind the headline. */}
            <div
                aria-hidden="true"
                style={{
                    position: "absolute",
                    top: "-25%",
                    left: "50%",
                    width: "min(1000px, 120%)",
                    height: 620,
                    transform: "translateX(-50%)",
                    background: "radial-gradient(closest-side, color-mix(in srgb, var(--neo-creator) 20%, transparent), transparent)",
                    pointerEvents: "none",
                }}
            />
            <div className="container-wide" style={{ position: "relative", textAlign: "center" }}>
                <div className="eyebrow" style={{ marginBottom: 22, color: "var(--neo-creator)" }}>Get the app</div>
                <h2 className="display" style={{ fontSize: "clamp(52px, 8.5vw, 132px)", color: "var(--neo-paper)", lineHeight: 0.95 }}>
                    Take Tendso
                    <br />
                    <em style={{ fontStyle: "italic", color: "var(--neo-creator)" }}>with you.</em>
                </h2>
                <p className="lede" style={{ maxWidth: "48ch", margin: "28px auto 0", fontSize: 19, color: "oklch(82% 0.01 85)" }}>
                    Get the Tendso app on your phone — available now on Android, with iOS on the way.
                </p>

                {/* Store buttons */}
                <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginTop: 44 }}>
                    {appLive ? (
                        <StoreButton href={appStoreUrl as string} glyph={<AppleGlyph />} small="Download on the" large="App Store" />
                    ) : (
                        <ComingSoonButton glyph={<AppleGlyph />} label="App Store" />
                    )}
                    <StoreButton href={playHref} glyph={<PlayGlyph />} small="Get it on" large="Google Play" />
                </div>

                <div style={{ marginTop: 22, fontSize: 11.5, letterSpacing: ".08em", textTransform: "uppercase", color: "oklch(66% 0.01 85)" }}>
                    Available now on Android · iOS coming soon
                </div>
            </div>
        </section>
    );
}
