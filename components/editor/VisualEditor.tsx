import { useState, useEffect, useRef, useMemo } from 'react'
import { Save, RotateCcw, Eye, EyeOff, Image as ImageIcon, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { getHeroStyleFields } from '@/lib/templates/hero-styles'
import { getServicesStyleFields } from '@/lib/templates/services-styles'
import { getAboutStyleFields } from '@/lib/templates/about-styles'
import { getFeaturedStyleFields } from '@/lib/templates/featured-styles'
import { getNavbarStyleFields } from '@/lib/templates/navbar-styles'

interface Service {
    name: string
    description: string
}

interface CollectionItem {
    title: string
    subtitle: string
}

interface MethodologyStep {
    title: string
    subtitle: string
    description: string
}

interface WebsiteContent {
    business_name: string
    tagline: string
    about: string
    services: Service[]
    images?: string[]
    contact?: {
        phone?: string
        email?: string
        address?: string
    }
    // New fields
    methodology?: {
        title: string
        description: string
        steps: MethodologyStep[]
    }
    collection_items?: CollectionItem[]
    offer_section?: {
        title: string
        description: string
    }
    collections_heading?: string
    footer?: {
        brand_blurb?: string
        social_links?: { platform: string; url: string }[]
    }
    hero_cta?: {
        label: string
        link: string
    }
    services_cta?: {
        label: string
        link: string
    }
    unique_selling_points?: string[]
    // Hero section fields
    hero_badge_text?: string
    hero_testimonial?: string
    // Visibility toggles for hero section
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
    // Navbar fields
    navbar_links?: Array<{ label: string; href: string }>
    navbar_cta_text?: string
    navbar_cta_link?: string
    navbar_headline?: string // For style 4 - navbar tagline
    // About section fields
    about_headline?: string
    about_description?: string // Separate description for about section
    about_images?: string[] // Separate images for about section gallery
    about_tagline?: string // Section title for style 3
    about_tags?: string[] // Iterable tags for style 3
    // Services section fields
    services_headline?: string
    services_subheadline?: string
    services_image?: string // Single image for services section
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
        }
    }>
    featured_images?: string[] // For style 3 gallery
    featured_cta_text?: string // CTA button text for style 4
    featured_cta_link?: string // CTA button link for style 4
}

interface VisualEditorProps {
    initialContent: WebsiteContent
    htmlContent: string
    submissionId: string
    onSave: (content: WebsiteContent) => Promise<void>
    availableImages?: string[] // Images from submission stored in Convex
    navbarStyle?: string // Navbar section style variant
    heroStyle?: string // Hero section style variant
    aboutStyle?: string // About section style variant
    servicesStyle?: string // Services section style variant
    featuredStyle?: string // Featured section style variant
}

export default function VisualEditor({
    initialContent,
    htmlContent,
    submissionId,
    onSave,
    availableImages = [],
    navbarStyle = '1',
    heroStyle = '1',
    aboutStyle = '1',
    servicesStyle = '1',
    featuredStyle = '1'
}: VisualEditorProps) {
    const [content, setContent] = useState<WebsiteContent>(initialContent)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null)
    const [iframeDoc, setIframeDoc] = useState<Document | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const aboutFileInputRef = useRef<HTMLInputElement>(null)
    const servicesFileInputRef = useRef<HTMLInputElement>(null)
    const featuredFileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isUploadingAboutImage, setIsUploadingAboutImage] = useState(false)
    const [isUploadingServicesImage, setIsUploadingServicesImage] = useState(false)
    const [isUploadingFeaturedImage, setIsUploadingFeaturedImage] = useState(false)
    const [showImagePicker, setShowImagePicker] = useState(false)
    const [showAboutImagePicker, setShowAboutImagePicker] = useState(false)
    const [showServicesImagePicker, setShowServicesImagePicker] = useState(false)
    const [showFeaturedImagePicker, setShowFeaturedImagePicker] = useState(false)
    const [resolvedHeroImage, setResolvedHeroImage] = useState<string | null>(null)
    const [resolvedImages, setResolvedImages] = useState<(string | null)[]>([]) // For carousel images
    const [resolvedAboutImages, setResolvedAboutImages] = useState<string[]>([])
    const [resolvedServicesImage, setResolvedServicesImage] = useState<string | null>(null)
    const [resolvedFeaturedImages, setResolvedFeaturedImages] = useState<string[]>([])

    // Get which fields the current navbar style uses
    const navbarFields = useMemo(() => getNavbarStyleFields(navbarStyle), [navbarStyle])

    // Get which fields the current hero style uses
    const heroFields = useMemo(() => getHeroStyleFields(heroStyle), [heroStyle])

    // Get which fields the current about style uses
    const aboutFields = useMemo(() => getAboutStyleFields(aboutStyle), [aboutStyle])

    // Get which fields the current services style uses
    const servicesFields = useMemo(() => getServicesStyleFields(servicesStyle), [servicesStyle])

    // Get which fields the current featured style uses
    const featuredFields = useMemo(() => getFeaturedStyleFields(featuredStyle), [featuredStyle])

    // Sync initialContent changes to content state (for when props update after mount)
    useEffect(() => {
        // Only update if initialContent has images and we don't have unsaved changes
        if (initialContent.images && initialContent.images.length > 0 && !hasChanges) {
            setContent(prev => ({
                ...prev,
                images: initialContent.images
            }))
        }
    }, [initialContent.images, hasChanges])

    // Convex mutation for file upload
    const generateUploadUrl = useMutation(api.files.generateUploadUrl)

    // Resolve hero image URL - handles both convex:xxx format and raw storage IDs
    const heroImage = content.images?.[0]
    const needsResolution = heroImage && !heroImage.startsWith('http')
    const resolvedImageUrls = useQuery(
        api.files.getMultipleUrls,
        needsResolution && heroImage ? { storageIds: [heroImage] } : 'skip'
    )

    // Update resolved hero image when query returns
    useEffect(() => {
        if (resolvedImageUrls && resolvedImageUrls[0]) {
            setResolvedHeroImage(resolvedImageUrls[0])
        } else if (heroImage?.startsWith('http')) {
            // It's already a regular URL
            setResolvedHeroImage(heroImage)
        }
    }, [resolvedImageUrls, heroImage])

    // Resolve all hero images for carousel (style 3)
    const allHeroImages = content.images || []
    const heroStorageIdsToResolve = allHeroImages.filter(img => img && !img.startsWith('http'))
    const resolvedAllHeroImageUrls = useQuery(
        api.files.getMultipleUrls,
        heroStorageIdsToResolve.length > 0 ? { storageIds: heroStorageIdsToResolve } : 'skip'
    )

    // Update resolved carousel images when query returns
    useEffect(() => {
        if (allHeroImages.length > 0) {
            const resolved = allHeroImages.map((img) => {
                if (img?.startsWith('http')) {
                    return img
                }
                // Find the resolved URL for this storage ID
                const storageIdIndex = heroStorageIdsToResolve.indexOf(img)
                if (resolvedAllHeroImageUrls && storageIdIndex !== -1) {
                    return resolvedAllHeroImageUrls[storageIdIndex] || null
                }
                return null
            })
            setResolvedImages(resolved)
        } else {
            setResolvedImages([])
        }
    }, [resolvedAllHeroImageUrls, allHeroImages.join(','), heroStorageIdsToResolve.join(',')])

    // Resolve about images URLs - handles both convex:xxx format and raw storage IDs
    const aboutImagesFromContent = content.about_images || []
    const aboutStorageIdsToResolve = aboutImagesFromContent
        .filter(img => img && !img.startsWith('http'))
    const resolvedAboutImageUrls = useQuery(
        api.files.getMultipleUrls,
        aboutStorageIdsToResolve.length > 0 ? { storageIds: aboutStorageIdsToResolve } : 'skip'
    )

    // Update resolved about images when query returns
    useEffect(() => {
        const currentAboutImages = content.about_images || []
        if (currentAboutImages.length > 0) {
            const storageIdsToResolve = currentAboutImages.filter(img => img && !img.startsWith('http'))
            const resolved = currentAboutImages.map((img) => {
                if (img?.startsWith('http')) {
                    return img
                }
                // Find the resolved URL for this storage ID
                const storageIdIndex = storageIdsToResolve.indexOf(img)
                if (resolvedAboutImageUrls && storageIdIndex !== -1) {
                    return resolvedAboutImageUrls[storageIdIndex] || img
                }
                return img
            })
            setResolvedAboutImages(resolved)
        } else {
            setResolvedAboutImages([])
        }
    }, [resolvedAboutImageUrls, content.about_images])

    // Resolve services image URL - handles both convex:xxx format and raw storage IDs
    const servicesImage = content.services_image
    const servicesNeedsResolution = servicesImage && !servicesImage.startsWith('http')
    const resolvedServicesImageUrls = useQuery(
        api.files.getMultipleUrls,
        servicesNeedsResolution && servicesImage ? { storageIds: [servicesImage] } : 'skip'
    )

    // Update resolved services image when query returns
    useEffect(() => {
        if (resolvedServicesImageUrls && resolvedServicesImageUrls[0]) {
            setResolvedServicesImage(resolvedServicesImageUrls[0])
        } else if (servicesImage?.startsWith('http')) {
            setResolvedServicesImage(servicesImage)
        } else {
            setResolvedServicesImage(null)
        }
    }, [resolvedServicesImageUrls, servicesImage])

    // Resolve featured images URLs - handles both convex:xxx format and raw storage IDs
    const featuredImagesFromContent = content.featured_images || []
    const featuredStorageIdsToResolve = featuredImagesFromContent
        .filter(img => img && !img.startsWith('http'))
    const resolvedFeaturedImageUrls = useQuery(
        api.files.getMultipleUrls,
        featuredStorageIdsToResolve.length > 0 ? { storageIds: featuredStorageIdsToResolve } : 'skip'
    )

    // Update resolved featured images when query returns
    useEffect(() => {
        const currentFeaturedImages = content.featured_images || []
        if (currentFeaturedImages.length > 0) {
            const storageIdsToResolve = currentFeaturedImages.filter(img => img && !img.startsWith('http'))
            const resolved = currentFeaturedImages.map((img) => {
                if (img?.startsWith('http')) {
                    return img
                }
                // Find the resolved URL for this storage ID
                const storageIdIndex = storageIdsToResolve.indexOf(img)
                if (resolvedFeaturedImageUrls && storageIdIndex !== -1) {
                    return resolvedFeaturedImageUrls[storageIdIndex] || img
                }
                return img
            })
            setResolvedFeaturedImages(resolved)
        } else {
            setResolvedFeaturedImages([])
        }
    }, [resolvedFeaturedImageUrls, content.featured_images])

    // Initialize missing fields with defaults on mount
    useEffect(() => {
        setContent(prev => {
            const next = { ...prev }
            let changed = false

            if (!next.methodology) {
                next.methodology = {
                    title: `Why Choose ${prev.business_name}`,
                    description: '',
                    steps: [
                        { title: 'Discover', subtitle: '', description: 'Identify your needs and explore our curated offerings.' },
                        { title: 'Apply', subtitle: '', description: 'Select the best options tailored for you.' },
                        { title: 'Master', subtitle: '', description: 'Experience excellence and achieve your goals.' }
                    ]
                }
                changed = true
            }

            if (!next.collection_items || next.collection_items.length === 0) {
                next.collection_items = [
                    { title: 'Technology', subtitle: 'Track' },
                    { title: 'Design Strategy', subtitle: 'Track' },
                    { title: 'Leadership', subtitle: 'Track' },
                    { title: 'Culture', subtitle: 'Track' }
                ]
                changed = true
            }

            if (!next.footer) {
                next.footer = {
                    brand_blurb: prev.about || '',
                    social_links: []
                }
                changed = true
            }

            if (!next.unique_selling_points) {
                next.unique_selling_points = []
                changed = true
            }

            if (!next.offer_section) {
                next.offer_section = {
                    title: 'What We Offer',
                    description: 'Intensive, outcome-driven programs designed for professionals. Limited seats available per season.'
                }
                next.collections_heading = 'Curated Disciplines'
                changed = true
            }

            if (!next.contact) {
                next.contact = {
                    phone: '',
                    email: '',
                    address: ''
                }
                changed = true
            }

            if (!next.visibility) {
                next.visibility = {
                    navbar: true,
                    hero_section: true, // Master toggle for hero
                    hero_headline: true,
                    hero_tagline: true,
                    hero_description: true,
                    hero_testimonial: true,
                    hero_button: true,
                    hero_image: true,
                    // About section visibility defaults
                    about_section: true, // Master toggle
                    about_badge: true,
                    about_headline: true,
                    about_description: true,
                    about_images: true,
                    // Services section visibility defaults
                    services_section: true, // Master toggle
                    services_badge: true,
                    services_headline: true,
                    services_subheadline: true,
                    services_image: true,
                    services_list: true,
                    // Featured section visibility defaults
                    featured_section: true, // Master toggle
                    featured_headline: true,
                    featured_subheadline: true,
                    featured_products: true,
                    // Footer section visibility defaults
                    footer_section: true, // Master toggle
                    footer_badge: true,
                    footer_headline: true,
                    footer_description: true,
                    footer_contact: true,
                    footer_social: true
                }
                changed = true
            }

            if (!next.navbar_links || next.navbar_links.length === 0) {
                next.navbar_links = [
                    { label: 'About', href: '#about' },
                    { label: 'Services', href: '#services' },
                    { label: 'Featured', href: '#featured' },
                    { label: 'Contacts', href: '#contact' }
                ]
                changed = true
            }

            if (changed) {
                setHasChanges(true) // Mark as changed so user knows to save
                return next
            }
            return prev
        })
    }, [])

    useEffect(() => {
        // Get iframe document after it loads
        const iframe = document.getElementById('visual-preview') as HTMLIFrameElement
        if (iframe && iframe.contentDocument) {
            setIframeDoc(iframe.contentDocument)

            // Add click listeners to images in iframe
            const doc = iframe.contentDocument
            const images = doc.getElementsByTagName('img')

            const handleImageClick = (e: Event) => {
                e.preventDefault()
                e.stopPropagation()
                const imagesSection = document.getElementById('images-editor-section')
                if (imagesSection) {
                    imagesSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    imagesSection.classList.add('ring-2', 'ring-blue-500')
                    setTimeout(() => imagesSection.classList.remove('ring-2', 'ring-blue-500'), 2000)
                }
            }

            for (let i = 0; i < images.length; i++) {
                images[i].style.cursor = 'pointer'
                images[i].title = 'Click to edit images'
                images[i].addEventListener('click', handleImageClick)
            }
        }
    }, [htmlContent])

    // Sync iframe content when htmlContent prop updates (e.g. from live preview regeneration)
    useEffect(() => {
        const iframe = document.getElementById('visual-preview') as HTMLIFrameElement
        if (iframe && htmlContent) {
            (iframe as any).srcdoc = htmlContent
        }
    }, [htmlContent])

    const updateField = (field: keyof WebsiteContent, value: any) => {
        setContent(prev => ({ ...prev, [field]: value }))
        setHasChanges(true)
    }

    const updateService = (index: number, field: keyof Service, value: string) => {
        setContent(prev => ({
            ...prev,
            services: prev.services.map((service, i) =>
                i === index ? { ...service, [field]: value } : service
            )
        }))
        setHasChanges(true)
    }

    const updateContact = (field: string, value: string) => {
        setContent(prev => ({
            ...prev,
            contact: { ...prev.contact, [field]: value }
        }))
        setHasChanges(true)
    }


    const handleSave = async () => {
        // Validation
        if (content.contact?.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(content.contact.email)) {
                toast.error('Please enter a valid email address')
                return
            }
        }

        setIsSaving(true)
        const saveToast = toast.loading('Saving changes...')

        try {
            await onSave(content)
            setHasChanges(false)
            toast.success('Changes saved successfully!', { id: saveToast })
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Failed to save changes', { id: saveToast })
        } finally {
            setIsSaving(false)
        }
    }

    const handleReset = () => {
        if (confirm('Reset all changes?')) {
            setContent(initialContent)
            setHasChanges(false)
            toast.info('Changes reset')
        }
    }

    const highlightElement = (selector: string, textContent?: string) => {
        if (!iframeDoc) return

        // Remove previous highlights
        iframeDoc.querySelectorAll('.editor-highlight').forEach(el => {
            el.classList.remove('editor-highlight')
        })

        // Add highlight to target element
        let elements: NodeListOf<Element> | Element[] = iframeDoc.querySelectorAll(selector)

        if (textContent) {
            elements = Array.from(elements).filter(el =>
                el.textContent?.includes(textContent)
            )
        }

        elements.forEach(el => {
            el.classList.add('editor-highlight')
        })

        // Add highlight styles if not already present
        if (!iframeDoc.getElementById('editor-highlight-styles')) {
            const style = iframeDoc.createElement('style')
            style.id = 'editor-highlight-styles'
            style.textContent = `
                .editor-highlight {
                    outline: 3px solid #3B82F6 !important;
                    outline-offset: 2px;
                    background-color: rgba(59, 130, 246, 0.1) !important;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .editor-highlight::before {
                    content: '✏️ Editing';
                    position: absolute;
                    top: -30px;
                    left: 0;
                    background: #3B82F6;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    z-index: 1000;
                }
            `
            iframeDoc.head.appendChild(style)
        }

        setHighlightedSection(selector)
    }

    const removeHighlight = () => {
        if (!iframeDoc) return
        iframeDoc.querySelectorAll('.editor-highlight').forEach(el => {
            el.classList.remove('editor-highlight')
        })
        setHighlightedSection(null)
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 min-h-[600px] lg:h-[800px]">
            {/* Left Panel - Editor */}
            <div className="w-full lg:w-1/2 bg-white rounded-lg border border-gray-200 overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Content Editor</h3>
                            <p className="text-sm text-gray-500">Edit content and see changes highlighted</p>
                        </div>
                        <div className="flex gap-2">
                            {/* Buttons removed as per request */}
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Navbar Section - First section in content editor */}
                    <div className="space-y-4">
                        {/* Navbar Section Header with Toggle */}
                        <div
                            className="flex items-center justify-between"
                            onMouseEnter={() => highlightElement('.navbar-refit')}
                            onMouseLeave={removeHighlight}
                        >
                            <h4 className={`font-medium text-lg flex items-center gap-2 ${
                                content.visibility?.navbar !== false ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                                {content.visibility?.navbar !== false ? (
                                    <Eye className="w-4 h-4" />
                                ) : (
                                    <EyeOff className="w-4 h-4" />
                                )}
                                Navbar Section
                            </h4>
                            <button
                                type="button"
                                onClick={() => updateField('visibility', {
                                    ...content.visibility,
                                    navbar: content.visibility?.navbar === false ? true : false
                                })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    content.visibility?.navbar !== false ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    content.visibility?.navbar !== false ? 'translate-x-4.5' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Navbar Links Editor - Only show if navbar is visible */}
                        {content.visibility?.navbar !== false && (
                            <div
                                onMouseEnter={() => highlightElement('.nav-links')}
                                onMouseLeave={removeHighlight}
                                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                            >
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Navigation Links
                                </label>
                                <div className="space-y-3">
                                    {content.navbar_links?.map((link, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={link.label}
                                                onChange={(e) => {
                                                    const newLinks = [...(content.navbar_links || [])]
                                                    newLinks[index] = { ...newLinks[index], label: e.target.value }
                                                    updateField('navbar_links', newLinks)
                                                }}
                                                placeholder="Label"
                                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <input
                                                type="text"
                                                value={link.href}
                                                onChange={(e) => {
                                                    const newLinks = [...(content.navbar_links || [])]
                                                    newLinks[index] = { ...newLinks[index], href: e.target.value }
                                                    updateField('navbar_links', newLinks)
                                                }}
                                                placeholder="#section"
                                                className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newLinks = content.navbar_links?.filter((_, i) => i !== index) || []
                                                    updateField('navbar_links', newLinks)
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                title="Remove link"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newLinks = [...(content.navbar_links || []), { label: 'New Link', href: '#' }]
                                            updateField('navbar_links', newLinks)
                                        }}
                                        className="w-full px-3 py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                                    >
                                        + Add Navigation Link
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">Edit the links shown in your navigation bar</p>
                            </div>
                        )}

                        {/* Navbar Headline - Only show for navbar style 4 (Headline with Bullets) */}
                        {content.visibility?.navbar !== false && navbarFields.usesHeadline && (
                            <div
                                onMouseEnter={() => highlightElement('.nav-headline')}
                                onMouseLeave={removeHighlight}
                                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Navbar Headline
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => updateField('visibility', {
                                            ...content.visibility,
                                            navbar_headline: content.visibility?.navbar_headline === false ? true : false
                                        })}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            content.visibility?.navbar_headline !== false ? 'bg-blue-600' : 'bg-gray-300'
                                        }`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                            content.visibility?.navbar_headline !== false ? 'translate-x-4.5' : 'translate-x-1'
                                        }`} />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={content.navbar_headline || 'Timeless Designs Built To Be Desired'}
                                    onChange={(e) => updateField('navbar_headline', e.target.value)}
                                    placeholder="Timeless Designs Built To Be Desired"
                                    disabled={content.visibility?.navbar_headline === false}
                                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        content.visibility?.navbar_headline === false ? 'opacity-50 bg-gray-100' : ''
                                    }`}
                                />
                                <p className="text-xs text-gray-500 mt-2">A short tagline displayed next to your brand name</p>
                            </div>
                        )}

                        {/* Navbar CTA Button - Only show for styles that use CTA */}
                        {content.visibility?.navbar !== false && navbarFields.usesCta && (
                            <div
                                onMouseEnter={() => highlightElement('.cta-button')}
                                onMouseLeave={removeHighlight}
                                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                            >
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    CTA Button
                                </label>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Button Text</label>
                                        <input
                                            type="text"
                                            value={content.navbar_cta_text || 'Get in Touch'}
                                            onChange={(e) => updateField('navbar_cta_text', e.target.value)}
                                            placeholder="Get in Touch"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Button Link</label>
                                        <input
                                            type="text"
                                            value={content.navbar_cta_link || '#contact'}
                                            onChange={(e) => updateField('navbar_cta_link', e.target.value)}
                                            placeholder="#contact"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">Customize the call-to-action button in your navigation bar</p>
                            </div>
                        )}
                    </div>

                    {/* Hero Section - All fields grouped together */}
                    <div className="space-y-4">
                        {/* Hero Section Header with Toggle */}
                        <div
                            className="flex items-center justify-between"
                            onMouseEnter={() => highlightElement('.hero-refit')}
                            onMouseLeave={removeHighlight}
                        >
                            <h4 className={`font-medium text-lg flex items-center gap-2 ${
                                content.visibility?.hero_section !== false ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                                {content.visibility?.hero_section !== false ? (
                                    <Eye className="w-4 h-4" />
                                ) : (
                                    <EyeOff className="w-4 h-4" />
                                )}
                                Hero Section
                            </h4>
                            <button
                                type="button"
                                onClick={() => updateField('visibility', {
                                    ...content.visibility,
                                    hero_section: content.visibility?.hero_section === false ? true : false
                                })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    content.visibility?.hero_section !== false ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    content.visibility?.hero_section !== false ? 'translate-x-4.5' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Only show hero fields if hero_section is visible */}
                        {content.visibility?.hero_section !== false && (
                            <>
                                {/* Business Name - Always visible, no toggle */}
                                <div
                                    onMouseEnter={() => highlightElement('.testimonial-card')}
                                    onMouseLeave={removeHighlight}
                                    className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                                >
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Eye className="w-4 h-4 inline mr-1" />
                                        Business Name
                                    </label>
                                    <input
                                        type="text"
                                        value={content.business_name}
                                        onChange={(e) => updateField('business_name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        maxLength={100}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{content.business_name.length}/100 - Used in testimonial card</p>
                                </div>

                                {/* Hero Headline */}
                        <div
                            onMouseEnter={() => highlightElement('h1.font-dm-sans')}
                            onMouseLeave={removeHighlight}
                            className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                content.visibility?.hero_headline !== false
                                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    {content.visibility?.hero_headline !== false ? (
                                        <Eye className="w-4 h-4" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-gray-400" />
                                    )}
                                    Hero Headline
                                </label>
                                <button
                                    type="button"
                                    onClick={() => updateField('visibility', {
                                        ...content.visibility,
                                        hero_headline: !content.visibility?.hero_headline
                                    })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        content.visibility?.hero_headline !== false ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        content.visibility?.hero_headline !== false ? 'translate-x-4.5' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={content.tagline}
                                onChange={(e) => updateField('tagline', e.target.value)}
                                disabled={content.visibility?.hero_headline === false}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                placeholder="e.g. Your trusted partner for quality home improvement"
                                maxLength={200}
                            />
                            <p className="text-xs text-gray-500 mt-1">{content.tagline.length}/200 - Main headline text</p>
                        </div>

                        {/* Hero Tagline (Badge) - Only show if hero style uses it */}
                        {heroFields.usesTagline && (
                        <div
                            onMouseEnter={() => highlightElement('.availability-badge')}
                            onMouseLeave={removeHighlight}
                            className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                content.visibility?.hero_tagline !== false
                                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    {content.visibility?.hero_tagline !== false ? (
                                        <Eye className="w-4 h-4" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-gray-400" />
                                    )}
                                    Hero Tagline
                                </label>
                                <button
                                    type="button"
                                    onClick={() => updateField('visibility', {
                                        ...content.visibility,
                                        hero_tagline: !content.visibility?.hero_tagline
                                    })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        content.visibility?.hero_tagline !== false ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        content.visibility?.hero_tagline !== false ? 'translate-x-4.5' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={content.hero_badge_text ?? ''}
                                onChange={(e) => updateField('hero_badge_text', e.target.value)}
                                disabled={content.visibility?.hero_tagline === false}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                placeholder="e.g. Available for work"
                                maxLength={50}
                            />
                            <p className="text-xs text-gray-500 mt-1">Displayed in the badge above the headline</p>
                        </div>
                        )}

                        {/* Hero Description - Only show if hero style uses it */}
                        {heroFields.usesDescription && (
                        <div
                            onMouseEnter={() => highlightElement('.description')}
                            onMouseLeave={removeHighlight}
                            className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                content.visibility?.hero_description !== false
                                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    {content.visibility?.hero_description !== false ? (
                                        <Eye className="w-4 h-4" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-gray-400" />
                                    )}
                                    Hero Description
                                </label>
                                <button
                                    type="button"
                                    onClick={() => updateField('visibility', {
                                        ...content.visibility,
                                        hero_description: !content.visibility?.hero_description
                                    })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        content.visibility?.hero_description !== false ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        content.visibility?.hero_description !== false ? 'translate-x-4.5' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            <textarea
                                value={content.about}
                                onChange={(e) => updateField('about', e.target.value)}
                                disabled={content.visibility?.hero_description === false}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                rows={3}
                                placeholder="e.g. We deliver expert services, creating beautiful and functional results with quality craftsmanship."
                                maxLength={500}
                            />
                            <p className="text-xs text-gray-500 mt-1">{content.about.length}/500 - Description below headline</p>
                        </div>
                        )}

                        {/* Hero Testimonial Quote - Only show if hero style uses it */}
                        {heroFields.usesTestimonial && (
                        <div
                            onMouseEnter={() => highlightElement('.testimonial-card')}
                            onMouseLeave={removeHighlight}
                            className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                content.visibility?.hero_testimonial !== false
                                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    {content.visibility?.hero_testimonial !== false ? (
                                        <Eye className="w-4 h-4" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-gray-400" />
                                    )}
                                    Hero Testimonial Quote
                                </label>
                                <button
                                    type="button"
                                    onClick={() => updateField('visibility', {
                                        ...content.visibility,
                                        hero_testimonial: !content.visibility?.hero_testimonial
                                    })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        content.visibility?.hero_testimonial !== false ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        content.visibility?.hero_testimonial !== false ? 'translate-x-4.5' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            <textarea
                                value={content.hero_testimonial || ''}
                                onChange={(e) => updateField('hero_testimonial', e.target.value)}
                                disabled={content.visibility?.hero_testimonial === false}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                rows={3}
                                placeholder="e.g. This business has been a game changer. The ability to blend function with exquisite design is unparalleled."
                                maxLength={200}
                            />
                            <p className="text-xs text-gray-500 mt-1">{(content.hero_testimonial || '').length}/200 - Displayed in the floating card on the hero image</p>
                        </div>
                        )}

                        {/* Hero Button (CTA) - Only show if hero style uses it */}
                        {heroFields.usesButton && (
                        <div
                            onMouseEnter={() => highlightElement('.cta-button')}
                            onMouseLeave={removeHighlight}
                            className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                content.visibility?.hero_button !== false
                                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    {content.visibility?.hero_button !== false ? (
                                        <Eye className="w-4 h-4" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-gray-400" />
                                    )}
                                    Hero Button
                                </label>
                                <button
                                    type="button"
                                    onClick={() => updateField('visibility', {
                                        ...content.visibility,
                                        hero_button: !content.visibility?.hero_button
                                    })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        content.visibility?.hero_button !== false ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        content.visibility?.hero_button !== false ? 'translate-x-4.5' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Button Text</label>
                                    <input
                                        type="text"
                                        value={content.hero_cta?.label || ''}
                                        onChange={(e) => updateField('hero_cta', {
                                            ...content.hero_cta,
                                            label: e.target.value,
                                            link: content.hero_cta?.link || '#contact'
                                        })}
                                        disabled={content.visibility?.hero_button === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="e.g. Book a Call"
                                        maxLength={50}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Button Link</label>
                                    <input
                                        type="text"
                                        value={content.hero_cta?.link || ''}
                                        onChange={(e) => updateField('hero_cta', {
                                            ...content.hero_cta,
                                            label: content.hero_cta?.label || 'Book a Call',
                                            link: e.target.value
                                        })}
                                        disabled={content.visibility?.hero_button === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="e.g. #contact or https://..."
                                        maxLength={200}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Call-to-action button displayed in the hero section</p>
                        </div>
                        )}

                        {/* Hero Image(s) - Shows multiple images for carousel styles */}
                        <div
                            id="images-editor-section"
                            onMouseEnter={() => highlightElement(heroStyle === '3' ? '.hero-linea-carousel' : '.image-container')}
                            onMouseLeave={removeHighlight}
                            className={`p-4 rounded-lg border transition-all ${
                                content.visibility?.hero_image !== false
                                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    {content.visibility?.hero_image !== false ? (
                                        <Eye className="w-4 h-4" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-gray-400" />
                                    )}
                                    {heroStyle === '3' ? 'Hero Images (Carousel)' : 'Hero Image'}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => updateField('visibility', {
                                        ...content.visibility,
                                        hero_image: !content.visibility?.hero_image
                                    })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        content.visibility?.hero_image !== false ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        content.visibility?.hero_image !== false ? 'translate-x-4.5' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>

                            {/* For carousel style (style 3), show all images in a grid */}
                            {heroStyle === '3' ? (
                                <>
                                    {content.images && content.images.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            {content.images.map((img, index) => {
                                                // Resolve the image URL if it's a Convex storage ID
                                                const imgUrl = img.startsWith('convex:') ? resolvedImages[index] : img
                                                return (
                                                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                                                        {imgUrl ? (
                                                            <img
                                                                src={imgUrl}
                                                                alt={`Carousel image ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                                <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newImages = content.images?.filter((_, i) => i !== index) || []
                                                                updateField('images', newImages)
                                                            }}
                                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Remove image"
                                                        >
                                                            ×
                                                        </button>
                                                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                                            {index + 1}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="aspect-video mb-4 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                            <div className="text-center text-gray-500">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No carousel images set</p>
                                                <p className="text-xs text-gray-400 mt-1">Add images for the carousel below</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Show current hero image (first image) for non-carousel styles */}
                                    {resolvedHeroImage ? (
                                        <div className="relative group aspect-video mb-4 rounded-lg overflow-hidden border border-gray-200">
                                            <img
                                                src={resolvedHeroImage}
                                                alt="Hero background"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-sm font-medium">Click below to change</span>
                                            </div>
                                        </div>
                                    ) : content.images && content.images.length > 0 && !content.images[0].startsWith('http') ? (
                                        <div className="aspect-video mb-4 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-100">
                                            <div className="text-center text-gray-500">
                                                <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                                                <p className="text-sm">Loading image...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video mb-4 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                            <div className="text-center text-gray-500">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No hero image set</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Change image options */}
                            <div className="space-y-3">
                                {/* Select from available images */}
                                {availableImages.length > 0 && (
                                    <button
                                        onClick={() => setShowImagePicker(true)}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        Choose from Uploaded Images
                                    </button>
                                )}

                                {/* File Upload UI */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return

                                        // Validate file size (max 5MB)
                                        if (file.size > 5 * 1024 * 1024) {
                                            toast.error('File is too large. Maximum size is 5MB.')
                                            return
                                        }

                                        // Validate file type
                                        if (!file.type.startsWith('image/')) {
                                            toast.error('Only image files are allowed.')
                                            return
                                        }

                                        setIsUploading(true)
                                        const toastId = toast.loading('Uploading image...')

                                        try {
                                            // Get upload URL from Convex
                                            const uploadUrl = await generateUploadUrl()

                                            // Upload the file to Convex storage
                                            const result = await fetch(uploadUrl, {
                                                method: 'POST',
                                                headers: { 'Content-Type': file.type },
                                                body: file,
                                            })

                                            if (!result.ok) {
                                                throw new Error('Failed to upload file')
                                            }

                                            const { storageId } = await result.json()

                                            // Store as convex:storageId format for later URL resolution
                                            const newImages = content.images ? [...content.images] : []
                                            if (heroStyle === '3') {
                                                // For carousel style, append to the list
                                                newImages.push(`convex:${storageId}`)
                                            } else {
                                                // For other styles, replace the first image
                                                newImages[0] = `convex:${storageId}`
                                            }
                                            updateField('images', newImages)
                                            toast.success(heroStyle === '3' ? 'Image added to carousel' : 'Hero image uploaded', { id: toastId })
                                        } catch (error) {
                                            console.error('Upload error:', error)
                                            toast.error('Failed to upload image', { id: toastId })
                                        } finally {
                                            setIsUploading(false)
                                            if (fileInputRef.current) fileInputRef.current.value = ''
                                        }
                                    }}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full px-4 py-2 bg-white border border-dashed border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2 text-sm text-gray-600 transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    {isUploading ? 'Uploading...' : 'Upload New Image'}
                                </button>
                            </div>

                            <p className="text-xs text-gray-500 mt-3">
                                {heroStyle === '3'
                                    ? 'These images appear in the scrolling carousel. Add multiple images for best effect.'
                                    : 'This image appears on the right side of the hero section.'}
                            </p>
                        </div>

                                {/* Image Picker Modal */}
                                {showImagePicker && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {heroStyle === '3' ? 'Add Images to Carousel' : 'Select Hero Image'}
                                        </h3>
                                        <button
                                            onClick={() => setShowImagePicker(false)}
                                            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div className="p-4 overflow-y-auto max-h-[60vh]">
                                        <p className="text-sm text-gray-500 mb-4">
                                            {heroStyle === '3'
                                                ? 'Click on images to add them to the carousel. Already added images are marked with a checkmark.'
                                                : 'Select an image from the submission\'s uploaded photos:'}
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {availableImages.map((imageUrl, index) => {
                                                const isSelected = content.images?.includes(imageUrl)
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            if (heroStyle === '3') {
                                                                // For carousel, toggle the image
                                                                const newImages = content.images ? [...content.images] : []
                                                                if (isSelected) {
                                                                    // Remove from carousel
                                                                    const filtered = newImages.filter(img => img !== imageUrl)
                                                                    updateField('images', filtered)
                                                                    toast.success('Image removed from carousel')
                                                                } else {
                                                                    // Add to carousel
                                                                    newImages.push(imageUrl)
                                                                    updateField('images', newImages)
                                                                    toast.success('Image added to carousel')
                                                                }
                                                            } else {
                                                                // For other styles, replace the first image
                                                                const newImages = content.images ? [...content.images] : []
                                                                newImages[0] = imageUrl
                                                                updateField('images', newImages)
                                                                setShowImagePicker(false)
                                                                toast.success('Hero image updated')
                                                            }
                                                        }}
                                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 ${
                                                            isSelected
                                                                ? 'border-blue-500 ring-2 ring-blue-200'
                                                                : 'border-gray-200'
                                                        }`}
                                                    >
                                                        <img
                                                            src={imageUrl}
                                                            alt={`Option ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                                                ✓
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                                        {heroStyle === '3' && (
                                            <p className="text-sm text-gray-600 mb-3">
                                                {content.images?.length || 0} image(s) selected for carousel
                                            </p>
                                        )}
                                        <button
                                            onClick={() => setShowImagePicker(false)}
                                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                                        >
                                            {heroStyle === '3' ? 'Done' : 'Cancel'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* About Section */}
                    <div className="space-y-4">
                        {/* About Section Header with Toggle */}
                        <div
                            className="flex items-center justify-between"
                            onMouseEnter={() => highlightElement('.about-refit-wrapper')}
                            onMouseLeave={removeHighlight}
                        >
                            <h4 className={`font-medium text-lg flex items-center gap-2 ${
                                content.visibility?.about_section !== false ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                                {content.visibility?.about_section !== false ? (
                                    <Eye className="w-4 h-4" />
                                ) : (
                                    <EyeOff className="w-4 h-4" />
                                )}
                                About Section
                            </h4>
                            <button
                                type="button"
                                onClick={() => updateField('visibility', {
                                    ...content.visibility,
                                    about_section: content.visibility?.about_section === false ? true : false
                                })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    content.visibility?.about_section !== false ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    content.visibility?.about_section !== false ? 'translate-x-4.5' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Only show other about fields if about_section is visible */}
                        {content.visibility?.about_section !== false && (
                            <>
                                {/* About Badge Visibility Toggle - Only show if about style uses badges */}
                                {aboutFields.usesBadge && (
                                <div
                                    onMouseEnter={() => highlightElement('.about-badge')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.about_badge !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.about_badge !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Show &quot;About us&quot; Badge
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                about_badge: content.visibility?.about_badge === false ? true : false
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.about_badge !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.about_badge !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">Toggle the &quot;About us&quot; badge visibility above the headline</p>
                                </div>
                                )}

                                {/* About Headline - Only show if about style uses it */}
                                {aboutFields.usesHeadline && (
                                <div
                                    onMouseEnter={() => highlightElement('.about-refit .headline')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.about_headline !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.about_headline !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            About Headline
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                about_headline: !content.visibility?.about_headline
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.about_headline !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.about_headline !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={content.about_headline ?? (content.unique_selling_points?.slice(0, 3).join(' ') || `${content.business_name} specialists`)}
                                        onChange={(e) => updateField('about_headline', e.target.value)}
                                        disabled={content.visibility?.about_headline === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="e.g. home improvement specialists"
                                        maxLength={100}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Large headline text on the left side of the about section</p>
                                </div>
                                )}

                                {/* About Description - Now Editable */}
                                <div
                                    onMouseEnter={() => highlightElement('.about-refit .description')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.about_description !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.about_description !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            About Description
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                about_description: !content.visibility?.about_description
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.about_description !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.about_description !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <textarea
                                        value={content.about_description ?? content.about}
                                        onChange={(e) => updateField('about_description', e.target.value)}
                                        disabled={content.visibility?.about_description === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        rows={4}
                                        placeholder="e.g. We deliver expert services, creating beautiful and functional results with quality craftsmanship."
                                        maxLength={800}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{(content.about_description ?? content.about).length}/800 - Description on the right side of the about section</p>
                                </div>

                                {/* About Images Gallery - Now with Image Picker and Upload */}
                                <div
                                    onMouseEnter={() => highlightElement('.about-refit .image-gallery')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all ${
                                        content.visibility?.about_images !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.about_images !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            {aboutStyle === '3' ? 'About Image' : 'About Images Gallery'}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                about_images: !content.visibility?.about_images
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.about_images !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.about_images !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">
                                        {aboutStyle === '3'
                                            ? 'Select 1 image for the about section'
                                            : 'Select up to 4 images for the horizontal gallery with scroll animations'}
                                    </p>

                                    {/* Current selected images */}
                                    <div className={`grid gap-2 mb-3 ${aboutStyle === '3' ? 'grid-cols-1 max-w-[200px]' : 'grid-cols-4'}`}>
                                        {(aboutStyle === '3' ? [0] : [0, 1, 2, 3]).map((index) => {
                                            const aboutImagesRaw = content.about_images || availableImages
                                            const rawImageUrl = aboutImagesRaw[index]
                                            // Use resolved URL if available, otherwise use raw URL (for http URLs)
                                            const displayUrl = content.about_images
                                                ? (resolvedAboutImages[index] || rawImageUrl)
                                                : rawImageUrl
                                            const isLoading = rawImageUrl && !rawImageUrl.startsWith('http') && !resolvedAboutImages[index]
                                            return (
                                                <div key={index} className="aspect-[3/4] rounded-md overflow-hidden border border-gray-200 bg-gray-50 relative group">
                                                    {rawImageUrl ? (
                                                        isLoading ? (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <img
                                                                    src={displayUrl}
                                                                    alt={`Gallery ${index + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const newImages = [...(content.about_images || availableImages)]
                                                                        newImages.splice(index, 1)
                                                                        updateField('about_images', newImages)
                                                                    }}
                                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Remove image"
                                                                >
                                                                    &times;
                                                                </button>
                                                            </>
                                                        )
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <ImageIcon className="w-6 h-6 opacity-50" />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 mb-3">
                                        {/* Select from available images */}
                                        {availableImages.length > 0 && (
                                            <button
                                                onClick={() => setShowAboutImagePicker(true)}
                                                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                {aboutStyle === '3' ? 'Choose Image' : 'Choose Images'}
                                            </button>
                                        )}

                                        {/* Upload new image */}
                                        <input
                                            type="file"
                                            ref={aboutFileInputRef}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return

                                                // Use current about_images if set, otherwise empty array for uploads
                                                // (don't fall back to availableImages for upload validation)
                                                const currentImages = content.about_images || []
                                                const maxImages = aboutStyle === '3' ? 1 : 4
                                                if (currentImages.length >= maxImages) {
                                                    toast.error(`Maximum ${maxImages} image${maxImages > 1 ? 's' : ''} allowed. Remove an image first.`)
                                                    return
                                                }

                                                // Validate file size (max 5MB)
                                                if (file.size > 5 * 1024 * 1024) {
                                                    toast.error('File is too large. Maximum size is 5MB.')
                                                    return
                                                }

                                                // Validate file type
                                                if (!file.type.startsWith('image/')) {
                                                    toast.error('Only image files are allowed.')
                                                    return
                                                }

                                                setIsUploadingAboutImage(true)
                                                const toastId = toast.loading('Uploading image...')

                                                try {
                                                    // Get upload URL from Convex
                                                    const uploadUrl = await generateUploadUrl()

                                                    // Upload the file to Convex storage
                                                    const result = await fetch(uploadUrl, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': file.type },
                                                        body: file,
                                                    })

                                                    if (!result.ok) {
                                                        throw new Error('Failed to upload file')
                                                    }

                                                    const { storageId } = await result.json()

                                                    // Store as convex:storageId format for later URL resolution
                                                    const newImageUrl = `convex:${storageId}`
                                                    updateField('about_images', [...currentImages, newImageUrl])
                                                    toast.success('Image uploaded and added to gallery', { id: toastId })
                                                } catch (error) {
                                                    console.error('Upload error:', error)
                                                    toast.error('Failed to upload image', { id: toastId })
                                                } finally {
                                                    setIsUploadingAboutImage(false)
                                                    if (aboutFileInputRef.current) aboutFileInputRef.current.value = ''
                                                }
                                            }}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => aboutFileInputRef.current?.click()}
                                            disabled={isUploadingAboutImage || (content.about_images?.length || 0) >= (aboutStyle === '3' ? 1 : 4)}
                                            className="flex-1 px-3 py-2 bg-white border border-dashed border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2 text-sm text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {isUploadingAboutImage ? 'Uploading...' : 'Upload New'}
                                        </button>
                                    </div>

                                    <p className="text-xs text-gray-500">Images appear in a 4-column horizontal gallery with scroll animations</p>
                                </div>

                                {/* About Tagline - Only show if about style uses it (Style 3) */}
                                {aboutFields.usesTagline && (
                                <div
                                    onMouseEnter={() => highlightElement('.about-linea .section-tagline')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.about_tagline !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.about_tagline !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            About Tagline
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                about_tagline: !content.visibility?.about_tagline
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.about_tagline !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.about_tagline !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={content.about_tagline ?? 'Our Expertise'}
                                        onChange={(e) => updateField('about_tagline', e.target.value)}
                                        disabled={content.visibility?.about_tagline === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="e.g. Brand Identity, Our Services"
                                        maxLength={50}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Section title displayed above the description (e.g., &quot;Brand Identity&quot;)</p>
                                </div>
                                )}

                                {/* About Tags - Only show if about style uses it (Style 3) */}
                                {aboutFields.usesTags && (
                                <div
                                    onMouseEnter={() => highlightElement('.about-linea .tags-container')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all ${
                                        content.visibility?.about_tags !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.about_tags !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            About Tags
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                about_tags: !content.visibility?.about_tags
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.about_tags !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.about_tags !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">Add tags to highlight your expertise or features (e.g., &quot;Logo Design&quot;, &quot;Colour Palette&quot;)</p>

                                    {/* Display existing tags */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {(content.about_tags || []).map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
                                            >
                                                {tag}
                                                <button
                                                    onClick={() => {
                                                        const newTags = [...(content.about_tags || [])]
                                                        newTags.splice(index, 1)
                                                        updateField('about_tags', newTags)
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 ml-1"
                                                    title="Remove tag"
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                    </div>

                                    {/* Add new tag input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            id="about-tag-input"
                                            placeholder="Type a tag and press Enter"
                                            disabled={content.visibility?.about_tags === false}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            maxLength={30}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    const input = e.target as HTMLInputElement
                                                    const newTag = input.value.trim()
                                                    if (newTag && !(content.about_tags || []).includes(newTag)) {
                                                        updateField('about_tags', [...(content.about_tags || []), newTag])
                                                        input.value = ''
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const input = document.getElementById('about-tag-input') as HTMLInputElement
                                                const newTag = input?.value.trim()
                                                if (newTag && !(content.about_tags || []).includes(newTag)) {
                                                    updateField('about_tags', [...(content.about_tags || []), newTag])
                                                    input.value = ''
                                                }
                                            }}
                                            disabled={content.visibility?.about_tags === false}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Tags display as pill-shaped badges with checkmark icons</p>
                                </div>
                                )}

                                {/* About Image Picker Modal */}
                                {showAboutImagePicker && (
                                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {aboutStyle === '3' ? 'Select About Image' : 'Select About Gallery Images'}
                                                </h3>
                                                <button
                                                    onClick={() => setShowAboutImagePicker(false)}
                                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                                <p className="text-sm text-gray-500 mb-4">
                                                    {aboutStyle === '3'
                                                        ? 'Click an image to select it for the about section.'
                                                        : 'Click images to select/deselect. Selected images show their order number. Maximum 4 images.'}
                                                </p>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                    {availableImages.map((imageUrl, index) => {
                                                        const aboutImages = content.about_images || availableImages
                                                        const isSelected = aboutImages.includes(imageUrl)
                                                        const selectedIndex = aboutImages.indexOf(imageUrl)
                                                        const maxImagesForPicker = aboutStyle === '3' ? 1 : 4
                                                        return (
                                                            <button
                                                                key={index}
                                                                onClick={() => {
                                                                    const currentImages = content.about_images || [...availableImages]
                                                                    if (isSelected) {
                                                                        // Remove from selection
                                                                        const newImages = currentImages.filter(img => img !== imageUrl)
                                                                        updateField('about_images', newImages)
                                                                    } else {
                                                                        // Add to selection (max based on style)
                                                                        if (aboutStyle === '3') {
                                                                            // For style 3, replace the single image
                                                                            updateField('about_images', [imageUrl])
                                                                        } else if (currentImages.length < maxImagesForPicker) {
                                                                            updateField('about_images', [...currentImages, imageUrl])
                                                                        } else {
                                                                            toast.error(`Maximum ${maxImagesForPicker} images allowed`)
                                                                        }
                                                                    }
                                                                }}
                                                                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 ${
                                                                    isSelected
                                                                        ? 'border-blue-500 ring-2 ring-blue-200'
                                                                        : 'border-gray-200'
                                                                }`}
                                                            >
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={`Option ${index + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                {isSelected && (
                                                                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                                                        {aboutStyle === '3' ? '✓' : selectedIndex + 1}
                                                                    </div>
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
                                                <button
                                                    onClick={() => setShowAboutImagePicker(false)}
                                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                                                >
                                                    Done ({(content.about_images || availableImages).length}/{aboutStyle === '3' ? 1 : 4} selected)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Services Section */}
                    <div className="space-y-4">
                        {/* Services Section Header with Toggle */}
                        <div
                            className="flex items-center justify-between"
                            onMouseEnter={() => highlightElement('.services-refit-wrapper')}
                            onMouseLeave={removeHighlight}
                        >
                            <h4 className={`font-medium text-lg flex items-center gap-2 ${
                                content.visibility?.services_section !== false ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                                {content.visibility?.services_section !== false ? (
                                    <Eye className="w-4 h-4" />
                                ) : (
                                    <EyeOff className="w-4 h-4" />
                                )}
                                Services Section
                            </h4>
                            <button
                                type="button"
                                onClick={() => updateField('visibility', {
                                    ...content.visibility,
                                    services_section: content.visibility?.services_section === false ? true : false
                                })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    content.visibility?.services_section !== false ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    content.visibility?.services_section !== false ? 'translate-x-4.5' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Only show services fields if services_section is visible */}
                        {content.visibility?.services_section !== false && (
                            <>
                                {/* Services Badge Visibility Toggle - Only show if services style uses it */}
                                {servicesFields.usesBadge && (
                                <div
                                    onMouseEnter={() => highlightElement('.services-badge')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.services_badge !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.services_badge !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Show &quot;Services&quot; Badge
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                services_badge: content.visibility?.services_badge === false ? true : false
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.services_badge !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.services_badge !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">Toggle the &quot;Services&quot; badge visibility above the headline</p>
                                </div>
                                )}

                                {/* Services Headline */}
                                <div
                                    onMouseEnter={() => highlightElement('.services-refit .headline')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.services_headline !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.services_headline !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Services Headline
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                services_headline: !content.visibility?.services_headline
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.services_headline !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.services_headline !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={content.services_headline ?? 'What we do'}
                                        onChange={(e) => updateField('services_headline', e.target.value)}
                                        disabled={content.visibility?.services_headline === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="e.g. What we do"
                                        maxLength={100}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Main headline for the services section</p>
                                </div>

                                {/* Services Subheadline - Only show if services style uses it */}
                                {servicesFields.usesSubheadline && (
                                <div
                                    onMouseEnter={() => highlightElement('.services-refit .subheadline')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.services_subheadline !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.services_subheadline !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Services Subheadline
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                services_subheadline: !content.visibility?.services_subheadline
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.services_subheadline !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.services_subheadline !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <textarea
                                        value={content.services_subheadline ?? 'Find out which one of our services fit the needs of your project'}
                                        onChange={(e) => updateField('services_subheadline', e.target.value)}
                                        disabled={content.visibility?.services_subheadline === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        rows={2}
                                        placeholder="e.g. Find out which one of our services fit the needs of your project"
                                        maxLength={200}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Description text below the headline</p>
                                </div>
                                )}

                                {/* Services Image - Only show if services style uses it */}
                                {servicesFields.usesImage && (
                                <div
                                    onMouseEnter={() => highlightElement('.services-refit .image-section')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all ${
                                        content.visibility?.services_image !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.services_image !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Services Image
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                services_image: !content.visibility?.services_image
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.services_image !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.services_image !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Show current services image or fallback to hero image */}
                                    {resolvedServicesImage ? (
                                        <div className="relative group aspect-[3/4] mb-4 rounded-lg overflow-hidden border border-gray-200 max-w-[200px]">
                                            <img
                                                src={resolvedServicesImage}
                                                alt="Services background"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-sm font-medium">Click below to change</span>
                                            </div>
                                        </div>
                                    ) : content.services_image && !content.services_image.startsWith('http') ? (
                                        <div className="aspect-[3/4] mb-4 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-100 max-w-[200px]">
                                            <div className="text-center text-gray-500">
                                                <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                                                <p className="text-sm">Loading image...</p>
                                            </div>
                                        </div>
                                    ) : availableImages.length > 0 ? (
                                        // Show fallback hero image with indicator
                                        <div className="relative group aspect-[3/4] mb-4 rounded-lg overflow-hidden border-2 border-dashed border-blue-300 max-w-[200px]">
                                            <img
                                                src={availableImages[0]}
                                                alt="Services background (using hero image)"
                                                className="w-full h-full object-cover opacity-80"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-3">
                                                <span className="text-white text-xs font-medium bg-blue-600 px-2 py-1 rounded">Using Hero Image</span>
                                            </div>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-sm font-medium">Click below to change</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-[3/4] mb-4 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 max-w-[200px]">
                                            <div className="text-center text-gray-500">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No image available</p>
                                                <p className="text-xs">Upload an image</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Change image options */}
                                    <div className="space-y-3">
                                        {availableImages.length > 0 && (
                                            <button
                                                onClick={() => setShowServicesImagePicker(true)}
                                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                Choose from Uploaded Images
                                            </button>
                                        )}

                                        {/* File Upload UI */}
                                        <input
                                            type="file"
                                            ref={servicesFileInputRef}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return

                                                if (file.size > 5 * 1024 * 1024) {
                                                    toast.error('File is too large. Maximum size is 5MB.')
                                                    return
                                                }

                                                if (!file.type.startsWith('image/')) {
                                                    toast.error('Only image files are allowed.')
                                                    return
                                                }

                                                setIsUploadingServicesImage(true)
                                                const toastId = toast.loading('Uploading image...')

                                                try {
                                                    const uploadUrl = await generateUploadUrl()
                                                    const result = await fetch(uploadUrl, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': file.type },
                                                        body: file,
                                                    })

                                                    if (!result.ok) {
                                                        throw new Error('Failed to upload file')
                                                    }

                                                    const { storageId } = await result.json()
                                                    updateField('services_image', `convex:${storageId}`)
                                                    toast.success('Services image uploaded', { id: toastId })
                                                } catch (error) {
                                                    console.error('Upload error:', error)
                                                    toast.error('Failed to upload image', { id: toastId })
                                                } finally {
                                                    setIsUploadingServicesImage(false)
                                                    if (servicesFileInputRef.current) servicesFileInputRef.current.value = ''
                                                }
                                            }}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => servicesFileInputRef.current?.click()}
                                            disabled={isUploadingServicesImage}
                                            className="w-full px-4 py-2 bg-white border border-dashed border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2 text-sm text-gray-600 transition-colors"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {isUploadingServicesImage ? 'Uploading...' : 'Upload New Image'}
                                        </button>
                                    </div>

                                    <p className="text-xs text-gray-500 mt-3">
                                        This image appears on the left side of the services section.
                                        {!resolvedServicesImage && availableImages.length > 0 && (
                                            <span className="block mt-1 text-blue-600">Currently using the first hero image as fallback.</span>
                                        )}
                                    </p>
                                </div>
                                )}

                                {/* Services List Toggle */}
                                <div
                                    onMouseEnter={() => highlightElement('.services-refit .services-list')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.services_list !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.services_list !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Services List
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                services_list: content.visibility?.services_list === false ? true : false
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.services_list !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.services_list !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">Toggle the accordion list of services on the right side</p>

                                    {/* Services editor - show the list of services */}
                                    {content.visibility?.services_list !== false && (
                                        <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-medium text-gray-600">Edit your services:</p>
                                                <span className="text-xs text-gray-400">{content.services?.length || 0} services</span>
                                            </div>
                                            {content.services && content.services.length > 0 && content.services.map((service, index) => (
                                                <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2 relative group">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400 font-medium w-5">{index + 1}.</span>
                                                        <input
                                                            type="text"
                                                            value={service.name}
                                                            onChange={(e) => updateService(index, 'name', e.target.value)}
                                                            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                            placeholder="Service name"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newServices = content.services.filter((_, i) => i !== index)
                                                                updateField('services', newServices)
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            title="Remove service"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={service.description}
                                                        onChange={(e) => updateService(index, 'description', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                                        rows={2}
                                                        placeholder="Service description"
                                                    />
                                                </div>
                                            ))}
                                            {/* Add new service button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newService = { name: '', description: '' }
                                                    const newServices = [...(content.services || []), newService]
                                                    updateField('services', newServices)
                                                }}
                                                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Add New Service
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Services Image Picker Modal */}
                                {showServicesImagePicker && (
                                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-gray-900">Select Services Image</h3>
                                                <button
                                                    onClick={() => setShowServicesImagePicker(false)}
                                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                                <p className="text-sm text-gray-500 mb-4">
                                                    Select an image from the submission&apos;s uploaded photos:
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {availableImages.map((imageUrl, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => {
                                                                updateField('services_image', imageUrl)
                                                                setShowServicesImagePicker(false)
                                                                toast.success('Services image updated')
                                                            }}
                                                            className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 ${
                                                                content.services_image === imageUrl
                                                                    ? 'border-blue-500 ring-2 ring-blue-200'
                                                                    : 'border-gray-200'
                                                            }`}
                                                        >
                                                            <img
                                                                src={imageUrl}
                                                                alt={`Option ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                            {content.services_image === imageUrl && (
                                                                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                                                    ✓
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-gray-200 bg-gray-50">
                                                <button
                                                    onClick={() => setShowServicesImagePicker(false)}
                                                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Featured Section */}
                    <div className="space-y-4">
                        {/* Featured Section Header with Toggle */}
                        <div
                            className="flex items-center justify-between"
                            onMouseEnter={() => highlightElement('.featured-refit-wrapper')}
                            onMouseLeave={removeHighlight}
                        >
                            <h4 className={`font-medium text-lg flex items-center gap-2 ${
                                content.visibility?.featured_section !== false ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                                {content.visibility?.featured_section !== false ? (
                                    <Eye className="w-4 h-4" />
                                ) : (
                                    <EyeOff className="w-4 h-4" />
                                )}
                                Featured Section
                            </h4>
                            <button
                                type="button"
                                onClick={() => updateField('visibility', {
                                    ...content.visibility,
                                    featured_section: content.visibility?.featured_section === false ? true : false
                                })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    content.visibility?.featured_section !== false ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    content.visibility?.featured_section !== false ? 'translate-x-4.5' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Only show featured fields if featured_section is visible */}
                        {content.visibility?.featured_section !== false && (
                            <>
                                {/* Featured Headline */}
                                <div
                                    onMouseEnter={() => highlightElement('.featured-refit .headline')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.featured_headline !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.featured_headline !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Featured Headline
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                featured_headline: !content.visibility?.featured_headline
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.featured_headline !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.featured_headline !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={content.featured_headline ?? 'Featured Products'}
                                        onChange={(e) => updateField('featured_headline', e.target.value)}
                                        disabled={content.visibility?.featured_headline === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="e.g. Featured Products"
                                        maxLength={100}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Main headline for the featured section</p>
                                </div>

                                {/* Featured Subheadline */}
                                <div
                                    onMouseEnter={() => highlightElement('.featured-refit .subheadline')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                        content.visibility?.featured_subheadline !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.featured_subheadline !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Featured Subheadline
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                featured_subheadline: !content.visibility?.featured_subheadline
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.featured_subheadline !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.featured_subheadline !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <textarea
                                        value={content.featured_subheadline ?? 'Take a look at some of our recent work'}
                                        onChange={(e) => updateField('featured_subheadline', e.target.value)}
                                        disabled={content.visibility?.featured_subheadline === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        rows={2}
                                        placeholder="e.g. Take a look at some of our recent work"
                                        maxLength={200}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Description text below the headline</p>
                                </div>

                                {/* Featured CTA Button - Only show if style uses CTA */}
                                {featuredFields.usesCta && (
                                    <div
                                        onMouseEnter={() => highlightElement('.featured-masonry .cta-button')}
                                        onMouseLeave={removeHighlight}
                                        className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                                    >
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2">
                                            <Eye className="w-4 h-4" />
                                            CTA Button
                                        </label>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Button Text</label>
                                                <input
                                                    type="text"
                                                    value={content.featured_cta_text ?? 'View All Works'}
                                                    onChange={(e) => updateField('featured_cta_text', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="e.g. View All Works"
                                                    maxLength={50}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Button Link</label>
                                                <input
                                                    type="text"
                                                    value={content.featured_cta_link ?? '#contact'}
                                                    onChange={(e) => updateField('featured_cta_link', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="e.g. #contact or /portfolio"
                                                    maxLength={200}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Call-to-action button in the header</p>
                                    </div>
                                )}

                                {/* Featured Products List - Only show if style uses products */}
                                {featuredFields.usesProducts && (
                                <div
                                    onMouseEnter={() => highlightElement('.featured-refit .projects-container')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all ${
                                        content.visibility?.featured_products !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.featured_products !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Featured Products
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                featured_products: content.visibility?.featured_products === false ? true : false
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.featured_products !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.featured_products !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">Toggle the project cards with scroll reveal effect</p>

                                    {/* Projects editor */}
                                    {content.visibility?.featured_products !== false && (
                                        <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-medium text-gray-600">Edit your projects:</p>
                                                <span className="text-xs text-gray-400">{content.featured_products?.length || 0} projects</span>
                                            </div>
                                            {content.featured_products && content.featured_products.length > 0 && content.featured_products.map((project, index) => (
                                                <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2 relative">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400 font-medium w-5">{index + 1}.</span>
                                                        <input
                                                            type="text"
                                                            value={project.title}
                                                            onChange={(e) => {
                                                                const newProjects = [...(content.featured_products || [])]
                                                                newProjects[index] = { ...newProjects[index], title: e.target.value }
                                                                updateField('featured_products', newProjects)
                                                            }}
                                                            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                            placeholder="Project title"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newProjects = (content.featured_products || []).filter((_, i) => i !== index)
                                                                updateField('featured_products', newProjects)
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            title="Remove project"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    {/* Product Image - shown for all product-based styles */}
                                                    {featuredFields.usesProducts && (() => {
                                                        // Calculate actual display image (explicit or fallback)
                                                        const fallbackImage = availableImages[index % Math.max(availableImages.length, 1)]
                                                        const displayImage = project.image || fallbackImage

                                                        return (
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-gray-500">Product Image:</p>
                                                                <div className="flex items-center gap-2">
                                                                    {displayImage ? (
                                                                        <div className="relative w-20 h-20 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                                                                            <img
                                                                                src={displayImage}
                                                                                alt={project.title}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-20 h-20 rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 flex-shrink-0">
                                                                            <ImageIcon className="w-6 h-6 text-gray-300" />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex-1">
                                                                        <select
                                                                            value={project.image || fallbackImage || ''}
                                                                            onChange={(e) => {
                                                                                const newProjects = [...(content.featured_products || [])]
                                                                                newProjects[index] = { ...newProjects[index], image: e.target.value || undefined }
                                                                                updateField('featured_products', newProjects)
                                                                            }}
                                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                        >
                                                                            {availableImages.map((img, imgIndex) => (
                                                                                <option key={imgIndex} value={img}>
                                                                                    Image {imgIndex + 1}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })()}

                                                    {/* Description - only shown for styles that use it */}
                                                    {featuredFields.usesTestimonials && (
                                                        <textarea
                                                            value={project.description}
                                                            onChange={(e) => {
                                                                const newProjects = [...(content.featured_products || [])]
                                                                newProjects[index] = { ...newProjects[index], description: e.target.value }
                                                                updateField('featured_products', newProjects)
                                                            }}
                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                                            rows={2}
                                                            placeholder="Project description"
                                                        />
                                                    )}

                                                    {/* Tags/Category - shown for all styles */}
                                                    {featuredFields.usesTags && (
                                                        <input
                                                            type="text"
                                                            value={project.tags?.join(', ') || ''}
                                                            onChange={(e) => {
                                                                const newProjects = [...(content.featured_products || [])]
                                                                newProjects[index] = { ...newProjects[index], tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) }
                                                                updateField('featured_products', newProjects)
                                                            }}
                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                            placeholder="Category (e.g. Kitchen, External, Bathroom)"
                                                        />
                                                    )}

                                                    {/* Testimonial - only shown for styles that use it */}
                                                    {featuredFields.usesTestimonials && (
                                                        <div className="pt-2 border-t border-gray-200 space-y-2">
                                                            <p className="text-xs text-gray-500">Testimonial (optional):</p>
                                                            <textarea
                                                                value={project.testimonial?.quote || ''}
                                                                onChange={(e) => {
                                                                    const newProjects = [...(content.featured_products || [])]
                                                                    newProjects[index] = {
                                                                        ...newProjects[index],
                                                                        testimonial: {
                                                                            ...newProjects[index].testimonial,
                                                                            quote: e.target.value,
                                                                            author: newProjects[index].testimonial?.author || ''
                                                                        }
                                                                    }
                                                                    updateField('featured_products', newProjects)
                                                                }}
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                                                rows={2}
                                                                placeholder="Customer testimonial quote"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={project.testimonial?.author || ''}
                                                                onChange={(e) => {
                                                                    const newProjects = [...(content.featured_products || [])]
                                                                    newProjects[index] = {
                                                                        ...newProjects[index],
                                                                        testimonial: {
                                                                            ...newProjects[index].testimonial,
                                                                            quote: newProjects[index].testimonial?.quote || '',
                                                                            author: e.target.value
                                                                        }
                                                                    }
                                                                    updateField('featured_products', newProjects)
                                                                }}
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                placeholder="Author name"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {/* Add new project button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newProject = featuredFields.usesTestimonials
                                                        ? {
                                                            title: '',
                                                            description: '',
                                                            tags: [],
                                                            testimonial: { quote: '', author: '' }
                                                        }
                                                        : {
                                                            title: '',
                                                            description: '',
                                                            tags: [],
                                                            image: undefined
                                                        }
                                                    const newProjects = [...(content.featured_products || []), newProject]
                                                    updateField('featured_products', newProjects)
                                                }}
                                                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Add New Project
                                            </button>
                                        </div>
                                    )}
                                </div>
                                )}

                                {/* Featured Images Gallery - Only show if style uses images (Style 3) */}
                                {featuredFields.usesImages && (
                                <div
                                    onMouseEnter={() => highlightElement('.featured-gallery .gallery-grid')}
                                    onMouseLeave={removeHighlight}
                                    className={`p-4 rounded-lg border transition-all ${
                                        content.visibility?.featured_images !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            {content.visibility?.featured_images !== false ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            Featured Images Gallery
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => updateField('visibility', {
                                                ...content.visibility,
                                                featured_images: content.visibility?.featured_images === false ? true : false
                                            })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                content.visibility?.featured_images !== false ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                content.visibility?.featured_images !== false ? 'translate-x-4.5' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">Select images for the animated 3-column gallery</p>

                                    {/* Current featured images */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {[0, 1, 2, 3, 4, 5].map((index) => {
                                            const featuredImagesRaw = content.featured_images || availableImages
                                            const rawImageUrl = featuredImagesRaw[index]
                                            // Use resolved URL if available, otherwise use raw URL (for http URLs)
                                            const displayUrl = content.featured_images
                                                ? (resolvedFeaturedImages[index] || rawImageUrl)
                                                : rawImageUrl
                                            const isLoading = rawImageUrl && !rawImageUrl.startsWith('http') && !resolvedFeaturedImages[index]
                                            return (
                                                <div key={index} className="aspect-[3/4] rounded-md overflow-hidden border border-gray-200 bg-gray-50 relative group">
                                                    {rawImageUrl ? (
                                                        isLoading ? (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <img
                                                                    src={displayUrl}
                                                                    alt={`Featured ${index + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const newImages = [...(content.featured_images || availableImages)]
                                                                        newImages.splice(index, 1)
                                                                        updateField('featured_images', newImages)
                                                                    }}
                                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Remove image"
                                                                >
                                                                    &times;
                                                                </button>
                                                            </>
                                                        )
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <ImageIcon className="w-5 h-5 opacity-50" />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 mb-3">
                                        {/* Select from available images */}
                                        {availableImages.length > 0 && (
                                            <button
                                                onClick={() => setShowFeaturedImagePicker(true)}
                                                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                Choose Images
                                            </button>
                                        )}

                                        {/* Upload new image */}
                                        <input
                                            type="file"
                                            ref={featuredFileInputRef}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return

                                                // Validate file size (max 5MB)
                                                if (file.size > 5 * 1024 * 1024) {
                                                    toast.error('File is too large. Maximum size is 5MB.')
                                                    return
                                                }

                                                // Validate file type
                                                if (!file.type.startsWith('image/')) {
                                                    toast.error('Only image files are allowed.')
                                                    return
                                                }

                                                setIsUploadingFeaturedImage(true)
                                                const toastId = toast.loading('Uploading image...')

                                                try {
                                                    // Get upload URL from Convex
                                                    const uploadUrl = await generateUploadUrl()

                                                    // Upload the file to Convex storage
                                                    const result = await fetch(uploadUrl, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': file.type },
                                                        body: file,
                                                    })

                                                    if (!result.ok) {
                                                        throw new Error('Failed to upload file')
                                                    }

                                                    const { storageId } = await result.json()

                                                    // Store as convex:storageId format for later URL resolution
                                                    const newImageUrl = `convex:${storageId}`
                                                    // If no featured_images set yet, start with available images, then add new one
                                                    const currentImages = content.featured_images || [...availableImages]
                                                    updateField('featured_images', [...currentImages, newImageUrl])
                                                    toast.success('Image uploaded and added to gallery', { id: toastId })
                                                } catch (error) {
                                                    console.error('Upload error:', error)
                                                    toast.error('Failed to upload image', { id: toastId })
                                                } finally {
                                                    setIsUploadingFeaturedImage(false)
                                                    if (featuredFileInputRef.current) featuredFileInputRef.current.value = ''
                                                }
                                            }}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => featuredFileInputRef.current?.click()}
                                            disabled={isUploadingFeaturedImage}
                                            className="flex-1 px-3 py-2 bg-white border border-dashed border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2 text-sm text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {isUploadingFeaturedImage ? 'Uploading...' : 'Upload New'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">Images will animate in 3 columns - first and third scroll down, middle scrolls up</p>
                                </div>
                                )}

                                {/* Featured Image Picker Modal */}
                                {showFeaturedImagePicker && (
                                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-gray-900">Select Featured Gallery Images</h3>
                                                <button
                                                    onClick={() => setShowFeaturedImagePicker(false)}
                                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                                <p className="text-sm text-gray-500 mb-4">
                                                    Click images to select/deselect. Select at least 6 images for the best gallery effect.
                                                </p>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                    {availableImages.map((imageUrl, index) => {
                                                        const featuredImages = content.featured_images || availableImages
                                                        const isSelected = featuredImages.includes(imageUrl)
                                                        const selectedIndex = featuredImages.indexOf(imageUrl)
                                                        return (
                                                            <button
                                                                key={index}
                                                                onClick={() => {
                                                                    const currentImages = content.featured_images || [...availableImages]
                                                                    if (isSelected) {
                                                                        // Remove from selection
                                                                        const newImages = currentImages.filter(img => img !== imageUrl)
                                                                        updateField('featured_images', newImages)
                                                                    } else {
                                                                        // Add to selection
                                                                        updateField('featured_images', [...currentImages, imageUrl])
                                                                    }
                                                                }}
                                                                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 ${
                                                                    isSelected
                                                                        ? 'border-blue-500 ring-2 ring-blue-200'
                                                                        : 'border-gray-200'
                                                                }`}
                                                            >
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={`Option ${index + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                {isSelected && (
                                                                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                                                        {selectedIndex + 1}
                                                                    </div>
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
                                                <button
                                                    onClick={() => setShowFeaturedImagePicker(false)}
                                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                                                >
                                                    Done ({(content.featured_images || availableImages).length} selected)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer Section */}
                    <div className="space-y-4">
                        {/* Footer Section Header with Toggle */}
                        <div
                            className="flex items-center justify-between"
                            onMouseEnter={() => highlightElement('.footer-refit-wrapper')}
                            onMouseLeave={removeHighlight}
                        >
                            <h4 className={`font-medium text-lg flex items-center gap-2 ${
                                content.visibility?.footer_section !== false ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                                {content.visibility?.footer_section !== false ? (
                                    <Eye className="w-4 h-4" />
                                ) : (
                                    <EyeOff className="w-4 h-4" />
                                )}
                                Footer Section
                            </h4>
                            <button
                                type="button"
                                onClick={() => updateField('visibility', {
                                    ...content.visibility,
                                    footer_section: content.visibility?.footer_section === false ? true : false
                                })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    content.visibility?.footer_section !== false ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    content.visibility?.footer_section !== false ? 'translate-x-4.5' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Only show footer fields if footer_section is visible */}
                        {content.visibility?.footer_section !== false && (
                            <>
                                {/* Element Visibility Toggles */}
                                <div
                                    className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                                >
                                    <label className="text-sm font-medium text-gray-700 mb-3 block">Element Visibility</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={content.visibility?.footer_badge !== false}
                                                onChange={(e) => updateField('visibility', {
                                                    ...content.visibility,
                                                    footer_badge: e.target.checked
                                                })}
                                                className="rounded text-blue-600"
                                            />
                                            Contact Badge
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={content.visibility?.footer_headline !== false}
                                                onChange={(e) => updateField('visibility', {
                                                    ...content.visibility,
                                                    footer_headline: e.target.checked
                                                })}
                                                className="rounded text-blue-600"
                                            />
                                            Headline
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={content.visibility?.footer_description !== false}
                                                onChange={(e) => updateField('visibility', {
                                                    ...content.visibility,
                                                    footer_description: e.target.checked
                                                })}
                                                className="rounded text-blue-600"
                                            />
                                            Description
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={content.visibility?.footer_contact !== false}
                                                onChange={(e) => updateField('visibility', {
                                                    ...content.visibility,
                                                    footer_contact: e.target.checked
                                                })}
                                                className="rounded text-blue-600"
                                            />
                                            Contact Info
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={content.visibility?.footer_social !== false}
                                                onChange={(e) => updateField('visibility', {
                                                    ...content.visibility,
                                                    footer_social: e.target.checked
                                                })}
                                                className="rounded text-blue-600"
                                            />
                                            Social Links
                                        </label>
                                    </div>
                                </div>

                                {/* Contact Info Editable */}
                                <div
                                    className={`p-4 rounded-lg border transition-all ${
                                        content.visibility?.footer_contact !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <label className="text-sm font-medium text-gray-700 mb-3 block">Contact Information</label>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Email</label>
                                            <input
                                                type="email"
                                                value={content.contact?.email || ''}
                                                onChange={(e) => updateField('contact', {
                                                    ...content.contact,
                                                    email: e.target.value
                                                })}
                                                disabled={content.visibility?.footer_contact === false}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                placeholder="contact@business.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                                            <input
                                                type="tel"
                                                value={content.contact?.phone || ''}
                                                onChange={(e) => updateField('contact', {
                                                    ...content.contact,
                                                    phone: e.target.value
                                                })}
                                                disabled={content.visibility?.footer_contact === false}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                placeholder="+63 900 000 0000"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Address</label>
                                            <input
                                                type="text"
                                                value={content.contact?.address || ''}
                                                onChange={(e) => updateField('contact', {
                                                    ...content.contact,
                                                    address: e.target.value
                                                })}
                                                disabled={content.visibility?.footer_contact === false}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                placeholder="123 Main St, City"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Description */}
                                <div
                                    className={`p-4 rounded-lg border transition-all ${
                                        content.visibility?.footer_description !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Footer Description</label>
                                    <textarea
                                        value={content.footer?.brand_blurb || ''}
                                        onChange={(e) => updateField('footer', {
                                            ...content.footer,
                                            brand_blurb: e.target.value
                                        })}
                                        disabled={content.visibility?.footer_description === false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        rows={3}
                                        placeholder="For any inquiries or to explore your vision further, we invite you to contact our professional team..."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Description text shown below the headline</p>
                                </div>

                                {/* Social Links */}
                                <div
                                    className={`p-4 rounded-lg border transition-all ${
                                        content.visibility?.footer_social !== false
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-medium text-gray-700">Social Links</label>
                                        <span className="text-xs text-gray-400">{content.footer?.social_links?.length || 0} links</span>
                                    </div>

                                    {/* Existing social links */}
                                    {content.footer?.social_links && content.footer.social_links.length > 0 && (
                                        <div className="space-y-2 mb-3">
                                            {content.footer.social_links.map((link, index) => (
                                                <div key={index} className="flex gap-2 items-center">
                                                    <select
                                                        value={link.platform}
                                                        onChange={(e) => {
                                                            const newLinks = [...(content.footer?.social_links || [])]
                                                            newLinks[index] = { ...newLinks[index], platform: e.target.value }
                                                            updateField('footer', { ...content.footer, social_links: newLinks })
                                                        }}
                                                        disabled={content.visibility?.footer_social === false}
                                                        className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                                    >
                                                        <option value="instagram">Instagram</option>
                                                        <option value="facebook">Facebook</option>
                                                        <option value="twitter">Twitter/X</option>
                                                        <option value="tiktok">TikTok</option>
                                                        <option value="youtube">YouTube</option>
                                                        <option value="linkedin">LinkedIn</option>
                                                    </select>
                                                    <input
                                                        type="url"
                                                        value={link.url}
                                                        onChange={(e) => {
                                                            const newLinks = [...(content.footer?.social_links || [])]
                                                            newLinks[index] = { ...newLinks[index], url: e.target.value }
                                                            updateField('footer', { ...content.footer, social_links: newLinks })
                                                        }}
                                                        disabled={content.visibility?.footer_social === false}
                                                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                                        placeholder="https://..."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newLinks = (content.footer?.social_links || []).filter((_, i) => i !== index)
                                                            updateField('footer', { ...content.footer, social_links: newLinks })
                                                        }}
                                                        disabled={content.visibility?.footer_social === false}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add new social link button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newLink = { platform: 'instagram', url: '' }
                                            const newLinks = [...(content.footer?.social_links || []), newLink]
                                            updateField('footer', { ...content.footer, social_links: newLinks })
                                        }}
                                        disabled={content.visibility?.footer_social === false}
                                        className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Social Link
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Save Indicator & Actions (Moved to Bottom) */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 z-10 flex justify-between items-center shadow-lg">
                        <div className="text-sm">
                            {hasChanges ? (
                                <span className="text-yellow-600 font-medium">⚠️ Unsaved changes</span>
                            ) : (
                                <span className="text-gray-500">All changes saved</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                disabled={!hasChanges || isSaving}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Live Preview */}
            <div className="w-full lg:w-1/2 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-white border-b border-gray-200 p-3">
                    <h3 className="text-sm font-semibold text-gray-900">Live Preview</h3>
                    <p className="text-xs text-gray-500">Hover over fields to see where they appear. Click images in preview to edit.</p>
                </div>
                <div className="h-[400px] lg:h-full overflow-auto">
                    <iframe
                        id="visual-preview"
                        srcDoc={htmlContent}
                        className="w-full h-full border-0"
                        title="Website Preview"
                        sandbox="allow-same-origin allow-scripts"
                    />
                </div>
            </div>
        </div >
    )
}
