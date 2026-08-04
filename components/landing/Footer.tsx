"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useT, type Lang } from "./i18n";

function FootCol({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-khaki/50">{title}</div>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-khaki/75 [&_a:hover]:text-khaki [&_a]:transition-colors">
                {children}
            </div>
        </div>
    );
}

/** Footer — WP dense multi-column directory, brand-token dark surface, real company info. */
export default function Footer() {
    const { lang, setLang, t } = useT();
    const apkUrl = useQuery(api.settings.get, { key: "apk_download_url" }) as string | null | undefined;
    const appStoreUrl = useQuery(api.settings.get, { key: "app_store_url" }) as string | null | undefined;
    const year = new Date().getFullYear();

    return (
        <footer className="bg-ink text-khaki">
            <div className="mx-auto max-w-6xl px-6 py-16">
                <div className="grid grid-cols-1 items-start gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                    <div>
                        {/* White wordmark — footer is a dark surface, no invert needed. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/tendso-logo.png" alt="Tendso" width={180} height={32} className="block" />
                        <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-khaki/65">{t("footer.blurb")}</p>
                        <p className="mt-4 text-xs leading-relaxed text-khaki/45">{t("footer.company")}</p>
                    </div>

                    <FootCol title={t("footer.appCol")}>
                        {apkUrl ? (
                            <a href={apkUrl} download="tendso.apk">Android · Direct APK</a>
                        ) : (
                            <Link href="/for-creators">Android · Direct APK</Link>
                        )}
                        {appStoreUrl && appStoreUrl.trim() ? (
                            <a href={appStoreUrl} target="_blank" rel="noreferrer">iOS · App Store</a>
                        ) : (
                            <span className="text-khaki/40">iOS · {t("footer.comingSoon")}</span>
                        )}
                        <Link href="/knowledge">{t("footer.kb")}</Link>
                        <Link href="/help-faq">{t("footer.help")}</Link>
                    </FootCol>

                    <FootCol title={t("footer.legal")}>
                        <Link href="/privacy-policy">{t("footer.privacy")}</Link>
                        <Link href="/terms-of-service">{t("footer.terms")}</Link>
                        <Link href="/contact">{t("footer.contact")}</Link>
                    </FootCol>

                    <FootCol title={t("footer.language")}>
                        <select
                            value={lang}
                            onChange={(e) => setLang(e.target.value as Lang)}
                            aria-label="Language"
                            className="w-full appearance-none rounded-lg border border-khaki/20 bg-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-khaki/80"
                        >
                            <option value="en" className="text-ink">English</option>
                            <option value="tl" className="text-ink">Tagalog</option>
                        </select>
                    </FootCol>
                </div>

                <div className="mt-12 flex flex-wrap justify-between gap-4 border-t border-khaki/10 pt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-khaki/45">
                    <span>© {year} Tendso</span>
                    <span>VONAS, OPC · Philippines</span>
                </div>
            </div>
        </footer>
    );
}
