import { promises as fs } from 'fs'
import path from 'path'
import { execSync } from 'child_process'

interface ExtractedContent {
    business_name: string
    tagline: string
    about: string
    services?: Array<{ name: string; description: string; icon?: string }>
    unique_selling_points?: string[]
    tone?: string
    contact?: {
        phone?: string
        email?: string
        address?: string
        whatsapp?: string
        messenger?: string
    }
    hero_cta?: { label: string; link: string }
    hero_cta_secondary?: { label: string; link: string }
    hero_badge_text?: string
    hero_testimonial?: string
    visibility?: Record<string, boolean>
    about_headline?: string
    about_description?: string
    about_tagline?: string
    about_tags?: string[]
    about_images?: string[]
    services_headline?: string
    services_subheadline?: string
    services_image?: string
    featured_headline?: string
    featured_subheadline?: string
    featured_products?: Array<{
        title: string
        description: string
        image?: string
        tags?: string[]
        testimonial?: { quote: string; author: string; avatar?: string }
    }>
    featured_images?: string[]
    featured_cta_text?: string
    featured_cta_link?: string
    navbar_links?: Array<{ label: string; href: string }>
    navbar_cta_text?: string
    navbar_cta_link?: string
    navbar_headline?: string
    footer?: {
        brand_blurb?: string
        social_links?: Array<{ platform: string; url: string }>
    }
    images?: string[]
}

interface Customizations {
    navbarStyle?: string
    heroStyle?: string
    aboutStyle?: string
    servicesStyle?: string
    featuredStyle?: string
    footerStyle?: string
    galleryStyle?: string
    contactStyle?: string
    colorScheme?: string
    colorSchemeId?: string
    fontPairing?: string
    fontPairingId?: string
}

/**
 * Map numeric style (1-4) to letter (A-D) for backward compatibility
 */
function mapStyleToLetter(numericStyle: string | undefined, fallback: string = 'A'): string {
    if (!numericStyle) return fallback
    const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F' }
    return map[numericStyle] || numericStyle // Pass through if already a letter
}

/**
 * Transform existing ExtractedContent + Customizations into the Astro site-data.json format
 */
function transformToAstroData(
    content: ExtractedContent,
    customizations: Customizations,
    photos: string[]
) {
    const heroStyle = mapStyleToLetter(customizations.heroStyle)
    const aboutStyle = mapStyleToLetter(customizations.aboutStyle)
    const servicesStyle = mapStyleToLetter(customizations.servicesStyle)
    const galleryStyle = mapStyleToLetter(customizations.galleryStyle || customizations.featuredStyle)
    const contactStyle = mapStyleToLetter(customizations.contactStyle || customizations.footerStyle)

    // Map visibility from snake_case to camelCase
    const vis = content.visibility || {}

    return {
        layout: {
            businessName: content.business_name,
            tagline: content.tagline,
            navLinks: content.navbar_links || [
                { label: 'About', href: '#about' },
                { label: 'Services', href: '#services' },
                { label: 'Gallery', href: '#gallery' },
                { label: 'Contact', href: '#contact' },
            ],
            socialLinks: content.footer?.social_links || [],
            colorScheme: customizations.colorSchemeId || customizations.colorScheme || 'auto',
            fontPairing: customizations.fontPairingId || customizations.fontPairing || 'modern',
            contact: content.contact || {},
        },
        customizations: {
            heroStyle,
            aboutStyle,
            servicesStyle,
            galleryStyle,
            contactStyle,
        },
        visibility: {
            heroSection: vis.hero_section !== false,
            heroHeadline: vis.hero_headline !== false,
            heroTagline: vis.hero_tagline !== false,
            heroDescription: vis.hero_description !== false,
            heroTestimonial: vis.hero_testimonial !== false,
            heroButton: vis.hero_button !== false,
            heroImage: vis.hero_image !== false,
            aboutSection: vis.about_section !== false,
            aboutBadge: vis.about_badge !== false,
            aboutHeadline: vis.about_headline !== false,
            aboutDescription: vis.about_description !== false,
            aboutImages: vis.about_images !== false,
            aboutTagline: vis.about_tagline !== false,
            aboutTags: vis.about_tags !== false,
            servicesSection: vis.services_section !== false,
            servicesBadge: vis.services_badge !== false,
            servicesHeadline: vis.services_headline !== false,
            servicesSubheadline: vis.services_subheadline !== false,
            servicesImage: vis.services_image !== false,
            servicesList: vis.services_list !== false,
            gallerySection: vis.featured_section !== false,
            galleryHeadline: vis.featured_headline !== false,
            gallerySubheadline: vis.featured_subheadline !== false,
            galleryItems: vis.featured_products !== false,
            galleryImages: vis.featured_images !== false,
            contactSection: vis.footer_section !== false,
            contactBadge: vis.footer_badge !== false,
            contactHeadline: vis.footer_headline !== false,
            contactDescription: vis.footer_description !== false,
            contactInfo: vis.footer_contact !== false,
            contactSocial: vis.footer_social !== false,
        },
        hero: {
            businessName: content.business_name,
            headline: content.tagline,
            description: content.about,
            badgeText: content.hero_badge_text,
            testimonial: content.hero_testimonial,
            ctaLabel: content.hero_cta?.label,
            ctaLink: content.hero_cta?.link,
            ctaSecondaryLabel: content.hero_cta_secondary?.label,
            ctaSecondaryLink: content.hero_cta_secondary?.link,
            photos,
            services: content.services?.slice(0, 3),
            visibility: {
                heroHeadline: vis.hero_headline !== false,
                heroTagline: vis.hero_tagline !== false,
                heroDescription: vis.hero_description !== false,
                heroTestimonial: vis.hero_testimonial !== false,
                heroButton: vis.hero_button !== false,
                heroImage: vis.hero_image !== false,
            },
        },
        about: {
            businessName: content.business_name,
            description: content.about_description || content.about,
            headline: content.about_headline || 'About Us',
            tagline: content.about_tagline,
            tags: content.about_tags,
            usps: content.unique_selling_points,
            photos: content.about_images?.length ? content.about_images : photos,
            visibility: {
                aboutBadge: vis.about_badge !== false,
                aboutHeadline: vis.about_headline !== false,
                aboutDescription: vis.about_description !== false,
                aboutImages: vis.about_images !== false,
                aboutTagline: vis.about_tagline !== false,
                aboutTags: vis.about_tags !== false,
            },
        },
        services: {
            headline: content.services_headline || 'Our Services',
            subheadline: content.services_subheadline,
            services: content.services || [
                { name: 'Service 1', description: 'Quality service' },
                { name: 'Service 2', description: 'Professional service' },
                { name: 'Service 3', description: 'Reliable service' },
            ],
            photos: content.services_image ? [content.services_image] : (photos.length > 0 ? [photos[0]] : []),
            visibility: {
                servicesBadge: vis.services_badge !== false,
                servicesHeadline: vis.services_headline !== false,
                servicesSubheadline: vis.services_subheadline !== false,
                servicesImage: vis.services_image !== false,
                servicesList: vis.services_list !== false,
            },
        },
        gallery: {
            headline: content.featured_headline || 'Featured Work',
            subheadline: content.featured_subheadline,
            items: (content.featured_products || []).map((p, i) => ({
                title: p.title,
                description: p.description,
                image: p.image || photos[i],
                tags: p.tags,
                testimonial: p.testimonial,
            })),
            images: content.featured_images,
            ctaText: content.featured_cta_text,
            ctaLink: content.featured_cta_link,
            photos,
            visibility: {
                galleryHeadline: vis.featured_headline !== false,
                gallerySubheadline: vis.featured_subheadline !== false,
                galleryItems: vis.featured_products !== false,
                galleryImages: vis.featured_images !== false,
            },
        },
        contact: {
            businessName: content.business_name,
            email: content.contact?.email || 'contact@example.com',
            phone: content.contact?.phone || '+63 900 000 0000',
            address: content.contact?.address,
            whatsapp: content.contact?.whatsapp,
            messenger: content.contact?.messenger,
            description: content.footer?.brand_blurb,
            socialLinks: content.footer?.social_links,
            photos,
            visibility: {
                contactBadge: vis.footer_badge !== false,
                contactHeadline: vis.footer_headline !== false,
                contactDescription: vis.footer_description !== false,
                contactInfo: vis.footer_contact !== false,
                contactSocial: vis.footer_social !== false,
            },
        },
    }
}

/**
 * Build an Astro site from extracted content and customizations.
 * Writes site-data.json, runs astro build, and returns the generated HTML.
 */
export async function buildAstroSite(
    content: ExtractedContent,
    customizations: Customizations,
    photos: string[]
): Promise<string> {
    const astroDir = path.join(process.cwd(), 'astro-site-template')
    const dataPath = path.join(astroDir, 'src', 'data', 'site-data.json')
    const outputPath = path.join(astroDir, 'dist', 'index.html')

    // 1. Transform data to Astro format
    const siteData = transformToAstroData(content, customizations, photos)

    // 2. Write site-data.json
    await fs.writeFile(dataPath, JSON.stringify(siteData, null, 2), 'utf-8')

    // 3. Run astro build
    try {
        execSync('npm run build', {
            cwd: astroDir,
            stdio: 'pipe',
            timeout: 60000, // 60 second timeout
            env: { ...process.env, NODE_ENV: 'production' },
        })
    } catch (error: any) {
        const stderr = error.stderr?.toString() || ''
        const stdout = error.stdout?.toString() || ''
        throw new Error(`Astro build failed: ${stderr || stdout || error.message}`)
    }

    // 4. Read output HTML
    try {
        const html = await fs.readFile(outputPath, 'utf-8')
        return html
    } catch {
        throw new Error('Astro build completed but output file not found at ' + outputPath)
    }
}

export { transformToAstroData, mapStyleToLetter }
export type { ExtractedContent, Customizations }
