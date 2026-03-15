"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import Accordion from "@/components/Accordion"

const SECTIONS = [
    { title: "1. Acceptance of Terms", content: "By accessing or using the Negosyo Digital platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our services." },
    { title: "2. Account Registration", content: "You must be at least 18 years old to create an account. You agree to provide accurate and complete information during registration and to keep your account credentials secure. You are responsible for all activity that occurs under your account." },
    { title: "3. Creator Certification", content: "Before submitting business content, you must complete the creator training program and pass the certification quiz with a score of at least 4 out of 5. Certification ensures quality standards for all submissions." },
    { title: "4. Submissions", content: "All submissions must contain authentic, original content collected with the business owner's knowledge and consent. We reserve the right to reject any submission that does not meet our quality guidelines, contains inaccurate information, or violates these terms. Rejected submissions may be resubmitted after corrections." },
    { title: "5. Payment Terms", content: "Creators earn PHP 500 for video submissions and PHP 300 for audio-only submissions, paid after the business owner completes payment. Referral bonuses of PHP 1,000 are awarded when a referred creator's first submission is approved and paid. Minimum withdrawal amount is PHP 100. All payments are processed via bank transfer through our payment partner." },
    { title: "6. Referral Program", content: "Each creator receives a unique referral code. When a new creator signs up using your code and their first submission is approved and paid, you earn a PHP 1,000 referral bonus. Only one bonus is awarded per referred creator, regardless of subsequent submissions." },
    { title: "7. Prohibited Conduct", content: "You may not: submit fake or fabricated business information, submit duplicate entries for the same business, use misleading or deceptive content, create multiple accounts, share or sell your account credentials, use the platform for any illegal purpose, or attempt to manipulate the referral system." },
    { title: "8. Intellectual Property", content: "By submitting content (photos, recordings, business information), you grant Negosyo Digital a non-exclusive, worldwide license to use, display, and distribute this content for the purpose of generating and hosting business websites. You retain ownership of your original content." },
    { title: "9. Account Termination", content: "We may suspend or terminate your account if you violate these terms, submit fraudulent content, engage in prohibited conduct, or are inactive for an extended period. Upon termination, any pending payouts may be forfeited if the termination was due to a violation." },
    { title: "10. Limitation of Liability", content: "Negosyo Digital is not liable for the business outcomes of generated websites, the accuracy of AI-generated content, delays in payment processing, or any indirect, incidental, or consequential damages arising from your use of the platform." },
    { title: "11. Governing Law", content: "These Terms of Service are governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes shall be resolved in the courts of the Philippines." },
    { title: "12. Contact", content: "For questions about these Terms of Service, contact us at frmwrkd.media@gmail.com." },
]

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-white font-sans pb-12">
            <header className="px-4 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/dashboard" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900">Terms of Service</h1>
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
