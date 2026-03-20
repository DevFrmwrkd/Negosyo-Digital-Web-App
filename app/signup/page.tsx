"use client"

import { SignUp } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Logo from "@/public/logo.png"
import { ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { Bricolage_Grotesque, Outfit } from 'next/font/google';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });
const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600'] });

export default function SignupPage() {
    const router = useRouter()

    return (
        <div className={`min-h-screen w-full flex bg-black text-white selection:bg-[#00FF66] selection:text-black overflow-x-hidden relative ${outfit.className}`}>
            {/* BACKGROUND EFFECTS */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#1D00FF] rounded-full mix-blend-screen filter blur-[200px] opacity-40 animate-pulse pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[40%] h-[60%] bg-[#00FF66] rounded-full mix-blend-screen filter blur-[250px] opacity-10 pointer-events-none" />

            <div className="relative z-10 w-full flex flex-col items-center justify-center p-6 min-h-screen py-20">
                
                {/* BACK TO HOME */}
                <Link href="/" className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3 text-white/50 hover:text-white transition-colors">
                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-md">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="font-bold tracking-widest uppercase text-xs">Return</span>
                </Link>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md mt-12"
                >
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(29,0,255,0.4)] mb-6 border border-white/10 bg-black/50 p-1 flex items-center justify-center backdrop-blur-md relative">
                            <Image src={Logo} alt="Logo" width={64} height={64} className="rounded-2xl" />
                        </div>
                        <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tighter text-center mb-3 ${bricolage.className}`}>
                            Join <span className="text-[#00F0FF]">Network</span>
                        </h1>
                        <p className="text-white/50 text-center font-light text-lg">
                            Register your creator identity to earn.
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col items-center">
                        <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-50" />
                        
                        <div className="w-full relative z-10 flex justify-center custom-clerk-wrapper">
                            <SignUp
                                appearance={{
                                    elements: {
                                        rootBox: "w-full",
                                        card: "bg-transparent shadow-none",
                                        headerTitle: "hidden",
                                        headerSubtitle: "hidden",
                                        socialButtonsBlockButton: "border-white/20 text-white hover:bg-white/10 transition-colors",
                                        formButtonPrimary: "bg-[#1D00FF] hover:bg-[#2B10FF] text-white shadow-[0_0_20px_rgba(29,0,255,0.3)] hover:shadow-[0_0_30px_rgba(29,0,255,0.5)] transition-all uppercase tracking-widest text-xs py-4 rounded-xl",
                                        formFieldInput: "bg-black/40 border border-white/10 text-white focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 rounded-xl h-12",
                                        formFieldLabel: "text-white/60 uppercase tracking-widest text-[10px] font-bold",
                                        dividerLine: "bg-white/20",
                                        dividerText: "text-white/40",
                                        footerActionText: "text-white/40",
                                        footerActionLink: "text-[#00F0FF] hover:text-white font-bold",
                                        identityPreviewText: "text-white",
                                        identityPreviewEditButtonIcon: "text-[#00F0FF]",
                                    },
                                    variables: {
                                        colorBackground: "transparent",
                                        colorText: "white",
                                        colorPrimary: "#00F0FF",
                                        colorInputText: "white",
                                    }
                                }}
                                routing="hash"
                                forceRedirectUrl="/onboarding"
                                signInUrl="/login"
                            />
                        </div>

                    </div>

                    <p className="text-center mt-8 text-sm font-light text-white/40 mb-12">
                        Already licensed?{" "}
                        <Link href="/login" className="font-bold text-[#00F0FF] hover:text-white transition-colors tracking-wide underline decoration-[#00F0FF]/30 underline-offset-4">
                            Access your portal
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
