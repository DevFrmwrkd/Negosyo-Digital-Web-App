/**
 * Hero Style Generators
 * Modern hero component for website templates
 */

interface HeroProps {
    businessName: string
    tagline: string
    about: string
    heroCta?: { label: string; link: string }
    photos: string[]
    badgeText?: string
    testimonial?: string
    visibility?: {
        hero_headline?: boolean
        hero_tagline?: boolean
        hero_description?: boolean
        hero_testimonial?: boolean
        hero_button?: boolean
        hero_image?: boolean
    }
}

/**
 * Style 1 - Split Dark Modern (Refit-inspired)
 * Dark background with split layout - content left, hero image right
 * Features: availability badge, bold headline, description, CTA button, floating testimonial
 */
function generateHeroStyle1(props: HeroProps): string {
    const { businessName, tagline, about, heroCta, photos, badgeText, testimonial, visibility } = props
    const mainPhoto = photos[0] || ''
    const displayBadgeText = badgeText // No default - empty means hidden
    const displayTestimonial = testimonial || `${businessName} has been a game changer. The ability to blend function with exquisite design is unparalleled.`

    // Visibility defaults (all visible by default)
    const showHeadline = visibility?.hero_headline !== false
    const showTagline = visibility?.hero_tagline !== false && displayBadgeText
    const showDescription = visibility?.hero_description !== false
    const showTestimonial = visibility?.hero_testimonial !== false
    const showButton = visibility?.hero_button !== false
    const showImage = visibility?.hero_image !== false

    return `
    <div class="hero-refit-wrapper">
        <style>
            .hero-refit-wrapper {
                background-color: var(--hero-bg, #0a0a0a);
                min-height: 100vh;
                position: relative;
                overflow: hidden;
                padding-top: 5rem;
            }

            @media (min-width: 768px) {
                .hero-refit-wrapper {
                    padding-top: 6rem;
                }
            }

            @media (min-width: 1024px) {
                .hero-refit-wrapper {
                    padding-top: 7rem;
                }
            }

            .hero-refit {
                display: grid;
                grid-template-columns: 1fr;
                min-height: 100vh;
                max-width: 1400px;
                margin: 0 auto;
                padding: 2rem;
                gap: 2rem;
            }

            @media (min-width: 768px) {
                .hero-refit {
                    grid-template-columns: 1fr 1fr;
                    padding: 3rem 4rem;
                    gap: 3rem;
                    align-items: center;
                }
            }

            @media (min-width: 1024px) {
                .hero-refit {
                    grid-template-columns: 45% 55%;
                    padding: 4rem 5rem;
                    gap: 4rem;
                }
            }

            /* Content Side */
            .hero-refit .content-side {
                display: flex;
                flex-direction: column;
                justify-content: center;
                order: 2;
                padding-top: 2rem;
            }

            @media (min-width: 768px) {
                .hero-refit .content-side {
                    order: 1;
                    padding-top: 0;
                }
            }

            /* Availability Badge */
            .hero-refit .availability-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 100px;
                width: fit-content;
                margin-bottom: 2rem;
            }

            .hero-refit .availability-badge .dot {
                width: 8px;
                height: 8px;
                background: var(--hero-accent, #6B8F71);
                border-radius: 50%;
                animation: pulse-dot 2s ease-in-out infinite;
            }

            @keyframes pulse-dot {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.2); }
            }

            .hero-refit .availability-badge span {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.85);
                letter-spacing: 0.02em;
            }

            /* Headline */
            .hero-refit h1 {
                font-size: clamp(2.5rem, 6vw, 4.5rem);
                font-weight: 500;
                line-height: 1.1;
                color: var(--hero-text, #ffffff);
                margin-bottom: 1.5rem;
                letter-spacing: -0.02em;
            }

            /* Description */
            .hero-refit .description {
                font-size: clamp(1rem, 1.5vw, 1.125rem);
                color: rgba(255, 255, 255, 0.65);
                line-height: 1.7;
                max-width: 420px;
                margin-bottom: 2.5rem;
            }

            /* CTA Button */
            .hero-refit .cta-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                padding: 1rem 1.5rem;
                background: var(--hero-text, #ffffff);
                color: var(--hero-bg, #0a0a0a);
                font-size: 0.9rem;
                font-weight: 500;
                border-radius: 100px;
                border: none;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                width: fit-content;
            }

            .hero-refit .cta-button:hover {
                transform: scale(1.03);
                box-shadow: 0 10px 30px rgba(255, 255, 255, 0.15);
            }

            .hero-refit .cta-button .arrow-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                background: var(--hero-bg, #0a0a0a);
                border-radius: 50%;
                transition: transform 0.3s ease;
            }

            .hero-refit .cta-button:hover .arrow-icon {
                transform: rotate(45deg);
            }

            .hero-refit .cta-button .arrow-icon svg {
                stroke: var(--hero-text, #ffffff);
            }

            /* Image Side */
            .hero-refit .image-side {
                position: relative;
                order: 1;
                min-height: 300px;
            }

            @media (min-width: 768px) {
                .hero-refit .image-side {
                    order: 2;
                    min-height: auto;
                    height: 100%;
                }
            }

            .hero-refit .image-container {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 350px;
                border-radius: 16px;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .hero-refit .image-container {
                    min-height: 500px;
                    border-radius: 20px;
                }
            }

            @media (min-width: 1024px) {
                .hero-refit .image-container {
                    min-height: 600px;
                    border-radius: 24px;
                }
            }

            .hero-refit .image-container img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
            }

            /* Floating Testimonial Card */
            .hero-refit .testimonial-card {
                position: absolute;
                bottom: 1.5rem;
                right: 1rem;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 12px;
                padding: 1rem;
                max-width: 280px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
                display: none;
            }

            @media (min-width: 768px) {
                .hero-refit .testimonial-card {
                    display: block;
                    bottom: 2rem;
                    right: 1.5rem;
                    padding: 1.25rem;
                }
            }

            @media (min-width: 1024px) {
                .hero-refit .testimonial-card {
                    bottom: 2.5rem;
                    right: 2rem;
                    max-width: 300px;
                    padding: 1.5rem;
                }
            }

            .hero-refit .testimonial-stars {
                display: flex;
                gap: 0.25rem;
                margin-bottom: 0.75rem;
            }

            .hero-refit .testimonial-stars svg {
                width: 14px;
                height: 14px;
                fill: var(--hero-accent, #6B8F71);
            }

            .hero-refit .testimonial-text {
                font-size: 0.85rem;
                color: #1a1a1a;
                line-height: 1.6;
                margin-bottom: 0;
                font-style: italic;
            }

            /* Navigation hint (optional floating element) */
            .hero-refit .nav-hint {
                position: absolute;
                top: 1rem;
                right: 1rem;
                display: flex;
                gap: 1.5rem;
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.6);
            }

            @media (min-width: 768px) {
                .hero-refit .nav-hint {
                    top: 1.5rem;
                    right: 1.5rem;
                }
            }

            .hero-refit .nav-hint a {
                color: rgba(255, 255, 255, 0.6);
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .hero-refit .nav-hint a:hover {
                color: var(--hero-text, #ffffff);
            }
        </style>

        <section class="hero-refit">
            <div class="content-side">
                ${showTagline ? `
                <div class="availability-badge">
                    <span class="dot"></span>
                    <span class="font-manrope">${displayBadgeText}</span>
                </div>
                ` : ''}

                ${showHeadline ? `<h1 class="font-dm-sans">${tagline}</h1>` : ''}

                ${showDescription ? `<p class="description font-manrope">${about}</p>` : ''}

                ${showButton ? `
                <a href="${heroCta?.link || '#services'}" class="cta-button font-manrope">
                    ${heroCta?.label || 'Work with us'}
                    <span class="arrow-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M7 7h10v10"/>
                            <path d="M7 17L17 7"/>
                        </svg>
                    </span>
                </a>
                ` : ''}
            </div>

            ${showImage ? `
            <div class="image-side">
                <div class="image-container">
                    <img src="${mainPhoto}" alt="${businessName}" class="hero-image">

                    ${showTestimonial ? `
                    <div class="testimonial-card">
                        <div class="testimonial-stars">
                            <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </div>
                        <p class="testimonial-text font-manrope">"${displayTestimonial}"</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
        </section>
    </div>`
}

/**
 * Style 2 - Fullscreen Background (Prototype-inspired)
 * Full-screen hero image as background with centered headline
 * Features: large headline with black boxes, scroll indicator, minimal design
 */
function generateHeroStyle2(props: HeroProps): string {
    const { businessName, tagline, photos, visibility } = props
    const mainPhoto = photos[0] || ''

    // Visibility defaults
    const showHeadline = visibility?.hero_headline !== false
    const showImage = visibility?.hero_image !== false

    // Split headline into words for the stacked black box effect
    const headlineWords = tagline.split(' ')
    const midPoint = Math.ceil(headlineWords.length / 2)
    const topLine = headlineWords.slice(0, midPoint).join(' ')
    const bottomLine = headlineWords.slice(midPoint).join(' ')

    return `
    <div class="hero-fullscreen-wrapper">
        <style>
            .hero-fullscreen-wrapper {
                position: relative;
                min-height: 100vh;
                width: 100%;
                overflow: hidden;
            }

            .hero-fullscreen-bg {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
            }

            .hero-fullscreen-bg img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
            }

            .hero-fullscreen-bg::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    to bottom,
                    rgba(0, 0, 0, 0.2) 0%,
                    rgba(0, 0, 0, 0.1) 50%,
                    rgba(0, 0, 0, 0.3) 100%
                );
            }

            .hero-fullscreen-content {
                position: relative;
                z-index: 2;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 2rem;
                text-align: center;
            }

            .hero-fullscreen-headline {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
            }

            .hero-fullscreen-headline .line {
                display: inline-block;
                background: #000000;
                color: #ffffff;
                padding: 0.5rem 1.5rem;
                font-size: clamp(1.5rem, 5vw, 3.5rem);
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                line-height: 1.2;
                /* Fade up animation */
                opacity: 0;
                transform: translateY(30px);
                animation: hero-fade-up 0.8s ease-out forwards;
            }

            .hero-fullscreen-headline .line:nth-child(1) {
                animation-delay: 0.2s;
            }

            .hero-fullscreen-headline .line:nth-child(2) {
                animation-delay: 0.4s;
            }

            @keyframes hero-fade-up {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @media (min-width: 768px) {
                .hero-fullscreen-headline .line {
                    padding: 0.75rem 2rem;
                    font-size: clamp(2rem, 6vw, 4rem);
                }
            }

            @media (min-width: 1024px) {
                .hero-fullscreen-headline .line {
                    padding: 1rem 2.5rem;
                    font-size: clamp(2.5rem, 5vw, 4.5rem);
                }
            }

            .hero-fullscreen-scroll {
                position: absolute;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                color: #ffffff;
                cursor: pointer;
                z-index: 3;
                /* Button reset styles */
                background: none;
                border: none;
                padding: 0;
                text-decoration: none;
                /* Fade in animation */
                opacity: 0;
                animation: hero-fade-in 0.6s ease-out 0.8s forwards;
                transition: transform 0.3s ease;
            }

            .hero-fullscreen-scroll:hover {
                transform: translateX(-50%) scale(1.05);
            }

            .hero-fullscreen-scroll span {
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.2em;
                font-weight: 500;
            }

            .hero-fullscreen-scroll .scroll-line {
                width: 1px;
                height: 40px;
                background: linear-gradient(to bottom, #ffffff, transparent);
                animation: scroll-bounce 2s ease-in-out infinite;
            }

            @keyframes scroll-bounce {
                0%, 100% {
                    transform: translateY(0);
                    opacity: 1;
                }
                50% {
                    transform: translateY(10px);
                    opacity: 0.5;
                }
            }

            .hero-fullscreen-brand {
                position: absolute;
                top: 2rem;
                left: 50%;
                transform: translateX(-50%);
                z-index: 3;
                color: #ffffff;
                font-size: 1rem;
                font-weight: 600;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                /* Fade in animation */
                opacity: 0;
                animation: hero-fade-in 0.6s ease-out 0.1s forwards;
            }

            @keyframes hero-fade-in {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            @media (min-width: 768px) {
                .hero-fullscreen-brand {
                    top: 3rem;
                    font-size: 1.125rem;
                }
            }
        </style>

        ${showImage ? `
        <div class="hero-fullscreen-bg">
            <img src="${mainPhoto}" alt="${businessName}">
        </div>
        ` : `
        <div class="hero-fullscreen-bg" style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%);"></div>
        `}

        <div class="hero-fullscreen-content">
            <div class="hero-fullscreen-brand font-dm-sans">${businessName}</div>

            ${showHeadline ? `
            <div class="hero-fullscreen-headline">
                <span class="line font-dm-sans">${topLine}</span>
                ${bottomLine ? `<span class="line font-dm-sans">${bottomLine}</span>` : ''}
            </div>
            ` : ''}

            <button type="button" class="hero-fullscreen-scroll" onclick="document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' }) || document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })">
                <span class="font-manrope">Scroll</span>
                <div class="scroll-line"></div>
            </button>
        </div>
    </div>`
}

/**
 * Style 3 - Centered Content with Image Carousel (Linea-inspired)
 * Light background with centered content, business name badge, and animated image carousel
 * Features: business name badge, large headline with italic accent, tagline, CTA button, infinite scroll carousel
 *
 * Field mapping:
 * - Business Name → Badge text at top (just the business name, no avatars/ratings)
 * - Hero Headline (tagline field) → Main headline with italic accent (e.g., "Wear Your Style In Season")
 * - Hero Tagline (hero_badge_text field) → Description text below headline
 * - Hero Button → CTA button
 * - Hero Images → Carousel images
 *
 * NOTE: This style does NOT use Hero Description field
 */
function generateHeroStyle3(props: HeroProps): string {
    const { businessName, tagline, heroCta, photos, badgeText, visibility } = props

    // Visibility defaults
    const showHeadline = visibility?.hero_headline !== false
    const showTagline = visibility?.hero_tagline !== false
    const showButton = visibility?.hero_button !== false
    const showImage = visibility?.hero_image !== false

    // Field mapping for this style:
    // - businessName → Badge text at top (just the name, no icons)
    // - tagline → Main large headline with italic accent (Hero Headline field)
    // - badgeText → Description text below headline (Hero Tagline field)

    // Ensure we have at least 4 images for the carousel by looping
    const carouselImages: string[] = []
    if (photos.length > 0) {
        // We need at least 8 images for smooth infinite scroll (4 visible + 4 for seamless loop)
        const minImages = 8
        while (carouselImages.length < minImages) {
            for (const photo of photos) {
                carouselImages.push(photo)
                if (carouselImages.length >= minImages) break
            }
        }
    }

    // Split headline (tagline field) to make last part italic (e.g., "Wear Your Style *In Season*")
    // Look for text after "for" or "in" to italicize, otherwise italicize last 2 words
    let headlinePart1 = tagline
    let headlinePart2 = ''

    // Check for " in " first, then " for "
    let splitIndex = tagline.toLowerCase().lastIndexOf(' in ')
    if (splitIndex === -1) {
        splitIndex = tagline.toLowerCase().lastIndexOf(' for ')
    }

    if (splitIndex !== -1) {
        headlinePart1 = tagline.substring(0, splitIndex + 4) // Include " in " or " for "
        headlinePart2 = tagline.substring(splitIndex + 4)
    } else {
        // Fallback: italicize last 2 words
        const words = tagline.split(' ')
        if (words.length > 2) {
            headlinePart1 = words.slice(0, -2).join(' ') + ' '
            headlinePart2 = words.slice(-2).join(' ')
        }
    }

    return `
    <div class="hero-linea-wrapper">
        <style>
            .hero-linea-wrapper {
                background-color: #fafafa;
                background-image: radial-gradient(circle, #e5e5e5 1px, transparent 1px);
                background-size: 20px 20px;
                min-height: 100vh;
                position: relative;
                overflow: hidden;
                padding-top: 80px;
            }

            .hero-linea {
                max-width: 1200px;
                margin: 0 auto;
                padding: 3rem 1.5rem 2rem;
                text-align: center;
            }

            @media (min-width: 768px) {
                .hero-linea {
                    padding: 4rem 2rem 2rem;
                }
            }

            @media (min-width: 1024px) {
                .hero-linea {
                    padding: 5rem 2rem 2rem;
                }
            }

            /* Business Name Badge */
            .hero-linea .business-badge {
                display: inline-block;
                font-size: 0.875rem;
                font-weight: 500;
                color: #666666;
                margin-bottom: 1.5rem;
                letter-spacing: 0.02em;
            }

            /* Headline */
            .hero-linea h1 {
                font-size: clamp(2rem, 5vw, 3.5rem);
                font-weight: 500;
                line-height: 1.15;
                color: #1a1a1a;
                margin-bottom: 1.25rem;
                letter-spacing: -0.02em;
            }

            @media (min-width: 768px) {
                .hero-linea h1 {
                    font-size: clamp(2.5rem, 6vw, 4rem);
                }
            }

            .hero-linea h1 .italic-accent {
                font-style: italic;
                font-weight: 400;
            }

            /* Description */
            .hero-linea .description {
                font-size: 1rem;
                color: #666666;
                line-height: 1.6;
                max-width: 500px;
                margin: 0 auto 2rem;
            }

            @media (min-width: 768px) {
                .hero-linea .description {
                    font-size: 1.0625rem;
                }
            }

            /* CTA Button */
            .hero-linea .cta-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.875rem 1.75rem;
                background: #e85a30;
                color: #ffffff;
                font-size: 0.9375rem;
                font-weight: 500;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
            }

            .hero-linea .cta-button:hover {
                background: #d14a22;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(232, 90, 48, 0.3);
            }

            /* Image Carousel */
            .hero-linea-carousel {
                margin-top: 3rem;
                overflow: hidden;
                position: relative;
            }

            @media (min-width: 768px) {
                .hero-linea-carousel {
                    margin-top: 4rem;
                }
            }

            .hero-linea-carousel::before,
            .hero-linea-carousel::after {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                width: 100px;
                z-index: 2;
                pointer-events: none;
            }

            .hero-linea-carousel::before {
                left: 0;
                background: linear-gradient(to right, #fafafa, transparent);
            }

            .hero-linea-carousel::after {
                right: 0;
                background: linear-gradient(to left, #fafafa, transparent);
            }

            .carousel-track {
                display: flex;
                gap: 1rem;
                animation: carousel-scroll 30s linear infinite;
                width: fit-content;
            }

            @media (min-width: 768px) {
                .carousel-track {
                    gap: 1.25rem;
                }
            }

            @keyframes carousel-scroll {
                0% {
                    transform: translateX(0);
                }
                100% {
                    transform: translateX(-50%);
                }
            }

            .carousel-track:hover {
                animation-play-state: paused;
            }

            .carousel-item {
                flex-shrink: 0;
                width: 200px;
                height: 240px;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            @media (min-width: 768px) {
                .carousel-item {
                    width: 260px;
                    height: 300px;
                    border-radius: 16px;
                }
            }

            @media (min-width: 1024px) {
                .carousel-item {
                    width: 280px;
                    height: 320px;
                }
            }

            .carousel-item:hover {
                transform: scale(1.02);
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
            }

            .carousel-item img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        </style>

        <section class="hero-linea">
            <!-- Business Name Badge -->
            <div class="business-badge font-manrope">${businessName}</div>

            <!-- Main Headline - uses Hero Headline field (tagline) -->
            ${showHeadline ? `
            <h1 class="font-dm-sans">
                ${headlinePart1}${headlinePart2 ? `<span class="italic-accent">${headlinePart2}</span>` : ''}
            </h1>
            ` : ''}

            <!-- Description - uses Hero Tagline field (badgeText) -->
            ${showTagline && badgeText ? `
            <p class="description font-manrope">${badgeText}</p>
            ` : ''}

            ${showButton ? `
            <a href="${heroCta?.link || '#contact'}" class="cta-button font-manrope">
                ${heroCta?.label || 'Book a Call'}
            </a>
            ` : ''}
        </section>

        ${showImage && carouselImages.length > 0 ? `
        <div class="hero-linea-carousel">
            <div class="carousel-track">
                ${carouselImages.map((img, i) => `
                <div class="carousel-item">
                    <img src="${img}" alt="${businessName} - Image ${(i % photos.length) + 1}" loading="lazy">
                </div>
                `).join('')}
                ${carouselImages.map((img, i) => `
                <div class="carousel-item">
                    <img src="${img}" alt="${businessName} - Image ${(i % photos.length) + 1}" loading="lazy">
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    </div>`
}

/**
 * Style 4 - Dark Full-Width with Services List
 * Dark hero with full background image, badge with dot indicator, large business name headline, and numbered services list
 * Features: badge with dot, large business name, "What we do" section with numbered services
 *
 * Field mapping:
 * - Hero Tagline (badgeText) → Badge text with dot indicator (e.g., "BRAND ARCHITECTS")
 * - Business Name → Large headline
 * - Hero Description (about) → Services list displayed as numbered items
 * - Hero Image → Background image with dark overlay
 *
 * NOTE: This style does NOT use Hero Headline, Testimonial, or Button fields
 */
function generateHeroStyle4(props: HeroProps): string {
    const { businessName, about, photos, badgeText, visibility } = props
    const mainPhoto = photos[0] || ''

    // Visibility defaults
    const showTagline = visibility?.hero_tagline !== false && badgeText
    const showHeadline = visibility?.hero_headline !== false
    const showDescription = visibility?.hero_description !== false
    const showImage = visibility?.hero_image !== false

    return `
    <div class="hero-services-wrapper">
        <style>
            .hero-services-wrapper {
                position: relative;
                min-height: 100vh;
                width: 100%;
                overflow: hidden;
                display: flex;
                align-items: center;
            }

            /* Fade up animation */
            @keyframes hero-services-fade-up {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Background Image */
            .hero-services-bg {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
            }

            .hero-services-bg img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
            }

            .hero-services-bg::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    135deg,
                    rgba(0, 0, 0, 0.85) 0%,
                    rgba(0, 0, 0, 0.7) 50%,
                    rgba(0, 0, 0, 0.5) 100%
                );
            }

            .hero-services-bg-fallback {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            }

            /* Content Container */
            .hero-services-content {
                position: relative;
                z-index: 2;
                width: 100%;
                max-width: 1400px;
                margin: 0 auto;
                padding: 8rem 2rem 4rem;
                display: grid;
                grid-template-columns: 1fr;
                gap: 3rem;
            }

            @media (min-width: 768px) {
                .hero-services-content {
                    padding: 10rem 3rem 5rem;
                    gap: 4rem;
                }
            }

            @media (min-width: 1024px) {
                .hero-services-content {
                    grid-template-columns: 1.2fr 1fr;
                    padding: 12rem 4rem 6rem;
                    gap: 6rem;
                    align-items: center;
                }
            }

            /* Left Column - Badge and Headline */
            .hero-services-left {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            /* Badge with Dot - with fade up animation */
            .hero-services-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.625rem;
                padding: 0.5rem 1rem;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 100px;
                width: fit-content;
                /* Fade up animation */
                opacity: 0;
                animation: hero-services-fade-up 0.8s ease-out 0.1s forwards;
            }

            .hero-services-badge .badge-dot {
                width: 8px;
                height: 8px;
                background: var(--hero-accent, #6B8F71);
                border-radius: 50%;
                animation: services-dot-pulse 2s ease-in-out infinite;
            }

            @keyframes services-dot-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.2); }
            }

            .hero-services-badge span {
                font-size: 0.75rem;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.85);
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }

            /* Large Headline (Business Name) - with fade up animation */
            .hero-services-headline {
                font-size: clamp(3rem, 8vw, 6rem);
                font-weight: 600;
                line-height: 1;
                color: var(--hero-text, #ffffff);
                letter-spacing: -0.03em;
                margin: 0;
                font-style: italic;
                /* Fade up animation */
                opacity: 0;
                animation: hero-services-fade-up 0.8s ease-out 0.3s forwards;
            }

            @media (min-width: 768px) {
                .hero-services-headline {
                    font-size: clamp(4rem, 10vw, 7rem);
                }
            }

            @media (min-width: 1024px) {
                .hero-services-headline {
                    font-size: clamp(5rem, 8vw, 8rem);
                }
            }

            /* Right Column - What We Do */
            .hero-services-right {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                /* Fade up animation */
                opacity: 0;
                animation: hero-services-fade-up 0.8s ease-out 0.5s forwards;
            }

            @media (min-width: 1024px) {
                .hero-services-right {
                    padding-left: 2rem;
                    border-left: 1px solid rgba(255, 255, 255, 0.15);
                }
            }

            .hero-services-label {
                font-size: 0.8125rem;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.5);
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }

            /* Description Text */
            .hero-services-description {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
            }

            .hero-services-description .desc-number {
                flex-shrink: 0;
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--hero-accent, #6B8F71);
                padding-top: 0.25rem;
            }

            .hero-services-description .desc-text {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.75);
                line-height: 1.7;
            }

            @media (min-width: 768px) {
                .hero-services-description .desc-text {
                    font-size: 1.0625rem;
                }
            }
        </style>

        ${showImage && mainPhoto ? `
        <div class="hero-services-bg">
            <img src="${mainPhoto}" alt="${businessName}">
        </div>
        ` : `
        <div class="hero-services-bg-fallback"></div>
        `}

        <div class="hero-services-content">
            <div class="hero-services-left">
                ${showTagline ? `
                <div class="hero-services-badge">
                    <span class="badge-dot"></span>
                    <span class="font-manrope">${badgeText}</span>
                </div>
                ` : ''}

                ${showHeadline ? `
                <h1 class="hero-services-headline font-dm-sans">${businessName}</h1>
                ` : ''}
            </div>

            ${showDescription && about ? `
            <div class="hero-services-right">
                <span class="hero-services-label font-manrope">What we do</span>
                <div class="hero-services-description">
                    <span class="desc-number font-manrope">01</span>
                    <p class="desc-text font-manrope">${about}</p>
                </div>
            </div>
            ` : ''}
        </div>
    </div>`
}

/**
 * Get fields used by each hero style
 * Used to conditionally show/hide fields in the content editor
 */
export function getHeroStyleFields(style: string): {
    usesHeadline: boolean
    usesTagline: boolean
    usesDescription: boolean
    usesTestimonial: boolean
    usesBadge: boolean
    usesButton: boolean
    usesImage: boolean
} {
    const styleFields: Record<string, {
        usesHeadline: boolean
        usesTagline: boolean
        usesDescription: boolean
        usesTestimonial: boolean
        usesBadge: boolean
        usesButton: boolean
        usesImage: boolean
    }> = {
        '1': {
            usesHeadline: true,
            usesTagline: true, // Badge/tagline
            usesDescription: true,
            usesTestimonial: true,
            usesBadge: true,
            usesButton: true,
            usesImage: true,
        },
        '2': {
            usesHeadline: true,
            usesTagline: false, // No badge/tagline in style 2
            usesDescription: false, // No description in style 2
            usesTestimonial: false, // No testimonial in style 2
            usesBadge: false,
            usesButton: false, // No CTA button, only scroll indicator
            usesImage: true, // Background image
        },
        '3': {
            usesHeadline: true, // Main headline with italic accent (e.g., "Wear Your Style In Season")
            usesTagline: true, // Description text below headline (mapped to Hero Tagline field)
            usesDescription: false, // NOT used - Hero Tagline serves as description in this style
            usesTestimonial: false, // No testimonial in style 3
            usesBadge: false, // Trust badge uses Business Name, not badge text field
            usesButton: true, // CTA button
            usesImage: true, // Carousel images
        },
        '4': {
            usesHeadline: true, // Business Name as large headline
            usesTagline: true, // Badge text with dot indicator (e.g., "BRAND ARCHITECTS")
            usesDescription: true, // Services list displayed as numbered items
            usesTestimonial: false, // No testimonial in style 4
            usesBadge: true, // Badge with dot indicator
            usesButton: false, // No CTA button in style 4
            usesImage: true, // Background image with dark overlay
        },
    }

    return styleFields[style] || styleFields['1']
}

/**
 * Main generator function - routes to appropriate style
 */
export function generateHeroHtml(style: string, props: HeroProps): string {
    const generators: Record<string, (props: HeroProps) => string> = {
        '1': generateHeroStyle1,
        '2': generateHeroStyle2,
        '3': generateHeroStyle3,
        '4': generateHeroStyle4,
    }

    const generator = generators[style] || generators['1']
    return generator(props)
}

export type { HeroProps }
