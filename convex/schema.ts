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
        referralCode: v.string(),
        referredBy: v.optional(v.id('creators')),
        balance: v.number(),
        totalEarnings: v.optional(v.number()), // Optional for legacy records
        status: v.optional(v.union(
            v.literal('pending'),
            v.literal('active'),
            v.literal('suspended')
        )), // Optional for legacy records
        role: v.optional(v.union(v.literal('creator'), v.literal('admin'))), // Optional for legacy records
        payoutMethod: v.optional(v.string()),
        payoutDetails: v.optional(v.string()),
        createdAt: v.optional(v.number()), // Timestamp from legacy records
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

        // Generated content
        websiteUrl: v.optional(v.string()),
        websiteCode: v.optional(v.string()),

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
            v.literal('website_generated')
        ),

        // Payment
        amount: v.optional(v.number()),
        paymentReference: v.optional(v.string()),
        paidAt: v.optional(v.number()), // Timestamp

        // Creator payout
        creatorPayout: v.optional(v.number()),
        payoutRequestedAt: v.optional(v.number()), // Timestamp
        creatorPaidAt: v.optional(v.number()), // Timestamp

        // Airtable sync
        airtableRecordId: v.optional(v.string()),
        airtableSyncStatus: v.optional(v.string()),
    })
        .index('by_creatorId', ['creatorId'])
        .index('by_status', ['status'])
        .index('by_payoutRequested', ['payoutRequestedAt']),

    // Generated websites - technical/deployment data only
    generatedWebsites: defineTable({
        submissionId: v.id('submissions'),
        templateName: v.string(),
        // DEPRECATED: extractedContent and customizations are being moved to websiteContent table
        // Kept for backward compatibility during migration
        extractedContent: v.optional(v.any()),
        customizations: v.optional(v.any()),
        // Technical/build data
        htmlContent: v.optional(v.string()),
        cssContent: v.optional(v.string()),
        htmlStorageId: v.optional(v.id('_storage')),
        // Publishing/deployment
        status: v.union(v.literal('draft'), v.literal('published')),
        publishedUrl: v.optional(v.string()),
        netlifySiteId: v.optional(v.string()), // DEPRECATED - kept for existing data
        cfPagesProjectName: v.optional(v.string()), // Cloudflare Pages project name
        publishedAt: v.optional(v.number()),
    })
        .index('by_submissionId', ['submissionId'])
        .index('by_status', ['status']),

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
        .index('by_websiteId', ['websiteId']),
});
