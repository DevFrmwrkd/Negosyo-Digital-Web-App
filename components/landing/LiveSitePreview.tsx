"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A live, scaled, non-interactive preview of a real site — it renders the actual
 * page in an iframe at desktop width and scales it to fill its container (16:9).
 * Because it's the live site (not a stored screenshot), the preview can never
 * drift "a version behind" the real page. The iframe is inert (pointer-events
 * off, not focusable, hidden from the a11y tree) so a wrapping link owns clicks.
 */
const DESIGN_WIDTH = 1280; // render each site at desktop width, then scale down

export default function LiveSitePreview({ url, name }: { url: string; name: string }) {
    const boxRef = useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = useState(0);
    const [loaded, setLoaded] = useState(false);

    // Scale = container width / design width, kept in sync with responsive resizes.
    useEffect(() => {
        const el = boxRef.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width ?? 0;
            if (w > 0) setScale(w / DESIGN_WIDTH);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // At 1280×720 scaled by (width/1280), the iframe exactly fills the 16:9 box.
    const iframeHeight = (DESIGN_WIDTH * 9) / 16;

    return (
        <div ref={boxRef} className="relative aspect-video w-full overflow-hidden bg-khaki-deep">
            {/* Loading shimmer until the live page paints */}
            {!loaded && <div aria-hidden className="absolute inset-0 animate-pulse bg-khaki-deep" />}
            {scale > 0 && (
                <iframe
                    src={url}
                    title={`${name} — live website`}
                    loading="lazy"
                    tabIndex={-1}
                    aria-hidden="true"
                    scrolling="no"
                    onLoad={() => setLoaded(true)}
                    className="absolute left-0 top-0 origin-top-left border-0 transition-opacity duration-500"
                    style={{
                        width: `${DESIGN_WIDTH}px`,
                        height: `${iframeHeight}px`,
                        transform: `scale(${scale})`,
                        pointerEvents: "none",
                        opacity: loaded ? 1 : 0,
                    }}
                />
            )}
        </div>
    );
}
