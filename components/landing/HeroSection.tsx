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
    // iOS: trigger native PWA add-to-home-screen via manifest
    if (isIos()) {
      // iOS doesn't support programmatic install - open in Safari standalone mode hint
      // The manifest + apple-mobile-web-app-capable meta tags handle this
      // Best we can do is alert the user briefly
      alert("To install: tap the Share button in Safari, then tap \"Add to Home Screen\".");
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
    </section>
  );
}
