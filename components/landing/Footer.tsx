"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/logo.png";
import { ArrowUpRight, Github, Twitter, Linkedin } from "lucide-react";
import { Bricolage_Grotesque } from 'next/font/google';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });

export default function Footer() {
  return (
    <footer className="bg-black text-white py-20 border-t border-white/10 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-[#00FF66]/50 to-transparent" />
      <div className="absolute -left-[20%] -bottom-[40%] w-[80%] h-[80%] bg-[#1D00FF]/20 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-16">
          <div className="md:col-span-2 flex flex-col items-start gap-4">
            <Link href="/" className={`text-white text-3xl tracking-tighter hover:opacity-80 transition-opacity flex items-center gap-3 ${bricolage.className}`}>
              <Image src={Logo} alt="Logo" width={48} height={48} className="rounded-xl shadow-[0_0_15px_rgba(29,0,255,0.4)]" />
              NegosyoDigital
            </Link>
            <p className="text-white/50 text-base max-w-sm mt-2 leading-relaxed font-light">
              Elevating digital businesses with unstoppable technology and uncompromising aesthetics. Bold solutions for modern brands.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className={`text-lg font-bold uppercase tracking-widest text-[#00FF66] ${bricolage.className}`}>Legal</h4>
            <Link href="/privacy-policy" className="text-white/60 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-white/60 hover:text-white transition-colors">Terms of Service</Link>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className={`text-lg font-bold uppercase tracking-widest text-[#00FF66] ${bricolage.className}`}>Connect</h4>
            <div className="flex items-center gap-4">
              <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                <Github size={18} />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                <Twitter size={18} />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                <Linkedin size={18} />
              </Link>
            </div>
            <Link href="/login" className="flex items-center gap-2 text-white/60 hover:text-[#00FF66] transition-colors mt-2 group">
              Login to Portal <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Negosyo Digital. All rights reserved.
          </p>
          <div className="text-white/30 text-xs tracking-widest uppercase">
            Designed for Impact
          </div>
        </div>
      </div>
    </footer>
  );
}
