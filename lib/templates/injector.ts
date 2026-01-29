import * as cheerio from 'cheerio'
import { generateNavbarHtml } from './navbar-styles'
import { generateHeroHtml } from './hero-styles'
import { generateAboutHtml } from './about-styles'
import { generateServicesHtml } from './services-styles'
import { generateFeaturedHtml } from './featured-styles'
import { generateFooterHtml } from './footer-styles'
import { generateColorSchemeCss } from './color-schemes'

export interface ExtractedContent {
    business_name: string
    tagline: string
    about: string
    services: Array<{ name: string; description: string }>
    unique_selling_points: string[]
    tone: string
    contact?: {
        phone?: string
        email?: string
        address?: string
    }
    hero_cta?: {
        label: string
        link: string
    }
    services_cta?: {
        label: string
        link: string
    }
    methodology?: {
        title: string
        description?: string
        steps: Array<{ title: string; subtitle?: string; description: string }>
    }
    collection_items?: Array<{ title: string; subtitle: string }>
    offer_section?: {
        title: string
        description: string
    }
    collections_heading?: string
    footer?: {
        brand_blurb: string
        social_links?: Array<{ platform: string; url: string }>
    }
    // Hero section fields
    hero_badge_text?: string
    hero_testimonial?: string
    // Visibility toggles
    visibility?: {
        navbar?: boolean
        navbar_headline?: boolean // For style 4
        hero_section?: boolean // Master toggle for entire hero section
        hero_headline?: boolean
        hero_tagline?: boolean
        hero_description?: boolean
        hero_testimonial?: boolean
        hero_button?: boolean
        hero_image?: boolean
        // About section visibility
        about_section?: boolean // Master toggle for entire about section
        about_badge?: boolean
        about_headline?: boolean
        about_description?: boolean
        about_images?: boolean
        about_tagline?: boolean
        about_tags?: boolean
        // Services section visibility
        services_section?: boolean // Master toggle for entire services section
        services_badge?: boolean
        services_headline?: boolean
        services_subheadline?: boolean
        services_image?: boolean
        services_list?: boolean
        // Featured section visibility
        featured_section?: boolean // Master toggle for entire featured section
        featured_headline?: boolean
        featured_subheadline?: boolean
        featured_products?: boolean
        featured_images?: boolean // For style 3 gallery
        // Footer section visibility
        footer_section?: boolean // Master toggle for entire footer section
        footer_badge?: boolean
        footer_headline?: boolean
        footer_description?: boolean
        footer_contact?: boolean
        footer_social?: boolean
    }
    // Services section fields
    services_headline?: string
    services_subheadline?: string
    services_image?: string
    // Featured section fields
    featured_headline?: string
    featured_subheadline?: string
    featured_products?: Array<{
        title: string
        description: string
        image?: string
        tags?: string[]
        testimonial?: {
            quote: string
            author: string
            avatar?: string
        }
    }>
    featured_images?: string[] // For style 3 gallery
    featured_cta_text?: string // CTA button text for style 4
    featured_cta_link?: string // CTA button link for style 4
    // About section fields
    about_headline?: string
    about_description?: string // Separate description for about section
    about_images?: string[] // Separate images for about section gallery
    about_tagline?: string // Section title for style 3
    about_tags?: string[] // Iterable tags for style 3
    // Navbar fields
    navbar_links?: Array<{ label: string; href: string }>
    navbar_cta_text?: string
    navbar_cta_link?: string
    navbar_headline?: string // For style 4
}

export interface Customizations {
    navbarStyle?: string
    heroStyle?: string
    aboutStyle?: string
    servicesStyle?: string
    featuredStyle?: string
    footerStyle?: string
    colorScheme?: string[]
    fontPairing?: string
    colorSchemeId?: string
    fontPairingId?: string
}

/**
 * Inject extracted content into HTML template using server-side replacement
 * This completely replaces the template content with our generated components
 */
export function injectContent(
    templateHtml: string,
    content: ExtractedContent,
    customizations?: Customizations,
    photos?: string[]
): string {
    const $ = cheerio.load(templateHtml)

    // Update page title
    $('title').text(`${content.business_name} - ${content.tagline}`)

    // STEP 1: Clear ALL content from main and body (except head)
    // Remove all existing content - we're building from scratch with our components
    $('main').empty()
    $('nav').remove()
    $('header').remove()
    $('footer').remove()

    // Remove any divs that might be outside main but inside body
    $('body > div').not('main').remove()
    $('body > section').remove()

    // Ensure main element exists
    let $main = $('main').first()
    if (!$main.length) {
        $('body').append('<main></main>')
        $main = $('main').first()
    }

    // STEP 2: Generate and inject our components in order

    // 2a. Generate Navbar
    let navbarHtml = ''
    if (customizations?.navbarStyle) {
        const navbarProps = {
            businessName: content.business_name,
            links: content.navbar_links,
            ctaText: content.navbar_cta_text,
            ctaLink: content.navbar_cta_link,
            headline: content.navbar_headline,
            visibility: {
                navbar: content.visibility?.navbar,
                navbar_headline: content.visibility?.navbar_headline
            }
        }
        navbarHtml = generateNavbarHtml(customizations.navbarStyle, navbarProps)
    }

    // 2b. Generate Hero (only if hero_section is visible)
    let heroHtml = ''
    if (customizations?.heroStyle && content.visibility?.hero_section !== false) {
        const heroProps = {
            businessName: content.business_name,
            tagline: content.tagline,
            about: content.about,
            heroCta: content.hero_cta,
            photos: photos || [],
            badgeText: content.hero_badge_text,
            testimonial: content.hero_testimonial,
            visibility: content.visibility
        }
        heroHtml = generateHeroHtml(customizations.heroStyle, heroProps)
    }

    // 2c. Generate About (only if about_section is visible)
    let aboutHtml = ''
    if (customizations?.aboutStyle && content.visibility?.about_section !== false) {
        // Use about_description if set, otherwise fall back to about
        const aboutDescription = content.about_description || content.about
        // Use about_images if set, otherwise fall back to photos
        const aboutPhotos = content.about_images && content.about_images.length > 0
            ? content.about_images
            : (photos || [])

        const aboutProps = {
            businessName: content.business_name,
            about: aboutDescription,
            photos: aboutPhotos,
            usps: content.unique_selling_points,
            headline: content.about_headline,
            tagline: content.about_tagline,
            tags: content.about_tags,
            visibility: {
                about_badge: content.visibility?.about_badge,
                about_headline: content.visibility?.about_headline,
                about_description: content.visibility?.about_description,
                about_images: content.visibility?.about_images,
                about_tagline: content.visibility?.about_tagline,
                about_tags: content.visibility?.about_tags
            }
        }
        aboutHtml = generateAboutHtml(customizations.aboutStyle, aboutProps)
    }

    // 2d. Generate Services (only if services_section is visible)
    let servicesHtml = ''
    if (customizations?.servicesStyle && content.visibility?.services_section !== false) {
        // Use services_image if set, otherwise fall back to first photo
        const servicesPhoto = content.services_image
            ? [content.services_image]
            : (photos && photos.length > 0 ? [photos[0]] : [])

        const servicesProps = {
            photos: servicesPhoto,
            services: content.services,
            headline: content.services_headline,
            subheadline: content.services_subheadline,
            visibility: {
                services_badge: content.visibility?.services_badge,
                services_headline: content.visibility?.services_headline,
                services_subheadline: content.visibility?.services_subheadline,
                services_image: content.visibility?.services_image,
                services_list: content.visibility?.services_list
            }
        }
        servicesHtml = generateServicesHtml(customizations.servicesStyle, servicesProps)
    }

    // 2e. Generate Featured (only if featured_section is visible)
    let featuredHtml = ''
    if (customizations?.featuredStyle && content.visibility?.featured_section !== false) {
        const featuredProps = {
            photos: photos || [],
            projects: content.featured_products,
            headline: content.featured_headline,
            subheadline: content.featured_subheadline,
            featuredImages: content.featured_images,
            ctaText: content.featured_cta_text,
            ctaLink: content.featured_cta_link,
            visibility: {
                featured_headline: content.visibility?.featured_headline,
                featured_subheadline: content.visibility?.featured_subheadline,
                featured_products: content.visibility?.featured_products,
                featured_images: content.visibility?.featured_images
            }
        }
        featuredHtml = generateFeaturedHtml(customizations.featuredStyle, featuredProps)
    }

    // 2f. Generate Footer (only if footer_section is visible)
    let footerHtml = ''
    if (customizations?.footerStyle && content.visibility?.footer_section !== false) {
        // Get a featured image for the Craft Footer style (first product image or first photo)
        const featuredProductImage = content.featured_products?.[0]?.image
        const firstPhoto = photos?.[0]
        const footerFeaturedImage = featuredProductImage || firstPhoto

        const footerProps = {
            businessName: content.business_name,
            email: content.contact?.email || 'contact@example.com',
            phone: content.contact?.phone || '+63 900 000 0000',
            address: content.contact?.address,
            description: content.footer?.brand_blurb,
            socialLinks: content.footer?.social_links,
            featuredImage: footerFeaturedImage,
            photos: photos, // Pass uploaded photos for marquee carousel
            visibility: {
                footer_badge: content.visibility?.footer_badge,
                footer_headline: content.visibility?.footer_headline,
                footer_description: content.visibility?.footer_description,
                footer_contact: content.visibility?.footer_contact,
                footer_social: content.visibility?.footer_social
            }
        }
        footerHtml = generateFooterHtml(customizations.footerStyle, footerProps)
    }

    // STEP 3: Inject components in correct order
    // Order: Navbar (in body before main) -> Hero -> About -> Services -> Featured (all in main) -> Footer (after main)

    // Navbar goes at the beginning of body (before main)
    if (navbarHtml) {
        $('body').prepend(`<div id="navbar-section">${navbarHtml}</div>`)
    }

    // Hero section
    if (heroHtml) {
        $main.append(`<div id="hero-section">${heroHtml}</div>`)
    }

    // About section
    if (aboutHtml) {
        $main.append(`<div id="about-section">${aboutHtml}</div>`)
    }

    // Services section
    if (servicesHtml) {
        $main.append(`<div id="services-section">${servicesHtml}</div>`)
    }

    // Featured section
    if (featuredHtml) {
        $main.append(`<div id="featured-section">${featuredHtml}</div>`)
    }

    // Footer goes after main
    if (footerHtml) {
        $main.after(`<div id="footer-section">${footerHtml}</div>`)
    }

    // STEP 4: Apply color scheme
    if (customizations?.colorSchemeId) {
        const colorCss = generateColorSchemeCss(customizations.colorSchemeId)
        $('head').append(colorCss)
    }

    // STEP 5: Apply font pairing
    if (customizations?.fontPairing) {
        const fontPairs = getFontPairing(customizations.fontPairing)
        if (fontPairs) {
            $('head').append(`
                <link href="https://fonts.googleapis.com/css2?family=${fontPairs.heading.replace(' ', '+')}:wght@300;400;500;600;700&family=${fontPairs.body.replace(' ', '+')}:wght@300;400;500;600&display=swap" rel="stylesheet">
                <style>
                    /* Global font override */
                    * {
                        font-family: '${fontPairs.body}', sans-serif !important;
                    }
                    body, p, span, div, a, button, input, textarea, select {
                        font-family: '${fontPairs.body}', sans-serif !important;
                    }
                    h1, h2, h3, h4, h5, h6 {
                        font-family: '${fontPairs.heading}', sans-serif !important;
                    }
                    /* Font class overrides */
                    .font-dm-sans {
                        font-family: '${fontPairs.heading}', sans-serif !important;
                    }
                    .font-manrope {
                        font-family: '${fontPairs.body}', sans-serif !important;
                    }
                </style>
            `)
        }
    }

    return $.html()
}

/**
 * Font pairing presets
 */
const fontPairings: Record<string, { heading: string; body: string }> = {
    'modern': { heading: 'Space Grotesk', body: 'Inter' },
    'classic': { heading: 'Playfair Display', body: 'Source Sans Pro' },
    'elegant': { heading: 'Cormorant Garamond', body: 'Montserrat' },
    'bold': { heading: 'Bebas Neue', body: 'Roboto' },
    'minimal': { heading: 'DM Sans', body: 'DM Sans' },
    'professional': { heading: 'Poppins', body: 'Open Sans' },
    'creative': { heading: 'Righteous', body: 'Nunito' },
    'tech': { heading: 'Orbitron', body: 'Exo 2' },
    'friendly': { heading: 'Quicksand', body: 'Quicksand' },
    'luxury': { heading: 'Cinzel', body: 'Lato' },
}

function getFontPairing(name: string) {
    return fontPairings[name] || fontPairings['modern']
}

export function getAvailableFontPairings() {
    return Object.keys(fontPairings)
}
