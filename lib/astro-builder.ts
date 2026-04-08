import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
// Static imports for @vercel/nft tracing — serverExternalPackages prevents webpack from bundling
// these, but nft still traces them and deploys all transitive deps to /var/task/node_modules/.
// They're used by the worker script (astro-build-worker.mjs) at runtime.
import 'astro'
import '@tailwindcss/vite'

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
    // Style G extra fields
    footer_badge?: string
    footer_headline?: string
    footer_hours?: string
    footer_days?: string
    about_signature_name?: string
    about_signature_role?: string
    about_headline?: string
    about_description?: string
    about_tagline?: string
    about_tags?: string[]
    about_images?: string[]
    services_headline?: string
    services_subheadline?: string
    services_image?: string
    services_cta?: { label: string; link: string }
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
    const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H', '9': 'I', '10': 'J' }
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
            navbarStyle: heroStyle,
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
            galleryCta: vis.featured_cta !== false,
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
            signatureName: content.about_signature_name,
            signatureRole: content.about_signature_role,
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
            ctaLabel: content.services_cta?.label,
            ctaLink: content.services_cta?.link,
            visibility: {
                servicesBadge: vis.services_badge !== false,
                servicesHeadline: vis.services_headline !== false,
                servicesSubheadline: vis.services_subheadline !== false,
                servicesImage: vis.services_image !== false,
                servicesList: vis.services_list !== false,
                servicesButton: vis.services_button !== false,
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
                galleryCta: vis.featured_cta !== false,
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
            badgeText: content.footer_badge,
            headline: content.footer_headline,
            days: content.footer_days,
            hours: content.footer_hours,
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
 * Recursively copy a directory, skipping specified folder names.
 */
async function copyDir(src: string, dest: string, skip: Set<string> = new Set()): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })
    for (const entry of entries) {
        if (skip.has(entry.name)) continue
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath, skip)
        } else {
            await fs.copyFile(srcPath, destPath)
        }
    }
}

/**
 * Build an Astro site from extracted content and customizations.
 * Writes site-data.json, runs astro build, and returns the generated HTML.
 *
 * On Vercel (read-only filesystem), copies the template to /tmp/ and builds there.
 */
export async function buildAstroSite(
    content: ExtractedContent,
    customizations: Customizations,
    photos: string[]
): Promise<string> {
    const sourceDir = path.join(process.cwd(), 'astro-site-template')

    // Detect read-only filesystem (Vercel) by checking if we can write to the source dir
    const isReadOnly = await fs.writeFile(
        path.join(sourceDir, '.write-test'), ''
    ).then(() => {
        fs.unlink(path.join(sourceDir, '.write-test')).catch(() => {})
        return false
    }).catch(() => true)

    let astroDir: string
    if (isReadOnly) {
        // Copy template source to /tmp/ (Vercel filesystem is read-only)
        astroDir = path.join(os.tmpdir(), `astro-build-${Date.now()}`)
        console.log(`[ASTRO] Read-only filesystem detected, building in ${astroDir}`)
        await copyDir(sourceDir, astroDir, new Set(['node_modules', 'dist', '.astro']))
        // Symlink node_modules so the worker's import 'astro' resolves from /var/task/node_modules
        const rootNM = path.join(process.cwd(), 'node_modules')
        try {
            await fs.symlink(rootNM, path.join(astroDir, 'node_modules'), 'dir')
            console.log(`[ASTRO] Symlinked node_modules → ${rootNM}`)
        } catch (e) {
            console.warn(`[ASTRO] Symlink failed:`, e)
        }
    } else {
        astroDir = sourceDir
    }

    const dataPath = path.join(astroDir, 'src', 'data', 'site-data.json')
    const outputPath = path.join(astroDir, 'dist', 'index.html')

    // 1. Transform data to Astro format
    const siteData = transformToAstroData(content, customizations, photos)

    // 2. Write site-data.json + ensure .astro cache dir exists
    await fs.writeFile(dataPath, JSON.stringify(siteData, null, 2), 'utf-8')
    await fs.mkdir(path.join(astroDir, '.astro'), { recursive: true })

    // 3. Run astro build via worker script (child process with cwd = astroDir)
    //    - Worker runs with cwd set to the build dir, so Astro's .astro/ cache resolves correctly
    //    - astro & @tailwindcss/vite are statically imported above for nft tracing only
    //    - serverExternalPackages ensures they're deployed to /var/task/node_modules/
    //    - Worker resolves them via node_modules symlink (local) or /var/task/node_modules (Vercel)
    const workerScript = path.join(process.cwd(), 'lib', 'astro-build-worker.mjs')
    console.log(`[ASTRO] Building site from ${astroDir} via worker`)
    try {
        const output = execSync(`node "${workerScript}" "${astroDir}"`, {
            cwd: astroDir,
            stdio: 'pipe',
            timeout: 60000,
            env: { ...process.env, NODE_ENV: 'production' },
        })
        const stdout = output.toString()
        if (!stdout.includes('ASTRO_BUILD_SUCCESS')) {
            throw new Error(stdout)
        }
    } catch (error: any) {
        const stderr = error.stderr?.toString() || ''
        const stdout = error.stdout?.toString() || ''
        throw new Error(`Astro build failed: ${stderr || stdout || error.message}`)
    }

    // 4. Read output HTML
    let html: string
    try {
        html = await fs.readFile(outputPath, 'utf-8')
    } catch {
        throw new Error('Astro build completed but output file not found at ' + outputPath)
    }

    // 5. Clean up temp directory if we created one
    if (astroDir !== sourceDir) {
        fs.rm(astroDir, { recursive: true, force: true }).catch(() => {})
    }

    console.log(`[ASTRO] Build complete: ${(html.length / 1024).toFixed(0)}KB HTML`)
    return html
}

export { transformToAstroData, mapStyleToLetter }
export type { ExtractedContent, Customizations }
