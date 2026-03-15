"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

// Legacy redirect — password reset is now handled in /forgot-password
export default function ResetPasswordPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace("/forgot-password")
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
    )
}
