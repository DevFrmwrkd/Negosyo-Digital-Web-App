import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    // Creators table (users - both creators and admins)
    creators: defineTable({
        clerkId: v.string(), // Clerk user ID
        phone: v.optional(v.string()),
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        email: v.optional(v.string()),
        wiseEmail: v.optional(v.string()), // For Wise payouts
        referralCode: v.string(),
        referredBy: v.optional(v.id('creators')),
        referredByCode: v.optional(v.string()), // Referral code used during signup
        balance: v.number(),
        totalEarnings: v.optional(v.number()), // Optional for legacy records
        totalWithdrawn: v.optional(v.number()), // Lifetime total withdrawn
        submissionCount: v.optional(v.number()), // Total submissions created
        referredByName: v.optional(v.string()), // Full name of the referrer
        status: v.optional(v.union(
            v.literal('pending'),
            v.literal('active'),
            v.literal('suspended'),
            v.literal('deleted')
        )), // Optional for legacy records
        role: v.optional(v.union(v.literal('creator'), v.literal('admin'))), // Optional for legacy records
        payoutMethod: v.optional(v.string()),
        payoutDetails: v.optional(v.string()),
        createdAt: v.optional(v.number()), // Timestamp from legacy records
        updatedAt: v.optional(v.number()), // Last profile update
        lastActiveAt: v.optional(v.number()), // Last activity timestamp
        profileImage: v.optional(v.string()), // Profile image URL (R2)
        certifiedAt: v.optional(v.number()), // Timestamp when creator was certified
        isDeleted: v.optional(v.boolean()), // Soft delete flag
        deletedAt: v.optional(v.number()), // Timestamp when creator was deleted
    })
        .index('by_clerkId', ['clerkId'])
        .index('by_email', ['email'])
        .index('by_referralCode', ['referralCode'])
        .index('by_role', ['role'])
        .index('by_status', ['status']),

    // Business submissions
    submissions: defineTable({
        creatorId: v.id('creators'),

        // Business info
        businessName: v.string(),
        businessType: v.string(),
        ownerName: v.string(),
        ownerPhone: v.string(),
        ownerEmail: v.optional(v.string()),
        address: v.string(),
        city: v.string(),

        // Files - store as storage IDs for Convex file storage or URL strings (legacy)
        photos: v.array(v.string()), // URLs or storage IDs
        videoStorageId: v.optional(v.union(v.id('_storage'), v.string())), // Storage ID or URL string
        audioStorageId: v.optional(v.union(v.id('_storage'), v.string())), // Storage ID or URL string
        // R2 URLs (preferred over storage IDs for new uploads)
        videoUrl: v.optional(v.string()),
        audioUrl: v.optional(v.string()),
        transcript: v.optional(v.string()),
        transcriptionStatus: v.optional(v.string()), // Status of audio transcription
        transcriptionError: v.optional(v.string()), // Error message if Groq Whisper transcription failed
        transcriptionUpdatedAt: v.optional(v.number()), // Timestamp of last transcription generation/update

        // Extended address fields
        province: v.optional(v.string()),
        barangay: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        coordinates: v.optional(v.object({ lat: v.number(), lng: v.number() })),
        businessDescription: v.optional(v.string()), // AI-generated description from transcript
        hasProducts: v.optional(v.boolean()), // Affects expected photo count (4 vs 6) and Airtable field mapping

        // Generated content
        websiteUrl: v.optional(v.string()),
        websiteCode: v.optional(v.string()),
        aiGeneratedContent: v.optional(v.any()), // AI-extracted content from transcript

        // Admin review tracking
        reviewedBy: v.optional(v.string()), // Admin Clerk ID
        reviewedAt: v.optional(v.number()), // Review timestamp
        rejectionReason: v.optional(v.string()),
        platformFee: v.optional(v.number()), // Platform fee charged

        // Status workflow: submitted -> in_review -> approved -> deployed -> pending_payment -> paid
        // Note: 'pending', 'completed' and 'website_generated' kept for backward compatibility with existing data
        status: v.union(
            v.literal('draft'),
            v.literal('pending'),
            v.literal('submitted'),
            v.literal('in_review'),
            v.literal('approved'),
            v.literal('rejected'),
            v.literal('deployed'),
            v.literal('pending_payment'),
            v.literal('paid'),
            v.literal('completed'),
            v.literal('website_generated'),
            v.literal('unpublished')
        ),

        // Payment
        amount: v.optional(v.number()),
        paymentReference: v.optional(v.string()),
        paidAt: v.optional(v.number()), // Timestamp
        sentEmailAt: v.optional(v.number()), // Timestamp when payment email was sent to client
        unpublishedAt: v.optional(v.number()), // Timestamp when website was auto-unpublished

        // Creator payout
        creatorPayout: v.optional(v.number()),
        payoutRequestedAt: v.optional(v.number()), // Timestamp
        creatorPaidAt: v.optional(v.number()), // Timestamp

        // Airtable sync
        airtableRecordId: v.optional(v.string()),
        airtableSyncStatus: v.optional(v.string()),

        // ==================== CUSTOM DOMAIN ====================
        // Pricing tier chosen at submission time
        submissionType: v.optional(v.union(
            v.literal('standard'),              // ₱1,000 — free subdomain
            v.literal('with_custom_domain')     // TEST: ₱100 (normally ₱1,500) — includes custom domain
        )),
        // The domain the creator picked on the review page
        requestedDomain: v.optional(v.string()),
        // Domain lifecycle (independent of submission status)
        domainStatus: v.optional(v.union(
            v.literal('not_requested'),      // Standard tier — no domain needed
            v.literal('pending_payment'),    // Awaiting business owner payment
            v.literal('registering'),        // Porkbun registration in progress
            v.literal('configuring_dns'),    // Cloudflare zone + Pages attachment
            v.literal('provisioning_ssl'),   // Waiting for SSL certificate
            v.literal('live'),               // Domain is live, serving the website
            v.literal('failed')              // Setup failed — admin review required
        )),
        domainFailureReason: v.optional(v.string()),
        // Registrar metadata
        registrarOrderId: v.optional(v.string()),
        domainExpiresAt: v.optional(v.number()),
        // Cloudflare zone for this custom domain
        cloudflareZoneId: v.optional(v.string()),
    })
        .index('by_creatorId', ['creatorId'])
        .index('by_status', ['status'])
        .index('by_payoutRequested', ['payoutRequestedAt'])
        .index('by_airtable_sync', ['airtableSyncStatus'])
        .index('by_creator_status', ['creatorId', 'status'])
        .index('by_city', ['city'])
        .index('by_domainStatus', ['domainStatus']),

    // Generated websites - technical/deployment data + content (mobile branch merged websiteContent fields here)
    generatedWebsites: defineTable({
        submissionId: v.id('submissions'),
        templateName: v.optional(v.string()),
        // DEPRECATED: extractedContent and customizations are being moved to websiteContent table
        // Kept for backward compatibility during migration
        extractedContent: v.optional(v.any()),
        customizations: v.optional(v.any()),
        // Technical/build data
        htmlContent: v.optional(v.string()),
        cssContent: v.optional(v.string()),
        htmlStorageId: v.optional(v.id('_storage')),
        // Publishing/deployment
        status: v.optional(v.union(v.literal('draft'), v.literal('published'))),
        publishedUrl: v.optional(v.string()),
        netlifySiteId: v.optional(v.string()), // DEPRECATED - kept for existing data
        cfPagesProjectName: v.optional(v.string()), // Cloudflare Pages project name
        publishedAt: v.optional(v.number()),
        // Domain customization
        subdomain: v.optional(v.string()),
        customDomain: v.optional(v.string()),
        // ==================== CONTENT FIELDS (from mobile branch merge) ====================
        // Hero section
        heroTitle: v.optional(v.string()),
        heroSubtitle: v.optional(v.string()),
        heroHeadline: v.optional(v.string()),
        heroSubHeadline: v.optional(v.string()),
        heroBadgeText: v.optional(v.string()),
        heroCtaLabel: v.optional(v.string()),
        heroCtaLink: v.optional(v.string()),
        heroTestimonial: v.optional(v.string()),
        // About section
        aboutText: v.optional(v.string()),
        aboutDescription: v.optional(v.string()),
        aboutHeadline: v.optional(v.string()),
        aboutTagline: v.optional(v.string()),
        aboutTags: v.optional(v.any()),
        aboutContent: v.optional(v.string()),
        // Featured section
        featuredHeadline: v.optional(v.string()),
        featuredSubHeadline: v.optional(v.string()),
        featuredSubheadline: v.optional(v.string()),
        featuredImages: v.optional(v.any()),
        featuredProducts: v.optional(v.any()),
        // Footer/Navbar
        footerDescription: v.optional(v.string()),
        navbarHeadline: v.optional(v.string()),
        navbarCtaLabel: v.optional(v.string()),
        navbarCtaLink: v.optional(v.string()),
        navbarCtaText: v.optional(v.string()),
        navbarLinks: v.optional(v.any()),
        // Services
        servicesHeadline: v.optional(v.string()),
        servicesSubheadline: v.optional(v.string()),
        servicesDescription: v.optional(v.string()),
        // Contact
        contactCta: v.optional(v.string()),
        // Business info
        businessName: v.optional(v.string()),
        tagline: v.optional(v.string()),
        tone: v.optional(v.string()),
        // Content data
        services: v.optional(v.any()),
        images: v.optional(v.any()),
        contact: v.optional(v.any()),
        contactInfo: v.optional(v.any()),
        uniqueSellingPoints: v.optional(v.any()),
        visibility: v.optional(v.any()),
        socialLinks: v.optional(v.any()),
        // Enhanced images
        enhancedImages: v.optional(v.any()),
        // Tracking
        updatedAt: v.optional(v.number()),
        airtableSyncedAt: v.optional(v.number()),
    })
        .index('by_submissionId', ['submissionId'])
        .index('by_status', ['status']),

    // ==================== AUDIT LOGS ====================
    auditLogs: defineTable({
        adminId: v.string(), // Clerk user ID of the admin
        action: v.union(
            v.literal('submission_approved'),
            v.literal('submission_rejected'),
            v.literal('website_generated'),
            v.literal('website_deployed'),
            v.literal('payment_sent'),
            v.literal('payment_confirmed'),
            v.literal('submission_deleted'),
            v.literal('creator_updated'),
            v.literal('manual_override'),
            v.literal('transcription_regenerated'),
            v.literal('images_enhanced'),
            v.literal('payment_auto_matched'),
            v.literal('payment_partial'),
            v.literal('payment_unmatched'),
            v.literal('payout_sent'),
            v.literal('payout_admin_override')
        ),
        targetType: v.union(
            v.literal('submission'),
            v.literal('creator'),
            v.literal('website'),
            v.literal('withdrawal'),
            v.literal('payment')
        ),
        targetId: v.string(),
        metadata: v.optional(v.any()),
        timestamp: v.number(),
    })
        .index('by_admin', ['adminId'])
        .index('by_target', ['targetType', 'targetId'])
        .index('by_action', ['action'])
        .index('by_timestamp', ['timestamp']),

    // ==================== EARNINGS ====================
    earnings: defineTable({
        creatorId: v.id('creators'),
        submissionId: v.id('submissions'),
        amount: v.number(),
        type: v.union(
            v.literal('submission_approved'),
            v.literal('referral_bonus'),
            v.literal('lead_bonus')
        ),
        status: v.union(
            v.literal('pending'),
            v.literal('available'),
            v.literal('withdrawn')
        ),
        createdAt: v.number(),
    })
        .index('by_creator', ['creatorId'])
        .index('by_submission', ['submissionId']),

    // ==================== WITHDRAWALS ====================
    withdrawals: defineTable({
        creatorId: v.id('creators'),
        amount: v.number(),
        payoutMethod: v.union(
            v.literal('gcash'),
            v.literal('maya'),
            v.literal('bank_transfer'),
            v.literal('wise_email')
        ),
        accountDetails: v.string(),
        accountHolderName: v.optional(v.string()),
        accountNumber: v.optional(v.string()),
        bankCode: v.optional(v.string()),
        bankName: v.optional(v.string()),
        failureReason: v.optional(v.string()),
        wiseEmail: v.optional(v.string()), // Wise payout email
        wiseRecipientId: v.optional(v.string()),
        wiseTransferId: v.optional(v.string()),
        wiseTransactionId: v.optional(v.string()), // Wise API transaction ID
        wiseStatus: v.optional(v.string()), // Status from Wise API (PROCESSING, COMPLETED, etc)
        reference: v.optional(v.string()), // Unique reference for tracking
        errorMessage: v.optional(v.string()), // Error details if transfer failed
        adminNotes: v.optional(v.string()), // Admin notes for manual interventions
        status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
        ),
        processedAt: v.optional(v.number()),
        transactionRef: v.optional(v.string()),
        createdAt: v.number(),
        // Status follow-up tracking (cron job polls Wise API for stalled transfers)
        lastStatusCheckAt: v.optional(v.number()),       // Last time we polled Wise API
        lastStatusEmailAt: v.optional(v.number()),       // Last time we sent a status email to creator
        wiseDetailedState: v.optional(v.string()),       // The latest detailed Wise state (e.g. "verifying", "outgoing_payment_sent")
    })
        .index('by_creator', ['creatorId'])
        .index('by_status', ['status']),

    // ==================== PAYOUT METHODS ====================
    payoutMethods: defineTable({
        creatorId: v.id('creators'),
        type: v.union(
            v.literal('gcash'),
            v.literal('maya'),
            v.literal('bank_transfer'),
            v.literal('wise_email')
        ),
        accountName: v.string(),
        accountNumber: v.string(),
        bankName: v.optional(v.string()),
        bankCode: v.optional(v.string()),
        isDefault: v.boolean(),
    })
        .index('by_creator', ['creatorId']),

    // ==================== LEADS ====================
    leads: defineTable({
        submissionId: v.optional(v.id('submissions')), // Optional — standalone leads don't need a submission
        creatorId: v.optional(v.id('creators')),        // Optional — auto-filled from submission if linked
        businessOwnerId: v.optional(v.string()),
        source: v.union(
            v.literal('website'),
            v.literal('qr_code'),
            v.literal('direct')
        ),
        name: v.string(),
        phone: v.string(),
        email: v.optional(v.string()),
        message: v.optional(v.string()),
        status: v.union(
            v.literal('new'),
            v.literal('contacted'),
            v.literal('qualified'),
            v.literal('converted'),
            v.literal('lost')
        ),
        createdAt: v.number(),
    })
        .index('by_submission', ['submissionId'])
        .index('by_creator', ['creatorId'])
        .index('by_status', ['status']),

    // ==================== LEAD NOTES ====================
    leadNotes: defineTable({
        leadId: v.id('leads'),
        creatorId: v.id('creators'),
        content: v.string(),
        createdAt: v.number(),
    })
        .index('by_lead', ['leadId']),

    // ==================== NOTIFICATIONS ====================
    notifications: defineTable({
        creatorId: v.id('creators'),
        type: v.union(
            v.literal('submission_approved'),
            v.literal('submission_rejected'),
            v.literal('submission_created'),
            v.literal('new_lead'),
            v.literal('payout_sent'),
            v.literal('website_live'),
            v.literal('profile_updated'),
            v.literal('password_changed'),
            v.literal('certification'),
            v.literal('system')
        ),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
        read: v.boolean(),
        sentAt: v.number(),
    })
        .index('by_creator', ['creatorId'])
        .index('by_creator_unread', ['creatorId', 'read']),

    // ==================== PUSH TOKENS ====================
    pushTokens: defineTable({
        creatorId: v.id('creators'),
        token: v.string(),
        platform: v.union(
            v.literal('ios'),
            v.literal('android'),
            v.literal('web')
        ),
        active: v.boolean(),
    })
        .index('by_creator', ['creatorId'])
        .index('by_token', ['token']),

    // ==================== REFERRALS ====================
    referrals: defineTable({
        referrerId: v.id('creators'),
        referredId: v.id('creators'),
        referralCode: v.string(),
        status: v.union(
            v.literal('pending'),
            v.literal('qualified'),
            v.literal('paid')
        ),
        bonusAmount: v.optional(v.number()),
        qualifiedAt: v.optional(v.number()),
        paidAt: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index('by_referrer', ['referrerId'])
        .index('by_referred', ['referredId'])
        .index('by_status', ['status']),

    // ==================== ANALYTICS ====================
    analytics: defineTable({
        creatorId: v.id('creators'),
        period: v.string(), // "2026-02" for monthly, "2026-02-17" for daily
        periodType: v.union(v.literal('daily'), v.literal('monthly')),
        submissionsCount: v.number(),
        approvedCount: v.number(),
        rejectedCount: v.number(),
        leadsGenerated: v.number(),
        earningsTotal: v.number(),
        websitesLive: v.number(),
        referralsCount: v.number(),
        updatedAt: v.number(),
    })
        .index('by_creator_period', ['creatorId', 'periodType', 'period'])
        .index('by_period', ['periodType', 'period']),

    // ==================== WEBSITE ANALYTICS ====================
    websiteAnalytics: defineTable({
        submissionId: v.id('submissions'),
        date: v.string(), // "2026-02-17"
        pageViews: v.number(),
        uniqueVisitors: v.number(),
        contactClicks: v.number(),
        whatsappClicks: v.number(),
        phoneClicks: v.number(),
        formSubmissions: v.number(),
        updatedAt: v.number(),
    })
        .index('by_submission_date', ['submissionId', 'date'])
        .index('by_date', ['date']),

    // ==================== SETTINGS ====================
    settings: defineTable({
        key: v.string(),
        value: v.any(),
        description: v.optional(v.string()),
        updatedAt: v.number(),
        updatedBy: v.optional(v.string()),
    })
        .index('by_key', ['key']),

    // Website content - all editable content with proper typing
    websiteContent: defineTable({
        websiteId: v.optional(v.id('generatedWebsites')),
        submissionId: v.optional(v.id('submissions')), // Legacy field

        // ==================== BUSINESS INFO ====================
        businessName: v.string(),
        tagline: v.optional(v.string()),
        aboutText: v.optional(v.string()),
        tone: v.optional(v.string()),

        // ==================== HERO SECTION ====================
        heroHeadline: v.optional(v.string()),
        heroSubheadline: v.optional(v.string()),
        heroBadgeText: v.optional(v.string()),
        heroTestimonial: v.optional(v.string()),
        heroCtaLabel: v.optional(v.string()),
        heroCtaLink: v.optional(v.string()),

        // ==================== ABOUT SECTION ====================
        aboutHeadline: v.optional(v.string()),
        aboutDescription: v.optional(v.string()),
        aboutTagline: v.optional(v.string()), // Section title for style 3
        aboutTags: v.optional(v.array(v.string())), // Iterable tags for style 3
        uniqueSellingPoints: v.optional(v.array(v.string())),

        // ==================== SERVICES SECTION ====================
        servicesHeadline: v.optional(v.string()),
        servicesSubheadline: v.optional(v.string()),
        services: v.optional(v.array(v.object({
            name: v.string(),
            description: v.string(),
            icon: v.optional(v.string()),
        }))),

        // ==================== FEATURED SECTION ====================
        featuredHeadline: v.optional(v.string()),
        featuredSubheadline: v.optional(v.string()),
        featuredProducts: v.optional(v.array(v.object({
            title: v.string(),
            description: v.string(),
            image: v.optional(v.string()),
            tags: v.optional(v.array(v.string())),
            testimonial: v.optional(v.object({
                quote: v.string(),
                author: v.string(),
                avatar: v.optional(v.string()),
            })),
        }))),
        featuredImages: v.optional(v.array(v.string())), // For style 3 gallery
        featuredCtaText: v.optional(v.string()), // CTA button text for style 4
        featuredCtaLink: v.optional(v.string()), // CTA button link for style 4

        // ==================== CONTACT INFO ====================
        contact: v.optional(v.object({
            email: v.string(),
            phone: v.string(),
            address: v.optional(v.string()),
            whatsapp: v.optional(v.string()),
            messenger: v.optional(v.string()),
        })),

        // ==================== FOOTER ====================
        footerDescription: v.optional(v.string()),
        socialLinks: v.optional(v.array(v.object({
            platform: v.string(),
            url: v.string(),
        }))),

        // ==================== NAVIGATION ====================
        navbarLinks: v.optional(v.array(v.object({
            label: v.string(),
            href: v.string(),
        }))),
        navbarCtaText: v.optional(v.string()),
        navbarCtaLink: v.optional(v.string()),
        navbarHeadline: v.optional(v.string()), // For style 4

        // ==================== IMAGES ====================
        images: v.optional(v.object({
            hero: v.optional(v.array(v.string())),
            about: v.optional(v.array(v.string())),
            services: v.optional(v.array(v.string())),
            featured: v.optional(v.array(v.string())),
            gallery: v.optional(v.array(v.string())),
        })),

        // ==================== VISIBILITY SETTINGS ====================
        visibility: v.optional(v.object({
            navbar: v.optional(v.boolean()),
            navbarHeadline: v.optional(v.boolean()), // For style 4
            heroSection: v.optional(v.boolean()),
            heroHeadline: v.optional(v.boolean()),
            heroTagline: v.optional(v.boolean()),
            heroDescription: v.optional(v.boolean()),
            heroTestimonial: v.optional(v.boolean()),
            heroButton: v.optional(v.boolean()),
            heroImage: v.optional(v.boolean()),
            aboutSection: v.optional(v.boolean()),
            aboutBadge: v.optional(v.boolean()),
            aboutHeadline: v.optional(v.boolean()),
            aboutDescription: v.optional(v.boolean()),
            aboutImages: v.optional(v.boolean()),
            aboutTagline: v.optional(v.boolean()),
            aboutTags: v.optional(v.boolean()),
            servicesSection: v.optional(v.boolean()),
            servicesBadge: v.optional(v.boolean()),
            servicesHeadline: v.optional(v.boolean()),
            servicesSubheadline: v.optional(v.boolean()),
            servicesImage: v.optional(v.boolean()),
            servicesList: v.optional(v.boolean()),
            featuredSection: v.optional(v.boolean()),
            featuredHeadline: v.optional(v.boolean()),
            featuredSubheadline: v.optional(v.boolean()),
            featuredProducts: v.optional(v.boolean()),
            featuredImages: v.optional(v.boolean()), // For style 3 gallery
            footerSection: v.optional(v.boolean()),
            footerBadge: v.optional(v.boolean()),
            footerHeadline: v.optional(v.boolean()),
            footerDescription: v.optional(v.boolean()),
            footerContact: v.optional(v.boolean()),
            footerSocial: v.optional(v.boolean()),
        })),

        // ==================== CUSTOMIZATIONS (STYLES) ====================
        customizations: v.optional(v.object({
            heroStyle: v.optional(v.string()),
            aboutStyle: v.optional(v.string()),
            servicesStyle: v.optional(v.string()),
            galleryStyle: v.optional(v.string()),
            contactStyle: v.optional(v.string()),
            // Legacy fields for backward compat
            navbarStyle: v.optional(v.string()),
            featuredStyle: v.optional(v.string()),
            footerStyle: v.optional(v.string()),
            colorScheme: v.optional(v.string()),
            fontPairing: v.optional(v.string()),
        })),

        // ==================== LEGACY FIELDS ====================
        enhancedImages: v.optional(v.any()),
        contactCta: v.optional(v.string()),
        servicesDescription: v.optional(v.string()),
        heroSubHeadline: v.optional(v.string()),
        airtableSyncedAt: v.optional(v.number()),

        // ==================== METADATA ====================
        updatedAt: v.number(),
    })
        .index('by_websiteId', ['websiteId'])
        .index('by_submissionId', ['submissionId']),

    // ==================== PAYMENT TOKENS ====================
    // Cryptographic tokens for secure payment links (one-time use, expiring)
    paymentTokens: defineTable({
        submissionId: v.id('submissions'),
        token: v.string(),                              // 64-char hex token (32 random bytes)
        referenceCode: v.string(),                      // ND-XXXX-YYYY format
        amount: v.number(),                             // PHP amount expected
        
        status: v.union(
            v.literal('pending'),                       // Created, not used
            v.literal('paid'),                          // Payment received
            v.literal('expired'),                       // Expired without payment
            v.literal('cancelled')                      // Admin cancelled
        ),
        
        createdAt: v.number(),
        expiresAt: v.number(),                          // 30 days from creation
        usedAt: v.optional(v.number()),                 // When token was consumed
        
        emailSentAt: v.optional(v.number()),            // When payment link email was sent
        paymentReceivedAt: v.optional(v.number()),      // When payment confirmed
        
        wiseTransactionId: v.optional(v.string()),      // Wise transaction ID when paid
        adminNotes: v.optional(v.string()),
    })
        .index('by_token', ['token'])
        .index('by_reference', ['referenceCode'])
        .index('by_submissionId', ['submissionId'])
        .index('by_status', ['status'])
        .index('by_expiresAt', ['expiresAt']),
});
