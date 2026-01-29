'use client'

import { useParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function WebsitePage() {
    const params = useParams()
    const submissionId = params.id as string

    // Get generated website from Convex
    const website = useQuery(
        api.generatedWebsites.getBySubmissionId,
        submissionId ? { submissionId: submissionId as any } : "skip"
    )

    const loading = website === undefined
    const error = website === null ? 'Website not found' : null
    const htmlContent = website?.htmlContent || ''


    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f9fafb'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid #e5e7eb',
                        borderTopColor: '#2563eb',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#6b7280' }}>Loading website...</p>
                </div>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f9fafb'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                        Website Not Found
                    </h1>
                    <p style={{ color: '#6b7280' }}>{error}</p>
                </div>
            </div>
        )
    }

    // Use iframe with srcdoc for proper rendering
    return (
        <iframe
            srcDoc={htmlContent}
            style={{
                width: '100%',
                height: '100vh',
                border: 'none',
                margin: 0,
                padding: 0,
                display: 'block',
                position: 'fixed',
                top: 0,
                left: 0
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            title="Generated Website"
        />
    )
}
