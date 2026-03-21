"use client"

import { useState, useEffect } from "react"
import { useSignIn, useSignUp, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react"
import { Bricolage_Grotesque, Outfit } from 'next/font/google';
import Logo from "@/public/logo.png"

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });
const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600'] });

export default function LoginPage() {
    const router = useRouter()
    const { isSignedIn } = useAuth()
    const { signIn, setActive, isLoaded } = useSignIn()
    const { signUp } = useSignUp()

    useEffect(() => {
        if (isSignedIn) {
            router.replace("/dashboard")
        }
    }, [isSignedIn, router])

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded || !signIn) return
        setError(null)
        setLoading(true)

        try {
            const result = await signIn.create({
                identifier: email,
                password,
            })

            if (result.status === "complete" && result.createdSessionId) {
                await setActive({ session: result.createdSessionId })
                router.push("/dashboard")
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.longMessage || err.message || "Invalid email or password")
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleOAuth = async () => {
        if (!isLoaded || !signIn || !signUp) return
        setOauthLoading(true)
        setError(null)

        try {
            const result = await signIn.create({
                strategy: "oauth_google",
                redirectUrl: window.location.origin + "/auth/sso-callback",
                actionCompleteRedirectUrl: "/dashboard",
            })

            const url = result.firstFactorVerification.externalVerificationRedirectURL
            if (url) {
                window.location.href = url.toString()
                return
            }
        } catch (err: any) {
            try {
                const result = await signUp.create({
                    strategy: "oauth_google",
                    redirectUrl: window.location.origin + "/auth/sso-callback",
                    actionCompleteRedirectUrl: "/dashboard",
                })

                const url = result.verifications?.externalAccount?.externalVerificationRedirectURL
                if (url) {
                    window.location.href = url.toString()
                    return
                }
            } catch (signUpErr: any) {
                setError(signUpErr.errors?.[0]?.longMessage || err.errors?.[0]?.longMessage || "Google sign-in failed")
            }
        }
        setOauthLoading(false)
    }

    return (
        <div className={`min-h-screen w-full flex bg-black text-white selection:bg-[#00FF66] selection:text-black overflow-hidden relative ${outfit.className}`}>
            {/* BACKGROUND EFFECTS */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#1D00FF] rounded-full mix-blend-screen filter blur-[200px] opacity-40 animate-pulse pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[40%] h-[60%] bg-[#00FF66] rounded-full mix-blend-screen filter blur-[250px] opacity-10 pointer-events-none" />

            <div className="relative z-10 w-full flex flex-col items-center justify-center p-6">
                
                {/* BACK TO HOME */}
                <Link href="/" className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3 text-white/50 hover:text-white transition-colors">
                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-md">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                    </div>
                    <span className="font-bold tracking-widest uppercase text-xs">Return</span>
                </Link>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md"
                >
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(29,0,255,0.4)] mb-6 border border-white/10 bg-black/50 p-1 flex items-center justify-center backdrop-blur-md relative">
                            <Image src={Logo} alt="Logo" width={64} height={64} className="rounded-2xl" />
                        </div>
                        <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tighter text-center mb-3 ${bricolage.className}`}>
                            Welcome Back <span className="text-[#00FF66]">Creator!</span>
                        </h1>
                        <p className="text-white/50 text-center font-light text-sm md:text-base max-w-xs">
                           Let's Continue your Journey on Digitalizing Local Business.
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-[#1D00FF] to-transparent opacity-50" />
                        
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-white/60 pl-2">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="w-5 h-5 text-white/30 group-focus-within:text-[#00FF66] transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="agent@negosyo.digital"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                        className="w-full h-14 pl-12 pr-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF66]/50 focus:ring-1 focus:ring-[#00FF66]/50 transition-all font-light"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between pl-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/60">Password</label>
                                    <Link href="/forgot-password" className="text-xs font-bold text-[#00FF66] hover:text-white transition-colors">
                                        FORGOT PASSWORD?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-white/30 group-focus-within:text-[#00FF66] transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                        className="w-full h-14 pl-12 pr-12 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF66]/50 focus:ring-1 focus:ring-[#00FF66]/50 transition-all font-light"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full h-14 bg-[#1D00FF] hover:bg-[#2B10FF] text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(29,0,255,0.3)] hover:shadow-[0_0_30px_rgba(29,0,255,0.5)] active:scale-[0.98] mt-4 flex items-center justify-center gap-3 ${bricolage.className}`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin h-5 w-5" /> INITIALIZING
                                    </>
                                ) : (
                                    <>
                                        LOGIN <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 mb-4 relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative bg-black border border-white/10 rounded-full px-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
                                OR
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleOAuth}
                            disabled={oauthLoading || loading}
                            className={`w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-2xl font-bold tracking-widest text-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${bricolage.className}`}
                        >
                            {oauthLoading ? (
                                <Loader2 className="animate-spin h-5 w-5 text-white/50" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                        <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </button>

                    </div>

                    <p className="text-center mt-8 text-sm font-light text-white/40">
                        New agent?{" "}
                        <Link href="/signup" className="font-bold text-[#00FF66] hover:text-white transition-colors tracking-wide underline decoration-[#00FF66]/30 underline-offset-4">
                            Create your creator profile
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
