"use client";

/**
 * Owner site detail — READ-ONLY, ownership-gated.
 *
 * This page used to be a content editor. It was removed, not hidden, because it
 * could not do what it said: updateMyWebsiteContent patches the `websiteContent`
 * table, while the builder assembles pages from `generatedWebsites.extractedContent`
 * (app/api/generate-website/route.ts) and the live site is a Cloudflare Worker with
 * its HTML inlined at publish time. So an owner save changed nothing a visitor
 * could see — and worse, the next admin regenerate upserts `websiteContent` from
 * the freshly built content (generate-website/route.ts ~:916), silently discarding
 * the owner's edit even in the database. A form that reports "Saved" over that is
 * a lie a flag would only postpone, so the form is gone.
 *
 * Policy: edits are REQUESTED, not self-served. Free for the first year, via
 * /contact, and Tendso makes the change. Anything shown here must be something we
 * actually know: name, status, live URL, lead count — all from getMyWebsites,
 * which derives from websiteOwnerships, so a guessed submissionId simply isn't in
 * the list.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { Loader2, ArrowLeft, Users, ExternalLink } from "lucide-react";

export default function OwnerWebsitePage() {
    const params = useParams();
    const submissionId = params.submissionId as string;
    const router = useRouter();
    const { isOwner, isSignedIn, loading } = useOwnerAuth();

    const websites = useQuery(api.businessOwners.getMyWebsites, isOwner ? {} : "skip");

    useEffect(() => {
        if (!loading && isSignedIn === false) router.replace("/login");
    }, [loading, isSignedIn, router]);

    if (loading || (isOwner && websites === undefined)) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "#FBF3E0" }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#E4B05E" }} />
            </div>
        );
    }

    const site = websites?.find((w) => w.submissionId === submissionId);

    // Not in the owner's list → not owned, or nothing built yet.
    if (!site) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#FBF3E0", color: "#5C3A0F" }}>
                <div className="max-w-md text-center space-y-3">
                    <h1 className="text-2xl font-bold">Website not available</h1>
                    <p style={{ color: "#C89548" }}>You don&apos;t have access to this website, or it isn&apos;t ready yet.</p>
                    <Link href="/my-business" className="inline-block hover:underline" style={{ color: "#E4B05E" }}>← Back to my business</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-6 py-10" style={{ background: "#FBF3E0", color: "#5C3A0F" }}>
            <div className="max-w-xl mx-auto space-y-6">
                <Link href="/my-business" className="inline-flex items-center gap-1 text-sm hover:underline" style={{ color: "#C89548" }}>
                    <ArrowLeft className="w-4 h-4" /> My business
                </Link>

                <header>
                    <h1 className="text-2xl font-bold">{site.businessName}</h1>
                    <p className="mt-1 text-sm capitalize" style={{ color: "#C89548" }}>Status: {site.status}</p>
                </header>

                <div className="bg-white rounded-2xl p-6 space-y-4" style={{ border: "1px solid #F5E4C0" }}>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#71717a" }}>Your website</p>
                        {site.publishedUrl ? (
                            <a
                                href={site.publishedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-sm hover:underline break-all"
                                style={{ color: "#C89548" }}
                            >
                                {site.publishedUrl} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>
                        ) : (
                            <p className="mt-1 text-sm" style={{ color: "#71717a" }}>Not live yet.</p>
                        )}
                    </div>

                    <div className="pt-4 border-t" style={{ borderColor: "#F5E4C0" }}>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#71717a" }}>Enquiries</p>
                        <p className="mt-1 text-sm flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" style={{ color: "#71717a" }} /> {site.leadCount} lead{site.leadCount === 1 ? "" : "s"}
                        </p>
                    </div>
                </div>

                {/* The edits policy, stated the same way on every Tendso surface. */}
                <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #F5E4C0" }}>
                    <h2 className="text-lg font-semibold">Need a change?</h2>
                    <p className="mt-1 text-sm">
                        <strong>Free edits for your first year.</strong> Tell us what you want changed and we&apos;ll make it for you.
                    </p>
                    <Link
                        href="/contact"
                        className="mt-4 w-full h-12 rounded-xl text-white font-bold inline-flex items-center justify-center gap-2"
                        style={{ background: "#E4B05E" }}
                    >
                        Request an edit
                    </Link>
                </div>
            </div>
        </div>
    );
}
