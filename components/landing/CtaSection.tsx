"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Bricolage_Grotesque } from 'next/font/google';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['800'] });

export default function CtaSection() {
  return (
    <section className="w-full py-40 px-6 relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-[#00FF66] skew-y-[-3deg] scale-110 z-0 origin-bottom-left" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-200px" }}
        className="relative z-10 text-center text-black max-w-4xl mx-auto flex flex-col items-center"
      >
        <h2 className={`text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-8 ${bricolage.className}`}>
          Empower <br /> Local <br /> Stores.
        </h2>
        <p className="text-black/70 text-xl md:text-3xl font-medium mb-12 max-w-2xl px-4">
          Help small businesses leap into the digital age while earning a sustainable income.
        </p>
        <Link href="/login">
          <motion.button
            whileHover={{ scale: 1.1, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`bg-black text-[#00FF66] px-12 py-6 rounded-full font-black text-2xl tracking-widest uppercase hover:text-white transition-colors flex items-center gap-4 ${bricolage.className}`}
          >
            Become a Creator <ArrowRight className="w-8 h-8" />
          </motion.button>
        </Link>
      </motion.div>
    </section>
  );
}
