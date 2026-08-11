"use client";

import { motion } from "framer-motion";
import { Scale, Users, FileText, Banknote, ShieldAlert, Award, PencilLine } from "lucide-react";

import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollToTop from "@/components/landing/ScrollToTop";

const termsSections = [
    {
        marker: "§ 01",
        icon: Scale,
        title: "Acceptance of Terms",
        content:
            "By accessing or using the Tendso platform (including our mobile app and web portal), you agree to be strictly bound by these Terms of Service. Users of all ages are welcome, including students and young entrepreneurs.",
    },
    {
        marker: "§ 02",
        icon: Award,
        title: "Creator Certification",
        content:
            "To maintain quality across the platform, Creators must complete the in-app training program and pass the certification quiz with a minimum score of 80% (4 out of 5 correct) before submitting live MSME data to the network.",
    },
    {
        marker: "§ 03",
        icon: FileText,
        title: "Submissions & Media",
        content:
            "All data submitted must be authentic and collected with the explicit consent of the business owner. Submissions require a minimum of 3 photos (portrait, location, product) and a valid audio/video interview. Fraudulent data will result in immediate termination.",
    },
    {
        marker: "§ 04",
        icon: Banknote,
        title: "Payouts & Economics",
        content:
            "Creators earn 50% of the website sale price (₱500 at the ₱999 base price, scaling up to ₱2,500 as higher price tiers unlock). Referral bonuses of PHP 1,000 are credited when a referred Creator completes their first paid submission. The minimum withdrawal threshold is PHP 100, processed securely via Wise API direct to local Philippine bank accounts.",
    },
    // The edits promise is advertised on the landing, pricing, About, /my-business,
    // the transactional emails and the knowledge base. It had no home in the Terms,
    // so a business owner reading the legal page found nothing about the service
    // they actually bought. Wording deliberately mirrors the live copy (see
    // components/landing/landingData.ts BUSINESS_TIERS + FAQ_BUSINESS) and promises
    // nothing beyond it — no turnaround time, no revision cap, no post-year-one fee.
    // The domain sentence is here because the ₱1,499 tier DOES leave the owner with
    // a yearly cost: our own renewal reminder (lib/email/templates.ts,
    // getDomainRenewalReminderEmailHtml) tells them Tendso paid year 1 and "Year 2
    // onwards is your responsibility". A blanket "no recurring fee" would contradict
    // the email we send them, so the no-recurring-fee promise is scoped to the site.
    // No renewal figure is quoted — lib/pricing.ts defines none, and the only number
    // that exists anywhere ("around 500 to 1200 PHP", templates.ts:1024) is a soft,
    // registrar-dependent range that has no business on a legal page.
    //
    // Every clause of the domain sentence is sourced:
    //   • one year, included in the price — convex/lib/hostinger.ts registerDomain
    //     ("Register a domain for 1 year", expiresAt = +365d) bought on Tendso's
    //     saved card by domains.setupForSubmission at mark-paid (convex/domains.ts:509).
    //   • held on TENDSO's registrar account, not the owner's — registerDomain sends
    //     one Hostinger WHOIS profile id as owner_id/admin_id/billing_id/tech_id
    //     (convex/lib/hostinger.ts:409-419). The owner's name is on no contact role.
    //     This was previously MISSING from the page and its absence made the old
    //     "the domain is yours to renew, paid to the registrar" sentence false: the
    //     owner has no registrar account and no standing to renew it directly.
    //   • auto-renew off by design — convex/domains.ts:531-541 disables it on the
    //     subscription right after purchase. Deliberately not phrased as "it will
    //     never renew": that call is best-effort and its failure is caught and
    //     audit-logged (:543-557), so the promise made is the one that holds either
    //     way — nothing is billed to the OWNER, who has no card on file with us.
    //   • ~30-day reminder, then lapse — convex/domains.ts:518-528 schedules
    //     sendDomainRenewalReminderEmailAction at expiresAt − 30d; the email says the
    //     domain is lost and the site unreachable if it is not renewed (templates.ts:1021).
    //   • renew-for-you and help-transferring-out — both are offers that email
    //     already makes verbatim (templates.ts:1028 "reply to this email and our team
    //     will renew … on your behalf"; :1030 "need help transferring the domain to
    //     your own account, just reply"). No code implements a transfer, so the page
    //     says they are handled by hand over email and promises no mechanism.
    {
        marker: "§ 05",
        icon: PencilLine,
        title: "Your Website, Edits & Hosting",
        content:
            "Your one-time payment covers building your website and putting it live. For one year from the day your site goes live, edits are free — you contact Tendso through the Contact page, tell us what you want changed, and we make the change for you. There is no editor for you to learn and nothing to install. After that first year, edits are no longer included; nothing is charged automatically for the website, as we keep no card on file and the website carries no recurring fee. If you bought a custom domain, its first year of registration is included in what you paid and Tendso buys it for you; that registration is held on Tendso's own registrar account, under Tendso's registrant, administrative, billing and technical contact details, not in your name. Auto-renew is switched off deliberately, so the domain is not extended automatically and no renewal is ever charged to you. Around 30 days before it expires we email you a reminder, and if it is not renewed the registration lapses and your site stops being reachable at that address. You can reply to that reminder and ask us to renew it for you, or ask us to help move the domain into a registrar account of your own — both are handled by our team over email; there is no automated transfer. Hosting with SSL is included at no monthly cost, though we cannot guarantee uninterrupted availability.",
    },
    {
        marker: "§ 06",
        icon: Users,
        title: "Intellectual Property",
        content:
            "By uploading media to Tendso, you grant us a worldwide, non-exclusive license to use, display, transcribe (via AI), and deploy the content to generate websites for the respective businesses.",
    },
    {
        marker: "§ 07",
        icon: ShieldAlert,
        title: "Prohibited Conduct & Law",
        content:
            "Manipulating the referral system, uploading AI-generated fake stores, or harassing business owners is strictly prohibited. These Terms are governed by the laws of the Republic of the Philippines. Any disputes will be resolved in Philippine jurisdictions.",
    },
];

export default function TermsOfServicePage() {
    return (
        <div
            className="min-h-screen overflow-x-hidden"
            style={{ background: "var(--khaki)", color: "var(--ink)" }}
        >
            <Navbar />

            {/* Subtle paper grain texture */}
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-[0.04] mix-blend-multiply"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 25% 25%, var(--ink) 0.5px, transparent 1px), radial-gradient(circle at 75% 75%, var(--ink) 0.5px, transparent 1px)",
                    backgroundSize: "4px 4px, 6px 6px",
                }}
            />
            <div className="fixed top-0 left-[20%] w-[40%] h-[40%] bg-[var(--rust)]/8 rounded-full blur-[200px] opacity-50 pointer-events-none" />

            <main className="relative z-10 w-full pt-40 sm:pt-48 pb-32 px-6 max-w-5xl mx-auto flex flex-col items-center">

                {/* HEADER */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="text-center w-full mb-20"
                >
                    {/* Section marker */}
                    <div className="flex items-center gap-3 justify-center mb-8">
                        <span className="h-px w-12 bg-[var(--rust)]/40" />
                        <p
                            className="text-[10px] sm:text-[11px] uppercase tracking-[0.45em] font-medium text-[var(--rust)]"
                            style={{ fontFamily: "var(--font-mono)" }}
                        >
                            DOC — LEGAL
                        </p>
                        <span className="h-px w-12 bg-[var(--rust)]/40" />
                    </div>

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 18 }}
                        className="mb-8 p-4 rounded-3xl bg-[var(--khaki-deep)] border border-[var(--ink)]/15 inline-block"
                    >
                        <Scale className="w-12 h-12 text-[var(--rust)]" />
                    </motion.div>

                    <h1
                        className="font-bold leading-[0.92] tracking-[-0.02em] text-[var(--ink)] mb-6"
                        style={{
                            fontFamily: "var(--font-playfair)",
                            fontSize: "clamp(3rem, 9vw, 7rem)",
                        }}
                    >
                        Terms of <br />
                        <span className="italic" style={{ color: "var(--rust)" }}>Service.</span>
                    </h1>
                    <p
                        className="italic text-[var(--ink)]/65 max-w-2xl mx-auto leading-relaxed"
                        style={{
                            fontFamily: "var(--font-playfair)",
                            fontSize: "clamp(1.1rem, 1.6vw, 1.4rem)",
                        }}
                    >
                        The operational guidelines governing your use of the Tendso Creator Network.
                    </p>
                    <div className="w-px h-20 bg-gradient-to-b from-[var(--rust)] to-transparent mx-auto mt-12" />
                </motion.div>

                {/* CONTENT SECTIONS */}
                <div className="w-full space-y-5">
                    {termsSections.map((section, idx) => {
                        const Icon = section.icon;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-80px" }}
                                transition={{ delay: idx * 0.08, duration: 0.5 }}
                                className="group p-8 sm:p-10 rounded-[1.75rem] bg-[var(--khaki-deep)] border border-[var(--ink)]/15 hover:border-[var(--rust)]/50 transition-all hover:shadow-xl hover:shadow-[var(--ink)]/10"
                            >
                                <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
                                    <div className="p-4 bg-[var(--khaki)] rounded-2xl border border-[var(--ink)]/15 shrink-0">
                                        <Icon className="w-7 h-7 text-[var(--rust)]" />
                                    </div>
                                    <div className="flex-1">
                                        <p
                                            className="text-[10px] uppercase tracking-[0.4em] font-medium text-[var(--rust)] mb-2"
                                            style={{ fontFamily: "var(--font-mono)" }}
                                        >
                                            {section.marker}
                                        </p>
                                        <h3
                                            className="text-2xl sm:text-3xl font-bold text-[var(--ink)] tracking-[-0.01em] mb-4 leading-tight"
                                            style={{ fontFamily: "var(--font-playfair)" }}
                                        >
                                            {section.title}
                                        </h3>
                                        <p
                                            className="text-[var(--ink)]/70 leading-relaxed"
                                            style={{ fontSize: "clamp(1rem, 1.15vw, 1.1rem)" }}
                                        >
                                            {section.content}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* CONTACT BANNER */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="w-full mt-20 p-10 sm:p-14 rounded-[2rem] bg-[var(--ink)] text-[var(--khaki)] text-center relative overflow-hidden"
                >
                    <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-[var(--rust)]/20 rounded-full blur-[140px] pointer-events-none" />
                    <div className="absolute -bottom-32 -left-20 w-[400px] h-[400px] bg-[var(--rust-soft)]/15 rounded-full blur-[140px] pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 justify-center mb-6">
                            <span className="h-px w-10 bg-[var(--rust-soft)]/50" />
                            <p
                                className="text-[10px] uppercase tracking-[0.45em] font-medium text-[var(--rust-soft)]"
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                INQUIRY — LEGAL HQ
                            </p>
                            <span className="h-px w-10 bg-[var(--rust-soft)]/50" />
                        </div>

                        <h3
                            className="font-bold tracking-[-0.01em] mb-5"
                            style={{
                                fontFamily: "var(--font-playfair)",
                                fontSize: "clamp(2rem, 4vw, 3rem)",
                            }}
                        >
                            Legal <span className="italic" style={{ color: "var(--rust-soft)" }}>inquiries?</span>
                        </h3>
                        <p
                            className="italic text-[var(--khaki)]/70 mb-8 max-w-xl mx-auto leading-relaxed"
                            style={{
                                fontFamily: "var(--font-playfair)",
                                fontSize: "clamp(1.05rem, 1.5vw, 1.25rem)",
                            }}
                        >
                            Reach out for clarifications on payout structures, intellectual property, or terms.
                        </p>
                        <a
                            href="mailto:frmwrkd.media@gmail.com"
                            className="inline-block bg-[var(--rust)] hover:bg-[var(--rust-soft)] text-[var(--khaki)] px-9 py-4 rounded-full font-semibold text-sm transition-colors"
                        >
                            Contact Legal HQ
                        </a>
                    </div>
                </motion.div>
            </main>

            <Footer />
            <ScrollToTop />
        </div>
    );
}
