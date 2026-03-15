"use client"

import Link from "next/link"
import { ArrowLeft, HelpCircle } from "lucide-react"
import Accordion from "@/components/Accordion"

const FAQ_SECTIONS = [
    {
        title: "Getting Started",
        items: [
            {
                title: "What is Negosyo Digital?",
                content: "Negosyo Digital is a platform that helps Filipino creators digitize local businesses. As a creator, you visit small businesses, collect their information through photos and interviews, and submit it through the app. We then generate a professional website for the business."
            },
            {
                title: "How do I get certified?",
                content: "Complete the training lessons and pass the certification quiz with at least 4 out of 5 correct answers. Training covers lighting, audio, portrait photography, interview techniques, and submission requirements."
            },
        ]
    },
    {
        title: "Submissions",
        items: [
            {
                title: "How do I submit a business?",
                content: "Follow the 4-step process: 1) Enter business information, 2) Upload at least 3 photos (portrait, location, product), 3) Record a video or audio interview, 4) Review and submit."
            },
            {
                title: "What happens after I submit?",
                content: "Your submission enters review (24-48 hours). If approved, we generate a website for the business. Once the business owner pays, you receive your payout."
            },
            {
                title: "What are the photo requirements?",
                content: "You need at least 3 photos: a portrait of the business owner, the business location/exterior, and a product or craft shot. Make sure photos are well-lit and clear."
            },
            {
                title: "Can I edit a draft submission?",
                content: "Yes, you can continue editing any draft submission from the Submissions page. Drafts are saved automatically."
            },
        ]
    },
    {
        title: "Earnings & Payments",
        items: [
            {
                title: "How much do I earn per submission?",
                content: "You earn PHP 500 for video submissions and PHP 300 for audio-only submissions once the business owner pays."
            },
            {
                title: "How do referral bonuses work?",
                content: "Share your referral code with other creators. When a referred creator's first submission is approved and paid, you earn a PHP 1,000 bonus."
            },
            {
                title: "When do I get paid?",
                content: "Payouts are processed via bank transfer. You can withdraw once your available balance reaches PHP 100. Processing typically takes 1-3 business days."
            },
        ]
    },
    {
        title: "Account & Support",
        items: [
            {
                title: "How do I reset my password?",
                content: "Go to Profile → Change Password, or use the 'Forgot Password' link on the login screen."
            },
            {
                title: "How do I update my profile?",
                content: "Go to Profile → Edit Profile to update your name, phone number, or profile photo."
            },
            {
                title: "I'm having technical issues",
                content: "Try refreshing the page and clearing your browser cache. If the issue persists, contact us at frmwrkd.media@gmail.com."
            },
        ]
    },
]

export default function HelpFaqPage() {
    return (
        <div className="min-h-screen bg-white font-sans pb-12">
            <header className="px-4 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/dashboard" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-zinc-900">Help & FAQ</h1>
                </div>
            </header>

            <main className="px-4 space-y-6">
                {FAQ_SECTIONS.map((section, i) => (
                    <div key={i}>
                        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">{section.title}</h2>
                        <Accordion items={section.items} defaultOpenIndex={i === 0 ? 0 : -1} />
                    </div>
                ))}
            </main>
        </div>
    )
}
