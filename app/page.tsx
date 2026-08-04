"use client";

import { LanguageProvider } from "@/components/landing/i18n";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollToTop from "@/components/landing/ScrollToTop";

import HeroSection from "@/components/landing/HeroSection";
import RealSitesSection from "@/components/landing/RealSitesSection";
import ProcessSection from "@/components/landing/ProcessSection";
import BusinessPricingSection from "@/components/landing/BusinessPricingSection";
import ManifestoSection from "@/components/landing/ManifestoSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";

import StickyCTA from "@/components/landing/StickyCTA";
import ChatBot from "@/components/landing/ChatBot";
import ScrollReveal from "@/components/landing/ScrollReveal";

/**
 * Tendso landing — WordPress-informed, modern-SaaS system on the brand palette
 * (warm paper + one gold accent, Fraunces display + Plus Jakarta body). Every
 * section is data-true (no fabricated counters/creators/testimonials) and
 * bilingual (EN/TL). Owners are customers only — no owner signup anywhere.
 *
 * Owner-first narrative: hero → real-sites proof → pricing → how it works
 * (process) → FAQ → manifesto → final CTA → footer. Creator content lives on
 * /for-creators; the homepage keeps only a secondary creator pointer.
 *
 * ChatBot still uses the legacy `.neo` tokens, so it keeps a minimal wrapper
 * until it's converted; everything else runs on brand tokens.
 */
export default function Home() {
    return (
        <LanguageProvider>
            <div className="reveal-scope min-h-screen overflow-x-clip bg-khaki text-ink">
                <Navbar />

                {/* Owner-first homepage: the paying customer (business owner) is the
                    single primary audience. Creators keep a secondary path (the hero
                    pointer, the "For creators" nav link, the footer, and /for-creators)
                    — the creator earnings + creator-app bands live on /for-creators. */}
                {/* Bands alternate paper (khaki) / wash (khaki-deep) so no two
                    adjacent sections share a tone: p,w,p,w,p,w,ink. */}
                <main>
                    <HeroSection />
                    <RealSitesSection />
                    <BusinessPricingSection />
                    <ProcessSection />
                    <FaqSection businessOnly />
                    <ManifestoSection />
                    <CtaSection focus="business" />
                </main>

                <Footer />

                <StickyCTA />
                <ScrollToTop />
                <ChatBot />
                <ScrollReveal />
            </div>
        </LanguageProvider>
    );
}
