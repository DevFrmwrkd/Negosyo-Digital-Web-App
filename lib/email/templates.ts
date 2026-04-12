/**
 * Email HTML template generators (extracted for reuse in preview).
 * These functions return raw HTML strings without sending any email.
 */

import { getPaymentConfig } from '@/lib/payment/config'

const paymentConfig = getPaymentConfig()

export function getPaymentConfirmationEmailHtml(params: {
    businessName: string
    businessOwnerName: string
    websiteUrl: string
    amount: number
    wiseEmail?: string
    customDomain?: string // If set, shows "domain being configured" notice
}): string {
    const { businessName, businessOwnerName, websiteUrl, amount, wiseEmail: customWiseEmail, customDomain } = params
    
    const wiseEmail = customWiseEmail || paymentConfig.wiseEmail || 'frmwrkd.media@gmail.com'

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed — ${businessName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding:40px 16px;">

                <!-- Card -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#1a1a1a;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.5);">

                    <!-- Hero gradient header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#10b981 0%,#059669 50%,#06b6d4 100%);padding:48px 40px 40px;text-align:center;">
                            <!-- Logo mark -->
                            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 18px;margin-bottom:24px;">
                                <span style="color:#ffffff;font-size:14px;font-weight:700;letter-spacing:1px;">NEGOSYO DIGITAL</span>
                            </div>
                            <h1 style="margin:0 0 12px;color:#ffffff;font-size:32px;font-weight:800;line-height:1.2;letter-spacing:-0.5px;">
                                Payment Confirmed!
                            </h1>
                            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:16px;line-height:1.6;">
                                Your website is now officially live
                            </p>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding:36px 40px 0;">
                            <p style="margin:0 0 12px;font-size:16px;color:#a1a1aa;line-height:1.7;">
                                Hi <strong style="color:#ffffff;">${businessOwnerName}</strong>,
                            </p>
                            <p style="margin:0;font-size:16px;color:#a1a1aa;line-height:1.7;">
                                We have received and confirmed your payment of <strong style="color:#10b981;">&#8369;${amount.toLocaleString()}</strong> for <strong style="color:#ffffff;">${businessName}</strong>. Your website is now fully published and live on the web!
                            </p>
                        </td>
                    </tr>

                    <!-- Payment Summary -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#111111;border:1px solid #2d2d2d;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="padding:28px;">
                                        <p style="margin:0 0 20px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Payment Summary</p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="padding:7px 0;font-size:13px;color:#6b7280;width:140px;">Status</td>
                                                <td style="padding:7px 0;">
                                                    <span style="font-size:13px;color:#10b981;font-weight:700;background:#052e16;padding:3px 10px;border-radius:4px;">CONFIRMED</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:7px 0;font-size:13px;color:#6b7280;">Amount Paid</td>
                                                <td style="padding:7px 0;font-size:14px;color:#e5e7eb;font-weight:600;">&#8369;${amount.toLocaleString()}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:7px 0;font-size:13px;color:#6b7280;">Business</td>
                                                <td style="padding:7px 0;font-size:14px;color:#e5e7eb;font-weight:600;">${businessName}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    ${customDomain ? `
                    <!-- Custom Domain Notice -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0c1f17;border:1px solid #065f46;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="padding:24px;">
                                        <p style="margin:0 0 8px;font-size:14px;color:#10b981;font-weight:700;">🌐 Custom Domain: ${customDomain}</p>
                                        <p style="margin:0;font-size:13px;color:#6ee7b7;line-height:1.6;">
                                            Your custom domain is being configured and will be live within 5 minutes. You'll receive a separate email with your domain details and renewal information once it's ready.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}

                    <!-- Website CTA -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#111111;border:1px solid #2d2d2d;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="padding:24px;text-align:center;">
                                        <p style="margin:0 0 18px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your Live Website</p>
                                        <!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${websiteUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" fillcolor="#10b981">
                                            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Visit Your Website &rarr;</center>
                                        </v:roundrect>
                                        <![endif]-->
                                        <!--[if !mso]><!-->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                            <tr>
                                                <td style="border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);">
                                                    <a href="${websiteUrl}" target="_blank" style="display:block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;font-family:sans-serif;">
                                                        Visit Your Website &rarr;
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Thank you note -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <p style="margin:0;font-size:16px;color:#a1a1aa;line-height:1.7;">
                                Thank you for choosing Negosyo Digital! Your business is now online and accessible to everyone. If you need any changes or support, don't hesitate to reach out.
                            </p>
                        </td>
                    </tr>

                    <!-- Support -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#111111;border:1px solid #2d2d2d;border-radius:10px;">
                                <tr>
                                    <td style="padding:18px 24px;text-align:center;">
                                        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Questions? We're here to help.</p>
                                        <a href="mailto:${wiseEmail}" style="color:#10b981;font-size:14px;font-weight:600;text-decoration:none;">${wiseEmail}</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:32px 40px;text-align:center;">
                            <p style="margin:0 0 4px;font-size:12px;color:#3f3f46;">&copy; 2026 Negosyo Digital. All rights reserved.</p>
                            <p style="margin:0;font-size:12px;color:#3f3f46;">Empowering Filipino businesses with digital presence</p>
                        </td>
                    </tr>

    `
}

export function getPaymentLinkEmailHtml(params: {
    businessName: string
    businessOwnerName: string
    amount: number
    paymentLink: string
    referenceCode: string
    platformEmail?: string
    customDomain?: string // If set, email shows a breakdown: website ₱1,000 + domain ₱500
}): string {
    const { businessName, businessOwnerName, amount, paymentLink, referenceCode, platformEmail, customDomain } = params

    const displayEmail = platformEmail || paymentConfig.wiseEmail || 'frmwrkd.media@gmail.com'

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Payment — ${businessName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding:40px 16px;">

                <!-- Card -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#1a1a1a;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.5);">

                    <!-- Hero gradient header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#10b981 0%,#059669 50%,#06b6d4 100%);padding:48px 40px 40px;text-align:center;">
                            <!-- Logo mark -->
                            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 18px;margin-bottom:24px;">
                                <span style="color:#ffffff;font-size:14px;font-weight:700;letter-spacing:1px;">NEGOSYO DIGITAL</span>
                            </div>
                            <h1 style="margin:0 0 12px;color:#ffffff;font-size:32px;font-weight:800;line-height:1.2;letter-spacing:-0.5px;">
                                Ready to Go Live!
                            </h1>
                            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:16px;line-height:1.6;">
                                Complete payment to activate your website
                            </p>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding:36px 40px 0;">
                            <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.7;">
                                Hi <strong style="color:#ffffff;">${businessOwnerName}</strong>,
                            </p>
                            <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.7;">
                                Your website for <strong style="color:#10b981;">${businessName}</strong> is ready! To activate it and make it live, we need you to complete a quick payment.
                            </p>
                        </td>
                    </tr>

                    <!-- Payment details box -->
                    <tr>
                        <td style="padding:0 40px;">
                            <table role="presentation" width="100%"  cellspacing="0" cellpadding="0" border="0" style="background-color:#0f0f0f;border:1px solid #2d2d2d;border-radius:12px;padding:24px;margin:0 0 24px;">
                                <tr>
                                    <td>
                                        <p style="margin:0 0 16px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Payment Amount</p>
                                        <p style="margin:0 0 8px;font-size:32px;color:#10b981;font-weight:800;">₱${amount.toLocaleString('en-PH')}</p>
                                        ${customDomain ? `
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background:#0a0a0a;border-radius:8px;overflow:hidden;">
                                            <tr>
                                                <td style="padding:12px 16px;border-bottom:1px solid #262626;">
                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="font-size:13px;color:#9ca3af;">Website Package</td>
                                                            <td align="right" style="font-size:13px;color:#e5e7eb;font-weight:600;">₱1,000</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:12px 16px;border-bottom:1px solid #262626;">
                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="font-size:13px;color:#9ca3af;">Custom Domain: <strong style="color:#10b981;">${customDomain}</strong></td>
                                                            <td align="right" style="font-size:13px;color:#e5e7eb;font-weight:600;">₱500</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 16px;background:#111;">
                                                    <p style="margin:0;font-size:11px;color:#6b7280;line-height:1.5;">
                                                        Year 1 of your custom domain is <strong style="color:#10b981;">included free</strong>. After year 1, renewal is ~₱1,120/year and is your responsibility. We do NOT auto-renew.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : '<div style="margin-bottom:20px;"></div>'}

                                        <p style="margin:0 0 8px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Reference Code</p>
                                        <p style="margin:0;font-size:16px;color:#ffffff;font-family:monospace;letter-spacing:1px;font-weight:700;">${referenceCode}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td style="padding:0 40px 24px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:8px;padding:3px;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:6px;padding:14px 32px;">
                                                                <a href="${paymentLink}" style="display:inline-block;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;line-height:1.2;letter-spacing:0.3px;">
                                                                    Complete Payment →
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Instructions -->
                    <tr>
                        <td style="padding:0 40px 32px;">
                            <div style="background-color:#0f0f0f;border:1px solid #2d2d2d;border-radius:8px;padding:20px;">
                                <p style="margin:0 0 12px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">How It Works</p>
                                
                                <ol style="margin:0;padding-left:20px;color:#9ca3af;font-size:14px;line-height:1.8;">
                                    <li style="margin-bottom:8px;">Click the button above to view payment details</li>
                                    <li style="margin-bottom:8px;">Open your Wise app and send the payment</li>
                                    <li style="margin-bottom:8px;">Use reference code: <strong style="color:#10b981;font-family:monospace;">${referenceCode}</strong></li>
                                    <li>Your website will go live automatically once payment is confirmed</li>
                                </ol>
                            </div>
                        </td>
                    </tr>

                    <!-- Payment details (if Wise account provided) -->
                    ${platformEmail ? `
                    <tr>
                        <td style="padding:0 40px 32px;">
                            <p style="margin:0 0 12px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Send Payment To</p>
                            <p style="margin:0;padding:12px;background-color:#0f0f0f;border:1px solid #2d2d2d;border-radius:8px;font-size:14px;color:#e5e7eb;font-family:monospace;">
                                📧 ${platformEmail}
                            </p>
                        </td>
                    </tr>
                    ` : ''}

                    <!-- Footer -->
                    <tr>
                        <td style="padding:32px 40px;border-top:1px solid #2d2d2d;text-align:center;">
                            <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">
                                Questions? <a href="mailto:frmwrkd.media@gmail.com" style="color:#10b981;text-decoration:none;font-weight:600;">Contact support</a>
                            </p>
                            <p style="margin:0;font-size:12px;color:#4b5563;">
                                © Negosyo Digital. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
    `
}export function getApprovalEmailHtml(params: {
    businessName: string
    businessOwnerName: string
    websiteUrl: string
    amount: number
    submissionId: string
    paymentReference?: string
}): string {
    const { businessName, businessOwnerName, websiteUrl, amount, submissionId } = params

    const wiseEmail = paymentConfig.wiseEmail || 'frmwrkd.media@gmail.com'
    const wiseAccountName = process.env.WISE_ACCOUNT_NAME || 'Negosyo Digital'
    // Use the auto-generated payment reference code, or fallback to old format
    const reference = params.paymentReference || submissionId.substring(0, 8).toUpperCase()

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Website is Ready — ${businessName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding:40px 16px;">

                <!-- Card -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#1a1a1a;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.5);">

                    <!-- Hero gradient header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%);padding:48px 40px 40px;text-align:center;">
                            <!-- Logo mark -->
                            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 18px;margin-bottom:24px;">
                                <span style="color:#ffffff;font-size:14px;font-weight:700;letter-spacing:1px;">NEGOSYO DIGITAL</span>
                            </div>
                            <h1 style="margin:0 0 12px;color:#ffffff;font-size:32px;font-weight:800;line-height:1.2;letter-spacing:-0.5px;">
                                Your website is<br>ready to launch 🚀
                            </h1>
                            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:16px;line-height:1.6;">
                                One payment away from going live
                            </p>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding:36px 40px 0;">
                            <p style="margin:0 0 12px;font-size:16px;color:#a1a1aa;line-height:1.7;">
                                Hi <strong style="color:#ffffff;">${businessOwnerName}</strong>,
                            </p>
                            <p style="margin:0;font-size:16px;color:#a1a1aa;line-height:1.7;">
                                Great news — your website for <strong style="color:#ffffff;">${businessName}</strong> is fully built and ready. Complete your payment below to get it published live on the web.
                            </p>
                        </td>
                    </tr>

                    <!-- Website CTA -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#111111;border:1px solid #2d2d2d;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="padding:24px;text-align:center;">
                                        <p style="margin:0 0 18px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Preview Your Website</p>
                                        <!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${websiteUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" fillcolor="#10b981">
                                            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">View Your Website &rarr;</center>
                                        </v:roundrect>
                                        <![endif]-->
                                        <!--[if !mso]><!-->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                            <tr>
                                                <td style="border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);">
                                                    <a href="${websiteUrl}" target="_blank" style="display:block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;font-family:sans-serif;">
                                                        View Your Website &rarr;
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Payment section -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#111111;border:1px solid #2d2d2d;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="padding:28px;">

                                        <!-- Section label -->
                                        <p style="margin:0 0 20px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Payment Details</p>

                                        <!-- Amount row -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#064e3b,#065f46);border-radius:10px;margin-bottom:20px;">
                                            <tr>
                                                <td style="padding:20px 24px;">
                                                    <p style="margin:0 0 4px;font-size:12px;color:#6ee7b7;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Total Amount Due</p>
                                                    <p style="margin:0;font-size:36px;font-weight:800;color:#ffffff;line-height:1;">&#8369;${amount.toLocaleString()}</p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Wise details -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0d1117;border:1px solid #065f46;border-radius:10px;">
                                            <tr>
                                                <td style="padding:20px 24px;">
                                                    <!-- Wise logo row -->
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:16px;">
                                                        <tr>
                                                            <td style="background:#9fe870;border-radius:6px;padding:4px 10px;">
                                                                <span style="color:#0d1117;font-size:13px;font-weight:800;letter-spacing:-0.3px;">wise</span>
                                                            </td>
                                                            <td style="padding-left:10px;">
                                                                <span style="color:#10b981;font-size:13px;font-weight:600;">Bank Transfer</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    <!-- Details table -->
                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="padding:7px 0;font-size:13px;color:#6b7280;width:140px;vertical-align:top;">Account Name</td>
                                                            <td style="padding:7px 0;font-size:14px;color:#e5e7eb;font-weight:600;">${wiseAccountName}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:7px 0;font-size:13px;color:#6b7280;vertical-align:top;">Email / ID</td>
                                                            <td style="padding:7px 0;font-size:14px;color:#e5e7eb;font-weight:600;">${wiseEmail}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:7px 0;font-size:13px;color:#6b7280;vertical-align:top;">Currency</td>
                                                            <td style="padding:7px 0;font-size:14px;color:#e5e7eb;font-weight:600;">PHP (Philippine Peso)</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:7px 0;font-size:13px;color:#6b7280;vertical-align:top;">Reference #</td>
                                                            <td style="padding:7px 0;">
                                                                <span style="font-size:14px;color:#9fe870;font-weight:700;font-family:'Courier New',monospace;background:#0a1f0a;padding:3px 8px;border-radius:4px;">${reference}</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Include reference note -->
                                        <p style="margin:14px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                                            &#9888;&#65039; Always include the reference number <strong style="color:#e5e7eb;">${reference}</strong> when sending payment so we can match it to your account.
                                        </p>

                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- 3-day urgency warning -->
                    <tr>
                        <td style="padding:20px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#052e16,#064e3b);border-radius:12px;border:1px solid #065f46;">
                                <tr>
                                    <td style="padding:20px 24px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="vertical-align:top;padding-right:14px;font-size:22px;line-height:1;">&#9201;</td>
                                                <td>
                                                    <p style="margin:0 0 6px;font-size:14px;color:#6ee7b7;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Action Required Within 3 Days</p>
                                                    <p style="margin:0;font-size:14px;color:#a7f3d0;line-height:1.6;">
                                                        Your website preview will be <strong>automatically taken offline</strong> if payment is not received within <strong>3 days</strong> of this email. Complete your payment now to keep it live.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- What's Next -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <p style="margin:0 0 16px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">What Happens Next</p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                ${[
                                    ['1', 'Send payment via Wise using the details above', '#059669'],
                                    ['2', 'Reply to this email with your payment confirmation screenshot', '#10b981'],
                                    ['3', 'We\'ll verify your payment and fully activate your website', '#34d399'],
                                    ['4', 'Your business goes live online — visible to everyone!', '#6ee7b7'],
                                ].map(([num, text, color]) => `
                                <tr>
                                    <td style="padding:8px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="vertical-align:top;padding-right:14px;">
                                                    <div style="width:28px;height:28px;background:${color}22;border-radius:50%;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:${color};">${num}</div>
                                                </td>
                                                <td style="vertical-align:middle;font-size:14px;color:#a1a1aa;line-height:1.5;padding-top:4px;">${text}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>`).join('')}
                            </table>
                        </td>
                    </tr>

                    <!-- Support -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#111111;border:1px solid #2d2d2d;border-radius:10px;">
                                <tr>
                                    <td style="padding:18px 24px;text-align:center;">
                                        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Questions? We're here to help.</p>
                                        <a href="mailto:${wiseEmail}" style="color:#10b981;font-size:14px;font-weight:600;text-decoration:none;">${wiseEmail}</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:32px 40px;text-align:center;">
                            <p style="margin:0 0 4px;font-size:12px;color:#3f3f46;">© 2026 Negosyo Digital. All rights reserved.</p>
                            <p style="margin:0;font-size:12px;color:#3f3f46;">Empowering Filipino businesses with digital presence</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
    `
}

// ==================== DOMAIN LIVE EMAIL ====================

export function getDomainLiveEmailHtml(params: {
    businessName: string
    businessOwnerName: string
    customDomain: string
    expiresAt: number
}): string {
    const { businessName, businessOwnerName, customDomain, expiresAt } = params
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${customDomain} is Live</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #0a0a0a;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background: #1a1a1a; border-radius: 16px; overflow: hidden; max-width: 600px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 48px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">🎉 Your Website is Live!</h1>
                            <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">${businessName}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #f5f5f5; font-size: 16px; line-height: 1.6;">Hi ${businessOwnerName},</p>
                            <p style="margin: 0 0 24px; color: #d4d4d4; font-size: 16px; line-height: 1.6;">
                                Great news! Your custom domain has been registered and your website is now live at:
                            </p>
                            <div style="background: #0a0a0a; border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                                <a href="https://${customDomain}" style="color: #10b981; font-size: 24px; font-weight: 700; text-decoration: none;">${customDomain}</a>
                            </div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                                <tr>
                                    <td style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 24px;">
                                        <h2 style="margin: 0 0 12px; color: #78350f; font-size: 18px; font-weight: 700;">⚠ Important: Domain Renewal Notice</h2>
                                        <p style="margin: 0 0 12px; color: #78350f; font-size: 14px; line-height: 1.6;">
                                            <strong>The first year of your custom domain is included FREE</strong> with your Negosyo Digital website package.
                                        </p>
                                        <p style="margin: 0 0 12px; color: #78350f; font-size: 14px; line-height: 1.6;">
                                            Your domain will expire on <strong>${expiryDate}</strong>.
                                        </p>
                                        <p style="margin: 0 0 12px; color: #78350f; font-size: 14px; line-height: 1.6;">
                                            <strong>After year 1, renewal is approximately ₱1,120 ($20) per year</strong> and is the business owner's responsibility. We do <strong>NOT</strong> auto-renew the domain — this is intentional, so you have full control.
                                        </p>
                                        <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                                            We'll send you a reminder email 30 days before the expiry date so you don't lose the domain.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 24px 0 0; color: #a3a3a3; font-size: 14px; line-height: 1.6;">
                                You can renew through any registrar (we recommend Hostinger or Cloudflare) or transfer the domain to your own account.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #0a0a0a; padding: 24px 40px; text-align: center; border-top: 1px solid #262626;">
                            <p style="margin: 0; color: #737373; font-size: 12px;">© ${new Date().getFullYear()} Negosyo Digital. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `
}

// ==================== WITHDRAWAL STATUS EMAIL ====================

export function getWithdrawalStatusEmailHtml(params: {
    creatorName: string
    creatorEmail: string
    amount: number
    statusLabel: string
    statusDescription: string
    isFinal: boolean
    referenceCode?: string
    submittedAt: number
}): string {
    const { creatorName, amount, statusLabel, statusDescription, isFinal, referenceCode, submittedAt } = params
    const submittedDate = new Date(submittedAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
    const accentColor = isFinal ? '#10b981' : '#f59e0b'
    const accentBg = isFinal ? '#d1fae5' : '#fef3c7'
    const accentText = isFinal ? '#065f46' : '#78350f'
    const icon = isFinal ? '✅' : '⏳'
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Withdrawal Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #0a0a0a;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background: #1a1a1a; border-radius: 16px; overflow: hidden; max-width: 600px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%); padding: 48px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">${icon} Withdrawal Update</h1>
                            <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">₱${amount.toLocaleString()}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #f5f5f5; font-size: 16px; line-height: 1.6;">Hi ${creatorName},</p>
                            <p style="margin: 0 0 24px; color: #d4d4d4; font-size: 16px; line-height: 1.6;">
                                Here's the latest update on your withdrawal request:
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">
                                <tr>
                                    <td style="background: ${accentBg}; border-left: 4px solid ${accentColor}; border-radius: 8px; padding: 24px;">
                                        <h2 style="margin: 0 0 8px; color: ${accentText}; font-size: 20px; font-weight: 700;">${statusLabel}</h2>
                                        <p style="margin: 0; color: ${accentText}; font-size: 14px; line-height: 1.6;">${statusDescription}</p>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 0; margin: 0 0 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; border-bottom: 1px solid #262626;">
                                        <p style="margin: 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</p>
                                        <p style="margin: 4px 0 0; color: #f5f5f5; font-size: 18px; font-weight: 700;">₱${amount.toLocaleString()}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px 20px; ${referenceCode ? 'border-bottom: 1px solid #262626;' : ''}">
                                        <p style="margin: 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Submitted</p>
                                        <p style="margin: 4px 0 0; color: #f5f5f5; font-size: 14px;">${submittedDate}</p>
                                    </td>
                                </tr>
                                ${referenceCode ? `
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <p style="margin: 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Wise Reference</p>
                                        <p style="margin: 4px 0 0; color: #f5f5f5; font-size: 13px; font-family: monospace;">${referenceCode}</p>
                                    </td>
                                </tr>` : ''}
                            </table>
                            ${!isFinal ? `
                            <p style="margin: 0 0 16px; color: #d4d4d4; font-size: 14px; line-height: 1.6;">
                                Wise transfers usually complete within minutes after Wise verification, but some can take 1-2 business days depending on the recipient bank. Your funds are safe and being processed.
                            </p>
                            <p style="margin: 0; color: #a3a3a3; font-size: 13px; line-height: 1.6;">
                                We'll send you another update as soon as the status changes. If you have questions, just reply to this email.
                            </p>` : `
                            <p style="margin: 0; color: #d4d4d4; font-size: 14px; line-height: 1.6;">
                                Thank you for your patience! If you have any questions, just reply to this email.
                            </p>`}
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #0a0a0a; padding: 24px 40px; text-align: center; border-top: 1px solid #262626;">
                            <p style="margin: 0; color: #737373; font-size: 12px;">© ${new Date().getFullYear()} Negosyo Digital. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `
}
