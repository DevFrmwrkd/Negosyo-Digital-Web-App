"use client"

import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"
import Accordion from "@/components/Accordion"

const SECTIONS = [
    { title: "1. Information We Collect", content: "We collect personal information you provide during account registration (name, email, phone number), business data you collect on behalf of local businesses (business name, owner details, photos, interview recordings), and device information (device type, operating system, IP address) for service improvement and security." },
    { title: "2. How We Use Your Information", content: "Your information is used to deliver our core services (website generation, payout processing), communicate with you about submissions and payouts, improve our platform and user experience, and comply with legal obligations." },
    { title: "3. Data Storage & Security", content: "Your data is stored securely using industry-standard encryption. We use Convex for our real-time database, Cloudflare R2 for file storage (photos, recordings), and implement access controls to protect your information." },
    { title: "4. Third-Party Services", content: "We use the following third-party services: Clerk (authentication and identity management), Convex (database and serverless functions), Cloudflare R2 (file storage), Groq (audio/video transcription via Whisper API), Expo (push notifications), and Google (OAuth sign-in). Each service has its own privacy policy." },
    { title: "5. Business Owner Data", content: "Data collected about business owners (name, phone, email, business details, photos) is collected on their behalf for the purpose of generating professional websites. This data is used solely for website creation and lead management." },
    { title: "6. Push Notifications", content: "Push notifications are optional and can be disabled in your device settings at any time. We use notifications to inform you about submission status updates, new leads, and payout completions." },
    { title: "7. Camera & Microphone", content: "Camera and microphone access is used only during active photo capture and interview recording within the app. We do not access your camera or microphone in the background or outside of these specific features." },
    { title: "8. Data Sharing", content: "We do not sell your personal data to third parties. Your information is shared only with the service providers listed above, solely for the purpose of delivering our services. Business owner data may be displayed on generated websites as intended." },
    { title: "9. Data Retention", content: "Your account data is retained while your account is active. You may request deletion of your account and associated data at any time by contacting us. Upon deletion request, we will remove your personal data within 30 days, except where retention is required by law." },
    { title: "10. Philippine Data Privacy Act", content: "We comply with Republic Act No. 10173 (Data Privacy Act of 2012) and its implementing rules and regulations. You have the right to access, correct, and request deletion of your personal data. For data privacy concerns, contact our Data Protection Officer at frmwrkd.media@gmail.com." },
    { title: "11. Children's Privacy", content: "Our services are not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected data from a minor, please contact us immediately." },
    { title: "12. Contact Us", content: "For privacy-related questions or concerns, contact us at frmwrkd.media@gmail.com. We will respond to your inquiry within 15 business days." },
]

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-white font-sans pb-12">
            <header className="px-4 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/dashboard" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900">Privacy Policy</h1>
                        <p className="text-xs text-zinc-500">Last updated: February 2026</p>
                    </div>
                </div>
            </header>

            <main className="px-4">
                <Accordion items={SECTIONS} defaultOpenIndex={0} />
            </main>
        </div>
    )
}
