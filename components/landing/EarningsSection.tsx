"use client";

import { motion } from "framer-motion";
import { Video, Mic, Gift, ArrowRight } from "lucide-react";
import { Bricolage_Grotesque } from 'next/font/google';
import Link from "next/link";

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });

const earningRates = [
  {
    icon: <Video className="w-10 h-10 text-[#00FF66]" />,
    title: "Video Interview",
    amount: "PHP 500",
    desc: "Earn directly to your wallet for a successful video interview and 3 location photos.",
    color: "from-[#00FF66]/20 to-transparent",
    borderColor: "border-[#00FF66]/30",
    buttonColor: "bg-[#00FF66] text-black hover:bg-white"
  },
  {
    icon: <Mic className="w-10 h-10 text-[#00F0FF]" />,
    title: "Audio Only",
    amount: "PHP 300",
    desc: "Perfect for camera-shy owners. Record high-quality audio plus 3 photos to earn.",
    color: "from-[#00F0FF]/20 to-transparent",
    borderColor: "border-[#00F0FF]/30",
    buttonColor: "bg-[#00F0FF] text-black hover:bg-white"
  },
  {
    icon: <Gift className="w-10 h-10 text-[#1D00FF]" />,
    title: "Referral Bonus",
    amount: "PHP 1,000",
    desc: "Invite another creator. When they complete their first paid submission, you get a massive bonus.",
    color: "from-[#1D00FF]/30 to-transparent",
    borderColor: "border-[#1D00FF]/30",
    buttonColor: "bg-[#1D00FF] text-white hover:bg-white hover:text-black"
  }
];

export default function EarningsSection() {
  return (
    <section id="earnings" className="w-full py-32 px-6 max-w-7xl mx-auto relative z-10 border-t border-white/5">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#00FF66] rounded-full mix-blend-screen filter blur-[250px] opacity-10 pointer-events-none" />
      
      <div className="text-center mb-24 relative z-10">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
           className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-[#00FF66]/40 bg-[#00FF66]/10 mb-8"
        >
          <span className="w-3 h-3 rounded-full bg-[#00FF66] animate-pulse" />
          <span className={`text-[#00FF66] text-sm uppercase tracking-widest font-black ${bricolage.className}`}>Uncapped Income</span>
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`text-6xl md:text-8xl font-black uppercase tracking-tighter ${bricolage.className}`}
        >
          Simple <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF66] to-[#00F0FF]">Economics.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-white/60 text-xl md:text-2xl mt-6 max-w-2xl mx-auto font-light"
        >
          No complex points systems. No hidden fees. Earn real cash directly via Wise for every MSME you digitize.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {earningRates.map((rate, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.15, duration: 0.6 }}
            className={`flex flex-col h-full rounded-[2.5rem] bg-gradient-to-b ${rate.color} border ${rate.borderColor} p-10 relative overflow-hidden group backdrop-blur-md`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-150 transition-transform duration-700 pointer-events-none">
              {rate.icon}
            </div>
            
            <div className="mb-6 bg-black/40 p-5 rounded-2xl w-max border border-white/5 backdrop-blur-xl">
              {rate.icon}
            </div>
            
            <div className="mt-auto pt-10">
              <h3 className={`text-2xl font-bold uppercase text-white/80 tracking-wide mb-2 ${bricolage.className}`}>
                {rate.title}
              </h3>
              <div className={`text-5xl md:text-6xl font-black text-white tracking-tighter mb-6 ${bricolage.className}`}>
                {rate.amount}
              </div>
              <p className="text-white/60 text-lg font-light leading-relaxed mb-10">
                {rate.desc}
              </p>
              
              <Link href="/login" className="mt-auto">
                <button className={`w-full py-5 rounded-full font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-colors ${rate.buttonColor} ${bricolage.className}`}>
                  Start Earning <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
