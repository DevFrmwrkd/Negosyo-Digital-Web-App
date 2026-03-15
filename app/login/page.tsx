"use client"

import { useState } from "react"
import { useSignIn, useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import Logo from "@/public/logo.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react"
import { OAuthStrategy } from "@clerk/types"

export default function LoginPage() {
    const router = useRouter()
    const { signIn, setActive, isLoaded } = useSignIn()
    const { signUp } = useSignUp()

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
            // Try sign-in first for existing users
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
            // For new Google users, Clerk may need sign-up flow
            // Also handle the "transfer" case via signUp
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
        <div className="min-h-screen w-full flex bg-white font-sans">
            {/* Left Side - Aesthetic Panel (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-black/60 z-10" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl opacity-50 animate-pulse" />
                <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl opacity-30" />

                <div className="relative z-20 flex flex-col justify-between w-full p-12 text-white">
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                                <Image src={Logo} alt="Logo" width={24} height={24} className="opacity-90" />
                            </div>
                            <span className="font-semibold text-lg tracking-wide">Negosyo Digital</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-4xl md:text-5xl font-bold font-sans leading-tight">
                            Empowering <br />
                            <span className="text-emerald-400">Digital Creators.</span>
                        </h2>
                        <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
                            Manage your digital store, track earnings, and grow your audience with our comprehensive suite of tools designed for the modern creator.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <p>&copy; 2026 Negosyo Digital</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 w-full flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 relative">
                <div className="w-full max-w-md mx-auto space-y-8">
                    {/* Mobile Logo Display */}
                    <div className="flex flex-col items-center gap-4 lg:hidden mb-8">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-900/20">
                            <Image src={Logo} alt="Logo" width={28} height={28} className="opacity-100" />
                        </div>
                        <span className="font-semibold text-xl tracking-tight text-zinc-900">Negosyo Digital</span>
                    </div>

                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Welcome back</h1>
                        <p className="text-zinc-500">Enter your credentials to access your account.</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-700 font-medium">Email Address</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="w-5 h-5 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="hello@creator.ph"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="pl-11 h-12 bg-zinc-50 border-zinc-200 focus:border-emerald-600 focus:ring-emerald-600/20 rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-zinc-700 font-medium">Password</Label>

                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" />
                                </div>
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="pl-11 pr-12 h-12 bg-zinc-50 border-zinc-200 focus:border-emerald-600 focus:ring-emerald-600/20 rounded-xl"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="w-full justify-center lg:justify-center flex">
                                <Link href="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                    Forgot Password?
                                </Link>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 hover:shadow-zinc-900/30 active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin h-5 w-5" />
                                    Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-4 text-zinc-400 font-medium">or</span>
                        </div>
                    </div>

                    {/* Google OAuth */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleGoogleOAuth}
                        disabled={oauthLoading || loading}
                        className="w-full h-12 border-zinc-200 hover:bg-zinc-50 rounded-xl font-semibold text-zinc-700 transition-all"
                    >
                        {oauthLoading ? (
                            <Loader2 className="animate-spin h-5 w-5" />
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </Button>

                    <p className="text-center text-sm text-zinc-500">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
