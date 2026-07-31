"use client";

import Link from "next/link";
import { Logo } from "./landingPrimitives";
import { useT, type Lang } from "./i18n";

const selectStyle: React.CSSProperties = {
    appearance: "none",
    border: "1px solid var(--neo-rule)",
    background: "var(--neo-paper-3)",
    color: "var(--neo-ink)",
    padding: "8px 12px",
    fontFamily: "var(--neo-mono)",
    fontSize: 11,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    cursor: "pointer",
    borderRadius: 8,
};

export default function Navbar() {
    const { lang, setLang, t } = useT();
    return (
        <div className="topbar">
            <div
                className="container-wide flex items-center justify-between gap-3"
                style={{ paddingTop: 12, paddingBottom: 12 }}
            >
                {/* Left cluster — logo + live status (status hides on phones) */}
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <Link href="/" style={{ textDecoration: "none" }} className="flex-shrink-0">
                        <Logo />
                    </Link>
                    {/* Region label — hide on <md to avoid wrap/overflow. (Region
                        dropdown removed: PH-only for now; this label states it.) */}
                    <div className="label items-center gap-2 hidden md:flex">
                        <span className="live-dot"></span>
                        {t("nav.live")}
                    </div>
                </div>

                {/* Right cluster — language switch. (The "Get the app" button
                    moved to the dedicated download section below the hero.) */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value as Lang)}
                        style={selectStyle}
                        aria-label="Language"
                        className="hidden sm:inline-block"
                    >
                        <option value="en">EN</option>
                        <option value="tl">Tagalog</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
