"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  RefreshCw,
  Check,
  Upload,
  X,
  Trash2,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Send,
  PowerOff,
  Mail,
  MailWarning,
  Coins,
  ClipboardCheck,
  AlertTriangle,
  Gift,
} from "lucide-react";

type TopActionBarProps = {
  businessName: string;
  status: string;
  websiteGenerated: boolean;
  websitePublishedUrl: string | null;
  hasTranscript: boolean;
  /** Timestamp of last follow-up email sent (ms), undefined if none */
  followUpSentAt?: number;
  /** True when this submission is on the ₱1,499 custom-domain tier — it cannot be comped. */
  isCustomDomainTier?: boolean;
  /** True once this site has already been given away under the promo. */
  isComped?: boolean;

  // Loading flags
  updating: boolean;
  generatingWebsite: boolean;
  publishingWebsite: boolean;
  republishingWebsite: boolean;
  unpublishingWebsite: boolean;
  enhancing: boolean;
  sendingEmail: boolean;
  markingPaid: boolean;
  markingComped: boolean;
  deleting: boolean;
  sendingFollowUp: boolean;

  // Handlers
  onGenerateWebsite: () => void;
  onApprove: () => void;
  onMarkInReview: () => void;
  onPublish: () => void;
  onRepublish: () => void;
  onUnpublish: () => void;
  onSendToClient: () => void;
  onEnhanceImages: () => void;
  onMarkAsPaid: () => void;
  onGiveFree: () => void;
  onResendPaymentEmail: () => void;
  onSendFollowUp: () => void;
  onReject: () => void;
  onDelete: () => void;
};

/** Format a timestamp as "2h ago" / "3d ago" / "just now" — used in the follow-up button label. */
function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return "just now";
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function TopActionBar({
  businessName,
  status,
  websiteGenerated,
  websitePublishedUrl,
  hasTranscript,
  followUpSentAt,
  isCustomDomainTier = false,
  isComped = false,
  updating,
  generatingWebsite,
  publishingWebsite,
  republishingWebsite,
  unpublishingWebsite,
  enhancing,
  sendingEmail,
  markingPaid,
  markingComped,
  deleting,
  sendingFollowUp,
  onGenerateWebsite,
  onApprove,
  onMarkInReview,
  onPublish,
  onRepublish,
  onUnpublish,
  onSendToClient,
  onEnhanceImages,
  onMarkAsPaid,
  onGiveFree,
  onResendPaymentEmail,
  onSendFollowUp,
  onReject,
  onDelete,
}: TopActionBarProps) {
  // Stale-publish signal. A regenerate (every Save in the editor runs one)
  // resets generatedWebsites.status to 'draft' while publishedUrl stays set —
  // so `draft + publishedUrl` means the live Worker is still serving the OLD
  // HTML. Read straight off the reactive row rather than taking a new prop, so
  // the badge clears by itself the moment the republish lands. Same query the
  // page already subscribes to, so it costs nothing extra.
  const params = useParams();
  const submissionId = (params?.id as string) || "";
  const website = useQuery(
    api.generatedWebsites.getBySubmissionId,
    submissionId ? { submissionId: submissionId as Id<"submissions"> } : "skip"
  );
  const publishStale = !!website?.publishedUrl && website?.status === "draft";

  // Eligibility
  const canApprove = status === "website_generated" || (status === "in_review" && websiteGenerated);
  const canGenerate = ["in_review", "website_generated", "approved", "deployed"].includes(status);
  const canPublish =
    ["approved", "website_generated", "deployed", "pending_payment", "paid"].includes(status) &&
    websiteGenerated;
  const canEnhance =
    ["submitted", "in_review", "website_generated", "approved", "deployed"].includes(status) && hasTranscript;
  const canReject = !["rejected", "deployed", "pending_payment", "paid", "unpublished"].includes(status);
  const canMarkInReview = status === "submitted";
  const canMarkPaid = status === "pending_payment";
  // Promo: hand the site to the owner for free, creator still earns their ₱500.
  // Offered from the moment a real website exists to give away, and still
  // offered at pending_payment — an owner who was billed and went quiet is
  // exactly the case a promo rescues. Hidden once the site is already comped or
  // settled, and never shown on the custom-domain tier, where "free" would mean
  // the platform paying a registrar out of pocket.
  const canGiveFree =
    !isComped &&
    !isCustomDomainTier &&
    websiteGenerated &&
    ["approved", "website_generated", "deployed", "pending_payment"].includes(status);
  const canSendToClient = status === "deployed";
  const canUnpublish = !!websitePublishedUrl;
  const canResendPaymentEmail = status === "pending_payment";
  const canSendFollowUp = status === "pending_payment";

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-neutral-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
        {/* Back + title */}
        <Link
          href="/admin/submissions"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 hover:text-amber-700 px-3 py-2 rounded-xl border border-neutral-200 hover:border-amber-300 hover:bg-amber-50 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>

        <div className="min-w-0 flex-1">
          <h1
            style={{ fontFamily: "var(--font-fraunces)" }}
            className="text-base sm:text-lg font-semibold text-neutral-900 leading-tight truncate"
          >
            {businessName}
          </h1>
          {publishStale ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              <AlertTriangle className="w-3 h-3" />
              Live site is out of date — republish to update it
            </span>
          ) : (
            <p className="text-xs text-neutral-500 hidden sm:block">Submission details</p>
          )}
        </div>

        {/* Primary action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* Mark in Review (only for submitted status — promoted to be visible) */}
          {canMarkInReview && (
            <PrimaryBtn
              onClick={onMarkInReview}
              loading={updating}
              icon={ClipboardCheck}
              label="Mark in review"
              tone="amber"
            />
          )}

          {/* Mark as Paid (pending_payment) */}
          {canMarkPaid && (
            <PrimaryBtn
              onClick={onMarkAsPaid}
              loading={markingPaid}
              icon={Coins}
              label="Mark as paid"
              tone="emerald"
            />
          )}

          {/* Give free (promo) — creator still paid */}
          {canGiveFree && (
            <SecondaryBtn
              onClick={onGiveFree}
              loading={markingComped}
              icon={Gift}
              label="Give free"
            />
          )}

          {/* Re-send payment email */}
          {canResendPaymentEmail && (
            <SecondaryBtn
              onClick={onResendPaymentEmail}
              loading={false}
              icon={Mail}
              label="Re-send email"
            />
          )}

          {/* Manual follow-up (when unpaid) */}
          {canSendFollowUp && (
            <SecondaryBtn
              onClick={onSendFollowUp}
              loading={sendingFollowUp}
              icon={MailWarning}
              label={
                followUpSentAt
                  ? `Follow up · sent ${relativeTime(followUpSentAt)}`
                  : "Follow up"
              }
            />
          )}

          {/* Send to client */}
          {canSendToClient && (
            <PrimaryBtn
              onClick={onSendToClient}
              loading={sendingEmail}
              icon={Send}
              label="Send to client"
              tone="indigo"
            />
          )}

          {/* Enhance images */}
          {canEnhance && (
            <SecondaryBtn
              onClick={onEnhanceImages}
              loading={enhancing}
              icon={ImageIcon}
              label="Enhance"
            />
          )}

          {/* Regenerate / Generate */}
          {canGenerate && (
            <SecondaryBtn
              onClick={onGenerateWebsite}
              loading={generatingWebsite}
              icon={websiteGenerated ? RefreshCw : Sparkles}
              label={websiteGenerated ? "Regenerate" : "Generate"}
            />
          )}

          {/* Approve */}
          {canApprove && (
            <PrimaryBtn
              onClick={onApprove}
              loading={updating}
              icon={Check}
              label="Approve"
              tone="emerald"
            />
          )}

          {/* Publish / Republish */}
          {canPublish && (
            <PrimaryBtn
              onClick={websitePublishedUrl ? onRepublish : onPublish}
              loading={publishingWebsite || republishingWebsite}
              icon={Upload}
              label={
                websitePublishedUrl
                  ? publishStale
                    ? "Republish · changes not live"
                    : "Republish"
                  : "Publish website"
              }
              tone="emerald"
              attention={publishStale}
            />
          )}

          {/* Unpublish (only if currently published) */}
          {canUnpublish && (
            <SecondaryBtn
              onClick={onUnpublish}
              loading={unpublishingWebsite}
              icon={PowerOff}
              label="Unpublish"
              danger
            />
          )}

          {/* Reject */}
          {canReject && (
            <SecondaryBtn onClick={onReject} loading={updating} icon={X} label="Reject" danger />
          )}

          {/* Delete (always) */}
          <SecondaryBtn onClick={onDelete} loading={deleting} icon={Trash2} label="Delete" danger />
        </div>
      </div>
    </div>
  );
}

function PrimaryBtn({
  onClick,
  loading,
  icon: Icon,
  label,
  tone = "emerald",
  attention = false,
}: {
  onClick: () => void;
  loading: boolean;
  icon: any;
  label: string;
  tone?: "emerald" | "amber" | "indigo";
  /** Ring the button when it is the action that fixes a problem (stale live site). */
  attention?: boolean;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-amber-600 hover:bg-amber-700 text-white",
    amber: "bg-amber-500 hover:bg-amber-600 text-white",
    indigo: "bg-indigo-600 hover:bg-indigo-700 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 min-h-[38px] whitespace-nowrap ${tones[tone]}${attention ? " ring-2 ring-amber-300 ring-offset-1" : ""}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function SecondaryBtn({
  onClick,
  loading,
  icon: Icon,
  label,
  danger = false,
}: {
  onClick: () => void;
  loading: boolean;
  icon: any;
  label: string;
  danger?: boolean;
}) {
  const cls = danger
    ? "bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-700"
    : "bg-white border border-neutral-200 hover:border-amber-300 hover:bg-amber-50 text-neutral-800 hover:text-amber-800";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 min-h-[38px] whitespace-nowrap ${cls}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
