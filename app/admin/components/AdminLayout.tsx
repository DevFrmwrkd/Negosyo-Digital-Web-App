"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useClerk } from "@clerk/nextjs"
import { motion, AnimatePresence } from "framer-motion"
import { 
    LayoutDashboard, 
    Users, 
    CreditCard, 
    History, 
    Download, 
    LogOut, 
    Menu, 
    X,
    ChevronRight
} from "lucide-react"

const navItems = [
    {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
    },
    {
        label: "Creators",
        href: "/admin/creators",
        icon: Users,
    },
    {
        label: "Payouts",
        href: "/admin/payouts",
        icon: CreditCard,
    },
    {
        label: "Audit Logs",
        href: "/admin/audit",
        icon: History,
    },
    {
        label: "App Release",
        href: "/admin/app-release",
        icon: Download,
    },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const { signOut } = useClerk()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const handleLogout = async () => {
        await signOut()
        router.push("/login")
    }

    return (
        <div className="min-h-screen bg-[#fcfdfd] flex font-sans selection:bg-green-100 selection:text-green-900">
            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" 
                        onClick={() => setSidebarOpen(false)} 
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={`
                w-64 bg-emerald-950 border-r border-emerald-900 flex flex-col fixed inset-y-0 left-0 z-50
                transition-all duration-300 ease-in-out shadow-[4px_0_24px_-4px_rgba(0,0,0,0.02)]
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
            `}>
                <div className="px-6 py-8 flex items-center justify-between mb-2">
                    <Link href="/admin" className="flex items-center gap-3 group">
                        <div className="relative w-10 h-10 transition-transform duration-500 group-hover:scale-110">
                            <Image
                                src="/logo.png"
                                alt="Negosyo Digital Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-black text-white tracking-tight leading-none group-hover:text-emerald-300 transition-colors">NEGOSYO</span>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mt-0.5">Digital Admin</span>
                        </div>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-full hover:bg-emerald-900 text-emerald-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                                    flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group
                                    ${isActive
                                        ? "bg-emerald-800 text-emerald-50 shadow-sm shadow-emerald-900/50"
                                        : "text-emerald-400 hover:bg-emerald-900 hover:text-emerald-100"}
                                `}
                            >
                                <div className="flex items-center gap-3.5">
                                    <Icon
                                        size={20}
                                        className={`transition-colors ${isActive ? "text-emerald-200" : "text-emerald-500 group-hover:text-emerald-300"}`}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    <span>{item.label}</span>
                                </div>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="px-4 py-6 mt-auto">
                    <div className="p-4 rounded-2xl bg-emerald-900/50 border border-emerald-800/50 mb-4 lg:hidden">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center border border-emerald-700/50">
                                <Users size={14} className="text-emerald-300" />
                            </div>
                            <span className="text-xs font-bold text-emerald-100">Quick Tools</span>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="
                            flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-white
                            hover:bg-red-500/10 hover:text-red-400 w-full transition-all duration-300 group
                        "
                    >
                        <LogOut size={20} className="text-white group-hover:text-red-400 transition-colors" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 min-w-0 min-h-screen flex flex-col relative">
                {/* Header (Universal) */}
                <header className={`
                    sticky top-0 z-30 transition-all duration-300 
                    ${scrolled ? "bg-white/80 backdrop-blur-md border-b border-gray-100 py-3" : "bg-transparent py-5"}
                    px-4 sm:px-6 lg:px-8 flex items-center justify-between
                `}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                            <Menu size={24} />
                        </button>
                        <div className="hidden lg:flex flex-col">
                            <h2 className="text-sm font-bold text-gray-900">Overview</h2>
                            <p className="text-[10px] text-gray-400 font-medium tracking-wide flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                LIVE SYSTEM MONITOR
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-100 shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-[10px] font-bold text-white uppercase italic">
                                AD
                            </div>
                            <span className="text-xs font-bold text-gray-700">Administrator</span>
                            <ChevronRight size={12} className="text-gray-300" />
                        </div>
                    </div>
                </header>

                <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6 flex-1">
                    {children}
                </div>
                
                <footer className="px-8 py-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-center">
                    &copy; 2026 NEGOSYO DIGITAL &bull; PREMIUM ADMIN PANEL
                </footer>
            </main>
        </div>
    )
}
