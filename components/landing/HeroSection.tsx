"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { MoveRight, Banknote, Activity, Download } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bricolage_Grotesque } from 'next/font/google';

import DashboardImg from "@/public/dashboard.png";

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });

export default function HeroSection() {
  const containerRef = useRef(null);
  const apkUrl = useQuery(api.settings.get, { key: "apk_download_url" }) as string | null;
  const [downloading, setDownloading] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const isIos = () => {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  };

  const handleInstall = async () => {
    // iOS: show visual guide since programmatic install isn't possible
    if (isIos()) {
      setShowIosGuide(true);
      return;
    }

    // Android/Chrome: use the native PWA install prompt if available
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      if (outcome === "accepted") return;
    }

    // Fallback: download APK for Android
    if (!apkUrl || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(apkUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Negosyo-Digital.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(apkUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const yOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const yMove = useTransform(scrollYProgress, [0, 0.2], [0, -100]);

  return (
    <section ref={containerRef} className="relative w-full min-h-screen pt-32 pb-20 px-6 overflow-hidden flex items-center">
      <motion.div
        style={{ opacity: yOpacity, y: yMove }}
        className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10"
      >
        {/* LEFT COLUMN - TEXT CONTENT */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
            <span className="w-2 h-2 rounded-full bg-[#00FF66] absolute" />
            <span className="text-xs uppercase tracking-widest font-bold">Creator Network Active</span>
          </motion.div>

          <motion.h1
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-tighter leading-[0.85] mb-8 ${bricolage.className}`}
          >
            Digitize MSMEs.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF66] via-[#39FF14] to-[#00F0FF]">
              Get Paid.
            </span>
          </motion.h1>

          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-2xl text-white/60 max-w-xl font-light mb-12"
          >
            Join Negosyo Digital as a Certified Creator. Visit local businesses, capture their story, and let our AI pipeline transform it into a website. You earn for every successful launch.
          </motion.p>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full sm:w-auto"
          >
            <Link href="#features" className="w-full sm:w-auto">
              <button className={`w-full sm:w-auto group relative overflow-hidden bg-[#00FF66] text-black px-8 py-4 rounded-full font-black text-lg tracking-wider uppercase transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(0,255,102,0.4)] ${bricolage.className}`}>
                <span className="relative z-10 flex items-center justify-center gap-3">
                  How it Works <MoveRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
              </button>
            </Link>

            {apkUrl ? (
              <button
                onClick={handleInstall}
                disabled={downloading}
                className={`w-full sm:w-auto group flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white text-black hover:bg-white/90 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] font-bold text-lg uppercase tracking-wider disabled:opacity-70 ${bricolage.className}`}
              >
                {downloading ? "Downloading..." : "Install App"} <Download className={`w-5 h-5 ${downloading ? "animate-bounce" : "group-hover:translate-y-1"} transition-transform`} />
              </button>
            ) : (
              <button disabled className={`w-full sm:w-auto group flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white/20 text-white/50 cursor-not-allowed font-bold text-lg uppercase tracking-wider ${bricolage.className}`}>
                Install App <Download className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        </div>

        {/* RIGHT COLUMN - FLOATING WIDGET */}
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.5, type: "spring", damping: 20 }}
          className="relative hidden lg:block"
        >
          {/* Decorative Glowing Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-[#00FF66]/20 to-[#1D00FF]/20 rounded-full blur-[100px] pointer-events-none -z-10" />

          <div className="relative z-10 transform sm:rotate-2 hover:rotate-0 transition-transform duration-700 ease-out">
            <div className="rounded-3xl p-2 bg-gradient-to-br from-white/20 to-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl border border-white/10">
              <Image
                src={DashboardImg}
                alt="App Dashboard Preview"
                width={800}
                height={1600}
                className="w-full h-auto rounded-2xl shadow-inner border border-white/5 object-cover max-h-[700px] mx-auto object-top"
                priority
              />
            </div>

            {/* Floating Floating Details */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="absolute -bottom-10 -left-12 bg-black/80 backdrop-blur-xl border border-[#00FF66]/30 p-6 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#00FF66]/20 flex items-center justify-center border border-[#00FF66]/50">
                  <Activity className="w-6 h-6 text-[#00FF66]" />
                </div>
                <div>
                  <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Live Transfers</p>
                  <p className={`text-white text-2xl font-black ${bricolage.className}`}>₱ 12,400.00</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="absolute -top-8 -right-8 bg-black/80 backdrop-blur-xl border border-[#1D00FF]/30 p-5 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            >
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1 text-center">Verified Submissions</p>
              <p className={`text-center text-white text-3xl font-black ${bricolage.className}`}>
                <span className="text-[#00FF66]">↑</span> 28
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* BACKGROUND GRID OVERLAY */}
      <div className="absolute bottom-0 w-full h-[50vh] bg-gradient-to-t from-black to-transparent z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1400px] h-full opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* iOS Add to Home Screen Guide */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-end justify-center" onClick={() => setShowIosGuide(false)}>
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md mx-4 mb-8 bg-[#1C1C1E] rounded-2xl p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 bg-[#00FF66]/20 rounded-2xl flex items-center justify-center">
                <Image src="/logo.png" alt="Negosyo Digital" width={36} height={36} className="rounded-lg" />
              </div>
              <h3 className={`text-xl font-bold ${bricolage.className}`}>Install Negosyo Digital</h3>
              <p className="text-white/50 text-sm mt-1">Add to your home screen in 2 steps</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                <div className="w-10 h-10 bg-[#007AFF] rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">1. Tap the Share button</p>
                  <p className="text-xs text-white/40">The square icon with an arrow at the bottom of Safari</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                <div className="w-10 h-10 bg-[#00FF66] rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">2. Tap &quot;Add to Home Screen&quot;</p>
                  <p className="text-xs text-white/40">Scroll down in the share menu to find it</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className={`w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-sm transition-colors ${bricolage.className}`}
            >
              Got it
            </button>

            {/* Arrow pointing to bottom of screen */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
              <svg className="w-6 h-6 text-white/40 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 16l-6-6h12l-6 6z" />
              </svg>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}
