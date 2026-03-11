import nodemailer from 'nodemailer'

interface ApprovalEmailData {
    businessName: string
    businessOwnerName: string
    businessOwnerEmail: string
    websiteUrl: string
    amount: number
    submissionId: string
}

export async function sendApprovalEmail(data: ApprovalEmailData) {
    const {
        businessName,
        businessOwnerName,
        businessOwnerEmail,
        websiteUrl,
        amount,
        submissionId
    } = data

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        })

        const emailHtml = getApprovalEmailTemplate({
            businessName,
            businessOwnerName,
            websiteUrl,
            amount,
            submissionId
        })

        const info = await transporter.sendMail({
            from: `"Negosyo Digital" <${process.env.GMAIL_USER}>`,
            to: businessOwnerEmail,
            subject: `🎉 Your Website is Ready — ${businessName}`,
            html: emailHtml
        })

        return { success: true, messageId: info.messageId }
    } catch (error: any) {
        console.error('Error in sendApprovalEmail:', error)
        throw error
    }
}

interface PaymentConfirmationEmailData {
    businessName: string
    businessOwnerName: string
    businessOwnerEmail: string
    websiteUrl: string
    amount: number
}

export async function sendPaymentConfirmationEmail(data: PaymentConfirmationEmailData) {
    const {
        businessName,
        businessOwnerName,
        businessOwnerEmail,
        websiteUrl,
        amount,
    } = data

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        })

        const emailHtml = getPaymentConfirmationTemplate({
            businessName,
            businessOwnerName,
            websiteUrl,
            amount,
        })

        const info = await transporter.sendMail({
            from: `"Negosyo Digital" <${process.env.GMAIL_USER}>`,
            to: businessOwnerEmail,
            subject: `Payment Confirmed — ${businessName} is Now Live!`,
            html: emailHtml
        })

        return { success: true, messageId: info.messageId }
    } catch (error: any) {
        console.error('Error in sendPaymentConfirmationEmail:', error)
        throw error
    }
}

function getPaymentConfirmationTemplate(params: {
    businessName: string
    businessOwnerName: string
    websiteUrl: string
    amount: number
}): string {
    const { businessName, businessOwnerName, websiteUrl, amount } = params

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

                    <!-- Website CTA -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#111111;border:1px solid #2d2d2d;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="padding:24px;text-align:center;">
                                        <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your Live Website</p>
                                        <p style="margin:0 0 18px;font-size:13px;color:#4b5563;word-break:break-all;">${websiteUrl}</p>
                                        <a href="${websiteUrl}"
                                           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
                                            Visit Your Website &rarr;
                                        </a>
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
                                        <a href="mailto:frmwkrd.media@gmail.com" style="color:#10b981;font-size:14px;font-weight:600;text-decoration:none;">frmwkrd.media@gmail.com</a>
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

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
    `
}

function getApprovalEmailTemplate(params: {
    businessName: string
    businessOwnerName: string
    websiteUrl: string
    amount: number
    submissionId: string
}): string {
    const { businessName, businessOwnerName, websiteUrl, amount, submissionId } = params

    // Wise mock payment details
    const wiseEmail = process.env.WISE_EMAIL || 'payments@negosyodigital.com'
    const wiseAccountName = process.env.WISE_ACCOUNT_NAME || 'Negosyo Digital'
    const reference = submissionId.substring(0, 8).toUpperCase()

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
                        <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#06b6d4 100%);padding:48px 40px 40px;text-align:center;">
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
                                        <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Preview Your Website</p>
                                        <p style="margin:0 0 18px;font-size:13px;color:#4b5563;word-break:break-all;">${websiteUrl}</p>
                                        <a href="${websiteUrl}"
                                           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
                                            View Your Website &rarr;
                                        </a>
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
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#1e1b4b,#2d1b69);border-radius:10px;margin-bottom:20px;">
                                            <tr>
                                                <td style="padding:20px 24px;">
                                                    <p style="margin:0 0 4px;font-size:12px;color:#a78bfa;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Total Amount Due</p>
                                                    <p style="margin:0;font-size:36px;font-weight:800;color:#ffffff;line-height:1;">&#8369;${amount.toLocaleString()}</p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Wise details -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0d1117;border:1px solid #1e3a5f;border-radius:10px;">
                                            <tr>
                                                <td style="padding:20px 24px;">
                                                    <!-- Wise logo row -->
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:16px;">
                                                        <tr>
                                                            <td style="background:#9fe870;border-radius:6px;padding:4px 10px;">
                                                                <span style="color:#0d1117;font-size:13px;font-weight:800;letter-spacing:-0.3px;">wise</span>
                                                            </td>
                                                            <td style="padding-left:10px;">
                                                                <span style="color:#60a5fa;font-size:13px;font-weight:600;">Bank Transfer</span>
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

                    <!-- 24-hour urgency warning -->
                    <tr>
                        <td style="padding:20px 40px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#3f1515,#7f1d1d);border-radius:12px;border:1px solid #991b1b;">
                                <tr>
                                    <td style="padding:20px 24px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="vertical-align:top;padding-right:14px;font-size:22px;line-height:1;">&#9201;</td>
                                                <td>
                                                    <p style="margin:0 0 6px;font-size:14px;color:#fca5a5;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Action Required Within 24 Hours</p>
                                                    <p style="margin:0;font-size:14px;color:#fecaca;line-height:1.6;">
                                                        Your website preview will be <strong>automatically taken offline</strong> if payment is not received within <strong>24 hours</strong> of this email. Complete your payment now to keep it live.
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
                                    ['1', 'Send payment via Wise using the details above', '#6366f1'],
                                    ['2', 'Reply to this email with your payment confirmation screenshot', '#8b5cf6'],
                                    ['3', 'We\'ll verify your payment and fully activate your website', '#06b6d4'],
                                    ['4', 'Your business goes live online — visible to everyone!', '#10b981'],
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
                                        <a href="mailto:support@negosyodigital.com" style="color:#8b5cf6;font-size:14px;font-weight:600;text-decoration:none;">support@negosyodigital.com</a>
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
