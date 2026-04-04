/**
 * Field configuration for each section's style variants.
 * Supports both letter keys (A-D) for Astro system and numeric keys (1-4) for backward compat.
 */

interface HeroStyleFields {
    usesHeadline: boolean
    usesTagline: boolean
    usesDescription: boolean
    usesTestimonial: boolean
    usesBadge: boolean
    usesButton: boolean
    usesImage: boolean
}

interface AboutStyleFields {
    usesHeadline: boolean
    usesBadge: boolean
    usesDescription: boolean
    usesImages: boolean
    usesUsps: boolean
    usesTagline: boolean
    usesTags: boolean
}

interface ServicesStyleFields {
    usesHeadline: boolean
    usesSubheadline: boolean
    usesBadge: boolean
    usesImage: boolean
    usesList: boolean
    usesCta: boolean
}

interface GalleryStyleFields {
    usesHeadline: boolean
    usesSubheadline: boolean
    usesProducts: boolean
    usesTestimonials: boolean
    usesTags: boolean
    usesImages: boolean
    usesCta: boolean
}

const heroFields: Record<string, HeroStyleFields> = {
    'A': { usesHeadline: true, usesTagline: true, usesDescription: true, usesTestimonial: true, usesBadge: true, usesButton: true, usesImage: true },
    'B': { usesHeadline: true, usesTagline: false, usesDescription: false, usesTestimonial: false, usesBadge: false, usesButton: false, usesImage: true },
    'C': { usesHeadline: true, usesTagline: true, usesDescription: false, usesTestimonial: false, usesBadge: false, usesButton: true, usesImage: true },
    'D': { usesHeadline: true, usesTagline: true, usesDescription: true, usesTestimonial: false, usesBadge: true, usesButton: false, usesImage: true },
    'E': { usesHeadline: true, usesTagline: true, usesDescription: true, usesTestimonial: true, usesBadge: true, usesButton: true, usesImage: true },
    'F': { usesHeadline: true, usesTagline: true, usesDescription: true, usesTestimonial: false, usesBadge: true, usesButton: true, usesImage: true },
    'G': { usesHeadline: true, usesTagline: true, usesDescription: true, usesTestimonial: false, usesBadge: true, usesButton: true, usesImage: true },
    'H': { usesHeadline: true, usesTagline: true, usesDescription: true, usesTestimonial: false, usesBadge: true, usesButton: true, usesImage: true },
    'I': { usesHeadline: true, usesTagline: true, usesDescription: true, usesTestimonial: false, usesBadge: true, usesButton: true, usesImage: true },
    'J': { usesHeadline: true, usesTagline: true, usesDescription: true, usesTestimonial: false, usesBadge: true, usesButton: true, usesImage: true },
}

const aboutFields: Record<string, AboutStyleFields> = {
    'A': { usesHeadline: true, usesBadge: true, usesDescription: true, usesImages: true, usesUsps: true, usesTagline: false, usesTags: false },
    'B': { usesHeadline: false, usesBadge: true, usesDescription: true, usesImages: true, usesUsps: false, usesTagline: false, usesTags: false },
    'C': { usesHeadline: true, usesBadge: false, usesDescription: true, usesImages: true, usesUsps: false, usesTagline: true, usesTags: true },
    'D': { usesHeadline: false, usesBadge: true, usesDescription: true, usesImages: true, usesUsps: false, usesTagline: false, usesTags: false },
    'E': { usesHeadline: true, usesBadge: true, usesDescription: true, usesImages: true, usesUsps: true, usesTagline: false, usesTags: true },
    'F': { usesHeadline: true, usesBadge: true, usesDescription: true, usesImages: true, usesUsps: true, usesTagline: true, usesTags: false },
    'G': { usesHeadline: true, usesBadge: false, usesDescription: true, usesImages: true, usesUsps: true, usesTagline: true, usesTags: false },
    'H': { usesHeadline: true, usesBadge: true, usesDescription: true, usesImages: true, usesUsps: true, usesTagline: true, usesTags: true },
    'I': { usesHeadline: true, usesBadge: true, usesDescription: true, usesImages: false, usesUsps: true, usesTagline: true, usesTags: true },
    'J': { usesHeadline: true, usesBadge: true, usesDescription: true, usesImages: true, usesUsps: true, usesTagline: true, usesTags: true },
}

const servicesFields: Record<string, ServicesStyleFields> = {
    'A': { usesHeadline: true, usesSubheadline: true, usesBadge: true, usesImage: true, usesList: true, usesCta: false },
    'B': { usesHeadline: true, usesSubheadline: false, usesBadge: false, usesImage: false, usesList: true, usesCta: false },
    'C': { usesHeadline: true, usesSubheadline: true, usesBadge: true, usesImage: false, usesList: true, usesCta: false },
    'D': { usesHeadline: true, usesSubheadline: true, usesBadge: true, usesImage: true, usesList: true, usesCta: false },
    'E': { usesHeadline: true, usesSubheadline: false, usesBadge: true, usesImage: false, usesList: true, usesCta: false },
    'F': { usesHeadline: true, usesSubheadline: true, usesBadge: true, usesImage: false, usesList: true, usesCta: false },
    'G': { usesHeadline: true, usesSubheadline: true, usesBadge: true, usesImage: false, usesList: true, usesCta: false },
    'H': { usesHeadline: true, usesSubheadline: true, usesBadge: true, usesImage: false, usesList: true, usesCta: true },
    'I': { usesHeadline: true, usesSubheadline: true, usesBadge: true, usesImage: false, usesList: true, usesCta: true },
    'J': { usesHeadline: true, usesSubheadline: true, usesBadge: true, usesImage: false, usesList: true, usesCta: true },
}

const galleryFields: Record<string, GalleryStyleFields> = {
    'A': { usesHeadline: true, usesSubheadline: true, usesProducts: true, usesTestimonials: true, usesTags: true, usesImages: false, usesCta: false },
    'B': { usesHeadline: true, usesSubheadline: true, usesProducts: true, usesTestimonials: false, usesTags: true, usesImages: false, usesCta: false },
    'C': { usesHeadline: true, usesSubheadline: true, usesProducts: false, usesTestimonials: false, usesTags: false, usesImages: true, usesCta: false },
    'D': { usesHeadline: true, usesSubheadline: true, usesProducts: true, usesTestimonials: false, usesTags: true, usesImages: false, usesCta: true },
    'E': { usesHeadline: true, usesSubheadline: true, usesProducts: true, usesTestimonials: true, usesTags: true, usesImages: false, usesCta: false },
    'F': { usesHeadline: true, usesSubheadline: true, usesProducts: true, usesTestimonials: false, usesTags: true, usesImages: false, usesCta: true },
    'G': { usesHeadline: true, usesSubheadline: true, usesProducts: true, usesTestimonials: true, usesTags: true, usesImages: false, usesCta: false },
    'H': { usesHeadline: true, usesSubheadline: true, usesProducts: true, usesTestimonials: false, usesTags: true, usesImages: false, usesCta: true },
    'I': { usesHeadline: true, usesSubheadline: true, usesProducts: true, usesTestimonials: false, usesTags: true, usesImages: false, usesCta: true },
    'J': { usesHeadline: true, usesSubheadline: true, usesProducts: true, usesTestimonials: false, usesTags: true, usesImages: false, usesCta: true },
}

// Map numeric keys to letters for backward compat
const numToLetter: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H', '9': 'I', '10': 'J' }
function normalize(style: string): string {
    return numToLetter[style] || style
}

export function getHeroStyleFields(style: string): HeroStyleFields {
    return heroFields[normalize(style)] || heroFields['A']
}

export function getAboutStyleFields(style: string): AboutStyleFields {
    return aboutFields[normalize(style)] || aboutFields['A']
}

export function getServicesStyleFields(style: string): ServicesStyleFields {
    return servicesFields[normalize(style)] || servicesFields['A']
}

export function getGalleryStyleFields(style: string): GalleryStyleFields {
    return galleryFields[normalize(style)] || galleryFields['A']
}

