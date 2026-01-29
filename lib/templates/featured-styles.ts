/**
 * Featured Products Section Style Generators
 * Modern featured/portfolio section with scroll reveal effect
 */

interface FeaturedProduct {
    title: string
    description: string
    image?: string
    tags?: string[]
    testimonial?: {
        quote: string
        author: string
        avatar?: string
    }
}

interface FeaturedProps {
    photos: string[]
    projects?: FeaturedProduct[]
    headline?: string
    subheadline?: string
    featuredImages?: string[] // For style 3 - gallery images
    ctaText?: string // For style 4 - CTA button text
    ctaLink?: string // For style 4 - CTA button link
    visibility?: {
        featured_headline?: boolean
        featured_subheadline?: boolean
        featured_products?: boolean
        featured_images?: boolean
    }
}

/**
 * Style 1 - Refit-Inspired Featured Section
 * Scroll-triggered reveal cards with testimonials
 * Features: Large project cards, testimonials, tags, scroll-up reveal animation
 */
function generateFeaturedStyle1(props: FeaturedProps): string {
    const {
        photos,
        projects = [],
        headline = 'Featured Products',
        subheadline = 'Take a look at some of our recent work',
        visibility
    } = props

    // Default projects if none provided - also validate that existing projects have required fields
    const validProducts = projects.filter(p => p && p.title && p.description)

    const defaultProducts: FeaturedProduct[] = [
        {
            title: 'Modern kitchen refit',
            description: 'This kitchen transformation brought sleek, modern design and enhanced functionality to our client\'s home. We installed custom cabinetry, high-quality worktops, and state-of-the-art appliances, creating a stylish yet practical space perfect for cooking and entertaining.',
            tags: ['Kitchen', '4 weeks'],
            testimonial: {
                quote: 'Refit completely transformed our kitchen, making it both beautiful and highly functional. The craftsmanship was outstanding, and the team was professional and communicative throughout. We couldn\'t be happier with the result!',
                author: 'Rachel Morgan'
            }
        },
        {
            title: 'External garden path build',
            description: 'Our team designed and built a durable, visually appealing garden path to enhance our client\'s outdoor space. Using high-quality materials, we created a seamless walkway that complements the garden\'s natural beauty.',
            tags: ['External', '2 weeks'],
            testimonial: {
                quote: 'The garden path exceeded our expectations. It\'s both practical and beautiful, perfectly blending with our landscape.',
                author: 'James Wilson'
            }
        },
        {
            title: 'Complete bathroom renovation',
            description: 'A full bathroom transformation featuring modern fixtures, custom tiling, and elegant finishes. We maximized space efficiency while creating a spa-like atmosphere.',
            tags: ['Bathroom', '3 weeks'],
            testimonial: {
                quote: 'Our new bathroom feels like a luxury spa. The attention to detail was incredible.',
                author: 'Sarah Chen'
            }
        }
    ]

    const productList: FeaturedProduct[] = validProducts.length > 0 ? validProducts : defaultProducts

    // Assign photos to projects and ensure all fields are safe
    const productsWithPhotos = productList.map((project, index) => ({
        title: project.title || `Project ${index + 1}`,
        description: project.description || 'A showcase of our quality work.',
        image: project.image || photos[index % Math.max(photos.length, 1)] || 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2000',
        tags: project.tags && Array.isArray(project.tags) ? project.tags : [],
        testimonial: project.testimonial && project.testimonial.quote && project.testimonial.author
            ? project.testimonial
            : undefined
    }))

    // Visibility defaults
    const showHeadline = visibility?.featured_headline !== false
    const showSubheadline = visibility?.featured_subheadline !== false
    const showProducts = visibility?.featured_products !== false

    return `
    <div class="featured-refit-wrapper" id="featured">
        <style>
            .featured-refit-wrapper {
                background-color: var(--featured-bg, #F6F7F5);
                position: relative;
                overflow: hidden;
            }

            .featured-refit {
                max-width: 1400px;
                margin: 0 auto;
            }

            /* Header Section */
            .featured-refit .header-section {
                text-align: center;
                padding: 5rem 2rem 3rem;
            }

            @media (min-width: 768px) {
                .featured-refit .header-section {
                    padding: 6rem 4rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .featured-refit .header-section {
                    padding: 8rem 5rem 5rem;
                }
            }

            /* Headline */
            .featured-refit .headline {
                font-size: clamp(2.5rem, 5vw, 4rem);
                font-weight: 500;
                line-height: 1.1;
                color: var(--featured-headline, #1F2933);
                letter-spacing: -0.02em;
                margin: 0 0 1rem 0;
            }

            /* Subheadline */
            .featured-refit .subheadline {
                font-size: clamp(1rem, 1.5vw, 1.125rem);
                color: var(--featured-text, rgba(31, 41, 51, 0.65));
                line-height: 1.6;
                margin: 0;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
            }

            /* Project Cards Container */
            .featured-refit .projects-container {
                display: flex;
                flex-direction: column;
                gap: 0;
            }

            /* Individual Project Card */
            .featured-refit .product-card {
                position: relative;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                background-color: var(--featured-card-bg, #ffffff);
            }

            @media (min-width: 768px) {
                .featured-refit .product-card {
                    padding: 4rem;
                }
            }

            /* Alternating backgrounds */
            .featured-refit .product-card:nth-child(odd) {
                background-color: var(--featured-card-bg, #ffffff);
            }

            .featured-refit .product-card:nth-child(even) {
                background-color: var(--featured-card-alt-bg, #1F2933);
            }

            .featured-refit .product-card:nth-child(even) .product-title,
            .featured-refit .product-card:nth-child(even) .product-description,
            .featured-refit .product-card:nth-child(even) .testimonial-quote,
            .featured-refit .product-card:nth-child(even) .testimonial-author {
                color: #ffffff;
            }

            .featured-refit .product-card:nth-child(even) .product-description {
                color: rgba(255, 255, 255, 0.75);
            }

            .featured-refit .product-card:nth-child(even) .product-tag {
                background-color: rgba(255, 255, 255, 0.1);
                color: #ffffff;
            }

            /* Project Content Layout */
            .featured-refit .product-content {
                max-width: 1200px;
                width: 100%;
                display: grid;
                grid-template-columns: 1fr;
                gap: 2rem;
                align-items: center;
            }

            @media (min-width: 1024px) {
                .featured-refit .product-content {
                    grid-template-columns: 1fr 1fr;
                    gap: 4rem;
                }
            }

            /* Project Image */
            .featured-refit .product-image-wrapper {
                position: relative;
                border-radius: 16px;
                overflow: hidden;
                aspect-ratio: 4/3;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
            }

            .featured-refit .product-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                transition: transform 0.7s ease;
            }

            .featured-refit .product-image-wrapper:hover .product-image {
                transform: scale(1.05);
            }

            /* Project Info */
            .featured-refit .product-info {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .featured-refit .product-title {
                font-size: clamp(1.75rem, 3vw, 2.5rem);
                font-weight: 500;
                line-height: 1.2;
                color: var(--featured-headline, #1F2933);
                margin: 0;
            }

            .featured-refit .product-description {
                font-size: 1rem;
                color: var(--featured-text, rgba(31, 41, 51, 0.75));
                line-height: 1.8;
                margin: 0;
            }

            /* Project Tags */
            .featured-refit .product-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }

            .featured-refit .product-tag {
                display: inline-flex;
                align-items: center;
                padding: 0.5rem 1rem;
                background-color: var(--featured-tag-bg, rgba(31, 41, 51, 0.05));
                color: var(--featured-headline, #1F2933);
                border-radius: 100px;
                font-size: 0.85rem;
                font-weight: 500;
            }

            /* Testimonial */
            .featured-refit .testimonial {
                margin-top: 1rem;
                padding-top: 1.5rem;
                border-top: 1px solid var(--featured-border, rgba(31, 41, 51, 0.1));
            }

            .featured-refit .product-card:nth-child(even) .testimonial {
                border-top-color: rgba(255, 255, 255, 0.1);
            }

            .featured-refit .testimonial-quote {
                font-size: 1rem;
                color: var(--featured-text, rgba(31, 41, 51, 0.75));
                line-height: 1.8;
                margin: 0 0 1rem 0;
                font-style: italic;
                position: relative;
                padding-left: 1.5rem;
            }

            .featured-refit .testimonial-quote::before {
                content: '"';
                position: absolute;
                left: 0;
                top: -0.25rem;
                font-size: 2rem;
                font-weight: 700;
                color: var(--featured-accent, #6B8F71);
                line-height: 1;
            }

            .featured-refit .testimonial-author-wrapper {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .featured-refit .testimonial-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: var(--featured-tag-bg, rgba(31, 41, 51, 0.1));
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .featured-refit .testimonial-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .featured-refit .testimonial-avatar-placeholder {
                font-size: 1rem;
                font-weight: 600;
                color: var(--featured-headline, #1F2933);
            }

            .featured-refit .product-card:nth-child(even) .testimonial-avatar-placeholder {
                color: #ffffff;
            }

            .featured-refit .testimonial-author {
                font-size: 0.9rem;
                font-weight: 500;
                color: var(--featured-headline, #1F2933);
                margin: 0;
            }

            /* Cards are visible by default - animation will hide and reveal */
            .featured-refit .product-card {
                opacity: 1;
                transform: translateY(0);
                transition: opacity 0.8s ease-out, transform 0.8s ease-out;
            }

            /* Animation state - hidden before scroll reveals */
            .featured-refit .product-card.animate-hidden {
                opacity: 0;
                transform: translateY(100px);
            }

            .featured-refit .product-card.animate-visible {
                opacity: 1;
                transform: translateY(0);
            }

            /* Sticky scroll effect for overlapping cards */
            @media (min-width: 1024px) {
                .featured-refit .product-card {
                    position: sticky;
                    top: 0;
                }

                .featured-refit .product-card:nth-child(1) { z-index: 1; }
                .featured-refit .product-card:nth-child(2) { z-index: 2; }
                .featured-refit .product-card:nth-child(3) { z-index: 3; }
                .featured-refit .product-card:nth-child(4) { z-index: 4; }
                .featured-refit .product-card:nth-child(5) { z-index: 5; }
                .featured-refit .product-card:nth-child(6) { z-index: 6; }
            }

            /* Staggered animation delays */
            .featured-refit .header-section .headline { transition-delay: 0s; }
            .featured-refit .header-section .subheadline { transition-delay: 0.1s; }

            /* Fade in up elements - visible by default for iframe compatibility */
            .featured-refit .fade-in-up {
                opacity: 1;
                transform: translateY(0);
                transition: opacity 0.8s ease-out, transform 0.8s ease-out;
            }

            .featured-refit .fade-in-up.animate-hidden {
                opacity: 0;
                transform: translateY(40px);
            }

            .featured-refit .fade-in-up.animate-visible {
                opacity: 1;
                transform: translateY(0);
            }
        </style>

        <section class="featured-refit">
            ${showHeadline || showSubheadline ? `
            <div class="header-section">
                ${showHeadline ? `
                <h2 class="headline fade-in-up font-dm-sans">${headline}</h2>
                ` : ''}

                ${showSubheadline ? `
                <p class="subheadline fade-in-up font-manrope">${subheadline}</p>
                ` : ''}
            </div>
            ` : ''}

            ${showProducts ? `
            <div class="projects-container">
                ${productsWithPhotos.map((project, index) => {
                    const safeTitle = project.title || `Project ${index + 1}`
                    const safeDescription = project.description || 'A showcase of our quality work.'
                    const safeImage = project.image || 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2000'
                    const safeTags = project.tags || []
                    const hasTestimonial = project.testimonial && project.testimonial.quote && project.testimonial.author
                    const safeAuthorInitial = hasTestimonial ? (project.testimonial?.author?.charAt(0) || 'A') : ''

                    return `
                <div class="product-card visible" data-index="${index}">
                    <div class="product-content">
                        <div class="product-image-wrapper">
                            <img src="${safeImage}" alt="${safeTitle}" class="product-image" loading="lazy">
                        </div>
                        <div class="product-info">
                            <h3 class="product-title font-dm-sans">${safeTitle}</h3>
                            <p class="product-description font-manrope">${safeDescription}</p>
                            ${safeTags.length > 0 ? `
                            <div class="product-tags">
                                ${safeTags.map(tag => `
                                <span class="product-tag font-manrope">${tag || ''}</span>
                                `).join('')}
                            </div>
                            ` : ''}
                            ${hasTestimonial ? `
                            <div class="testimonial">
                                <p class="testimonial-quote font-manrope">${project.testimonial?.quote || ''}</p>
                                <div class="testimonial-author-wrapper">
                                    <div class="testimonial-avatar">
                                        ${project.testimonial?.avatar
                                            ? `<img src="${project.testimonial.avatar}" alt="${project.testimonial?.author || 'Author'}">`
                                            : `<span class="testimonial-avatar-placeholder">${safeAuthorInitial}</span>`
                                        }
                                    </div>
                                    <p class="testimonial-author font-manrope">${project.testimonial?.author || 'Customer'}</p>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                `}).join('')}
            </div>
            ` : ''}
        </section>

        <script>
            // Intersection Observer for scroll animations - works in iframe context
            (function initFeaturedAnimations() {
                // Delay initialization to ensure DOM is ready in iframe
                function setupAnimations() {
                    const featuredSection = document.querySelector('.featured-refit-wrapper');
                    if (!featuredSection) {
                        // Retry if section not found yet
                        setTimeout(setupAnimations, 100);
                        return;
                    }

                    // Get elements
                    const fadeElements = featuredSection.querySelectorAll('.fade-in-up');
                    const productCards = featuredSection.querySelectorAll('.product-card');

                    // Check if Intersection Observer is available
                    if (!('IntersectionObserver' in window)) {
                        // Fallback: make everything visible immediately
                        fadeElements.forEach(el => el.classList.add('animate-visible'));
                        productCards.forEach(card => card.classList.add('animate-visible'));
                        return;
                    }

                    // First hide elements that will be animated
                    fadeElements.forEach(el => el.classList.add('animate-hidden'));
                    productCards.forEach((card, index) => {
                        // Add staggered delay for initial animation
                        card.style.transitionDelay = (index * 0.15) + 's';
                        card.classList.add('animate-hidden');
                    });

                    // Observer for header elements
                    const headerObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                entry.target.classList.remove('animate-hidden');
                                entry.target.classList.add('animate-visible');
                                headerObserver.unobserve(entry.target);
                            }
                        });
                    }, {
                        root: null,
                        rootMargin: '0px 0px -50px 0px',
                        threshold: 0.1
                    });

                    fadeElements.forEach(el => headerObserver.observe(el));

                    // Observer for project cards with scroll reveal
                    const cardObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                entry.target.classList.remove('animate-hidden');
                                entry.target.classList.add('animate-visible');
                                cardObserver.unobserve(entry.target);
                            }
                        });
                    }, {
                        root: null,
                        rootMargin: '0px 0px -100px 0px',
                        threshold: 0.15
                    });

                    productCards.forEach(card => cardObserver.observe(card));
                }

                // Initialize when DOM is ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', setupAnimations);
                } else {
                    // DOM already ready, initialize after a small delay for iframe
                    setTimeout(setupAnimations, 50);
                }
            })();
        </script>
    </div>`
}

/**
 * Style 2 - Prototype-Inspired Portfolio Stack
 * Large numbering on left, vertical image stack in center, product list on right
 * Features: Auto-cycling images, category labels, numbered navigation, client list
 */
function generateFeaturedStyle2(props: FeaturedProps): string {
    const {
        photos,
        projects = [],
        headline = 'Featured Products',
        subheadline = 'Take a look at some of our recent work',
        visibility
    } = props

    // Default projects if none provided
    // For Style 2 (Portfolio Stack), only title is required since description is hidden in editor
    const validProducts = projects.filter(p => p && p.title)

    const defaultProducts: FeaturedProduct[] = [
        {
            title: 'Modern kitchen refit',
            description: 'This kitchen transformation brought sleek, modern design and enhanced functionality.',
            tags: ['Kitchen']
        },
        {
            title: 'External garden path build',
            description: 'A durable, visually appealing garden path to enhance outdoor space.',
            tags: ['External']
        },
        {
            title: 'Complete bathroom renovation',
            description: 'Full bathroom transformation featuring modern fixtures and elegant finishes.',
            tags: ['Bathroom']
        }
    ]

    const productList: FeaturedProduct[] = validProducts.length > 0 ? validProducts : defaultProducts

    // Assign photos to projects
    const productsWithPhotos = productList.map((project, index) => ({
        title: project.title || `Project ${index + 1}`,
        description: project.description || 'A showcase of our quality work.',
        image: project.image || photos[index % Math.max(photos.length, 1)] || 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2000',
        tags: project.tags && Array.isArray(project.tags) ? project.tags : ['Product']
    }))

    const totalProducts = productsWithPhotos.length
    const totalFormatted = totalProducts.toString().padStart(2, '0')

    // Visibility defaults
    const showHeadline = visibility?.featured_headline !== false
    const showSubheadline = visibility?.featured_subheadline !== false
    const showProducts = visibility?.featured_products !== false

    return `
    <div class="featured-portfolio-wrapper" id="featured">
        <style>
            .featured-portfolio-wrapper {
                background-color: #ffffff;
                padding: 5rem 2rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .featured-portfolio-wrapper {
                    padding: 6rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .featured-portfolio-wrapper {
                    padding: 8rem 5rem;
                }
            }

            .featured-portfolio {
                max-width: 1400px;
                margin: 0 auto;
            }

            /* Header - Optional headline/subheadline */
            .featured-portfolio .header-section {
                text-align: center;
                margin-bottom: 4rem;
                /* Fade in animation */
                opacity: 0;
                transform: translateY(30px);
                animation: featured-fade-up 0.8s ease-out 0.2s forwards;
            }

            @keyframes featured-fade-up {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .featured-portfolio .headline {
                font-size: clamp(2rem, 4vw, 3rem);
                font-weight: 500;
                line-height: 1.1;
                color: #1a1a1a;
                letter-spacing: -0.02em;
                margin: 0 0 1rem 0;
            }

            .featured-portfolio .subheadline {
                font-size: clamp(1rem, 1.5vw, 1.125rem);
                color: rgba(26, 26, 26, 0.6);
                line-height: 1.6;
                margin: 0;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
            }

            /* Main Portfolio Layout */
            .featured-portfolio .portfolio-layout {
                display: grid;
                grid-template-columns: 1fr;
                gap: 2rem;
                align-items: start;
            }

            @media (min-width: 1024px) {
                .featured-portfolio .portfolio-layout {
                    grid-template-columns: 120px 1fr 200px;
                    gap: 3rem;
                    align-items: center;
                }
            }

            /* Left Side - Large Number Indicator */
            .featured-portfolio .number-indicator {
                display: none;
            }

            @media (min-width: 1024px) {
                .featured-portfolio .number-indicator {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    /* Fade in animation */
                    opacity: 0;
                    animation: featured-fade-in 0.6s ease-out 0.4s forwards;
                }
            }

            @keyframes featured-fade-in {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            .featured-portfolio .current-number {
                font-size: 5rem;
                font-weight: 300;
                line-height: 1;
                color: #1a1a1a;
                letter-spacing: -0.02em;
                margin: 0;
            }

            .featured-portfolio .total-number {
                font-size: 1rem;
                color: rgba(26, 26, 26, 0.4);
                margin-top: 0.5rem;
            }

            /* Center - Image Stack */
            .featured-portfolio .image-stack {
                position: relative;
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                /* Fade up animation */
                opacity: 0;
                transform: translateY(40px);
                animation: featured-fade-up 0.8s ease-out 0.3s forwards;
            }

            @media (min-width: 1024px) {
                .featured-portfolio .image-stack {
                    max-width: none;
                }
            }

            .featured-portfolio .image-container {
                position: relative;
                aspect-ratio: 4/5;
                border-radius: 0;
                overflow: hidden;
                background-color: #f5f5f5;
            }

            .featured-portfolio .image-container img {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                opacity: 0;
                transition: opacity 0.8s ease-in-out, transform 0.6s ease;
            }

            .featured-portfolio .image-container img.active {
                opacity: 1;
            }

            .featured-portfolio .image-container:hover img.active {
                transform: scale(1.02);
            }

            /* Category label below image */
            .featured-portfolio .category-label {
                margin-top: 1.5rem;
                text-align: center;
            }

            .featured-portfolio .category-name {
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                color: rgba(26, 26, 26, 0.5);
                margin: 0;
                transition: color 0.3s ease;
            }

            /* Right Side - Product List */
            .featured-portfolio .product-list {
                display: flex;
                flex-direction: column;
                gap: 0;
                /* Fade in animation */
                opacity: 0;
                animation: featured-fade-in 0.6s ease-out 0.5s forwards;
            }

            .featured-portfolio .product-list-item {
                padding: 1rem 0;
                border-bottom: 1px solid rgba(26, 26, 26, 0.1);
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .featured-portfolio .product-list-item:first-child {
                padding-top: 0;
            }

            .featured-portfolio .product-list-item:last-child {
                border-bottom: none;
            }

            .featured-portfolio .product-list-item:hover {
                padding-left: 0.5rem;
            }

            .featured-portfolio .product-list-item.active {
                padding-left: 0.5rem;
            }

            .featured-portfolio .product-list-item .item-number {
                font-size: 0.7rem;
                color: rgba(26, 26, 26, 0.3);
                margin-bottom: 0.25rem;
                transition: color 0.3s ease;
            }

            .featured-portfolio .product-list-item.active .item-number {
                color: rgba(26, 26, 26, 0.6);
            }

            .featured-portfolio .product-list-item .item-title {
                font-size: 0.875rem;
                color: rgba(26, 26, 26, 0.5);
                margin: 0;
                transition: color 0.3s ease;
                line-height: 1.4;
            }

            .featured-portfolio .product-list-item:hover .item-title,
            .featured-portfolio .product-list-item.active .item-title {
                color: #1a1a1a;
            }

            /* Mobile: Show as horizontal scroll or simplified list */
            @media (max-width: 1023px) {
                .featured-portfolio .product-list {
                    flex-direction: row;
                    overflow-x: auto;
                    gap: 1rem;
                    padding-bottom: 1rem;
                    margin-top: 1rem;
                }

                .featured-portfolio .product-list-item {
                    flex-shrink: 0;
                    padding: 0.75rem 1rem;
                    border: 1px solid rgba(26, 26, 26, 0.1);
                    border-radius: 100px;
                    border-bottom: 1px solid rgba(26, 26, 26, 0.1);
                }

                .featured-portfolio .product-list-item .item-number {
                    display: none;
                }

                .featured-portfolio .product-list-item:hover,
                .featured-portfolio .product-list-item.active {
                    padding-left: 1rem;
                    background-color: #1a1a1a;
                }

                .featured-portfolio .product-list-item:hover .item-title,
                .featured-portfolio .product-list-item.active .item-title {
                    color: #ffffff;
                }
            }

            /* Navigation dots for mobile */
            .featured-portfolio .nav-dots {
                display: flex;
                justify-content: center;
                gap: 0.5rem;
                margin-top: 1.5rem;
            }

            @media (min-width: 1024px) {
                .featured-portfolio .nav-dots {
                    display: none;
                }
            }

            .featured-portfolio .nav-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: rgba(26, 26, 26, 0.2);
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .featured-portfolio .nav-dot.active {
                background-color: #1a1a1a;
                width: 24px;
                border-radius: 4px;
            }
        </style>

        <section class="featured-portfolio">
            ${showHeadline || showSubheadline ? `
            <div class="header-section">
                ${showHeadline ? `
                <h2 class="headline font-dm-sans">${headline}</h2>
                ` : ''}

                ${showSubheadline ? `
                <p class="subheadline font-manrope">${subheadline}</p>
                ` : ''}
            </div>
            ` : ''}

            ${showProducts ? `
            <div class="portfolio-layout">
                <!-- Left: Number Indicator -->
                <div class="number-indicator">
                    <p class="current-number font-dm-sans" id="portfolio-current">01</p>
                    <p class="total-number font-manrope">/${totalFormatted}</p>
                </div>

                <!-- Center: Image Stack -->
                <div class="image-stack">
                    <div class="image-container" id="portfolio-images">
                        ${productsWithPhotos.map((product, index) => `
                        <img src="${product.image}" alt="${product.title}" loading="lazy" class="${index === 0 ? 'active' : ''}" data-index="${index}">
                        `).join('')}
                    </div>
                    <div class="category-label">
                        <p class="category-name font-manrope" id="portfolio-category">${productsWithPhotos[0]?.tags?.[0] || 'Product'}</p>
                    </div>

                    <!-- Mobile nav dots -->
                    <div class="nav-dots">
                        ${productsWithPhotos.map((_, index) => `
                        <div class="nav-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
                        `).join('')}
                    </div>
                </div>

                <!-- Right: Product List -->
                <div class="product-list" id="portfolio-list">
                    ${productsWithPhotos.map((product, index) => `
                    <div class="product-list-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <div class="item-number font-manrope">${(index + 1).toString().padStart(2, '0')}</div>
                        <p class="item-title font-manrope">${product.title}</p>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </section>

        ${productsWithPhotos.length > 1 ? `
        <script>
            // Portfolio navigation - auto-cycle and click navigation
            (function() {
                const imagesContainer = document.getElementById('portfolio-images');
                const listContainer = document.getElementById('portfolio-list');
                const currentNumberEl = document.getElementById('portfolio-current');
                const categoryEl = document.getElementById('portfolio-category');
                const navDots = document.querySelectorAll('.featured-portfolio .nav-dot');

                if (!imagesContainer || !listContainer) return;

                const images = imagesContainer.querySelectorAll('img');
                const listItems = listContainer.querySelectorAll('.product-list-item');
                const categories = ${JSON.stringify(productsWithPhotos.map(p => p.tags?.[0] || 'Product'))};

                if (images.length <= 1) return;

                let currentIndex = 0;
                const totalItems = images.length;
                let autoPlayInterval;

                function showItem(index) {
                    // Update current index
                    currentIndex = index;

                    // Update images
                    images.forEach((img, i) => {
                        img.classList.toggle('active', i === index);
                    });

                    // Update list items
                    listItems.forEach((item, i) => {
                        item.classList.toggle('active', i === index);
                    });

                    // Update nav dots
                    navDots.forEach((dot, i) => {
                        dot.classList.toggle('active', i === index);
                    });

                    // Update number indicator
                    if (currentNumberEl) {
                        currentNumberEl.textContent = (index + 1).toString().padStart(2, '0');
                    }

                    // Update category
                    if (categoryEl && categories[index]) {
                        categoryEl.textContent = categories[index];
                    }
                }

                function nextItem() {
                    showItem((currentIndex + 1) % totalItems);
                }

                function startAutoPlay() {
                    autoPlayInterval = setInterval(nextItem, 4000);
                }

                function stopAutoPlay() {
                    if (autoPlayInterval) {
                        clearInterval(autoPlayInterval);
                    }
                }

                function resetAutoPlay() {
                    stopAutoPlay();
                    startAutoPlay();
                }

                // Click handlers for list items
                listItems.forEach((item, index) => {
                    item.addEventListener('click', () => {
                        showItem(index);
                        resetAutoPlay();
                    });
                });

                // Click handlers for nav dots
                navDots.forEach((dot, index) => {
                    dot.addEventListener('click', () => {
                        showItem(index);
                        resetAutoPlay();
                    });
                });

                // Start auto-play after a short delay
                setTimeout(startAutoPlay, 1000);
            })();
        </script>
        ` : ''}
    </div>`
}

/**
 * Style 3 - Gallery Grid with Animated Columns (Linea-inspired)
 * Features: Badge, centered headline with italic accent, 3-column image gallery
 * Column 1 scrolls down, Column 2 scrolls up, Column 3 scrolls down
 * No products - just images with continuous scroll animation
 */
function generateFeaturedStyle3(props: FeaturedProps): string {
    const {
        photos,
        headline = 'WORKS',
        subheadline = 'Collaboration that moved the needle.',
        featuredImages = [],
        visibility
    } = props

    // Use featured images if provided, otherwise fall back to photos
    const galleryImages = featuredImages.length > 0 ? featuredImages : photos

    // Need at least 6 images for a good gallery effect, duplicate if needed
    const ensureImages = (images: string[], minCount: number): string[] => {
        if (images.length === 0) {
            // Default placeholder images
            return [
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=800&fit=crop',
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=800&fit=crop',
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=800&fit=crop',
                'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=800&fit=crop',
                'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=800&fit=crop',
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop',
            ]
        }
        let result = [...images]
        while (result.length < minCount) {
            result = [...result, ...images]
        }
        return result.slice(0, Math.max(minCount, images.length))
    }

    const allImages = ensureImages(galleryImages, 9)

    // Split images into 3 columns
    const col1Images = allImages.filter((_, i) => i % 3 === 0)
    const col2Images = allImages.filter((_, i) => i % 3 === 1)
    const col3Images = allImages.filter((_, i) => i % 3 === 2)

    // Visibility defaults
    const showHeadline = visibility?.featured_headline !== false
    const showSubheadline = visibility?.featured_subheadline !== false
    const showImages = visibility?.featured_images !== false

    // Format subheadline to add italic styling
    const formatHeadline = (text: string): string => {
        const italicPatterns = [
            /\b(moved|needle|collaboration|creative|design|work|works|portfolio|projects)\b/gi,
        ]

        let formattedText = text
        italicPatterns.forEach(pattern => {
            formattedText = formattedText.replace(pattern, '<em>$1</em>')
        })

        return formattedText
    }

    return `
    <div class="featured-gallery-wrapper" id="featured">
        <style>
            .featured-gallery-wrapper {
                background-color: #fafafa;
                padding: 5rem 1.5rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .featured-gallery-wrapper {
                    padding: 6rem 2rem;
                }
            }

            @media (min-width: 1024px) {
                .featured-gallery-wrapper {
                    padding: 6rem 3rem;
                }
            }

            .featured-gallery {
                max-width: 1400px;
                margin: 0 auto;
            }

            /* Header Section */
            .featured-gallery .header-section {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-bottom: 3rem;
            }

            @media (min-width: 768px) {
                .featured-gallery .header-section {
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 4rem;
                }
            }

            .featured-gallery .header-left {
                flex: 1;
            }

            .featured-gallery .badge {
                display: inline-block;
                font-size: 0.75rem;
                font-weight: 500;
                color: #666666;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                margin-bottom: 0.75rem;
            }

            .featured-gallery .headline {
                font-size: clamp(1.75rem, 4vw, 2.75rem);
                font-weight: 400;
                line-height: 1.2;
                color: #1a1a1a;
                letter-spacing: -0.01em;
                margin: 0;
                max-width: 500px;
            }

            .featured-gallery .headline em {
                font-style: italic;
            }

            /* Gallery Grid */
            .featured-gallery .gallery-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
                height: 500px;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .featured-gallery .gallery-grid {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.25rem;
                    height: 600px;
                }
            }

            @media (min-width: 1024px) {
                .featured-gallery .gallery-grid {
                    gap: 1.5rem;
                    height: 650px;
                }
            }

            /* Gallery Column */
            .featured-gallery .gallery-column {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            @media (min-width: 768px) {
                .featured-gallery .gallery-column {
                    gap: 1.25rem;
                }
            }

            @media (min-width: 1024px) {
                .featured-gallery .gallery-column {
                    gap: 1.5rem;
                }
            }

            /* Animation for columns */
            .featured-gallery .gallery-column.scroll-down {
                animation: scrollDown 25s linear infinite;
            }

            .featured-gallery .gallery-column.scroll-up {
                animation: scrollUp 25s linear infinite;
            }

            .featured-gallery .gallery-column:hover {
                animation-play-state: paused;
            }

            @keyframes scrollDown {
                0% {
                    transform: translateY(-25%);
                }
                100% {
                    transform: translateY(0%);
                }
            }

            @keyframes scrollUp {
                0% {
                    transform: translateY(0%);
                }
                100% {
                    transform: translateY(-25%);
                }
            }

            /* Gallery Image */
            .featured-gallery .gallery-image {
                width: 100%;
                border-radius: 12px;
                overflow: hidden;
                flex-shrink: 0;
            }

            @media (min-width: 768px) {
                .featured-gallery .gallery-image {
                    border-radius: 16px;
                }
            }

            .featured-gallery .gallery-image img {
                width: 100%;
                aspect-ratio: 3/4;
                object-fit: cover;
                display: block;
                transition: transform 0.4s ease;
            }

            .featured-gallery .gallery-image:hover img {
                transform: scale(1.03);
            }

            /* Third column hidden on mobile */
            .featured-gallery .gallery-column:nth-child(3) {
                display: none;
            }

            @media (min-width: 768px) {
                .featured-gallery .gallery-column:nth-child(3) {
                    display: flex;
                }
            }

            /* Fade in animation */
            .featured-gallery .fade-in-up {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.6s ease-out, transform 0.6s ease-out;
            }

            .featured-gallery .fade-in-up.visible {
                opacity: 1;
                transform: translateY(0);
            }
        </style>

        <section class="featured-gallery">
            <div class="header-section fade-in-up">
                <div class="header-left">
                    ${showHeadline ? `
                    <span class="badge font-manrope">${headline}</span>
                    ` : ''}
                    ${showSubheadline ? `
                    <h2 class="headline font-dm-sans">${formatHeadline(subheadline)}</h2>
                    ` : ''}
                </div>
            </div>

            ${showImages ? `
            <div class="gallery-grid fade-in-up">
                <div class="gallery-column scroll-down">
                    ${col1Images.map(img => `
                    <div class="gallery-image">
                        <img src="${img}" alt="Gallery image" loading="lazy">
                    </div>
                    `).join('')}
                    ${col1Images.map(img => `
                    <div class="gallery-image">
                        <img src="${img}" alt="Gallery image" loading="lazy">
                    </div>
                    `).join('')}
                </div>
                <div class="gallery-column scroll-up">
                    ${col2Images.map(img => `
                    <div class="gallery-image">
                        <img src="${img}" alt="Gallery image" loading="lazy">
                    </div>
                    `).join('')}
                    ${col2Images.map(img => `
                    <div class="gallery-image">
                        <img src="${img}" alt="Gallery image" loading="lazy">
                    </div>
                    `).join('')}
                </div>
                <div class="gallery-column scroll-down">
                    ${col3Images.map(img => `
                    <div class="gallery-image">
                        <img src="${img}" alt="Gallery image" loading="lazy">
                    </div>
                    `).join('')}
                    ${col3Images.map(img => `
                    <div class="gallery-image">
                        <img src="${img}" alt="Gallery image" loading="lazy">
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </section>

        <script>
            // Intersection Observer for scroll animations
            (function() {
                const featuredSection = document.querySelector('.featured-gallery-wrapper');
                if (!featuredSection) return;

                const fadeElements = featuredSection.querySelectorAll('.fade-in-up');

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
 * Style 4 - Staggered Masonry Grid (Project Showcase)
 * Features: Badge with dot, large headline, CTA button, staggered grid of project cards
 * Each card has image, title, and date in a masonry-style layout
 *
 * Field mapping:
 * - Featured Headline → Badge text (e.g., "PROJECT")
 * - Featured Subheadline → Main headline (e.g., "Stories behind the build")
 * - Featured Products → Project cards with title, image, and tags (first tag used as date)
 */
function generateFeaturedStyle4(props: FeaturedProps): string {
    const {
        photos,
        projects = [],
        headline = 'PROJECT',
        subheadline = 'Stories behind the build',
        ctaText = 'View All Works',
        ctaLink = '#contact',
        visibility
    } = props

    // Default projects if none provided
    const defaultProducts: FeaturedProduct[] = [
        {
            title: 'Nordic Tones',
            description: 'A modern interior design project featuring minimalist aesthetics.',
            tags: ['Aug 5, 2025'],
        },
        {
            title: 'Aurora Home',
            description: 'Contemporary living space with bold color accents.',
            tags: ['Aug 14, 2025'],
        },
        {
            title: 'City Pulse',
            description: 'Urban-inspired design with futuristic elements.',
            tags: ['Aug 22, 2025'],
        },
        {
            title: 'Serene Valley',
            description: 'Nature-inspired interiors with organic materials.',
            tags: ['Sep 1, 2025'],
        },
    ]

    // Use provided projects or defaults
    const validProducts = projects.filter(p => p && p.title)
    const productList: FeaturedProduct[] = validProducts.length > 0 ? validProducts : defaultProducts

    // Assign photos to projects
    const productsWithPhotos = productList.map((project, index) => ({
        ...project,
        image: project.image || photos[index % Math.max(photos.length, 1)] || `https://images.unsplash.com/photo-${1556909114 + index}-f6e7ad7d3136?q=80&w=800`,
        tags: project.tags || [`Project ${index + 1}`]
    }))

    // Visibility defaults
    const showHeadline = visibility?.featured_headline !== false
    const showSubheadline = visibility?.featured_subheadline !== false
    const showProducts = visibility?.featured_products !== false

    return `
    <div class="featured-masonry-wrapper" id="featured">
        <style>
            .featured-masonry-wrapper {
                background-color: var(--background, #F6F7F5);
                padding: 5rem 2rem;
                position: relative;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .featured-masonry-wrapper {
                    padding: 6rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .featured-masonry-wrapper {
                    padding: 8rem 5rem;
                }
            }

            .featured-masonry {
                max-width: 1400px;
                margin: 0 auto;
            }

            /* Fade up animation */
            @keyframes featured-masonry-fade-up {
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
            .featured-masonry .header-section {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                margin-bottom: 3rem;
            }

            @media (min-width: 768px) {
                .featured-masonry .header-section {
                    flex-direction: row;
                    align-items: flex-start;
                    justify-content: space-between;
                    margin-bottom: 4rem;
                }
            }

            .featured-masonry .header-left {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            /* Badge with Dot */
            .featured-masonry .badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                opacity: 0;
                animation: featured-masonry-fade-up 0.6s ease-out 0.1s forwards;
            }

            .featured-masonry .badge-dot {
                width: 8px;
                height: 8px;
                background: var(--primary, #e85a30);
                border-radius: 50%;
            }

            .featured-masonry .badge-text {
                font-size: 0.75rem;
                font-weight: 500;
                color: var(--featured-text, #666666);
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }

            /* Headline */
            .featured-masonry .headline {
                font-size: clamp(2rem, 4vw, 3rem);
                font-weight: 500;
                line-height: 1.15;
                color: var(--secondary, #1a1a1a);
                letter-spacing: -0.02em;
                margin: 0;
                max-width: 400px;
                opacity: 0;
                animation: featured-masonry-fade-up 0.6s ease-out 0.2s forwards;
            }

            .featured-masonry .headline em {
                font-style: italic;
            }

            /* CTA Button */
            .featured-masonry .cta-button {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.25rem;
                font-size: 0.875rem;
                font-weight: 500;
                color: #ffffff;
                background-color: var(--primary, #e85a30);
                border: none;
                border-radius: 50px;
                text-decoration: none;
                cursor: pointer;
                transition: background-color 0.2s ease, transform 0.2s ease;
                white-space: nowrap;
                opacity: 0;
                animation: featured-masonry-fade-up 0.6s ease-out 0.3s forwards;
            }

            .featured-masonry .cta-button:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }

            .featured-masonry .cta-button .arrow-icon {
                width: 20px;
                height: 20px;
                background-color: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .featured-masonry .cta-button .arrow-icon svg {
                width: 10px;
                height: 10px;
                stroke: #ffffff;
                stroke-width: 2.5;
            }

            /* Masonry Grid */
            .featured-masonry .projects-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 2rem;
            }

            @media (min-width: 640px) {
                .featured-masonry .projects-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                }
            }

            @media (min-width: 1024px) {
                .featured-masonry .projects-grid {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 2rem;
                }
            }

            /* Staggered layout for masonry effect */
            @media (min-width: 640px) {
                .featured-masonry .project-card:nth-child(2) {
                    margin-top: 3rem;
                }
                .featured-masonry .project-card:nth-child(4) {
                    margin-top: -3rem;
                }
            }

            @media (min-width: 1024px) {
                .featured-masonry .project-card:nth-child(1) {
                    margin-top: 0;
                }
                .featured-masonry .project-card:nth-child(2) {
                    margin-top: 4rem;
                }
                .featured-masonry .project-card:nth-child(3) {
                    margin-top: 8rem;
                }
                .featured-masonry .project-card:nth-child(4) {
                    margin-top: -2rem;
                }
                .featured-masonry .project-card:nth-child(5) {
                    margin-top: 2rem;
                }
                .featured-masonry .project-card:nth-child(6) {
                    margin-top: 6rem;
                }
            }

            /* Project Card */
            .featured-masonry .project-card {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                opacity: 0;
                animation: featured-masonry-fade-up 0.7s ease-out forwards;
            }

            .featured-masonry .project-card:nth-child(1) { animation-delay: 0.3s; }
            .featured-masonry .project-card:nth-child(2) { animation-delay: 0.4s; }
            .featured-masonry .project-card:nth-child(3) { animation-delay: 0.5s; }
            .featured-masonry .project-card:nth-child(4) { animation-delay: 0.6s; }
            .featured-masonry .project-card:nth-child(5) { animation-delay: 0.7s; }
            .featured-masonry .project-card:nth-child(6) { animation-delay: 0.8s; }

            .featured-masonry .project-image {
                position: relative;
                aspect-ratio: 3/4;
                border-radius: 8px;
                overflow: hidden;
                background-color: #e5e5e5;
            }

            .featured-masonry .project-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                transition: transform 0.5s ease;
            }

            .featured-masonry .project-card:hover .project-image img {
                transform: scale(1.05);
            }

            .featured-masonry .project-info {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
            }

            .featured-masonry .project-title {
                font-size: 1rem;
                font-weight: 500;
                color: var(--secondary, #1a1a1a);
                margin: 0;
                letter-spacing: -0.01em;
            }

            @media (min-width: 768px) {
                .featured-masonry .project-title {
                    font-size: 1.125rem;
                }
            }

            .featured-masonry .project-date {
                font-size: 0.8125rem;
                color: var(--featured-text, #666666);
                white-space: nowrap;
            }
        </style>

        <section class="featured-masonry">
            <div class="header-section">
                <div class="header-left">
                    ${showHeadline ? `
                    <div class="badge">
                        <span class="badge-dot"></span>
                        <span class="badge-text font-manrope">${headline}</span>
                    </div>
                    ` : ''}

                    ${showSubheadline ? `
                    <h2 class="headline font-dm-sans">${subheadline}</h2>
                    ` : ''}
                </div>

                <a href="${ctaLink}" class="cta-button font-manrope">
                    ${ctaText}
                    <span class="arrow-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 17L17 7M17 7H7M17 7V17" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                </a>
            </div>

            ${showProducts ? `
            <div class="projects-grid">
                ${productsWithPhotos.map((project) => `
                <div class="project-card">
                    <div class="project-image">
                        <img src="${project.image}" alt="${project.title}" loading="lazy">
                    </div>
                    <div class="project-info">
                        <h3 class="project-title font-dm-sans">${project.title}</h3>
                        <span class="project-date font-manrope">${project.tags?.[0] || ''}</span>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </section>
    </div>`
}

/**
 * Get fields used by each featured style
 * Used to conditionally show/hide fields in the content editor
 */
export function getFeaturedStyleFields(style: string): {
    usesHeadline: boolean
    usesSubheadline: boolean
    usesProducts: boolean
    usesTestimonials: boolean
    usesTags: boolean
    usesImages: boolean
    usesCta: boolean
} {
    const styleFields: Record<string, {
        usesHeadline: boolean
        usesSubheadline: boolean
        usesProducts: boolean
        usesTestimonials: boolean
        usesTags: boolean
        usesImages: boolean
        usesCta: boolean
    }> = {
        '1': {
            usesHeadline: true,
            usesSubheadline: true,
            usesProducts: true,
            usesTestimonials: true, // Full cards with testimonials
            usesTags: true,
            usesImages: false, // Products have their own images
            usesCta: false,
        },
        '2': {
            usesHeadline: true,
            usesSubheadline: true,
            usesProducts: true,
            usesTestimonials: false, // Portfolio view, no testimonials shown
            usesTags: true, // Tags shown as category labels
            usesImages: false, // Products have their own images
            usesCta: false,
        },
        '3': {
            usesHeadline: true, // Used as badge (e.g., "WORKS")
            usesSubheadline: true, // Used as main headline
            usesProducts: false, // No products in gallery style
            usesTestimonials: false,
            usesTags: false,
            usesImages: true, // Uses featured images gallery
            usesCta: false,
        },
        '4': {
            usesHeadline: true, // Used as badge (e.g., "PROJECT")
            usesSubheadline: true, // Used as main headline
            usesProducts: true, // Project cards with title, image, date
            usesTestimonials: false, // No testimonials in masonry style
            usesTags: true, // First tag used as date
            usesImages: false, // Products have their own images
            usesCta: true, // Has "View All Works" button
        },
    }

    return styleFields[style] || styleFields['1']
}

/**
 * Main generator function - routes to appropriate style
 */
export function generateFeaturedHtml(style: string, props: FeaturedProps): string {
    const generators: Record<string, (props: FeaturedProps) => string> = {
        '1': generateFeaturedStyle1,
        '2': generateFeaturedStyle2,
        '3': generateFeaturedStyle3,
        '4': generateFeaturedStyle4,
    }

    const generator = generators[style] || generators['1']
    return generator(props)
}

export type { FeaturedProps, FeaturedProduct }
