"use client";

import { motion } from "framer-motion";
import { Scale, Users, FileText, Banknote, ShieldAlert, Award } from "lucide-react";
import { Bricolage_Grotesque, Outfit } from 'next/font/google';

import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollToTop from "@/components/landing/ScrollToTop";

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });
const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600'] });

const termsSections = [
  {
    icon: <Scale className="w-8 h-8 text-[#00F0FF]" />,
    title: "1. Acceptance of Terms",
    content: "By accessing or using the Negosyo Digital platform (including our mobile app and web portal), you agree to be strictly bound by these Terms of Service. You must be at least 18 years of age to register as a Creator."
  },
  {
    icon: <Award className="w-8 h-8 text-[#00FF66]" />,
    title: "2. Creator Certification",
    content: "To maintain quality across the platform, Creators must complete the in-app training program and pass the certification quiz with a minimum score of 80% (4 out of 5 correct) before submitting live MSME data to the network."
  },
  {
    icon: <FileText className="w-8 h-8 text-[#39FF14]" />,
    title: "3. Submissions & Media",
    content: "All data submitted must be authentic and collected with the explicit consent of the business owner. Submissions require a minimum of 3 photos (portrait, location, product) and a valid audio/video interview. Fraudulent data will result in immediate termination."
  },
  {
    icon: <Banknote className="w-8 h-8 text-[#1D00FF]" />,
    title: "4. Payouts & Economics",
    content: "Creators earn PHP 500 for a successful video interview submission, and PHP 300 for audio-only submissions. Referral bonuses of PHP 1,000 are credited when a referred Creator completes their first paid submission. The minimum withdrawal threshold is PHP 100, processed securely via Wise API direct to local Philippine bank accounts."
  },
  {
    icon: <Users className="w-8 h-8 text-[#00F0FF]" />,
    title: "5. Intellectual Property",
    content: "By uploading media to Negosyo Digital, you grant us a worldwide, non-exclusive license to use, display, transcribe (via AI), and deploy the content to generate websites for the respective businesses."
  },
  {
    icon: <ShieldAlert className="w-8 h-8 text-red-500" />,
    title: "6. Prohibited Conduct & Law",
    content: "Manipulating the referral system, uploading AI-generated fake stores, or harassing business owners is strictly prohibited. These Terms are governed by the laws of the Republic of the Philippines. Any disputes will be resolved in Philippine jurisdictions."
  }
];

export default function TermsOfServicePage() {
  return (
    <div className={`min-h-screen bg-black text-white selection:bg-[#00F0FF] selection:text-black overflow-x-hidden ${outfit.className}`}>
      <Navbar />
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="fixed top-0 left-[20%] w-[40%] h-[40%] bg-[#1D00FF] rounded-full mix-blend-screen filter blur-[250px] opacity-20 pointer-events-none" />

      <main className="relative z-10 w-full pt-48 pb-32 px-6 max-w-5xl mx-auto flex flex-col items-center">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center w-full mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="mb-8 p-4 rounded-3xl bg-white/5 border border-white/10 inline-block backdrop-blur-xl"
          >
            <Scale className="w-12 h-12 text-[#1D00FF]" />
          </motion.div>
          
          <h1 className={`text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6 ${bricolage.className}`}>
            Terms of <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1D00FF] to-[#00F0FF]">Service</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/50 max-w-2xl mx-auto font-light">
            The operational guidelines governing your use of the Negosyo Digital Creator Network.
          </p>
          <div className="w-px h-24 bg-gradient-to-b from-[#1D00FF] to-transparent mx-auto mt-12" />
        </motion.div>

        {/* CONTENT SECTIONS */}
        <div className="w-full grid gap-12">
          {termsSections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="group p-8 md:p-12 rounded-[2rem] bg-white/5 border border-white/10 hover:border-[#1D00FF]/50 transition-all relative overflow-hidden backdrop-blur-md"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="p-4 bg-black/50 rounded-2xl border border-white/10 shrink-0 shadow-lg shadow-black/50">
                  {section.icon}
                </div>
                <div>
                  <h3 className={`text-3xl font-bold uppercase tracking-tight mb-4 text-white group-hover:text-[#00F0FF] transition-colors ${bricolage.className}`}>
                    {section.title}
                  </h3>
                  <p className="text-white/70 text-lg leading-relaxed font-light">
                    {section.content}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CONTACT BANNER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="w-full mt-24 p-12 rounded-[3rem] bg-gradient-to-br from-[#1D00FF]/20 to-[#00F0FF]/10 border border-[#1D00FF]/20 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
          <h3 className={`text-3xl font-black uppercase tracking-tighter mb-4 relative z-10 ${bricolage.className}`}>
            Legal Inquiries?
          </h3>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto relative z-10">
            Reach out to our legal department for clarifications on payout structures or Intellectual Property disputes.
          </p>
          <a href="mailto:frmwrkd.media@gmail.com" className={`inline-block bg-[#1D00FF] text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors relative z-10 ${bricolage.className}`}>
            Contact Legal HQ
          </a>
        </motion.div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
