"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    ArrowLeft,
    Wallet,
    Loader2,
    X,
    TrendingUp,
    TrendingDown,
    ArrowDownRight,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    ChevronDown,
} from "lucide-react"

const BANKS = [
    { name: "BDO Unibank", code: "BDO", digits: 10 },
    { name: "BPI", code: "BPI", digits: 10 },
    { name: "Metrobank", code: "MBTC", digits: 13 },
    { name: "UnionBank", code: "UBP", digits: 12 },
    { name: "Landbank", code: "LBP", digits: 10 },
    { name: "PNB", code: "PNB", digits: 12 },
    { name: "RCBC", code: "RCBC", digits: 10 },
    { name: "Security Bank", code: "SECB", digits: 13 },
    { name: "China Bank", code: "CB", digits: 12 },
    { name: "EastWest Bank", code: "EW", digits: 12 },
    { name: "AUB", code: "AUB", digits: 12 },
    { name: "UCPB", code: "UCPB", digits: 12 },
    { name: "PSBank", code: "PSB", digits: 12 },
    { name: "Robinsons Bank", code: "RBB", digits: 12 },
    { name: "GCash (via GXI)", code: "GXI", digits: 11 },
]

export default function WalletPage() {
    const router = useRouter()
    const { user, isLoaded, isSignedIn } = useUser()
    const [showWithdrawModal, setShowWithdrawModal] = useState(false)
    const [amount, setAmount] = useState("")
    const [accountHolderName, setAccountHolderName] = useState("")
    const [selectedBankIndex, setSelectedBankIndex] = useState<number | null>(null)
    const [accountNumber, setAccountNumber] = useState("")
    const [city, setCity] = useState("")
    const [error, setError] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const creator = useQuery(
        api.creators.getByClerkId,
        user ? { clerkId: user.id } : "skip"
    )

    const earnings = useQuery(
        api.earnings.getByCreator,
        creator?._id ? { creatorId: creator._id } : "skip"
    )

    const earningsSummary = useQuery(
        api.earnings.getSummary,
        creator?._id ? { creatorId: creator._id } : "skip"
    )

    const withdrawals = useQuery(
        api.withdrawals.getByCreator,
        creator?._id ? { creatorId: creator._id } : "skip"
    )

    const createWithdrawal = useMutation(api.withdrawals.create)

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/login")
        }
    }, [isLoaded, isSignedIn, router])

    useEffect(() => {
        if (isLoaded && isSignedIn && creator === null) {
            router.push("/onboarding")
        }
    }, [isLoaded, isSignedIn, creator, router])

    if (!isLoaded || !isSignedIn || creator === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    if (!creator) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    const balance = creator.balance || 0
    const totalEarned = earningsSummary?.total || creator.totalEarnings || 0
    const totalWithdrawn = earningsSummary?.withdrawn || creator.totalWithdrawn || 0

    const selectedBank = selectedBankIndex !== null ? BANKS[selectedBankIndex] : null

    const handleWithdraw = async () => {
        setError("")

        const withdrawAmount = parseFloat(amount)
        if (isNaN(withdrawAmount) || withdrawAmount < 100) {
            setError("Minimum withdrawal amount is PHP 100.")
            return
        }
        if (withdrawAmount > balance) {
            setError("Insufficient balance.")
            return
        }
        if (!accountHolderName.trim()) {
            setError("Please enter the account holder name.")
            return
        }
        if (!selectedBank) {
            setError("Please select a bank.")
            return
        }
        if (!accountNumber.trim()) {
            setError("Please enter your account number.")
            return
        }
        if (accountNumber.replace(/\s/g, "").length !== selectedBank.digits) {
            setError(`${selectedBank.name} requires exactly ${selectedBank.digits} digits.`)
            return
        }
        if (!city.trim()) {
            setError("Please enter your city.")
            return
        }

        try {
            setIsSubmitting(true)
            await createWithdrawal({
                creatorId: creator._id,
                amount: withdrawAmount,
                payoutMethod: "bank_transfer",
                accountDetails: JSON.stringify({
                    accountHolderName: accountHolderName.trim(),
                    bankName: selectedBank.name,
                    bankCode: selectedBank.code,
                    accountNumber: accountNumber.replace(/\s/g, ""),
                    city: city.trim(),
                }),
            })
            setShowWithdrawModal(false)
            setAmount("")
            setAccountHolderName("")
            setSelectedBankIndex(null)
            setAccountNumber("")
            setCity("")
        } catch (err: any) {
            setError(err.message || "Withdrawal failed. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const getWithdrawalStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md uppercase">
                        <CheckCircle className="w-3 h-3" /> Completed
                    </span>
                )
            case "processing":
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md uppercase">
                        <RefreshCw className="w-3 h-3" /> Processing
                    </span>
                )
            case "failed":
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-md uppercase">
                        <XCircle className="w-3 h-3" /> Failed
                    </span>
                )
            default:
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-md uppercase">
                        <Clock className="w-3 h-3" /> Pending
                    </span>
                )
        }
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
    }

    const formatCurrency = (value: number) => {
        return value.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    }

    return (
        <div className="min-h-screen bg-white font-sans pb-24 overflow-x-hidden">
            <main className="px-4 py-6">
                {/* Back Button */}
                <div className="flex items-center justify-between mb-2">
                    <Link
                        href="/dashboard"
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
                        My <span className="text-emerald-500">Wallet</span>
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Manage your earnings and withdrawals.</p>
                </div>

                {/* Balance Card */}
                <div className="bg-zinc-900 text-white rounded-3xl p-5 relative overflow-hidden shadow-xl shadow-zinc-900/20 mb-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className="text-zinc-400 text-xs font-medium">Available Balance</span>
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-400">
                            <Wallet className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    <div className="mb-5 relative z-10">
                        <span className="text-3xl font-bold tracking-tight">
                            PHP {formatCurrency(balance)}
                        </span>
                    </div>

                    <div className="flex gap-4 relative z-10">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            <div>
                                <p className="text-[10px] text-zinc-500">Total Earned</p>
                                <p className="text-xs font-semibold">PHP {formatCurrency(totalEarned)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5 text-orange-400" />
                            <div>
                                <p className="text-[10px] text-zinc-500">Withdrawn</p>
                                <p className="text-xs font-semibold">PHP {formatCurrency(totalWithdrawn)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Withdraw Button */}
                <Button
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={balance < 100}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-12 mb-6 shadow-lg shadow-emerald-500/20"
                >
                    <ArrowDownRight className="w-5 h-5 mr-2" />
                    Withdraw Funds
                </Button>

                {/* Recent Earnings */}
                <div className="mb-6">
                    <h2 className="text-base font-bold text-zinc-900 mb-3">Recent Earnings</h2>
                    <div className="space-y-3">
                        {earnings && earnings.length > 0 ? (
                            earnings.slice(0, 10).map((earning: any) => (
                                <div
                                    key={earning._id}
                                    className="bg-white rounded-xl p-3 border border-zinc-100 shadow-sm flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-zinc-900">{earning.businessName}</h3>
                                            <p className="text-[10px] text-zinc-500">
                                                {earning.type === "submission_approved"
                                                    ? "Submission"
                                                    : earning.type === "referral_bonus"
                                                      ? "Referral Bonus"
                                                      : "Lead Bonus"}{" "}
                                                · {formatDate(earning.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600">
                                        +PHP {formatCurrency(earning.amount)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                                <p className="text-zinc-500 text-xs">No earnings yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Withdrawal History */}
                <div>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">Withdrawal History</h2>
                    <div className="space-y-3">
                        {withdrawals && withdrawals.length > 0 ? (
                            withdrawals.map((withdrawal: any) => {
                                let bankLabel = "Bank Transfer"
                                try {
                                    const details = JSON.parse(withdrawal.accountDetails)
                                    bankLabel = details.bankName || bankLabel
                                } catch {
                                    // ignore parse errors
                                }

                                return (
                                    <div
                                        key={withdrawal._id}
                                        className="bg-white rounded-xl p-3 border border-zinc-100 shadow-sm flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                                                <ArrowDownRight className="w-5 h-5 text-zinc-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-zinc-900">
                                                    PHP {formatCurrency(withdrawal.amount)}
                                                </h3>
                                                <p className="text-[10px] text-zinc-500">
                                                    {bankLabel} · {formatDate(withdrawal.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        {getWithdrawalStatusBadge(withdrawal.status)}
                                    </div>
                                )
                            })
                        ) : (
                            <div className="text-center py-6 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                                <p className="text-zinc-500 text-xs">No withdrawals yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-zinc-900">Withdraw Funds</h2>
                            <button
                                onClick={() => {
                                    setShowWithdrawModal(false)
                                    setError("")
                                }}
                                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="bg-zinc-50 rounded-xl p-3 mb-5 text-center">
                            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Available Balance</p>
                            <p className="text-xl font-bold text-zinc-900">PHP {formatCurrency(balance)}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="amount" className="text-sm font-semibold text-zinc-700">
                                    Amount (PHP)
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min={100}
                                    max={balance}
                                    placeholder="Min. 100"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="mt-1 rounded-xl border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <Label htmlFor="accountHolderName" className="text-sm font-semibold text-zinc-700">
                                    Account Holder Name
                                </Label>
                                <Input
                                    id="accountHolderName"
                                    type="text"
                                    placeholder="Full name on the account"
                                    value={accountHolderName}
                                    onChange={(e) => setAccountHolderName(e.target.value)}
                                    className="mt-1 rounded-xl border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <Label htmlFor="bank" className="text-sm font-semibold text-zinc-700">
                                    Bank
                                </Label>
                                <div className="relative mt-1">
                                    <select
                                        id="bank"
                                        value={selectedBankIndex !== null ? selectedBankIndex : ""}
                                        onChange={(e) =>
                                            setSelectedBankIndex(e.target.value !== "" ? parseInt(e.target.value) : null)
                                        }
                                        className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 pr-10 text-sm text-zinc-900 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">Select a bank</option>
                                        {BANKS.map((bank, index) => (
                                            <option key={bank.code} value={index}>
                                                {bank.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="accountNumber" className="text-sm font-semibold text-zinc-700">
                                    Account Number
                                    {selectedBank && (
                                        <span className="text-zinc-400 font-normal ml-1">
                                            ({selectedBank.digits} digits)
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    id="accountNumber"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder={selectedBank ? `${selectedBank.digits}-digit account number` : "Account number"}
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9\s]/g, ""))}
                                    maxLength={selectedBank ? selectedBank.digits + 3 : 16}
                                    className="mt-1 rounded-xl border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <Label htmlFor="city" className="text-sm font-semibold text-zinc-700">
                                    City
                                </Label>
                                <Input
                                    id="city"
                                    type="text"
                                    placeholder="e.g., Manila"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="mt-1 rounded-xl border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-xl">{error}</p>
                            )}

                            <Button
                                onClick={handleWithdraw}
                                disabled={isSubmitting}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-emerald-500/20"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Submit Withdrawal"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
