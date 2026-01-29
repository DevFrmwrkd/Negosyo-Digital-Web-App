import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';

/**
 * Get migration status
 */
export const getMigrationStatus = query({
    args: {},
    handler: async (ctx) => {
        const generatedWebsites = await ctx.db.query('generatedWebsites').collect();
        const websiteContent = await ctx.db.query('websiteContent').collect();

        // Count websites with extractedContent (need migration)
        const needsMigration = generatedWebsites.filter(
            (gw) => gw.extractedContent && !websiteContent.some((wc) => wc.websiteId === gw._id)
        );

        return {
            totalWebsites: generatedWebsites.length,
            migratedCount: websiteContent.length,
            needsMigrationCount: needsMigration.length,
            isComplete: needsMigration.length === 0,
        };
    },
});

/**
 * Migrate extractedContent from generatedWebsites to websiteContent table
 */
export const migrateWebsiteContent = mutation({
    args: {},
    handler: async (ctx) => {
        const generatedWebsites = await ctx.db.query('generatedWebsites').collect();
        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const gw of generatedWebsites) {
            // Check if already migrated
            const existing = await ctx.db
                .query('websiteContent')
                .withIndex('by_websiteId', (q) => q.eq('websiteId', gw._id))
                .first();

            if (existing) {
                skippedCount++;
                continue;
            }

            // Skip if no extractedContent
            if (!gw.extractedContent) {
                skippedCount++;
                continue;
            }

            try {
                const content = gw.extractedContent;
                const customizations = gw.customizations || {};
                const now = Date.now();

                // Map extractedContent fields to websiteContent schema
                await ctx.db.insert('websiteContent', {
                    websiteId: gw._id,

                    // Business info
                    businessName: content.business_name || '',
                    tagline: content.tagline || '',
                    aboutText: content.about || '',
                    tone: content.tone,

                    // Hero section
                    heroHeadline: content.hero_headline,
                    heroSubheadline: content.hero_sub_headline,
                    heroBadgeText: content.hero_badge_text,
                    heroTestimonial: content.hero_testimonial,
                    heroCtaLabel: content.hero_cta_label,
                    heroCtaLink: content.hero_cta_link,

                    // About section
                    aboutHeadline: content.about_headline,
                    aboutDescription: content.about_description,
                    uniqueSellingPoints: content.unique_selling_points,

                    // Services section
                    servicesHeadline: content.services_headline,
                    servicesSubheadline: content.services_subheadline,
                    services: content.services?.map((s: { name?: string; title?: string; description?: string; icon?: string }) => ({
                        name: s.name || s.title || '',
                        description: s.description || '',
                        icon: s.icon,
                    })),

                    // Featured section
                    featuredHeadline: content.featured_headline,
                    featuredSubheadline: content.featured_subheadline,
                    featuredProducts: content.featured_products?.map((p: {
                        title?: string;
                        description?: string;
                        image?: string;
                        tags?: string[];
                        testimonial?: { quote?: string; author?: string; avatar?: string };
                    }) => ({
                        title: p.title || '',
                        description: p.description || '',
                        image: p.image,
                        tags: p.tags,
                        testimonial: p.testimonial ? {
                            quote: p.testimonial.quote || '',
                            author: p.testimonial.author || '',
                            avatar: p.testimonial.avatar,
                        } : undefined,
                    })),

                    // Contact info
                    contact: content.contact ? {
                        email: content.contact.email || '',
                        phone: content.contact.phone || '',
                        address: content.contact.address,
                        whatsapp: content.contact.whatsapp,
                        messenger: content.contact.messenger,
                    } : undefined,

                    // Footer
                    footerDescription: content.footer?.brand_blurb,
                    socialLinks: content.footer?.social_links?.map((l: { platform?: string; url?: string }) => ({
                        platform: l.platform || '',
                        url: l.url || '',
                    })),

                    // Navigation
                    navbarLinks: content.navbar_links?.map((l: { label?: string; href?: string }) => ({
                        label: l.label || '',
                        href: l.href || '',
                    })),

                    // Images
                    images: content.images ? {
                        hero: Array.isArray(content.images.hero) ? content.images.hero :
                              (content.images.hero ? [content.images.hero] : undefined),
                        about: Array.isArray(content.images.about) ? content.images.about :
                               (content.images.about ? [content.images.about] : undefined),
                        services: Array.isArray(content.images.services) ? content.images.services :
                                  (content.images.services ? [content.images.services] : undefined),
                        featured: Array.isArray(content.images.featured) ? content.images.featured :
                                  (content.images.featured ? [content.images.featured] : undefined),
                        gallery: Array.isArray(content.images.gallery) ? content.images.gallery :
                                 (content.images.gallery ? [content.images.gallery] : undefined),
                    } : undefined,

                    // Visibility settings
                    visibility: content.visibility ? {
                        navbar: content.visibility.navbar,
                        heroSection: content.visibility.hero_section,
                        heroHeadline: content.visibility.hero_headline,
                        heroTagline: content.visibility.hero_tagline,
                        heroDescription: content.visibility.hero_description,
                        heroTestimonial: content.visibility.hero_testimonial,
                        heroButton: content.visibility.hero_button,
                        heroImage: content.visibility.hero_image,
                        aboutSection: content.visibility.about_section,
                        aboutBadge: content.visibility.about_badge,
                        aboutHeadline: content.visibility.about_headline,
                        aboutDescription: content.visibility.about_description,
                        aboutImages: content.visibility.about_images,
                        servicesSection: content.visibility.services_section,
                        servicesBadge: content.visibility.services_badge,
                        servicesHeadline: content.visibility.services_headline,
                        servicesSubheadline: content.visibility.services_subheadline,
                        servicesImage: content.visibility.services_image,
                        servicesList: content.visibility.services_list,
                        featuredSection: content.visibility.featured_section,
                        featuredHeadline: content.visibility.featured_headline,
                        featuredSubheadline: content.visibility.featured_subheadline,
                        featuredProducts: content.visibility.featured_products,
                        footerSection: content.visibility.footer_section,
                        footerBadge: content.visibility.footer_badge,
                        footerHeadline: content.visibility.footer_headline,
                        footerDescription: content.visibility.footer_description,
                        footerContact: content.visibility.footer_contact,
                        footerSocial: content.visibility.footer_social,
                    } : undefined,

                    // Customizations (styles)
                    customizations: {
                        navbarStyle: customizations.navbarStyle,
                        heroStyle: customizations.heroStyle,
                        aboutStyle: customizations.aboutStyle,
                        servicesStyle: customizations.servicesStyle,
                        featuredStyle: customizations.featuredStyle,
                        footerStyle: customizations.footerStyle,
                        colorScheme: customizations.colorScheme,
                        fontPairing: customizations.fontPairing,
                    },

                    updatedAt: now,
                });

                migratedCount++;
            } catch (error) {
                console.error(`Error migrating website ${gw._id}:`, error);
                errorCount++;
            }
        }

        return {
            total: generatedWebsites.length,
            migrated: migratedCount,
            skipped: skippedCount,
            errors: errorCount,
        };
    },
});

/**
 * Verify migration integrity
 */
export const verifyMigration = query({
    args: {},
    handler: async (ctx) => {
        const issues: string[] = [];

        const generatedWebsites = await ctx.db.query('generatedWebsites').collect();

        for (const gw of generatedWebsites) {
            // Skip websites without extractedContent
            if (!gw.extractedContent) continue;

            const content = await ctx.db
                .query('websiteContent')
                .withIndex('by_websiteId', (q) => q.eq('websiteId', gw._id))
                .first();

            if (!content) {
                issues.push(`Website ${gw._id} has no migrated content`);
                continue;
            }

            // Verify key fields match
            const ec = gw.extractedContent;
            if (ec.business_name && content.businessName !== ec.business_name) {
                issues.push(`Website ${gw._id}: businessName mismatch`);
            }
            if (ec.tagline && content.tagline !== ec.tagline) {
                issues.push(`Website ${gw._id}: tagline mismatch`);
            }
        }

        return {
            isValid: issues.length === 0,
            issueCount: issues.length,
            issues: issues.slice(0, 20), // Return first 20 issues
        };
    },
});
