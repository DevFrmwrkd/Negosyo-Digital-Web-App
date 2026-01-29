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

    const gcashNumber = process.env.NEXT_PUBLIC_PAYMENT_GCASH_NUMBER || '09171234567'
    const gcashName = process.env.NEXT_PUBLIC_PAYMENT_GCASH_NAME || 'Negosyo Digital'

    try {
        // Create transporter using Gmail with App Password
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, // Your Gmail address
                pass: process.env.GMAIL_APP_PASSWORD // Your Gmail App Password
            }
        })

        const emailHtml = getApprovalEmailTemplate({
            businessName,
            businessOwnerName,
            websiteUrl,
            amount,
            gcashNumber,
            gcashName,
            submissionId
        })

        // Send email
        const info = await transporter.sendMail({
            from: `"Negosyo Digital" <${process.env.GMAIL_USER}>`,
            to: businessOwnerEmail,
            subject: `🎉 Your Website is Ready, ${businessOwnerName}!`,
            html: emailHtml
        })

        return { success: true, messageId: info.messageId }
    } catch (error: any) {
        console.error('Error in sendApprovalEmail:', error)
        throw error
    }
}

function getApprovalEmailTemplate(params: {
    businessName: string
    businessOwnerName: string
    websiteUrl: string
    amount: number
    gcashNumber: string
    gcashName: string
    submissionId: string
}): string {
    const {
        businessName,
        businessOwnerName,
        websiteUrl,
        amount,
        gcashNumber,
        gcashName,
        submissionId
    } = params

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Website is Ready!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                🎉 Your Website is Ready!
                            </h1>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 30px 40px 20px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
                                Hi <strong>${businessOwnerName}</strong>,
                            </p>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
                                Great news! Your website for <strong>${businessName}</strong> has been approved and is now ready to go live! 🚀
                            </p>
                        </td>
                    </tr>

                    <!-- Website Preview Button -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="margin: 0 0 15px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                            Your Website
                                        </p>
                                        <a href="${websiteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-bottom: 10px;">
                                            View Your Website →
                                        </a>
                                        <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af; word-break: break-all;">
                                            ${websiteUrl}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Payment Instructions -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <div style="border-top: 2px solid #e5e7eb; padding-top: 30px;">
                                <h2 style="margin: 0 0 20px; font-size: 20px; color: #111827; font-weight: 600;">
                                    💳 Payment Instructions
                                </h2>
                                <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
                                    To activate your website, please complete the payment using the details below:
                                </p>
                                
                                <!-- Amount Box -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                                    <tr>
                                        <td style="text-align: center;">
                                            <p style="margin: 0 0 5px; font-size: 14px; color: #92400e; font-weight: 600;">
                                                Total Amount
                                            </p>
                                            <p style="margin: 0; font-size: 32px; color: #78350f; font-weight: bold;">
                                                ₱${amount.toLocaleString()}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- GCash Details -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                                    <tr>
                                        <td>
                                            <p style="margin: 0 0 15px; font-size: 16px; color: #065f46; font-weight: 600;">
                                                📱 GCash Payment Details
                                            </p>
                                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #047857; width: 140px;">
                                                        <strong>GCash Number:</strong>
                                                    </td>
                                                    <td style="padding: 8px 0; font-size: 16px; color: #065f46; font-weight: 600; font-family: 'Courier New', monospace;">
                                                        ${gcashNumber}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #047857;">
                                                        <strong>Account Name:</strong>
                                                    </td>
                                                    <td style="padding: 8px 0; font-size: 16px; color: #065f46; font-weight: 600;">
                                                        ${gcashName}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #047857;">
                                                        <strong>Reference:</strong>
                                                    </td>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #065f46; font-family: 'Courier New', monospace;">
                                                        ${submissionId.substring(0, 8).toUpperCase()}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Important Note -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px;">
                                    <tr>
                                        <td>
                                            <p style="margin: 0 0 10px; font-size: 14px; color: #991b1b; font-weight: 600;">
                                                ⚠️ Important:
                                            </p>
                                            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #7f1d1d; line-height: 20px;">
                                                <li>Please include the reference number when sending payment</li>
                                                <li>Send a screenshot of your payment confirmation to verify</li>
                                                <li>Your website will be activated within 24 hours after payment confirmation</li>
                                            </ul>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Next Steps -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <h3 style="margin: 0 0 15px; font-size: 18px; color: #111827; font-weight: 600;">
                                📋 What's Next?
                            </h3>
                            <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563; line-height: 24px;">
                                <li style="margin-bottom: 8px;">Send payment via GCash using the details above</li>
                                <li style="margin-bottom: 8px;">Take a screenshot of your payment confirmation</li>
                                <li style="margin-bottom: 8px;">Reply to this email with the screenshot</li>
                                <li>We'll activate your website within 24 hours!</li>
                            </ol>
                        </td>
                    </tr>

                    <!-- Support -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                                <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                                    Need help? We're here for you!
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                    Contact us at <a href="mailto:support@negosyodigital.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@negosyodigital.com</a>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 5px; font-size: 12px; color: #6b7280;">
                                © 2026 Negosyo Digital. All rights reserved.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                Empowering Filipino businesses with digital presence
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
}
