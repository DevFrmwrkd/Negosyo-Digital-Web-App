"use client";

import { motion } from "framer-motion";
import { Camera, Banknote, Sparkles, Users } from "lucide-react";
import { Bricolage_Grotesque } from 'next/font/google';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });

const features = [
  {
    icon: <Camera className="w-8 h-8 text-[#00FF66]" />,
    title: "Capture The Story",
    desc: "Simply visit a local MSME, take a few photos, and record a short audio/video interview using your device. No coding required."
  },
  {
    icon: <Sparkles className="w-8 h-8 text-[#1D00FF]" />,
    title: "AI-Powered Generation",
    desc: "Our platform uses advanced AI to transcribe your interview and automatically build a fully deployed, highly optimized website."
  },
  {
    icon: <Banknote className="w-8 h-8 text-[#39FF14]" />,
    title: "Earn Real Income",
    desc: "Get paid up to PHP 1,000 for every successfully deployed business website. Direct withdrawals to your local bank account via Wise."
  },
  {
    icon: <Users className="w-8 h-8 text-[#00F0FF]" />,
    title: "Referral Ecosystem",
    desc: "Multiply your earnings by inviting other creators. When they succeed, you receive massive bonuses straight to your wallet."
  }
];

export default function FeaturesSection() {
  return (
    <section id="features" className="w-full py-32 px-6 max-w-7xl mx-auto relative z-10">
      <div className="mb-20">
        <motion.h2
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className={`text-5xl md:text-7xl font-black uppercase tracking-tighter ${bricolage.className}`}
        >
          The Creator <span className="text-[#00F0FF]">Ecosystem.</span>
        </motion.h2>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "100px" }}
          viewport={{ once: true }}
          className="h-2 bg-[#00FF66] mt-6"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {features.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: idx * 0.1, duration: 0.6 }}
            className="group p-10 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors relative overflow-hidden backdrop-blur-sm"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
            <div className="mb-8 p-4 bg-black/50 rounded-2xl inline-block border border-white/5">
              {item.icon}
            </div>
            <h3 className={`text-3xl font-bold mb-4 ${bricolage.className}`}>{item.title}</h3>
            <p className="text-white/60 text-lg font-light leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
