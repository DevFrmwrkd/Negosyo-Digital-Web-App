"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Logo from "@/public/logo.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Phone, Loader2 } from "lucide-react"

function generateReferralCode(firstName: string, lastName: string): string {
    const namePrefix = (firstName.substring(0, 2) + lastName.substring(0, 1)).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `${namePrefix}${random}`
}

export default function OnboardingPage() {
    const router = useRouter()
    const { user, isLoaded, isSignedIn } = useUser()
    const createCreator = useMutation(api.creators.create)
    const existingCreator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )

    const [firstName, setFirstName] = useState("")
    const [middleName, setMiddleName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phone, setPhone] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [initialized, setInitialized] = useState(false)

    // Redirect if not signed in
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/login")
        }
    }, [isLoaded, isSignedIn, router])

    // Redirect if user already has a profile
    useEffect(() => {
        if (isLoaded && isSignedIn && existingCreator) {
            router.push("/dashboard")
        }
    }, [isLoaded, isSignedIn, existingCreator, router])

    // Pre-fill from Clerk if available (only once)
    useEffect(() => {
        if (isLoaded && user && !initialized) {
            if (user.firstName) setFirstName(user.firstName)
            if (user.lastName) setLastName(user.lastName)
            setInitialized(true)
        }
    }, [isLoaded, user, initialized])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!user) {
            setError("You must be signed in")
            return
        }

        if (!firstName.trim() || !lastName.trim()) {
            setError("First and last name are required")
            return
        }

        // Basic phone validation (Philippine format)
        const phoneRegex = /^(\+63|0)?9\d{9}$/
        if (phone && !phoneRegex.test(phone.replace(/\s/g, ''))) {
            setError("Please enter a valid Philippine phone number (e.g., 09123456789)")
            return
        }

        setLoading(true)

        try {
            const referralCode = generateReferralCode(firstName, lastName)

            await createCreator({
                clerkId: user.id,
                firstName: firstName.trim(),
                middleName: middleName.trim() || undefined,
                lastName: lastName.trim(),
                email: user.primaryEmailAddress?.emailAddress,
                phone: phone.trim() || undefined,
                referralCode,
            })

            router.push("/dashboard")
        } catch (err: any) {
            console.error("Failed to create profile:", err)
            setError(err.message || "Failed to create profile")
        } finally {
            setLoading(false)
        }
    }

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
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
                            Almost There! <br />
                            <span className="text-emerald-400">Complete Your Profile.</span>
                        </h2>
                        <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
                            Just a few more details and you&apos;ll be ready to start creating and earning.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <p>© 2026 Negosyo Digital</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 w-full flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32">
                <div className="w-full max-w-md mx-auto space-y-8">
                    {/* Mobile Logo */}
                    <div className="flex flex-col items-center gap-4 lg:hidden mb-8">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-900/20">
                            <Image src={Logo} alt="Logo" width={28} height={28} />
                        </div>
                        <span className="font-semibold text-xl tracking-tight text-zinc-900">Negosyo Digital</span>
                    </div>

                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Complete Your Profile</h1>
                        <p className="text-zinc-500">
                            Help us personalize your experience.
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-zinc-700 font-medium">First Name</Label>
                                <Input
                                    id="firstName"
                                    type="text"
                                    placeholder="Juan"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="h-12 bg-zinc-50 border-zinc-200 focus:border-emerald-600 focus:ring-emerald-600/20 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="middleName" className="text-zinc-700 font-medium">Middle Name</Label>
                                    <span className="text-xs text-zinc-400">Optional</span>
                                </div>
                                <Input
                                    id="middleName"
                                    type="text"
                                    placeholder="Santos"
                                    value={middleName}
                                    onChange={(e) => setMiddleName(e.target.value)}
                                    disabled={loading}
                                    className="h-12 bg-zinc-50 border-zinc-200 focus:border-emerald-600 focus:ring-emerald-600/20 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-zinc-700 font-medium">Last Name</Label>
                            <Input
                                id="lastName"
                                type="text"
                                placeholder="Dela Cruz"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                disabled={loading}
                                className="h-12 bg-zinc-50 border-zinc-200 focus:border-emerald-600 focus:ring-emerald-600/20 rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="phone" className="text-zinc-700 font-medium">Mobile Number</Label>
                                <span className="text-xs text-zinc-400">Optional</span>
                            </div>
                            <div className="relative flex gap-3">
                                <div className="flex items-center gap-2 px-3 h-12 bg-zinc-50 border border-zinc-200 rounded-xl shrink-0">
                                    <span className="text-sm font-medium text-zinc-700">+63</span>
                                </div>
                                <div className="relative flex-1 group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Phone className="w-5 h-5 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" />
                                    </div>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="912 345 4567"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={loading}
                                        className="pl-11 h-12 bg-zinc-50 border-zinc-200 focus:border-emerald-600 focus:ring-emerald-600/20 rounded-xl w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-zinc-900/20 hover:shadow-zinc-900/30 active:scale-[0.98] mt-4"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin h-5 w-5" />
                                    Creating profile...
                                </span>
                            ) : (
                                "Complete Setup"
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
