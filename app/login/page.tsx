"use client"

import { SignIn } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Logo from "@/public/logo.png"
import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen w-full flex bg-white font-sans">
            {/* Left Side - Aesthetic Panel (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-black/60 z-10" />

                {/* Abstract shapes/blur for depth */}
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
                        <p>© 2026 Negosyo Digital</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Clerk SignIn */}
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
                        <p className="text-zinc-500">
                            Enter your credentials to access your account.
                        </p>
                    </div>

                    {/* Clerk SignIn Component */}
                    <div className="flex justify-center">
                        <SignIn
                            appearance={{
                                elements: {
                                    rootBox: "w-full max-w-md",
                                    headerTitle: "hidden",
                                    headerSubtitle: "hidden",
                                },
                            }}
                            routing="hash"
                            forceRedirectUrl="/dashboard"
                            signUpUrl="/signup"
                        />
                    </div>

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
