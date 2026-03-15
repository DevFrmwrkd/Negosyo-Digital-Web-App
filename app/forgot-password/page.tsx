"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import Logo from "@/public/logo.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff, Check, X } from "lucide-react"

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
    if (pw.length < 8) return { level: 1, label: "Weak", color: "bg-red-500" }
    const hasUpper = /[A-Z]/.test(pw)
    const hasLower = /[a-z]/.test(pw)
    const hasNumber = /\d/.test(pw)
    const hasSpecial = /[^A-Za-z0-9]/.test(pw)
    const mixedCase = hasUpper && hasLower
    if (mixedCase && hasNumber && hasSpecial) return { level: 4, label: "Strong", color: "bg-emerald-500" }
    if ((mixedCase && hasNumber) || (mixedCase && hasSpecial)) return { level: 3, label: "Good", color: "bg-yellow-500" }
    return { level: 2, label: "Fair", color: "bg-orange-500" }
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

    // Step 1: Send reset code to email
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

    // Step 2: Verify code + set new password
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

    // Resend code
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
            <div className="min-h-screen bg-white font-sans flex flex-col items-center justify-center px-6 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                    <Check className="w-10 h-10 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Password Reset!</h1>
                <p className="text-sm text-zinc-500">Your password has been successfully reset. Redirecting to dashboard...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex bg-white font-sans">
            {/* Left Side - Aesthetic Panel */}
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
                            Reset Your <br />
                            <span className="text-emerald-400">Password.</span>
                        </h2>
                        <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
                            No worries — we&apos;ll send you a verification code to get you back in.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <p>&copy; 2026 Negosyo Digital</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 w-full flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 relative">
                <button
                    onClick={() => step === "code" ? setStep("email") : router.push("/login")}
                    className="absolute top-8 left-6 lg:left-12 p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-full hover:bg-zinc-100"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-full max-w-md mx-auto space-y-8 mt-12 lg:mt-0">
                    {/* Mobile Logo */}
                    <div className="flex flex-col items-center gap-4 lg:hidden mb-8">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-900/20">
                            <Image src={Logo} alt="Logo" width={28} height={28} />
                        </div>
                        <span className="font-semibold text-xl tracking-tight text-zinc-900">Negosyo Digital</span>
                    </div>

                    {step === "email" ? (
                        <>
                            <div className="space-y-2 text-center lg:text-left">
                                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Forgot Password?</h1>
                                <p className="text-zinc-500">Enter your email and we&apos;ll send you a reset code.</p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{error}</div>
                            )}

                            <form onSubmit={handleSendCode} className="space-y-5">
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

                                <Button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 hover:shadow-zinc-900/30"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="animate-spin h-5 w-5" />
                                            Sending code...
                                        </span>
                                    ) : (
                                        "Send Reset Code"
                                    )}
                                </Button>
                            </form>

                            <p className="text-center text-sm text-zinc-500">
                                Remember your password?{" "}
                                <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                    Back to Login
                                </Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2 text-center lg:text-left">
                                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Reset Password</h1>
                                <p className="text-zinc-500">
                                    Enter the 6-digit code sent to <span className="font-medium text-zinc-700">{email}</span> and your new password.
                                </p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{error}</div>
                            )}

                            <form onSubmit={handleResetPassword} className="space-y-5">
                                {/* Verification Code */}
                                <div className="space-y-2">
                                    <Label htmlFor="code" className="text-zinc-700 font-medium">Verification Code</Label>
                                    <Input
                                        id="code"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="123456"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                        required
                                        disabled={loading}
                                        className="h-12 bg-zinc-50 border-zinc-200 focus:border-emerald-600 focus:ring-emerald-600/20 rounded-xl text-center text-lg tracking-[0.5em] font-mono"
                                    />
                                </div>

                                {/* New Password */}
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword" className="text-zinc-700 font-medium">New Password</Label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-zinc-400" />
                                        </div>
                                        <Input
                                            id="newPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Minimum 8 characters"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="pl-11 pr-12 h-12 bg-zinc-50 border-zinc-200 focus:border-emerald-600 focus:ring-emerald-600/20 rounded-xl"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {newPassword.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.level ? strength.color : "bg-zinc-200"}`} />
                                                ))}
                                            </div>
                                            <p className="text-xs text-zinc-500">{strength.label}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-zinc-700 font-medium">Confirm Password</Label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-zinc-400" />
                                        </div>
                                        <Input
                                            id="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Re-enter password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="pl-11 h-12 bg-zinc-50 border-zinc-200 focus:border-emerald-600 focus:ring-emerald-600/20 rounded-xl"
                                        />
                                    </div>
                                    {confirmPassword.length > 0 && (
                                        <div className="flex items-center gap-1 text-xs">
                                            {passwordsMatch ? (
                                                <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600">Passwords match</span></>
                                            ) : (
                                                <><X className="w-3.5 h-3.5 text-red-500" /><span className="text-red-600">Passwords do not match</span></>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading || code.length !== 6 || !passwordsMatch}
                                    className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 disabled:opacity-40"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="animate-spin h-5 w-5" />
                                            Resetting...
                                        </span>
                                    ) : (
                                        "Reset Password"
                                    )}
                                </Button>
                            </form>

                            <p className="text-center text-sm text-zinc-500">
                                Didn&apos;t receive the code?{" "}
                                <button onClick={handleResendCode} className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                    Resend
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
