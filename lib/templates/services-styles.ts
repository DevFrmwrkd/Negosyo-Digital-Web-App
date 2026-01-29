/**
 * Services Section Style Generators
 * Modern services components for website templates
 */

interface ServicesProps {
    photos: string[]
    services?: Array<{ name: string; description: string }>
    headline?: string
    subheadline?: string
    visibility?: {
        services_badge?: boolean
        services_headline?: boolean
        services_subheadline?: boolean
        services_image?: boolean
        services_list?: boolean
    }
}

// Service icons as inline SVGs for the accordion
const serviceIcons = [
    // Kitchens/Home icon
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="service-icon">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>`,
    // Loft/Building icon
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="service-icon">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <path d="M9 4v16M15 4v16M4 9h16M4 15h16"/>
    </svg>`,
    // Bathroom/Droplet icon
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="service-icon">
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
    </svg>`,
    // Extensions/Expand icon
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="service-icon">
        <path d="M21 3h-6m6 0v6m0-6l-9 9M3 21h6m-6 0v-6m0 6l9-9"/>
    </svg>`,
    // Restorations/Refresh icon
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="service-icon">
        <path d="M23 4v6h-6M1 20v-6h6"/>
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>`,
    // External/Outdoor icon
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="service-icon">
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>
    </svg>`,
]

/**
 * Style 1 - Refit-Inspired Services Section
 * Light background with accordion-style service list
 * Features: Services badge, headline, image gallery on left, accordion list on right
 * Includes scroll-triggered animations and click-to-expand functionality
 */
function generateServicesStyle1(props: ServicesProps): string {
    const {
        photos,
        services = [],
        headline = 'What we do',
        subheadline = 'Find out which one of our services fit the needs of your project',
        visibility
    } = props

    // Default services if none provided
    const serviceList = services.length > 0 ? services : [
        { name: 'Kitchens', description: 'We design and build stunning kitchens tailored to your style and needs. Whether you\'re after a sleek modern space or a classic, timeless look, our expert team delivers high-quality craftsmanship, functionality, and attention to detail to create the heart of your home.' },
        { name: 'Loft Conversions', description: 'Transform your unused loft space into a beautiful, functional room. From home offices to extra bedrooms, we handle everything from design to completion with expert craftsmanship.' },
        { name: 'Bathrooms', description: 'Create your perfect bathroom sanctuary. We specialize in luxury bathroom renovations, from contemporary minimalist designs to traditional elegant spaces.' },
        { name: 'Extensions', description: 'Expand your living space with a professionally designed and built extension. We work with you to create seamless additions that enhance your home\'s value and functionality.' },
        { name: 'Restorations', description: 'Breathe new life into period properties with our expert restoration services. We preserve character while updating for modern living, respecting the original craftsmanship.' },
        { name: 'External Works', description: 'Complete your property with professional external works including driveways, patios, landscaping, and outdoor living spaces designed to complement your home.' }
    ]

    // Get main photo for the image section
    const mainPhoto = photos && photos.length > 0
        ? photos[0]
        : 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2000'

    // Visibility defaults
    const showBadge = visibility?.services_badge !== false
    const showHeadline = visibility?.services_headline !== false
    const showSubheadline = visibility?.services_subheadline !== false
    const showImage = visibility?.services_image !== false
    const showList = visibility?.services_list !== false

    return `
    <div class="services-refit-wrapper" id="services">
        <style>
            .services-refit-wrapper {
                background-color: var(--services-bg, #ffffff);
                padding: 5rem 2rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .services-refit-wrapper {
                    padding: 6rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .services-refit-wrapper {
                    padding: 8rem 5rem;
                }
            }

            .services-refit {
                max-width: 1400px;
                margin: 0 auto;
            }

            /* Header Section */
            .services-refit .header-section {
                text-align: center;
                margin-bottom: 4rem;
            }

            /* Services Badge */
            .services-refit .services-badge {
                display: inline-flex;
                align-items: center;
                padding: 0.5rem 1rem;
                background: var(--services-badge-bg, #1F2933);
                color: var(--services-badge-text, #ffffff);
                border-radius: 100px;
                margin-bottom: 1.5rem;
                font-size: 0.85rem;
                letter-spacing: 0.02em;
            }

            /* Headline */
            .services-refit .headline {
                font-size: clamp(2.5rem, 5vw, 4rem);
                font-weight: 500;
                line-height: 1.1;
                color: var(--services-headline, #1F2933);
                letter-spacing: -0.02em;
                margin: 0 0 1rem 0;
            }

            /* Subheadline */
            .services-refit .subheadline {
                font-size: clamp(1rem, 1.5vw, 1.125rem);
                color: var(--services-text, rgba(31, 41, 51, 0.65));
                line-height: 1.6;
                margin: 0;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
            }

            /* Main Content - Split Layout */
            .services-refit .content-section {
                display: grid;
                grid-template-columns: 1fr;
                gap: 3rem;
            }

            @media (min-width: 1024px) {
                .services-refit .content-section {
                    grid-template-columns: 1fr 1fr;
                    gap: 4rem;
                    align-items: start;
                }
            }

            /* Left Side - Image */
            .services-refit .image-section {
                position: relative;
                border-radius: 16px;
                overflow: hidden;
                aspect-ratio: 4/5;
            }

            @media (min-width: 1024px) {
                .services-refit .image-section {
                    position: sticky;
                    top: 2rem;
                    aspect-ratio: 3/4;
                }
            }

            .services-refit .image-section img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                transition: transform 0.7s ease;
            }

            .services-refit .image-section:hover img {
                transform: scale(1.03);
            }

            /* Right Side - Services List */
            .services-refit .services-list {
                display: flex;
                flex-direction: column;
            }

            /* Service Item */
            .services-refit .service-item {
                border-bottom: 1px solid var(--services-border, rgba(31, 41, 51, 0.1));
                overflow: hidden;
            }

            .services-refit .service-item:first-child {
                border-top: 1px solid var(--services-border, rgba(31, 41, 51, 0.1));
            }

            .services-refit .service-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1.5rem 0;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .services-refit .service-header:hover {
                padding-left: 0.5rem;
            }

            .services-refit .service-header-left {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .services-refit .service-icon {
                width: 24px;
                height: 24px;
                color: var(--services-icon, #1F2933);
                flex-shrink: 0;
            }

            .services-refit .service-name {
                font-size: 1.25rem;
                font-weight: 500;
                color: var(--services-headline, #1F2933);
                margin: 0;
                transition: color 0.3s ease;
            }

            .services-refit .service-header:hover .service-name {
                color: var(--services-accent, #6B8F71);
            }

            .services-refit .service-toggle {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--services-icon, #1F2933);
                transition: transform 0.3s ease;
            }

            .services-refit .service-item.active .service-toggle {
                transform: rotate(45deg);
            }

            .services-refit .service-content {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.4s ease-out, padding 0.3s ease;
            }

            .services-refit .service-item.active .service-content {
                max-height: 300px;
                padding-bottom: 1.5rem;
            }

            .services-refit .service-description {
                font-size: 1rem;
                color: var(--services-text, rgba(31, 41, 51, 0.75));
                line-height: 1.8;
                margin: 0;
                padding-left: 2.5rem;
            }

            /* Scroll Animation Styles */
            .services-refit .fade-in-up {
                opacity: 0;
                transform: translateY(40px);
                transition: opacity 0.8s ease-out, transform 0.8s ease-out;
            }

            .services-refit .fade-in-up.visible {
                opacity: 1;
                transform: translateY(0);
            }

            /* Staggered animation delays */
            .services-refit .header-section .fade-in-up:nth-child(1) { transition-delay: 0s; }
            .services-refit .header-section .fade-in-up:nth-child(2) { transition-delay: 0.1s; }
            .services-refit .header-section .fade-in-up:nth-child(3) { transition-delay: 0.2s; }
            .services-refit .image-section { transition-delay: 0.3s; }
            .services-refit .service-item:nth-child(1) { transition-delay: 0.1s; }
            .services-refit .service-item:nth-child(2) { transition-delay: 0.15s; }
            .services-refit .service-item:nth-child(3) { transition-delay: 0.2s; }
            .services-refit .service-item:nth-child(4) { transition-delay: 0.25s; }
            .services-refit .service-item:nth-child(5) { transition-delay: 0.3s; }
            .services-refit .service-item:nth-child(6) { transition-delay: 0.35s; }
        </style>

        <section class="services-refit">
            <div class="header-section">
                ${showBadge ? `
                <div class="services-badge fade-in-up font-manrope">
                    Services
                </div>
                ` : ''}

                ${showHeadline ? `
                <h2 class="headline fade-in-up font-dm-sans">${headline}</h2>
                ` : ''}

                ${showSubheadline ? `
                <p class="subheadline fade-in-up font-manrope">${subheadline}</p>
                ` : ''}
            </div>

            <div class="content-section">
                ${showImage ? `
                <div class="image-section fade-in-up">
                    <img src="${mainPhoto}" alt="Our services" loading="lazy" id="services-main-image">
                </div>
                ` : ''}

                ${showList ? `
                <div class="services-list">
                    ${serviceList.map((service, index) => `
                    <div class="service-item fade-in-up${index === 0 ? ' active' : ''}" data-index="${index}">
                        <div class="service-header" onclick="toggleService(this)">
                            <div class="service-header-left">
                                ${serviceIcons[index % serviceIcons.length]}
                                <h3 class="service-name font-dm-sans">${service.name}</h3>
                            </div>
                            <div class="service-toggle">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="8" y1="2" x2="8" y2="14"/>
                                    <line x1="2" y1="8" x2="14" y2="8"/>
                                </svg>
                            </div>
                        </div>
                        <div class="service-content">
                            <p class="service-description font-manrope">${service.description}</p>
                        </div>
                    </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </section>

        <script>
            // Toggle service accordion
            function toggleService(header) {
                const item = header.closest('.service-item');
                const wasActive = item.classList.contains('active');

                // Close all items
                document.querySelectorAll('.services-refit .service-item').forEach(el => {
                    el.classList.remove('active');
                });

                // Open clicked item if it wasn't active
                if (!wasActive) {
                    item.classList.add('active');
                }
            }

            // Intersection Observer for scroll animations
            (function() {
                const servicesSection = document.querySelector('.services-refit-wrapper');
                if (!servicesSection) return;

                const fadeElements = servicesSection.querySelectorAll('.fade-in-up');

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
 * Style 2 - Minimal Grid Services (Prototype-inspired)
 * Large headline on left with staggered category grid on right
 * Features: Large serif headline, numbered categories with service descriptions, no images
 */
function generateServicesStyle2(props: ServicesProps): string {
    const {
        services = [],
        headline = 'What we do',
        visibility
    } = props

    // Default services if none provided
    const defaultServices = [
        { name: 'Branding', description: 'Art direction, Brand Strategy, Tone & Voice, Insights, Content strategy' },
        { name: 'Creative', description: 'Storytelling, Copywriting, Social media guidelines, Photo + Video direction, 3D Visualisation' },
        { name: 'Production', description: 'Scouting, Production management, Content creation, Live action filming, Experience' },
        { name: 'Post-production', description: 'Editing, 2D/3D Animation, Colorgrading, Visual effect, Finishing' }
    ]

    // Use provided services or defaults (max 4 for the grid)
    const serviceList = services.length > 0 ? services.slice(0, 4) : defaultServices

    // Visibility defaults
    const showHeadline = visibility?.services_headline !== false
    const showList = visibility?.services_list !== false

    return `
    <div class="services-minimal-wrapper" id="services">
        <style>
            .services-minimal-wrapper {
                background-color: #ffffff;
                padding: 5rem 2rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .services-minimal-wrapper {
                    padding: 6rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .services-minimal-wrapper {
                    padding: 8rem 5rem;
                }
            }

            .services-minimal {
                max-width: 1400px;
                margin: 0 auto;
                display: grid;
                grid-template-columns: 1fr;
                gap: 4rem;
            }

            @media (min-width: 1024px) {
                .services-minimal {
                    grid-template-columns: 1fr 1.2fr;
                    gap: 4rem;
                    align-items: start;
                }
            }

            /* Large Headline - Left Side */
            .services-minimal .headline-section {
                position: relative;
            }

            @media (min-width: 1024px) {
                .services-minimal .headline-section {
                    position: sticky;
                    top: 2rem;
                }
            }

            .services-minimal .headline {
                font-size: clamp(3.5rem, 12vw, 9rem);
                font-weight: 400;
                line-height: 0.9;
                color: #1a1a1a;
                letter-spacing: -0.03em;
                margin: 0;
                text-transform: uppercase;
                /* Fade up animation */
                opacity: 0;
                transform: translateY(40px);
                animation: services-fade-up 0.8s ease-out 0.2s forwards;
            }

            @keyframes services-fade-up {
                from {
                    opacity: 0;
                    transform: translateY(40px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Categories Grid - Right Side */
            .services-minimal .categories-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 2.5rem;
            }

            @media (min-width: 640px) {
                .services-minimal .categories-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 2rem 3rem;
                }
            }

            /* Staggered layout - first two at top, last two offset below */
            @media (min-width: 640px) {
                .services-minimal .category:nth-child(3),
                .services-minimal .category:nth-child(4) {
                    margin-top: 3rem;
                }
            }

            /* Category Item */
            .services-minimal .category {
                opacity: 0;
                transform: translateY(30px);
                animation: services-fade-up 0.6s ease-out forwards;
            }

            .services-minimal .category:nth-child(1) { animation-delay: 0.3s; }
            .services-minimal .category:nth-child(2) { animation-delay: 0.4s; }
            .services-minimal .category:nth-child(3) { animation-delay: 0.5s; }
            .services-minimal .category:nth-child(4) { animation-delay: 0.6s; }

            .services-minimal .category-header {
                display: flex;
                align-items: baseline;
                gap: 0.5rem;
                margin-bottom: 1rem;
            }

            .services-minimal .category-number {
                font-size: 0.75rem;
                font-style: italic;
                color: #e07c4c;
                font-weight: 400;
            }

            .services-minimal .category-name {
                font-size: 1rem;
                font-weight: 600;
                color: #1a1a1a;
                margin: 0;
                letter-spacing: -0.01em;
            }

            @media (min-width: 768px) {
                .services-minimal .category-name {
                    font-size: 1.125rem;
                }
            }

            /* Service Description */
            .services-minimal .service-description {
                font-size: 0.875rem;
                color: #666666;
                line-height: 1.7;
                margin: 0;
            }

            @media (min-width: 768px) {
                .services-minimal .service-description {
                    font-size: 0.9375rem;
                }
            }
        </style>

        <section class="services-minimal">
            ${showHeadline ? `
            <div class="headline-section">
                <h2 class="headline font-dm-sans">${headline.toUpperCase().replace(/ /g, '<br>')}</h2>
            </div>
            ` : ''}

            ${showList ? `
            <div class="categories-grid">
                ${serviceList.map((service, index) => `
                <div class="category">
                    <div class="category-header">
                        <span class="category-number font-manrope">0${index + 1}.</span>
                        <h3 class="category-name font-dm-sans">${service.name}</h3>
                    </div>
                    <p class="service-description font-manrope">${service.description}</p>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </section>
    </div>`
}

// Card icons for Style 3 - Orange colored icons
const cardIcons = [
    // Video/Camera icon
    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="14" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M16 9l4-2v8l-4-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    // Lightning/Fast icon
    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    // Trophy/Quality icon
    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2" stroke="currentColor" stroke-width="2"/>
        <path d="M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 3v6a6 6 0 1012 0V3" stroke="currentColor" stroke-width="2"/>
    </svg>`,
    // Scale/Scalable icon
    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 3h-6m6 0v6m0-6l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 21h6m-6 0v-6m0 6l9-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    // Sparkle/Custom icon
    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    // Dashboard/Board icon
    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="9" rx="1" stroke="currentColor" stroke-width="2"/>
        <rect x="14" y="3" width="7" height="5" rx="1" stroke="currentColor" stroke-width="2"/>
        <rect x="14" y="12" width="7" height="9" rx="1" stroke="currentColor" stroke-width="2"/>
        <rect x="3" y="16" width="7" height="5" rx="1" stroke="currentColor" stroke-width="2"/>
    </svg>`,
]

/**
 * Style 3 - Card Grid Services Section (Linea-inspired)
 * Features: Badge, centered headline with italic accent, 6-card grid layout
 * Each card has an orange icon, title, and description
 * No service images - text-based cards only
 */
function generateServicesStyle3(props: ServicesProps): string {
    const {
        services = [],
        headline = 'Stress free, monthly design services.',
        subheadline = 'MEMBERSHIP BENEFITS',
        visibility
    } = props

    // Default services if none provided (6 services for the grid)
    const defaultServices = [
        { name: 'Fixed monthly rate', description: 'Pay a predictable flat fee every month. Just reliable design support.' },
        { name: 'Fast Delivery', description: 'Fast turnaround without compromising on creativity or details.' },
        { name: 'Premium Quality', description: 'All designs are created by professionals who deliver excellence.' },
        { name: 'Scalable', description: 'Easily upgrade, downgrade, or pause your plan based on your project volume.' },
        { name: 'Unique & Custom', description: 'Every project is crafted from scratch to reflect your brand\'s personality.' },
        { name: 'Design Board', description: 'Manage, review, and approve projects all from your personal design dashboard.' }
    ]

    // Use provided services or defaults (max 6 for the grid)
    const serviceList = services.length > 0 ? services.slice(0, 6) : defaultServices

    // Visibility defaults
    const showBadge = visibility?.services_badge !== false
    const showHeadline = visibility?.services_headline !== false
    const showList = visibility?.services_list !== false

    // Format headline to add italic styling to certain words
    const formatHeadline = (text: string): string => {
        const italicPatterns = [
            /\b(stress free|monthly|design|creative|quality|premium|fast|custom|unique|scalable)\b/gi,
        ]

        let formattedText = text
        italicPatterns.forEach(pattern => {
            formattedText = formattedText.replace(pattern, '<em>$1</em>')
        })

        return formattedText
    }

    return `
    <div class="services-cards-wrapper" id="services">
        <style>
            .services-cards-wrapper {
                background-color: #ffffff;
                padding: 5rem 1.5rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .services-cards-wrapper {
                    padding: 6rem 2rem;
                }
            }

            @media (min-width: 1024px) {
                .services-cards-wrapper {
                    padding: 8rem 3rem;
                }
            }

            .services-cards {
                max-width: 1100px;
                margin: 0 auto;
            }

            /* Header Section - Centered */
            .services-cards .header-section {
                text-align: center;
                margin-bottom: 3rem;
            }

            @media (min-width: 768px) {
                .services-cards .header-section {
                    margin-bottom: 4rem;
                }
            }

            .services-cards .badge {
                display: inline-block;
                font-size: 0.75rem;
                font-weight: 500;
                color: #666666;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                margin-bottom: 1rem;
            }

            .services-cards .headline {
                font-size: clamp(1.75rem, 4vw, 2.75rem);
                font-weight: 400;
                line-height: 1.25;
                color: #1a1a1a;
                letter-spacing: -0.01em;
                margin: 0;
                max-width: 700px;
                margin-left: auto;
                margin-right: auto;
            }

            .services-cards .headline em {
                font-style: italic;
            }

            /* Cards Grid */
            .services-cards .cards-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            @media (min-width: 640px) {
                .services-cards .cards-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.25rem;
                }
            }

            @media (min-width: 1024px) {
                .services-cards .cards-grid {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                }
            }

            /* Individual Card */
            .services-cards .service-card {
                background-color: #ffffff;
                border: 1px solid #f0f0f0;
                border-radius: 16px;
                padding: 1.5rem;
                transition: box-shadow 0.3s ease, border-color 0.3s ease;
            }

            @media (min-width: 768px) {
                .services-cards .service-card {
                    padding: 2rem;
                    border-radius: 20px;
                }
            }

            .services-cards .service-card:hover {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
                border-color: #e5e5e5;
            }

            /* Card Icon */
            .services-cards .card-icon {
                width: 40px;
                height: 40px;
                background-color: #FEF3EE;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 1.25rem;
                color: #e85a30;
            }

            @media (min-width: 768px) {
                .services-cards .card-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                }
            }

            .services-cards .card-icon svg {
                width: 20px;
                height: 20px;
            }

            @media (min-width: 768px) {
                .services-cards .card-icon svg {
                    width: 24px;
                    height: 24px;
                }
            }

            /* Card Title */
            .services-cards .card-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: #1a1a1a;
                margin: 0 0 0.75rem 0;
                letter-spacing: -0.01em;
            }

            @media (min-width: 768px) {
                .services-cards .card-title {
                    font-size: 1.25rem;
                }
            }

            /* Card Description */
            .services-cards .card-description {
                font-size: 0.875rem;
                color: #666666;
                line-height: 1.6;
                margin: 0;
            }

            @media (min-width: 768px) {
                .services-cards .card-description {
                    font-size: 0.9375rem;
                }
            }

            /* Scroll Animation Styles */
            .services-cards .fade-in-up {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.6s ease-out, transform 0.6s ease-out;
            }

            .services-cards .fade-in-up.visible {
                opacity: 1;
                transform: translateY(0);
            }

            /* Staggered animation delays for cards */
            .services-cards .service-card:nth-child(1) { transition-delay: 0.1s; }
            .services-cards .service-card:nth-child(2) { transition-delay: 0.15s; }
            .services-cards .service-card:nth-child(3) { transition-delay: 0.2s; }
            .services-cards .service-card:nth-child(4) { transition-delay: 0.25s; }
            .services-cards .service-card:nth-child(5) { transition-delay: 0.3s; }
            .services-cards .service-card:nth-child(6) { transition-delay: 0.35s; }
        </style>

        <section class="services-cards">
            ${showHeadline || showBadge ? `
            <div class="header-section fade-in-up">
                ${showBadge && subheadline ? `
                <span class="badge font-manrope">${subheadline}</span>
                ` : ''}
                ${showHeadline ? `
                <h2 class="headline font-dm-sans">${formatHeadline(headline)}</h2>
                ` : ''}
            </div>
            ` : ''}

            ${showList ? `
            <div class="cards-grid">
                ${serviceList.map((service, index) => `
                <div class="service-card fade-in-up">
                    <div class="card-icon">
                        ${cardIcons[index % cardIcons.length]}
                    </div>
                    <h3 class="card-title font-dm-sans">${service.name}</h3>
                    <p class="card-description font-manrope">${service.description}</p>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </section>

        <script>
            // Intersection Observer for scroll animations
            (function() {
                const servicesSection = document.querySelector('.services-cards-wrapper');
                if (!servicesSection) return;

                const fadeElements = servicesSection.querySelectorAll('.fade-in-up');

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
 * Style 4 - Stats Grid with Quote (Opalhaus-inspired)
 * Features: Badge with dot, large quote description, single image, stats grid
 * Each stat shows a number/value and description from services data
 *
 * Field mapping:
 * - Services Badge → "KEY STATS" badge with dot indicator
 * - Services Headline → Large quote-style description
 * - Services Image → Single image on left side
 * - Services List → Stats displayed as number + label pairs in a 2x2 grid
 */
function generateServicesStyle4(props: ServicesProps): string {
    const {
        photos,
        services = [],
        headline = '"At our company, we believe great design goes beyond — it tells stories, evokes emotion, and builds the connections. As a creative agency, we specialize in branding, web design, and storytelling."',
        subheadline = 'KEY STATS',
        visibility
    } = props

    // Default stats if no services provided
    const defaultStats = [
        { name: '120+', description: 'Brands Elevated Over the Years With Purpose' },
        { name: '18+', description: 'Industries served as professionals' },
        { name: '40+', description: 'Websites brought to life with webflow' },
        { name: '98%', description: 'Client satisfaction throughout our journey' }
    ]

    // Use provided services or defaults (max 4 for the grid)
    const statsList = services.length > 0 ? services.slice(0, 4) : defaultStats

    // Get main photo for the image section
    const mainPhoto = photos && photos.length > 0
        ? photos[0]
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200'

    // Visibility defaults
    const showBadge = visibility?.services_badge !== false
    const showHeadline = visibility?.services_headline !== false
    const showImage = visibility?.services_image !== false
    const showList = visibility?.services_list !== false

    return `
    <div class="services-stats-wrapper" id="services">
        <style>
            .services-stats-wrapper {
                background-color: var(--background, #ffffff);
                padding: 5rem 2rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .services-stats-wrapper {
                    padding: 6rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .services-stats-wrapper {
                    padding: 8rem 5rem;
                }
            }

            .services-stats {
                max-width: 1200px;
                margin: 0 auto;
            }

            /* Fade up animation */
            @keyframes services-stats-fade-up {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Header Section */
            .services-stats .header-section {
                margin-bottom: 3rem;
            }

            @media (min-width: 768px) {
                .services-stats .header-section {
                    margin-bottom: 4rem;
                }
            }

            /* Badge with Dot */
            .services-stats .stats-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 1.5rem;
                opacity: 0;
                animation: services-stats-fade-up 0.6s ease-out 0.1s forwards;
            }

            .services-stats .badge-dot {
                width: 8px;
                height: 8px;
                background: var(--primary, #e85a30);
                border-radius: 50%;
            }

            .services-stats .badge-text {
                font-size: 0.75rem;
                font-weight: 500;
                color: var(--services-text, #666666);
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }

            /* Quote Description */
            .services-stats .description {
                font-size: clamp(1.25rem, 2.5vw, 1.75rem);
                font-weight: 400;
                line-height: 1.5;
                color: var(--secondary, #1a1a1a);
                letter-spacing: -0.01em;
                margin: 0;
                max-width: 800px;
                opacity: 0;
                animation: services-stats-fade-up 0.7s ease-out 0.2s forwards;
            }

            /* Italic accent for quoted parts */
            .services-stats .description em {
                font-style: italic;
                color: var(--services-text, #666666);
            }

            /* Content Section - Split Layout */
            .services-stats .content-section {
                display: grid;
                grid-template-columns: 1fr;
                gap: 3rem;
            }

            @media (min-width: 768px) {
                .services-stats .content-section {
                    grid-template-columns: 1fr 1.2fr;
                    gap: 3rem;
                    align-items: start;
                }
            }

            @media (min-width: 1024px) {
                .services-stats .content-section {
                    gap: 4rem;
                }
            }

            /* Left Side - Image */
            .services-stats .image-section {
                position: relative;
                border-radius: 0;
                overflow: hidden;
                aspect-ratio: 3/4;
                opacity: 0;
                animation: services-stats-fade-up 0.7s ease-out 0.3s forwards;
            }

            .services-stats .image-section img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                filter: grayscale(100%);
                transition: filter 0.5s ease, transform 0.7s ease;
            }

            .services-stats .image-section:hover img {
                filter: grayscale(0%);
                transform: scale(1.03);
            }

            /* Right Side - Stats Grid */
            .services-stats .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 2rem;
            }

            @media (min-width: 768px) {
                .services-stats .stats-grid {
                    gap: 2.5rem 3rem;
                    padding-top: 1rem;
                }
            }

            /* Individual Stat */
            .services-stats .stat-item {
                opacity: 0;
                animation: services-stats-fade-up 0.6s ease-out forwards;
            }

            .services-stats .stat-item:nth-child(1) { animation-delay: 0.4s; }
            .services-stats .stat-item:nth-child(2) { animation-delay: 0.5s; }
            .services-stats .stat-item:nth-child(3) { animation-delay: 0.6s; }
            .services-stats .stat-item:nth-child(4) { animation-delay: 0.7s; }

            .services-stats .stat-value {
                font-size: clamp(2.5rem, 5vw, 3.5rem);
                font-weight: 400;
                line-height: 1;
                color: var(--secondary, #1a1a1a);
                letter-spacing: -0.02em;
                margin: 0 0 0.75rem 0;
                font-style: italic;
            }

            @media (min-width: 768px) {
                .services-stats .stat-value {
                    margin: 0 0 1rem 0;
                }
            }

            .services-stats .stat-label {
                font-size: 0.8125rem;
                color: var(--services-text, #666666);
                line-height: 1.5;
                margin: 0;
            }

            @media (min-width: 768px) {
                .services-stats .stat-label {
                    font-size: 0.875rem;
                }
            }
        </style>

        <section class="services-stats">
            <div class="header-section">
                ${showBadge ? `
                <div class="stats-badge">
                    <span class="badge-dot"></span>
                    <span class="badge-text font-manrope">${subheadline}</span>
                </div>
                ` : ''}

                ${showHeadline ? `
                <p class="description font-dm-sans">${headline}</p>
                ` : ''}
            </div>

            <div class="content-section">
                ${showImage ? `
                <div class="image-section">
                    <img src="${mainPhoto}" alt="Our work" loading="lazy">
                </div>
                ` : ''}

                ${showList ? `
                <div class="stats-grid">
                    ${statsList.map((stat) => `
                    <div class="stat-item">
                        <p class="stat-value font-dm-sans">${stat.name}</p>
                        <p class="stat-label font-manrope">${stat.description}</p>
                    </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </section>
    </div>`
}

/**
 * Get fields used by each services style
 * Used to conditionally show/hide fields in the content editor
 */
export function getServicesStyleFields(style: string): {
    usesHeadline: boolean
    usesSubheadline: boolean
    usesBadge: boolean
    usesImage: boolean
    usesList: boolean
} {
    const styleFields: Record<string, {
        usesHeadline: boolean
        usesSubheadline: boolean
        usesBadge: boolean
        usesImage: boolean
        usesList: boolean
    }> = {
        '1': {
            usesHeadline: true,
            usesSubheadline: true,
            usesBadge: true,
            usesImage: true,
            usesList: true,
        },
        '2': {
            usesHeadline: true,
            usesSubheadline: false, // No subheadline in style 2
            usesBadge: false, // No badge in style 2
            usesImage: false, // No image in style 2
            usesList: true,
        },
        '3': {
            usesHeadline: true,
            usesSubheadline: true, // Used as badge text in style 3
            usesBadge: true,
            usesImage: false, // No image in style 3 - card-based layout
            usesList: true,
        },
        '4': {
            usesHeadline: true, // Used as quote description
            usesSubheadline: true, // Used as badge text (KEY STATS)
            usesBadge: true,
            usesImage: true, // Single grayscale image on left
            usesList: true, // Stats grid (uses services data)
        },
    }

    return styleFields[style] || styleFields['1']
}

/**
 * Main generator function - routes to appropriate style
 */
export function generateServicesHtml(style: string, props: ServicesProps): string {
    const generators: Record<string, (props: ServicesProps) => string> = {
        '1': generateServicesStyle1,
        '2': generateServicesStyle2,
        '3': generateServicesStyle3,
        '4': generateServicesStyle4,
    }

    const generator = generators[style] || generators['1']
    return generator(props)
}

export type { ServicesProps }
