"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/logo.png";
import { Menu, X, ArrowRight } from "lucide-react";
import { Bricolage_Grotesque } from 'next/font/google';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '800'] });

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Features", href: "#features" },
    { name: "Earnings", href: "#earnings" },
    { name: "Privacy Policy", href: "/privacy-policy" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-in-out border-b border-white/5 backdrop-blur-md ${
        scrolled ? "bg-black/70 py-4 shadow-2xl shadow-[#00FF66]/5" : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        {/* BRAND */}
        <Link href="/" className={`text-white text-2xl tracking-tighter hover:opacity-80 transition-opacity flex items-center gap-3 ${bricolage.className}`}>
          <Image src={Logo} alt="Logo" width={36} height={36} className="rounded-xl shadow-[0_0_15px_rgba(0,255,102,0.4)]" />
          NegosyoDigital
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex bg-white/5 backdrop-blur-xl rounded-full px-6 py-2 border border-white/10 gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-white/70 hover:text-[#00FF66] text-sm font-medium tracking-wide transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <Link href="/login">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`group flex items-center gap-2 bg-[#00FF66] text-black px-6 py-2.5 rounded-full font-bold text-sm overflow-hidden relative ${bricolage.className}`}
            >
              <div className="absolute inset-0 w-full h-full bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10">LOGIN</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </div>

        {/* MOBILE TOGGLE */}
        <button
          className="md:hidden text-white/80 hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100vh" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-2xl border-t border-white/10 overflow-hidden"
          >
            <div className="flex flex-col px-6 py-10 gap-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    href={link.href}
                    className="text-white text-3xl font-light tracking-tight hover:text-[#00FF66] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8"
              >
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className={`w-full bg-[#1D00FF] hover:bg-[#1D00FF]/90 text-white px-8 py-4 rounded-full font-bold text-xl tracking-wider uppercase ${bricolage.className}`}>
                    Login
                  </button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
