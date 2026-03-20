"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff, Check, X } from "lucide-react"
import { Bricolage_Grotesque, Outfit } from 'next/font/google';
import Logo from "@/public/logo.png"

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });
const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600'] });

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
    if (pw.length < 8) return { level: 1, label: "Weak", color: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" }
    const hasUpper = /[A-Z]/.test(pw)
    const hasLower = /[a-z]/.test(pw)
    const hasNumber = /\d/.test(pw)
    const hasSpecial = /[^A-Za-z0-9]/.test(pw)
    const mixedCase = hasUpper && hasLower
    if (mixedCase && hasNumber && hasSpecial) return { level: 4, label: "Strong", color: "bg-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.5)]" }
    if ((mixedCase && hasNumber) || (mixedCase && hasSpecial)) return { level: 3, label: "Good", color: "bg-[#00FF66] shadow-[0_0_10px_rgba(226,250,58,0.5)]" }
    return { level: 2, label: "Fair", color: "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" }
}

export default function ForgotPasswordPage() {
    const router = useRouter()
    const { signIn, setActive, isLoaded } = useSignIn()

    const [step, setStep] = useState<"email" | "code">("email")
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const strength = getPasswordStrength(newPassword)
    const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded || !signIn) return
        setError(null)
        setLoading(true)

        try {
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: email,
            })
            setStep("code")
        } catch (err: any) {
            setError(err.errors?.[0]?.longMessage || err.message || "Failed to send reset code")
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded || !signIn) return
        setError(null)

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters")
            return
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setLoading(true)

        try {
            const result = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code,
                password: newPassword,
            })

            if (result.status === "complete" && result.createdSessionId) {
                await setActive({ session: result.createdSessionId })
                setSuccess(true)
                setTimeout(() => router.push("/dashboard"), 2000)
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.longMessage || err.message || "Failed to reset password")
        } finally {
            setLoading(false)
        }
    }

    const handleResendCode = async () => {
        if (!isLoaded || !signIn) return
        setError(null)
        try {
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: email,
            })
        } catch (err: any) {
            setError(err.errors?.[0]?.longMessage || "Failed to resend code")
        }
    }

    if (success) {
        return (
            <div className={`min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center px-6 text-center ${outfit.className}`}>
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-24 h-24 bg-[#39FF14]/20 border border-[#39FF14] shadow-[0_0_50px_rgba(57,255,20,0.5)] rounded-full flex items-center justify-center mb-6"
                >
                    <Check className="w-12 h-12 text-[#39FF14]" />
                </motion.div>
                <h1 className={`text-5xl font-black uppercase tracking-tighter mb-4 ${bricolage.className}`}>Protocol <span className="text-[#39FF14]">Reset!</span></h1>
                <p className="text-white/60 text-lg">Your identity has been secured. Initializing dashboard via uplink...</p>
            </div>
        )
    }

    return (
        <div className={`min-h-screen w-full flex bg-black text-white selection:bg-[#00F0FF] selection:text-black overflow-x-hidden relative ${outfit.className}`}>
            {/* BACKGROUND EFFECTS */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#00F0FF] rounded-full mix-blend-screen filter blur-[200px] opacity-20 animate-pulse pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[40%] h-[60%] bg-[#1D00FF] rounded-full mix-blend-screen filter blur-[250px] opacity-30 pointer-events-none" />

            <div className="relative z-10 w-full flex flex-col items-center justify-center p-6 min-h-screen py-20">
                
                {/* BACK NAVIGATION */}
                <button
                    onClick={() => step === "code" ? setStep("email") : router.push("/login")}
                    className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3 text-white/50 hover:text-white transition-colors"
                >
                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-md">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="font-bold tracking-widest uppercase text-xs">Return</span>
                </button>

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
                            Initialize <span className="text-[#00F0FF]">Reset</span>
                        </h1>
                        <p className="text-white/50 text-center font-light text-lg">
                            {step === "email" ? "Enter your agent email to recover access." : `Secure your identity with a new passcode.`}
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col items-center">
                        <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-50" />
                        <div className="w-full relative z-10">

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {step === "email" ? (
                                <form onSubmit={handleSendCode} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-white/60 pl-2">Email Address</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="w-5 h-5 text-white/30 group-focus-within:text-[#00F0FF] transition-colors" />
                                            </div>
                                            <input
                                                id="email"
                                                type="email"
                                                placeholder="hello@creator.ph"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                disabled={loading}
                                                className="w-full h-14 pl-12 pr-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all font-light"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !email}
                                        className={`w-full h-14 bg-[#1D00FF] hover:bg-[#2B10FF] disabled:opacity-50 text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(29,0,255,0.3)] hover:shadow-[0_0_30px_rgba(29,0,255,0.5)] active:scale-[0.98] mt-4 flex items-center justify-center gap-3 ${bricolage.className}`}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin h-5 w-5" /> EXECUTING...
                                            </>
                                        ) : (
                                            "Transmit Reset Code"
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleResetPassword} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-white/60 pl-2">Security Code</label>
                                        <input
                                            id="code"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="XXXXXX"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                            required
                                            disabled={loading}
                                            className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all font-light text-center text-xl tracking-[0.5em]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-white/60 pl-2">New Passcode</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="w-5 h-5 text-white/30 group-focus-within:text-[#00F0FF] transition-colors" />
                                            </div>
                                            <input
                                                id="newPassword"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Minimum 8 characters"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                disabled={loading}
                                                className="w-full h-14 pl-12 pr-12 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all font-light"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {newPassword.length > 0 && (
                                            <div className="space-y-2 mt-2 px-2">
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4].map((i) => (
                                                        <div key={i} className={`h-1.5 flex-1 rounded-full border border-white/5 transition-colors ${i <= strength.level ? strength.color : "bg-white/10"}`} />
                                                    ))}
                                                </div>
                                                <p className="text-[10px] uppercase font-bold tracking-widest text-white/50">{strength.label} SECURITY</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-white/60 pl-2">Confirm Passcode</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="w-5 h-5 text-white/30 group-focus-within:text-[#00F0FF] transition-colors" />
                                            </div>
                                            <input
                                                id="confirmPassword"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Verify passcode"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                disabled={loading}
                                                className="w-full h-14 pl-12 pr-12 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all font-light"
                                            />
                                        </div>
                                        {confirmPassword.length > 0 && (
                                            <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-widest mt-2 px-2">
                                                {passwordsMatch ? (
                                                    <><Check className="w-4 h-4 text-[#39FF14]" /><span className="text-[#39FF14]">Match Confirmed</span></>
                                                ) : (
                                                    <><X className="w-4 h-4 text-red-500" /><span className="text-red-500">Mismatched Identity</span></>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || code.length !== 6 || !passwordsMatch}
                                        className={`w-full h-14 bg-[#1D00FF] hover:bg-[#2B10FF] disabled:opacity-50 text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(29,0,255,0.3)] hover:shadow-[0_0_30px_rgba(29,0,255,0.5)] active:scale-[0.98] mt-4 flex items-center justify-center gap-3 ${bricolage.className}`}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin h-5 w-5" /> UPDATING PROTOCOLS...
                                            </>
                                        ) : (
                                            "Confirm New Identity"
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {step === "code" && (
                        <p className="text-center mt-8 text-sm font-light text-white/40 mb-12">
                            Signal disrupted?{" "}
                            <button onClick={handleResendCode} className="font-bold text-[#00F0FF] hover:text-white transition-colors tracking-wide underline decoration-[#00F0FF]/30 underline-offset-4">
                                Request new code
                            </button>
                        </p>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
