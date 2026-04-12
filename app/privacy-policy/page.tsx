"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Fingerprint, Lock, Database, FileText, Bell, Clock, Scale, BookOpen, AlertTriangle, MessageSquare } from "lucide-react";
import { Bricolage_Grotesque, Outfit } from 'next/font/google';

import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollToTop from "@/components/landing/ScrollToTop";

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });
const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600'] });

const policySections = [
  {
    icon: <Database className="w-8 h-8 text-[#00F0FF]" />,
    title: "1. Information We Collect",
    content: (
      <>
        <p className="mb-4">We collect information that you provide directly to us when using the Negosyo Digital app.</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>Account Information:</strong> Name, email address, phone number, password, profile photo, and referral codes provided during registration.</li>
          <li><strong>Submission Content:</strong> Business photos, video/audio recordings, interview transcriptions, business owner details (name, phone, email), and business information (name, type, address, city).</li>
          <li><strong>Device & Usage Data:</strong> Device type, operating system, push notification tokens, network connectivity status, and app usage patterns.</li>
        </ul>
      </>
    )
  },
  {
    icon: <Fingerprint className="w-8 h-8 text-[#00FF66]" />,
    title: "2. How We Use Your Data",
    content: (
      <>
        <p className="mb-4">We use the information we collect to provide, maintain, and improve our services. Specifically, we use your data to:</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li>Process and manage business submissions</li>
          <li>Generate AI-enhanced websites for digitized businesses</li>
          <li>Process creator payouts via Wise bank transfers</li>
          <li>Send push notifications about submission status updates</li>
          <li>Transcribe video and audio interviews using AI</li>
          <li>Track referrals and calculate referral bonuses</li>
          <li>Provide customer support and respond to inquiries</li>
          <li>Monitor app performance and usage analytics</li>
        </ul>
      </>
    )
  },
  {
    icon: <Lock className="w-8 h-8 text-[#39FF14]" />,
    title: "3. Data Storage & Security",
    content: (
      <>
        <p className="mb-4">We implement industry-standard security measures to protect your personal information:</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li>Authentication tokens stored securely via Expo SecureStore</li>
          <li>Encrypted data transmission for all API communications</li>
          <li>Secure file uploads via presigned URLs</li>
          <li>Server-side data validation and sanitization</li>
          <li>Role-based access controls for administrative functions</li>
          <li>Regular security audits and vulnerability assessments</li>
        </ul>
      </>
    )
  },
  {
    icon: <FileText className="w-8 h-8 text-[#1D00FF]" />,
    title: "4. Business Owner Data",
    content: "When creators submit business information, they collect data about business owners including name, phone number, optional email, business name, type, address, and city. This data is used to generate a professional website for the business and create lead records. Business owners are contacted via the information provided to verify and manage their generated websites. Photos, videos, and audio recordings of the business are stored securely and processed through our AI content pipeline."
  },
  {
    icon: <Bell className="w-8 h-8 text-[#00F0FF]" />,
    title: "5. Push Notifications",
    content: (
      <>
        <p className="mb-4">We use Expo Push Notifications to keep you informed about important updates. You may receive notifications for: Submission status changes (approved, rejected, deployed), Payout confirmations and withdrawal updates, New lead alerts from generated websites, and System announcements and important updates.</p>
        <p>You can manage notification preferences through your device settings. Push notification tokens are stored securely and deactivated when invalid.</p>
      </>
    )
  },
  {
    icon: <Clock className="w-8 h-8 text-[#00FF66]" />,
    title: "6. Data Retention",
    content: (
      <>
        <p className="mb-4">We retain your data according to the following policies:</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li>Active account data is retained for the lifetime of your account</li>
          <li>Submission content is retained indefinitely to maintain generated websites</li>
          <li>Local form draft caches expire after 7 days automatically</li>
          <li>Financial records (earnings, withdrawals) are retained as required by Philippine tax law</li>
          <li>Deleted accounts: personal data removed within 30 days; anonymized analytics retained</li>
        </ul>
      </>
    )
  },
  {
    icon: <Scale className="w-8 h-8 text-[#39FF14]" />,
    title: "7. Your Rights",
    content: (
      <>
        <p className="mb-4">Under the Philippine Data Privacy Act of 2012 (RA 10173), you have the following rights:</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li>Right to be informed about how your data is collected and processed</li>
          <li>Right to access your personal data held by us</li>
          <li>Right to object to data processing activities</li>
          <li>Right to erasure or blocking of personal data</li>
          <li>Right to rectify inaccurate or incomplete data</li>
          <li>Right to data portability in a structured, machine-readable format</li>
        </ul>
      </>
    )
  },
  {
    icon: <BookOpen className="w-8 h-8 text-[#1D00FF]" />,
    title: "8. Philippine DPA Compliance",
    content: "Negosyo Digital is committed to complying with Republic Act No. 10173 (Data Privacy Act of 2012) and its Implementing Rules and Regulations. We process personal data based on legitimate interest and consent, maintain appropriate organizational and technical security measures, and have designated a Data Protection Officer to oversee compliance. We ensure all data processing activities are conducted in accordance with the principles of transparency, legitimate purpose, and proportionality as mandated by the National Privacy Commission."
  },
  {
    icon: <AlertTriangle className="w-8 h-8 text-[#00F0FF]" />,
    title: "9. Open Platform for All Ages",
    content: "Negosyo Digital is open to users of all ages — including students, young entrepreneurs, and anyone who wants to help digitalize local businesses and earn from it. There are no age restrictions to use the platform or register as a Creator. We believe in empowering the next generation of Filipino digital entrepreneurs."
  },
  {
    icon: <MessageSquare className="w-8 h-8 text-[#00FF66]" />,
    title: "10. Policy Updates",
    content: "We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make significant changes, we will notify you through the app via push notification and update the 'Last updated' date at the top of this page. We encourage you to review this policy periodically. Continued use of the app after changes constitutes acceptance of the updated policy."
  }
];

export default function PrivacyPolicy() {
  return (
    <div className={`min-h-screen bg-black text-white selection:bg-[#00F0FF] selection:text-black overflow-x-hidden ${outfit.className}`}>
      <Navbar />
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="fixed top-0 right-[20%] w-[40%] h-[40%] bg-[#00F0FF] rounded-full mix-blend-screen filter blur-[250px] opacity-20 pointer-events-none" />

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
            <ShieldAlert className="w-12 h-12 text-[#00F0FF]" />
          </motion.div>
          
          <h1 className={`text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6 ${bricolage.className}`}>
            Privacy <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#1D00FF]">Policy</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/50 max-w-2xl mx-auto font-light">
            Last updated: February 2026. Your privacy matters to us. This policy explains how Negosyo Digital collects, uses, and protects your personal information.
          </p>
          <div className="w-px h-24 bg-gradient-to-b from-[#00F0FF] to-transparent mx-auto mt-12" />
        </motion.div>

        {/* CONTENT SECTIONS */}
        <div className="w-full grid gap-12">
          {policySections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="group p-8 md:p-12 rounded-[2rem] bg-white/5 border border-white/10 hover:border-white/30 transition-all relative overflow-hidden backdrop-blur-md"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="p-4 bg-black/50 rounded-2xl border border-white/10 shrink-0 shadow-lg shadow-black/50">
                  {section.icon}
                </div>
                <div className="w-full">
                  <h3 className={`text-3xl font-bold tracking-tight mb-4 text-white group-hover:text-[#00F0FF] transition-colors ${bricolage.className}`}>
                    {section.title}
                  </h3>
                  <div className="text-white/70 text-lg leading-relaxed font-light">
                    {section.content}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 11. CONTACT US BANNER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="w-full mt-24 p-12 rounded-[3rem] bg-gradient-to-br from-[#1D00FF]/20 to-[#00F0FF]/10 border border-[#00F0FF]/20 text-center relative overflow-hidden flex flex-col items-center"
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
          <h3 className={`text-4xl font-black uppercase tracking-tighter mb-4 relative z-10 ${bricolage.className}`}>
            11. Contact Us
          </h3>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto relative z-10 font-light">
            If you have any questions about this Privacy Policy or our data practices, please contact us through the Help & FAQ section in your profile settings or reach out directly to operations.
          </p>
          <a href="mailto:frmwrkd.media@gmail.com" className={`inline-block bg-[#00F0FF] text-black px-12 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,240,255,0.4)] relative z-10 ${bricolage.className}`}>
            frmwrkd.media@gmail.com
          </a>
        </motion.div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
