/**
 * About Section Style Generators
 * Modern about section components for website templates
 */

interface AboutProps {
    businessName: string
    about: string
    photos: string[]
    stats?: { label: string; value: string }[]
    usps?: string[]
    headline?: string
    tagline?: string // Used as section title in style 3
    tags?: string[] // Iterable tags for style 3
    visibility?: {
        about_badge?: boolean
        about_headline?: boolean
        about_description?: boolean
        about_images?: boolean
        about_tagline?: boolean
        about_tags?: boolean
    }
}

/**
 * Style 1 - Refit-Inspired About Section
 * Light background with split layout - headline left, description right
 * Features: About us badge, large headline, description, 4-image horizontal gallery
 * Includes scroll-triggered animations for content and images
 */
function generateAboutStyle1(props: AboutProps): string {
    const { businessName, about, photos, usps = [], headline: customHeadline, visibility } = props

    // Get up to 4 photos for the gallery
    const galleryPhotos = photos.slice(0, 4)

    // Use custom headline if provided, otherwise generate from USPs or use business type
    const headline = customHeadline
        ? customHeadline
        : (usps.length > 0
            ? usps.slice(0, 3).join(' ')
            : `${businessName} specialists`)

    // Visibility defaults (all visible by default)
    const showBadge = visibility?.about_badge !== false
    const showHeadline = visibility?.about_headline !== false
    const showDescription = visibility?.about_description !== false
    const showImages = visibility?.about_images !== false

    return `
    <div class="about-refit-wrapper" id="about">
        <style>
            .about-refit-wrapper {
                background-color: var(--background, #F6F7F5);
                padding: 5rem 2rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .about-refit-wrapper {
                    padding: 6rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .about-refit-wrapper {
                    padding: 8rem 5rem;
                }
            }

            .about-refit {
                max-width: 1400px;
                margin: 0 auto;
            }

            /* Content Section - Split Layout */
            .about-refit .content-section {
                display: grid;
                grid-template-columns: 1fr;
                gap: 2rem;
                margin-bottom: 4rem;
            }

            @media (min-width: 768px) {
                .about-refit .content-section {
                    grid-template-columns: 1fr 1fr;
                    gap: 3rem;
                    margin-bottom: 5rem;
                }
            }

            @media (min-width: 1024px) {
                .about-refit .content-section {
                    grid-template-columns: 45% 55%;
                    gap: 4rem;
                    margin-bottom: 6rem;
                }
            }

            /* Left Side - Badge and Headline */
            .about-refit .content-left {
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
            }

            /* About Badge */
            .about-refit .about-badge {
                display: inline-flex;
                align-items: center;
                padding: 0.5rem 1rem;
                background: var(--secondary, #1F2933);
                color: #ffffff;
                border-radius: 100px;
                width: fit-content;
                margin-bottom: 1.5rem;
                font-size: 0.85rem;
                letter-spacing: 0.02em;
            }

            /* Headline */
            .about-refit .headline {
                font-size: clamp(2.5rem, 5vw, 4rem);
                font-weight: 500;
                line-height: 1.1;
                color: var(--secondary, #1F2933);
                letter-spacing: -0.02em;
                margin: 0;
            }

            /* Right Side - Description */
            .about-refit .content-right {
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .about-refit .description {
                font-size: clamp(1rem, 1.5vw, 1.125rem);
                color: rgba(31, 41, 51, 0.75);
                line-height: 1.8;
                margin: 0;
            }

            /* Image Gallery */
            .about-refit .image-gallery {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
            }

            @media (min-width: 768px) {
                .about-refit .image-gallery {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
            }

            .about-refit .gallery-image {
                position: relative;
                aspect-ratio: 3/4;
                border-radius: 12px;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .about-refit .gallery-image {
                    border-radius: 16px;
                }
            }

            .about-refit .gallery-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                transition: transform 0.5s ease;
            }

            .about-refit .gallery-image:hover img {
                transform: scale(1.05);
            }

            /* Scroll Animation Styles */
            .about-refit .fade-in-up {
                opacity: 0;
                transform: translateY(40px);
                transition: opacity 0.8s ease-out, transform 0.8s ease-out;
            }

            .about-refit .fade-in-up.visible {
                opacity: 1;
                transform: translateY(0);
            }

            /* Staggered animation delays for gallery images */
            .about-refit .gallery-image:nth-child(1) { transition-delay: 0.1s; }
            .about-refit .gallery-image:nth-child(2) { transition-delay: 0.2s; }
            .about-refit .gallery-image:nth-child(3) { transition-delay: 0.3s; }
            .about-refit .gallery-image:nth-child(4) { transition-delay: 0.4s; }

            /* Content stagger */
            .about-refit .content-left .fade-in-up:nth-child(1) { transition-delay: 0s; }
            .about-refit .content-left .fade-in-up:nth-child(2) { transition-delay: 0.15s; }
            .about-refit .content-right .fade-in-up { transition-delay: 0.3s; }
        </style>

        <section class="about-refit">
            <div class="content-section">
                <div class="content-left">
                    ${showBadge ? `
                    <div class="about-badge fade-in-up font-manrope">
                        About us
                    </div>
                    ` : ''}

                    ${showHeadline ? `
                    <h2 class="headline fade-in-up font-dm-sans">${headline}</h2>
                    ` : ''}
                </div>

                <div class="content-right">
                    ${showDescription ? `
                    <p class="description fade-in-up font-manrope">${about}</p>
                    ` : ''}
                </div>
            </div>

            ${showImages && galleryPhotos.length > 0 ? `
            <div class="image-gallery">
                ${galleryPhotos.map((photo, index) => `
                <div class="gallery-image fade-in-up">
                    <img src="${photo}" alt="${businessName} - Image ${index + 1}" loading="lazy">
                </div>
                `).join('')}
            </div>
            ` : ''}
        </section>

        <script>
            // Intersection Observer for scroll animations
            (function() {
                const aboutSection = document.querySelector('.about-refit-wrapper');
                if (!aboutSection) return;

                const fadeElements = aboutSection.querySelectorAll('.fade-in-up');

                const observerOptions = {
                    root: null,
                    rootMargin: '0px 0px -100px 0px',
                    threshold: 0.1
                };

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            observer.unobserve(entry.target);
                        }
                    });
                }, observerOptions);

                fadeElements.forEach(el => observer.observe(el));
            })();
        </script>
    </div>`
}

/**
 * Style 2 - Minimal Italic (Prototype-inspired)
 * Large italic serif description on right, image slideshow on left bottom
 * Features: Large italic text, "About us" link, auto-cycling image slideshow, minimal design
 */
function generateAboutStyle2(props: AboutProps): string {
    const { businessName, about, photos, visibility } = props

    // Get all photos for the slideshow
    const slidePhotos = photos.length > 0 ? photos : []

    // Visibility defaults (all visible by default)
    const showBadge = visibility?.about_badge !== false
    const showDescription = visibility?.about_description !== false
    const showImages = visibility?.about_images !== false

    return `
    <div class="about-minimal-wrapper" id="about">
        <style>
            .about-minimal-wrapper {
                background-color: #ffffff;
                padding: 5rem 2rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .about-minimal-wrapper {
                    padding: 6rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .about-minimal-wrapper {
                    padding: 8rem 5rem;
                }
            }

            .about-minimal {
                max-width: 1400px;
                margin: 0 auto;
                display: grid;
                grid-template-columns: 1fr;
                gap: 3rem;
            }

            @media (min-width: 1024px) {
                .about-minimal {
                    grid-template-columns: 1fr 1.5fr;
                    gap: 4rem;
                    align-items: end;
                }
            }

            /* Left Side - Image Slideshow */
            .about-minimal .image-section {
                order: 2;
            }

            @media (min-width: 1024px) {
                .about-minimal .image-section {
                    order: 1;
                }
            }

            .about-minimal .about-slideshow {
                position: relative;
                aspect-ratio: 4/3;
                border-radius: 0;
                overflow: hidden;
                /* Fade up animation */
                opacity: 0;
                transform: translateY(40px);
                animation: about-fade-up 0.8s ease-out 0.4s forwards;
            }

            @keyframes about-fade-up {
                from {
                    opacity: 0;
                    transform: translateY(40px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .about-minimal .about-slideshow img {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                opacity: 0;
                transition: opacity 1s ease-in-out, transform 0.7s ease;
            }

            .about-minimal .about-slideshow img.active {
                opacity: 1;
            }

            .about-minimal .about-slideshow:hover img.active {
                transform: scale(1.03);
            }

            /* Right Side - Content */
            .about-minimal .content-section {
                order: 1;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
            }

            @media (min-width: 1024px) {
                .about-minimal .content-section {
                    order: 2;
                }
            }

            /* Description - Large Italic Serif */
            .about-minimal .description {
                font-size: clamp(1.5rem, 3.5vw, 2.5rem);
                font-weight: 400;
                font-style: italic;
                line-height: 1.4;
                color: #1a1a1a;
                letter-spacing: -0.01em;
                margin: 0 0 2rem 0;
                /* Fade up animation */
                opacity: 0;
                transform: translateY(40px);
                animation: about-fade-up 0.8s ease-out 0.2s forwards;
            }

            /* About Link/Badge */
            .about-minimal .about-link {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: #1a1a1a;
                text-decoration: none;
                letter-spacing: 0.02em;
                transition: opacity 0.2s ease;
                /* Fade in animation */
                opacity: 0;
                animation: about-fade-in 0.6s ease-out 0.6s forwards;
            }

            @keyframes about-fade-in {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            .about-minimal .about-link:hover {
                opacity: 0.7;
            }

            .about-minimal .about-link::before {
                content: '›';
                font-size: 1rem;
            }

            .about-minimal .about-link span {
                text-decoration: underline;
                text-underline-offset: 3px;
            }
        </style>

        <section class="about-minimal">
            <div class="content-section">
                ${showDescription ? `
                <p class="description font-playfair">${about}</p>
                ` : ''}

                ${showBadge ? `
                <a href="#contact" class="about-link font-manrope">
                    <span>About us</span>
                </a>
                ` : ''}
            </div>

            ${showImages && slidePhotos.length > 0 ? `
            <div class="image-section">
                <div class="about-slideshow" id="about-slideshow">
                    ${slidePhotos.map((photo, index) => `
                    <img src="${photo}" alt="${businessName} - Image ${index + 1}" loading="lazy" class="${index === 0 ? 'active' : ''}" data-index="${index}">
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </section>

        ${slidePhotos.length > 1 ? `
        <script>
            // Image slideshow - cycles every 4 seconds
            (function() {
                const slideshow = document.getElementById('about-slideshow');
                if (!slideshow) return;

                const images = slideshow.querySelectorAll('img');
                if (images.length <= 1) return;

                let currentIndex = 0;
                const totalImages = images.length;

                function showNextImage() {
                    // Remove active class from current image
                    images[currentIndex].classList.remove('active');

                    // Move to next image
                    currentIndex = (currentIndex + 1) % totalImages;

                    // Add active class to new image
                    images[currentIndex].classList.add('active');
                }

                // Start the slideshow after a short delay
                setTimeout(() => {
                    setInterval(showNextImage, 4000);
                }, 1000);
            })();
        </script>
        ` : ''}
    </div>`
}

/**
 * Style 3 - Linea-Inspired About Section
 * Large headline with italic accent, single image left, tagline + description + tags right
 * Features: No badge, large headline, single image, section tagline, description, iterable tags
 */
function generateAboutStyle3(props: AboutProps): string {
    const { businessName, about, photos, headline: customHeadline, tagline, tags = [], visibility } = props

    // Get first photo for the single image
    const aboutImage = photos.length > 0 ? photos[0] : ''

    // Use custom headline if provided
    const headline = customHeadline || `We help brands show up with clarity, confidence, and design that actually works.`

    // Split headline to add italic styling to certain words
    // Look for patterns like "clarity, confidence," or words after "with"
    const formatHeadline = (text: string): string => {
        // Find words that should be italicized (typically descriptive words or phrases)
        // Pattern: words separated by commas or "and" that describe qualities
        const italicPatterns = [
            /\b(clarity|confidence|design|quality|excellence|precision|care|passion|dedication|innovation|creativity|style|elegance)\b/gi,
        ]

        let formattedText = text
        italicPatterns.forEach(pattern => {
            formattedText = formattedText.replace(pattern, '<em>$1</em>')
        })

        return formattedText
    }

    // Visibility defaults (all visible by default)
    const showHeadline = visibility?.about_headline !== false
    const showDescription = visibility?.about_description !== false
    const showImages = visibility?.about_images !== false
    const showTagline = visibility?.about_tagline !== false
    const showTags = visibility?.about_tags !== false

    return `
    <div class="about-linea-wrapper" id="about">
        <style>
            .about-linea-wrapper {
                background-color: #ffffff;
                padding: 5rem 1.5rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .about-linea-wrapper {
                    padding: 6rem 2rem;
                }
            }

            @media (min-width: 1024px) {
                .about-linea-wrapper {
                    padding: 8rem 3rem;
                }
            }

            .about-linea {
                max-width: 1200px;
                margin: 0 auto;
            }

            /* Headline Section - Centered */
            .about-linea .headline-section {
                margin-bottom: 3rem;
                text-align: center;
            }

            @media (min-width: 768px) {
                .about-linea .headline-section {
                    margin-bottom: 4rem;
                }
            }

            .about-linea .headline {
                font-size: clamp(1.75rem, 4vw, 2.75rem);
                font-weight: 400;
                line-height: 1.25;
                color: #1a1a1a;
                letter-spacing: -0.01em;
                margin: 0 auto;
                max-width: 800px;
            }

            .about-linea .headline em {
                font-style: italic;
            }

            /* Content Card - Contains image and text */
            .about-linea .content-card {
                background-color: #ffffff;
                border-radius: 20px;
                box-shadow: 0 4px 40px rgba(0, 0, 0, 0.08), 0 2px 12px rgba(0, 0, 0, 0.04);
                padding: 1.5rem;
                max-width: 950px;
                margin: 0 auto;
            }

            @media (min-width: 768px) {
                .about-linea .content-card {
                    padding: 2rem;
                    border-radius: 24px;
                }
            }

            /* Content Section - Split Layout inside card */
            .about-linea .content-section {
                display: grid;
                grid-template-columns: 1fr;
                gap: 2rem;
                align-items: center;
            }

            @media (min-width: 768px) {
                .about-linea .content-section {
                    grid-template-columns: 1fr 1.3fr;
                    gap: 2.5rem;
                }
            }

            /* Left Side - Image */
            .about-linea .image-section {
                position: relative;
            }

            .about-linea .about-image {
                width: 100%;
                aspect-ratio: 4/5;
                object-fit: cover;
                object-position: center;
                border-radius: 12px;
            }

            @media (min-width: 768px) {
                .about-linea .about-image {
                    border-radius: 16px;
                }
            }

            /* Right Side - Content */
            .about-linea .content-right {
                display: flex;
                flex-direction: column;
                padding: 0.5rem 0;
            }

            @media (min-width: 768px) {
                .about-linea .content-right {
                    padding: 1rem 0.5rem;
                }
            }

            /* Section Tagline (Title) */
            .about-linea .section-tagline {
                font-size: 1.5rem;
                font-weight: 600;
                color: #1a1a1a;
                letter-spacing: -0.01em;
                margin: 0 0 1rem 0;
            }

            @media (min-width: 768px) {
                .about-linea .section-tagline {
                    font-size: 1.75rem;
                    margin: 0 0 1.25rem 0;
                }
            }

            /* Description */
            .about-linea .description {
                font-size: 0.9375rem;
                color: #666666;
                line-height: 1.7;
                margin: 0 0 1.75rem 0;
            }

            @media (min-width: 768px) {
                .about-linea .description {
                    font-size: 1rem;
                    margin: 0 0 2rem 0;
                }
            }

            /* Tags Container */
            .about-linea .tags-container {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }

            @media (min-width: 768px) {
                .about-linea .tags-container {
                    gap: 0.625rem;
                }
            }

            /* Individual Tag */
            .about-linea .tag {
                display: inline-flex;
                align-items: center;
                gap: 0.375rem;
                padding: 0.5rem 0.875rem;
                background-color: #fafafa;
                border: 1px solid #f0f0f0;
                border-radius: 100px;
                font-size: 0.8125rem;
                color: #1a1a1a;
                transition: background-color 0.2s ease, border-color 0.2s ease;
            }

            @media (min-width: 768px) {
                .about-linea .tag {
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                }
            }

            .about-linea .tag:hover {
                background-color: #f5f5f5;
                border-color: #e5e5e5;
            }

            .about-linea .tag-icon {
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #e85a30;
            }

            .about-linea .tag-icon svg {
                width: 14px;
                height: 14px;
                stroke: currentColor;
                stroke-width: 2.5;
                fill: none;
            }

            /* Scroll Animation Styles */
            .about-linea .fade-in-up {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.7s ease-out, transform 0.7s ease-out;
            }

            .about-linea .fade-in-up.visible {
                opacity: 1;
                transform: translateY(0);
            }

            /* Staggered animation delays */
            .about-linea .headline-section .fade-in-up { transition-delay: 0s; }
            .about-linea .content-card.fade-in-up { transition-delay: 0.15s; }
        </style>

        <section class="about-linea">
            ${showHeadline ? `
            <div class="headline-section">
                <h2 class="headline fade-in-up font-dm-sans">${formatHeadline(headline)}</h2>
            </div>
            ` : ''}

            <div class="content-card fade-in-up">
                <div class="content-section">
                    ${showImages && aboutImage ? `
                    <div class="image-section">
                        <img src="${aboutImage}" alt="${businessName}" class="about-image" loading="lazy">
                    </div>
                    ` : ''}

                    <div class="content-right">
                        ${showTagline && tagline ? `
                        <h3 class="section-tagline font-dm-sans">${tagline}</h3>
                        ` : ''}

                        ${showDescription ? `
                        <p class="description font-manrope">${about}</p>
                        ` : ''}

                        ${showTags && tags.length > 0 ? `
                        <div class="tags-container">
                            ${tags.map(tag => `
                            <span class="tag font-manrope">
                                <span class="tag-icon">
                                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </span>
                                ${tag}
                            </span>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </section>

        <script>
            // Intersection Observer for scroll animations
            (function() {
                const aboutSection = document.querySelector('.about-linea-wrapper');
                if (!aboutSection) return;

                const fadeElements = aboutSection.querySelectorAll('.fade-in-up');

                const observerOptions = {
                    root: null,
                    rootMargin: '0px 0px -80px 0px',
                    threshold: 0.1
                };

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            observer.unobserve(entry.target);
                        }
                    });
                }, observerOptions);

                fadeElements.forEach(el => observer.observe(el));
            })();
        </script>
    </div>`
}

/**
 * Style 4 - Quote Style with Logo Carousel
 * Centered layout with "ABOUT US" badge, large quote-style description with scroll-reveal text effect,
 * and small logo/image carousel at the bottom
 * Features: Badge with dot, large description text, infinite logo carousel
 *
 * Field mapping:
 * - About Badge → "ABOUT US" badge with dot indicator
 * - About Description → Large quote-style text with scroll-reveal effect
 * - About Images → Small logo carousel at bottom
 */
function generateAboutStyle4(props: AboutProps): string {
    const { businessName, about, photos, visibility } = props

    // Visibility defaults (all visible by default)
    const showBadge = visibility?.about_badge !== false
    const showDescription = visibility?.about_description !== false
    const showImages = visibility?.about_images !== false

    // Ensure we have images for the carousel
    const carouselImages: string[] = []
    if (photos.length > 0) {
        // Duplicate images to ensure smooth infinite scroll
        const minImages = 12
        while (carouselImages.length < minImages) {
            for (const photo of photos) {
                carouselImages.push(photo)
                if (carouselImages.length >= minImages) break
            }
        }
    }

    return `
    <div class="about-quote-wrapper" id="about">
        <style>
            .about-quote-wrapper {
                background-color: var(--background, #ffffff);
                padding: 5rem 2rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .about-quote-wrapper {
                    padding: 6rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .about-quote-wrapper {
                    padding: 8rem 5rem;
                }
            }

            .about-quote {
                max-width: 1200px;
                margin: 0 auto;
            }

            /* Fade up animation for all elements */
            @keyframes about-quote-fade-up {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Elements start hidden, animate when section is visible */
            .about-quote .fade-up {
                opacity: 0;
                transform: translateY(30px);
            }

            .about-quote.visible .fade-up {
                animation: about-quote-fade-up 0.7s ease-out forwards;
            }

            /* Staggered delays for coming together effect */
            .about-quote.visible .fade-up:nth-child(1) {
                animation-delay: 0.1s;
            }
            .about-quote.visible .fade-up:nth-child(2) {
                animation-delay: 0.25s;
            }
            .about-quote.visible .fade-up:nth-child(3) {
                animation-delay: 0.4s;
            }

            /* Badge with Dot */
            .about-quote .about-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 2.5rem;
            }

            .about-quote .badge-dot {
                width: 8px;
                height: 8px;
                background: var(--primary, #e85a30);
                border-radius: 50%;
            }

            .about-quote .badge-text {
                font-size: 0.75rem;
                font-weight: 500;
                color: var(--secondary, #666666);
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }

            /* Description with scroll reveal text effect */
            .about-quote .description-container {
                margin-bottom: 4rem;
            }

            @media (min-width: 768px) {
                .about-quote .description-container {
                    margin-bottom: 5rem;
                }
            }

            .about-quote .description {
                font-size: clamp(1.5rem, 3.5vw, 2.25rem);
                font-weight: 400;
                line-height: 1.5;
                color: var(--secondary, #1a1a1a);
                letter-spacing: -0.01em;
                margin: 0;
                max-width: 900px;
            }

            /* Word-by-word reveal animation */
            .about-quote .reveal-word {
                display: inline-block;
                opacity: 0.15;
                transition: opacity 0.4s ease-out, color 0.4s ease-out;
            }

            .about-quote .reveal-word.revealed {
                opacity: 1;
            }

            /* Italic accent for highlighted words */
            .about-quote .reveal-word.italic-accent {
                font-style: italic;
                color: var(--secondary, #1a1a1a);
            }

            .about-quote .reveal-word.italic-accent.revealed {
                color: var(--secondary, #666666);
            }

            /* Logo Carousel */
            .about-quote-carousel {
                overflow: hidden;
                position: relative;
                padding: 1rem 0;
            }

            .about-quote-carousel::before,
            .about-quote-carousel::after {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                width: 80px;
                z-index: 2;
                pointer-events: none;
            }

            .about-quote-carousel::before {
                left: 0;
                background: linear-gradient(to right, var(--background, #ffffff), transparent);
            }

            .about-quote-carousel::after {
                right: 0;
                background: linear-gradient(to left, var(--background, #ffffff), transparent);
            }

            .about-quote .carousel-track {
                display: flex;
                gap: 3rem;
                animation: about-carousel-scroll 25s linear infinite;
                width: fit-content;
            }

            @media (min-width: 768px) {
                .about-quote .carousel-track {
                    gap: 4rem;
                }
            }

            @keyframes about-carousel-scroll {
                0% {
                    transform: translateX(0);
                }
                100% {
                    transform: translateX(-50%);
                }
            }

            .about-quote .carousel-track:hover {
                animation-play-state: paused;
            }

            .about-quote .carousel-item {
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 40px;
                opacity: 0.5;
                transition: opacity 0.3s ease;
                filter: grayscale(100%);
            }

            @media (min-width: 768px) {
                .about-quote .carousel-item {
                    height: 50px;
                }
            }

            .about-quote .carousel-item:hover {
                opacity: 1;
                filter: grayscale(0%);
            }

            .about-quote .carousel-item img {
                max-height: 100%;
                max-width: 120px;
                object-fit: contain;
            }

            @media (min-width: 768px) {
                .about-quote .carousel-item img {
                    max-width: 140px;
                }
            }
        </style>

        <section class="about-quote" id="about-quote-section">
            ${showBadge ? `
            <div class="about-badge fade-up">
                <span class="badge-dot"></span>
                <span class="badge-text font-manrope">About Us</span>
            </div>
            ` : ''}

            ${showDescription ? `
            <div class="description-container fade-up">
                <p class="description font-dm-sans" id="about-reveal-text">${about}</p>
            </div>
            ` : ''}

            ${showImages && carouselImages.length > 0 ? `
            <div class="about-quote-carousel fade-up">
                <div class="carousel-track">
                    ${carouselImages.map((img, i) => `
                    <div class="carousel-item">
                        <img src="${img}" alt="${businessName} partner ${(i % photos.length) + 1}" loading="lazy">
                    </div>
                    `).join('')}
                    ${carouselImages.map((img, i) => `
                    <div class="carousel-item">
                        <img src="${img}" alt="${businessName} partner ${(i % photos.length) + 1}" loading="lazy">
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </section>

        <script>
            // Coming all together animation - Intersection Observer
            (function() {
                const section = document.getElementById('about-quote-section');
                if (!section) return;

                const sectionObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            section.classList.add('visible');
                            sectionObserver.unobserve(section);
                        }
                    });
                }, {
                    root: null,
                    rootMargin: '0px 0px -100px 0px',
                    threshold: 0.1
                });

                sectionObserver.observe(section);
            })();

            // Word-by-word scroll reveal effect
            (function() {
                const textElement = document.getElementById('about-reveal-text');
                if (!textElement) return;

                const originalText = textElement.textContent || '';
                const words = originalText.split(' ');

                // Words to make italic (common descriptive/emotional words)
                const italicWords = ['stories', 'evokes', 'emotion', 'connections', 'branding', 'web', 'design', 'storytelling', 'creative', 'agency', 'specialize', 'quality', 'excellence', 'passion', 'care', 'dedication'];

                // Wrap each word in a span
                textElement.innerHTML = words.map((word, index) => {
                    const isItalic = italicWords.some(iw => word.toLowerCase().includes(iw.toLowerCase()));
                    return '<span class="reveal-word' + (isItalic ? ' italic-accent' : '') + '" data-index="' + index + '">' + word + '</span>';
                }).join(' ');

                const wordSpans = textElement.querySelectorAll('.reveal-word');

                // Intersection Observer for scroll-based reveal
                const observerOptions = {
                    root: null,
                    rootMargin: '0px 0px -20% 0px',
                    threshold: Array.from({ length: 11 }, (_, i) => i / 10)
                };

                let hasStartedReveal = false;

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && !hasStartedReveal) {
                            hasStartedReveal = true;
                            // Start revealing words with staggered delay
                            wordSpans.forEach((span, index) => {
                                setTimeout(() => {
                                    span.classList.add('revealed');
                                }, index * 50);
                            });
                        }
                    });
                }, observerOptions);

                observer.observe(textElement);

                // Also reveal on scroll position within section
                const aboutSection = document.querySelector('.about-quote-wrapper');
                if (aboutSection) {
                    const handleScroll = () => {
                        const rect = aboutSection.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;

                        // Calculate how much of section is visible
                        const visibleTop = Math.max(0, viewportHeight - rect.top);
                        const visibleHeight = Math.min(rect.height, visibleTop);
                        const scrollProgress = Math.min(1, visibleHeight / (viewportHeight * 0.6));

                        if (scrollProgress > 0 && !hasStartedReveal) {
                            hasStartedReveal = true;
                            wordSpans.forEach((span, index) => {
                                setTimeout(() => {
                                    span.classList.add('revealed');
                                }, index * 50);
                            });
                        }
                    };

                    window.addEventListener('scroll', handleScroll, { passive: true });
                    // Initial check
                    handleScroll();
                }
            })();
        </script>
    </div>`
}

/**
 * Get fields used by each about style
 * Used to conditionally show/hide fields in the content editor
 */
export function getAboutStyleFields(style: string): {
    usesHeadline: boolean
    usesBadge: boolean
    usesDescription: boolean
    usesImages: boolean
    usesUsps: boolean
    usesTagline: boolean
    usesTags: boolean
} {
    const styleFields: Record<string, {
        usesHeadline: boolean
        usesBadge: boolean
        usesDescription: boolean
        usesImages: boolean
        usesUsps: boolean
        usesTagline: boolean
        usesTags: boolean
    }> = {
        '1': {
            usesHeadline: true,
            usesBadge: true,
            usesDescription: true,
            usesImages: true, // 4-image gallery
            usesUsps: true,
            usesTagline: false,
            usesTags: false,
        },
        '2': {
            usesHeadline: false, // No headline in style 2
            usesBadge: true, // "About us" link
            usesDescription: true, // Large italic description
            usesImages: true, // Single image
            usesUsps: false, // No USPs in style 2
            usesTagline: false,
            usesTags: false,
        },
        '3': {
            usesHeadline: true, // Large headline with italic accent
            usesBadge: false, // No badge in style 3
            usesDescription: true, // Description paragraph
            usesImages: true, // Single image
            usesUsps: false, // No USPs in style 3
            usesTagline: true, // Section title (e.g., "Brand Identity")
            usesTags: true, // Iterable tags
        },
        '4': {
            usesHeadline: false, // No headline in style 4
            usesBadge: true, // "ABOUT US" badge with dot
            usesDescription: true, // Large quote-style description with scroll reveal
            usesImages: true, // Logo carousel at bottom
            usesUsps: false, // No USPs in style 4
            usesTagline: false, // No tagline in style 4
            usesTags: false, // No tags in style 4
        },
    }

    return styleFields[style] || styleFields['1']
}

/**
 * Main generator function - routes to appropriate style
 */
export function generateAboutHtml(style: string, props: AboutProps): string {
    const generators: Record<string, (props: AboutProps) => string> = {
        '1': generateAboutStyle1,
        '2': generateAboutStyle2,
        '3': generateAboutStyle3,
        '4': generateAboutStyle4,
    }

    const generator = generators[style] || generators['1']
    return generator(props)
}

export type { AboutProps }
