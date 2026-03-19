import nodemailer from 'nodemailer'
import { getApprovalEmailHtml, getPaymentConfirmationEmailHtml } from './templates'

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

        const emailHtml = getApprovalEmailHtml({
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

        const emailHtml = getPaymentConfirmationEmailHtml({
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

