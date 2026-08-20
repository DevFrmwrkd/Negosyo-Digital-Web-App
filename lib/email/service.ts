/**
 * Email transport — Resend.
 *
 * Migrated from nodemailer + Gmail SMTP on 2026-06 (see ndm conversation
 * + the prospect-pool work for context). The 8 named functions below
 * preserve their original signatures so consumer routes
 * (app/api/send-*-email/route.ts + convex/domains.ts callers) need no
 * changes. The only real swap is what happens inside `sendEmail`.
 * (`sendIntakeReceivedEmail` is a ninth, added for the /start owner-intake
 * funnel — it never had an SMTP version, so there was nothing to preserve.)
 *
 * Env vars:
 *   - RESEND_API_KEY     — required. Format `re_xxxxxxxxxxxx…`.
 *   - RESEND_FROM_EMAIL  — optional. Default falls back to
 *     `Tendso <onboarding@resend.dev>` (Resend's test sender,
 *     works without DNS verification). Swap to a verified domain
 *     address by setting this env var only — no code redeploy needed.
 *   - RESEND_REPLY_TO    — optional. When set, every outgoing email
 *     gets a reply_to header so customer replies land in this inbox
 *     instead of bouncing off the unverified onboarding@ sender.
 *
 * Why we keep nodemailer in package.json for now: rollback insurance.
 * If Resend has an outage in the first week we can revert this single
 * file and the old SMTP path comes back. Remove nodemailer +
 * @types/nodemailer + GMAIL_USER/GMAIL_APP_PASSWORD in a follow-up
 * cleanup PR after Resend is verified in prod.
 */
import { Resend } from 'resend';
import {
    getApprovalEmailHtml,
    getPaymentConfirmationEmailHtml,
    getPromoWebsiteLiveEmailHtml,
    getPaymentLinkEmailHtml,
    getPaymentFollowUpEmailHtml,
    getDomainLiveEmailHtml,
    getDomainSetupInProgressEmailHtml,
    getDomainRenewalReminderEmailHtml,
    getWithdrawalStatusEmailHtml,
    getIntakeReceivedEmailHtml,
} from './templates';

// ── Transport ─────────────────────────────────────────────────────────

const DEFAULT_FROM = 'Tendso <onboarding@resend.dev>';

// Lazy-init the Resend client so unit tests / build-time imports don't
// require the env var to exist. The client is cheap to construct;
// memoizing prevents repeated reads of process.env at hot paths.
let _resend: Resend | null = null;
function getClient(): Resend {
    if (_resend) return _resend;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error(
            'RESEND_API_KEY is not set on this deployment. ' +
                'Add it to .env.local (dev) or Vercel env (prod) and redeploy.',
        );
    }
    _resend = new Resend(apiKey);
    return _resend;
}

interface SendArgs {
    to: string;
    subject: string;
    html: string;
}

/**
 * What this deployment will actually put on an outgoing email, without sending
 * one and without exposing the API key.
 *
 * Exists because the from-address is invisible until a customer receives mail:
 * it comes from Vercel env, not from code, so a stale or unverified value only
 * shows up in someone's inbox. `usingTestSender` is the one that matters —
 * `onboarding@resend.dev` is Resend's shared onboarding address, carries none
 * of our domain's SPF/DKIM/DMARC alignment or sending reputation, and replies
 * to it bounce (which is what RESEND_REPLY_TO exists to work around).
 */
export function getMailerDiagnostics() {
    const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
    const replyTo = process.env.RESEND_REPLY_TO;
    return {
        from,
        fromSource: process.env.RESEND_FROM_EMAIL ? 'RESEND_FROM_EMAIL' : 'code default',
        replyTo: replyTo ?? null,
        apiKeyConfigured: !!process.env.RESEND_API_KEY,
        usingTestSender: /@resend\.dev>?\s*$/i.test(from.trim()),
    };
}

/**
 * Subject lines are header text, not HTML — entity-encoding them the way
 * ./templates escapes the body would leak literal `&amp;` into inboxes. So
 * strip markup instead, and flatten CR/LF plus every other control character
 * so a caller-supplied value can never terminate the header.
 *
 * Every subject below interpolates a `businessName` (and the withdrawal one a
 * `statusLabel`), and since /start exists those reach us from an unauthenticated
 * submitter — see the escapeHtml note in ./templates for the full story.
 */
function sanitizeHeader(value: string): string {
    return value
        .replace(/<[^>]*>/g, '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Single source of truth for outbound mail. Every named function below
 * funnels through here so the from / reply_to / error-handling logic is
 * defined exactly once.
 *
 * On success: returns `{ success: true, messageId }` matching the prior
 * nodemailer shape so consumer routes don't notice the swap.
 * On failure: throws so the caller's try/catch + API-route 500 path
 * keeps working the same way it did with SMTP errors.
 */
async function sendEmail(args: SendArgs): Promise<{ success: true; messageId: string }> {
    const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
    const replyTo = process.env.RESEND_REPLY_TO;
    const client = getClient();

    // Sanitized here rather than at each of the nine call sites — this is the
    // choke point every one of them already funnels through.
    const result = await client.emails.send({
        from,
        to: sanitizeHeader(args.to),
        subject: sanitizeHeader(args.subject),
        html: args.html,
        ...(replyTo ? { replyTo } : {}),
    });

    if (result.error) {
        // Resend's error object has { message, name, statusCode? }.
        // Throw a plain Error so the consumer's existing catch block
        // gets the same shape it did with nodemailer's SMTPError.
        throw new Error(
            `Resend send failed: ${result.error.message ?? result.error.name ?? 'unknown error'}`,
        );
    }

    return { success: true, messageId: result.data?.id ?? 'unknown' };
}

// ── Named functions (signatures unchanged from nodemailer version) ────

interface IntakeReceivedEmailData {
    businessName: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    amount: number;
    platformEmail?: string;
}

/**
 * The first email an owner-intake customer ever receives — sent within a minute
 * of them finishing /start, before any admin has touched the row.
 *
 * Everything else in this file fires from the admin's own clicks, which on the
 * owner path is 48-72h away. Without this one the owner's first contact from us
 * is a bill. See getIntakeReceivedEmailHtml for what it does and does not
 * promise.
 */
export async function sendIntakeReceivedEmail(data: IntakeReceivedEmailData) {
    try {
        const html = getIntakeReceivedEmailHtml({
            businessName: data.businessName,
            businessOwnerName: data.businessOwnerName,
            amount: data.amount,
            platformEmail: data.platformEmail,
        });
        return await sendEmail({
            to: data.businessOwnerEmail,
            subject: `We got your details — building ${data.businessName}'s website now`,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendIntakeReceivedEmail:', error);
        throw error;
    }
}

interface ApprovalEmailData {
    businessName: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    websiteUrl: string;
    amount: number;
    submissionId: string;
    paymentReference?: string; // ND-XXXX-YYYY format, generated by paymentReferences.generate
}

export async function sendApprovalEmail(data: ApprovalEmailData) {
    try {
        const html = getApprovalEmailHtml({
            businessName: data.businessName,
            businessOwnerName: data.businessOwnerName,
            websiteUrl: data.websiteUrl,
            amount: data.amount,
            submissionId: data.submissionId,
            paymentReference: data.paymentReference,
        });
        return await sendEmail({
            to: data.businessOwnerEmail,
            subject: `🎉 Your Website is Ready — ${data.businessName}`,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendApprovalEmail:', error);
        throw error;
    }
}

interface PaymentLinkEmailData {
    businessName: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    amount: number;
    websiteUrl?: string; // Published Cloudflare URL → "See your website" button
    referenceCode: string;
    platformEmail?: string;
    customDomain?: string; // If set, template shows a website + domain breakdown
    domainCostPHP?: number; // Real frozen domain price (submissions.domainCostPHP) for the breakdown split
    editMyWebsiteUrl?: string; // Owner-portal claim link → "Edit my website" button
}

export async function sendPaymentLinkEmail(data: PaymentLinkEmailData) {
    try {
        const html = getPaymentLinkEmailHtml({
            businessName: data.businessName,
            businessOwnerName: data.businessOwnerName,
            amount: data.amount,
            websiteUrl: data.websiteUrl,
            referenceCode: data.referenceCode,
            platformEmail: data.platformEmail,
            customDomain: data.customDomain,
            domainCostPHP: data.domainCostPHP,
            editMyWebsiteUrl: data.editMyWebsiteUrl,
        });
        return await sendEmail({
            to: data.businessOwnerEmail,
            subject: `💰 Complete Payment to Go Live — ${data.businessName} Website`,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendPaymentLinkEmail:', error);
        throw error;
    }
}

interface PaymentFollowUpEmailData {
    businessName: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    amount: number;
    websiteUrl?: string;
    referenceCode?: string;
    hoursLeft?: number;
    /** true = admin manually triggered; false = automated 24h-before-unpublish cron */
    isManual?: boolean;
}

export async function sendPaymentFollowUpEmail(data: PaymentFollowUpEmailData) {
    try {
        const html = getPaymentFollowUpEmailHtml({
            businessName: data.businessName,
            businessOwnerName: data.businessOwnerName,
            websiteUrl: data.websiteUrl,
            amount: data.amount,
            referenceCode: data.referenceCode,
            hoursLeft: data.hoursLeft,
            isManual: data.isManual,
        });
        const subject = data.isManual
            ? `Following up on your website — ${data.businessName}`
            : `⏰ Last day — ${data.businessName} website goes offline tomorrow`;
        return await sendEmail({
            to: data.businessOwnerEmail,
            subject,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendPaymentFollowUpEmail:', error);
        throw error;
    }
}

interface PaymentConfirmationEmailData {
    businessName: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    websiteUrl: string;
    amount: number;
}

export async function sendPaymentConfirmationEmail(data: PaymentConfirmationEmailData) {
    try {
        const html = getPaymentConfirmationEmailHtml({
            businessName: data.businessName,
            businessOwnerName: data.businessOwnerName,
            websiteUrl: data.websiteUrl,
            amount: data.amount,
        });
        return await sendEmail({
            to: data.businessOwnerEmail,
            subject: `Payment Confirmed — ${data.businessName} is Now Live!`,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendPaymentConfirmationEmail:', error);
        throw error;
    }
}

interface PromoWebsiteLiveEmailData {
    businessName: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    websiteUrl: string;
    creatorName?: string;
}

/**
 * PROMO — tell the owner their free website is live.
 *
 * The counterpart to sendPaymentConfirmationEmail for sites nobody paid for.
 * Keep the two apart: sending the confirmation for a comped site mails the
 * owner a receipt for money they never sent, which is the exact failure this
 * whole path exists to prevent.
 */
export async function sendPromoWebsiteLiveEmail(data: PromoWebsiteLiveEmailData) {
    try {
        const html = getPromoWebsiteLiveEmailHtml({
            businessName: data.businessName,
            businessOwnerName: data.businessOwnerName,
            websiteUrl: data.websiteUrl,
            creatorName: data.creatorName,
        });
        return await sendEmail({
            to: data.businessOwnerEmail,
            subject: `${data.businessName} is Now Live — Free, Nothing to Pay`,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendPromoWebsiteLiveEmail:', error);
        throw error;
    }
}

interface DomainLiveEmailData {
    businessName: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    customDomain: string;
    expiresAt: number;
}

export async function sendDomainLiveEmail(data: DomainLiveEmailData) {
    try {
        const html = getDomainLiveEmailHtml(data);
        return await sendEmail({
            to: data.businessOwnerEmail,
            subject: `🎉 ${data.customDomain} is Live — Your ${data.businessName} Website is Online!`,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendDomainLiveEmail:', error);
        throw error;
    }
}

interface DomainSetupInProgressEmailData {
    businessName: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    customDomain: string;
}

export async function sendDomainSetupInProgressEmail(data: DomainSetupInProgressEmailData) {
    try {
        const html = getDomainSetupInProgressEmailHtml(data);
        return await sendEmail({
            to: data.businessOwnerEmail,
            subject: `⏳ Setting up ${data.customDomain} — ${data.businessName}`,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendDomainSetupInProgressEmail:', error);
        throw error;
    }
}

interface DomainRenewalReminderEmailData {
    businessName: string;
    businessOwnerName: string;
    businessOwnerEmail: string;
    customDomain: string;
    expiresAt: number;
}

export async function sendDomainRenewalReminderEmail(data: DomainRenewalReminderEmailData) {
    try {
        const html = getDomainRenewalReminderEmailHtml(data);
        return await sendEmail({
            to: data.businessOwnerEmail,
            subject: `⏰ Renew ${data.customDomain} — ${data.businessName}`,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendDomainRenewalReminderEmail:', error);
        throw error;
    }
}

interface WithdrawalStatusEmailData {
    creatorName: string;
    creatorEmail: string;
    amount: number;
    statusLabel: string; // e.g. "Verifying your details"
    statusDescription: string; // longer human-readable explanation
    isFinal: boolean; // true = completed/failed, false = still in progress
    referenceCode?: string; // Wise transfer ID
    submittedAt: number;
}

export async function sendWithdrawalStatusEmail(data: WithdrawalStatusEmailData) {
    try {
        const html = getWithdrawalStatusEmailHtml(data);
        const subject = data.isFinal
            ? `✅ Withdrawal of ₱${data.amount} — ${data.statusLabel}`
            : `⏳ Withdrawal Update: ₱${data.amount} — ${data.statusLabel}`;
        return await sendEmail({
            to: data.creatorEmail,
            subject,
            html,
        });
    } catch (error: any) {
        console.error('Error in sendWithdrawalStatusEmail:', error);
        throw error;
    }
}

// ── Re-exports used by getApprovalEmailHtml callers (preview etc.) ────
// Templates module is the canonical source; re-exporting here is a no-op
// but documents the public surface for grep-discoverability.
export {
    getApprovalEmailHtml,
    getPaymentConfirmationEmailHtml,
    getPromoWebsiteLiveEmailHtml,
    getPaymentLinkEmailHtml,
    getPaymentFollowUpEmailHtml,
    getDomainLiveEmailHtml,
    getDomainSetupInProgressEmailHtml,
    getDomainRenewalReminderEmailHtml,
    getWithdrawalStatusEmailHtml,
    getIntakeReceivedEmailHtml,
};
