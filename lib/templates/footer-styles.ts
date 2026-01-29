/**
 * Footer Section Style Generators
 * Refit-inspired contact/footer section
 */

interface FooterProps {
    businessName: string
    email: string
    phone: string
    address?: string
    description?: string
    socialLinks?: Array<{ platform: string; url: string }>
    featuredImage?: string // Product image for Craft Footer style
    photos?: string[] // Uploaded business photos for marquee carousel
    visibility?: {
        footer_badge?: boolean
        footer_headline?: boolean
        footer_description?: boolean
        footer_contact?: boolean
        footer_social?: boolean
    }
}

/**
 * Style 1 - Refit-Inspired Contact Footer
 * Dark background with contact info on left, social links below
 * Features: Contact badge, "Get in touch" headline, contact details, social icons
 */
function generateFooterStyle1(props: FooterProps): string {
    const {
        businessName,
        email,
        phone,
        address,
        description = 'For any inquiries or to explore your vision further, we invite you to contact our professional team using the details provided below.',
        socialLinks = [],
        visibility
    } = props

    const year = new Date().getFullYear()

    // Visibility defaults
    const showBadge = visibility?.footer_badge !== false
    const showHeadline = visibility?.footer_headline !== false
    const showDescription = visibility?.footer_description !== false
    const showContact = visibility?.footer_contact !== false
    const showSocial = visibility?.footer_social !== false

    // Default social links if none provided
    const defaultSocialLinks = [
        { platform: 'instagram', url: '#' },
        { platform: 'tiktok', url: '#' },
        { platform: 'twitter', url: '#' }
    ]
    const socialLinksToShow = socialLinks.length > 0 ? socialLinks : defaultSocialLinks

    // Social icon SVGs
    const socialIcons: Record<string, string> = {
        instagram: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
        tiktok: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>`,
        twitter: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
        facebook: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>`,
        linkedin: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
        youtube: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
    }

    return `
    <div class="footer-refit-wrapper" id="contact">
        <style>
            .footer-refit-wrapper {
                background-color: var(--footer-bg, #1F2933);
                position: relative;
                overflow: hidden;
            }

            .footer-refit {
                max-width: 1400px;
                margin: 0 auto;
                padding: 5rem 2rem;
            }

            @media (min-width: 768px) {
                .footer-refit {
                    padding: 6rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .footer-refit {
                    padding: 8rem 5rem;
                }
            }

            /* Content Layout */
            .footer-refit .footer-content {
                display: flex;
                flex-direction: column;
                gap: 3rem;
            }

            /* Badge */
            .footer-refit .footer-badge {
                display: inline-flex;
                align-items: center;
                padding: 0.5rem 1rem;
                background-color: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                border-radius: 100px;
                font-size: 0.85rem;
                font-weight: 500;
                width: fit-content;
            }

            /* Headline */
            .footer-refit .footer-headline {
                font-size: clamp(2.5rem, 5vw, 4rem);
                font-weight: 500;
                line-height: 1.1;
                color: #ffffff;
                letter-spacing: -0.02em;
                margin: 0;
            }

            /* Description */
            .footer-refit .footer-description {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.65);
                line-height: 1.8;
                margin: 0;
                max-width: 500px;
            }

            /* Contact Info */
            .footer-refit .contact-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 1.5rem;
                margin-top: 1rem;
            }

            @media (min-width: 640px) {
                .footer-refit .contact-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (min-width: 768px) {
                .footer-refit .contact-grid {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 2rem;
                }
            }

            .footer-refit .contact-item {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .footer-refit .contact-label {
                font-size: 0.875rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0;
            }

            .footer-refit .contact-value {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.65);
                margin: 0;
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .footer-refit .contact-value:hover {
                color: #ffffff;
            }

            /* Social Section */
            .footer-refit .social-section {
                margin-top: 2rem;
                padding-top: 2rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .footer-refit .social-label {
                font-size: 0.875rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 1rem 0;
            }

            .footer-refit .social-links {
                display: flex;
                gap: 1rem;
            }

            .footer-refit .social-link {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                transition: background-color 0.2s ease, transform 0.2s ease;
            }

            .footer-refit .social-link:hover {
                background-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }

            /* Copyright */
            .footer-refit .copyright {
                margin-top: 3rem;
                padding-top: 2rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            @media (min-width: 768px) {
                .footer-refit .copyright {
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                }
            }

            .footer-refit .copyright-text {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.5);
                margin: 0;
            }

            .footer-refit .copyright-links {
                display: flex;
                gap: 1.5rem;
            }

            .footer-refit .copyright-link {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.5);
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .footer-refit .copyright-link:hover {
                color: #ffffff;
            }

            /* Animation */
            .footer-refit .fade-in-up {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.6s ease-out, transform 0.6s ease-out;
            }

            .footer-refit .fade-in-up.visible {
                opacity: 1;
                transform: translateY(0);
            }
        </style>

        <footer class="footer-refit">
            <div class="footer-content">
                ${showBadge ? `
                <span class="footer-badge fade-in-up font-manrope">Contact</span>
                ` : ''}

                ${showHeadline ? `
                <h2 class="footer-headline fade-in-up font-dm-sans">Get in touch</h2>
                ` : ''}

                ${showDescription ? `
                <p class="footer-description fade-in-up font-manrope">${description}</p>
                ` : ''}

                ${showContact ? `
                <div class="contact-grid fade-in-up">
                    ${address ? `
                    <div class="contact-item">
                        <p class="contact-label font-manrope">Office</p>
                        <p class="contact-value font-manrope">${address}</p>
                    </div>
                    ` : ''}
                    <div class="contact-item">
                        <p class="contact-label font-manrope">Email</p>
                        <a href="mailto:${email}" class="contact-value font-manrope">${email}</a>
                    </div>
                    <div class="contact-item">
                        <p class="contact-label font-manrope">Telephone</p>
                        <a href="tel:${phone.replace(/\s/g, '')}" class="contact-value font-manrope">${phone}</a>
                    </div>
                </div>
                ` : ''}

                ${showSocial ? `
                <div class="social-section fade-in-up">
                    <p class="social-label font-manrope">Follow us</p>
                    <div class="social-links">
                        ${socialLinksToShow.map(link => `
                        <a href="${link.url}" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="${link.platform}">
                            ${socialIcons[link.platform.toLowerCase()] || socialIcons.instagram}
                        </a>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="copyright fade-in-up">
                    <p class="copyright-text font-manrope">© ${year} ${businessName}. All rights reserved.</p>
                    <div class="copyright-links">
                        <a href="#" class="copyright-link font-manrope">Privacy Policy</a>
                        <a href="#" class="copyright-link font-manrope">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>

        <script>
            // Intersection Observer for footer animations
            (function() {
                const footerSection = document.querySelector('.footer-refit-wrapper');
                if (!footerSection) return;

                const fadeElements = footerSection.querySelectorAll('.fade-in-up');

                if (!('IntersectionObserver' in window)) {
                    fadeElements.forEach(el => el.classList.add('visible'));
                    return;
                }

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry, index) => {
                        if (entry.isIntersecting) {
                            setTimeout(() => {
                                entry.target.classList.add('visible');
                            }, index * 100);
                            observer.unobserve(entry.target);
                        }
                    });
                }, {
                    root: null,
                    rootMargin: '0px 0px -50px 0px',
                    threshold: 0.1
                });

                fadeElements.forEach(el => observer.observe(el));
            })();
        </script>
    </div>`
}

/**
 * Style 2 - Craft Footer (Prototype-inspired)
 * Large italic headline, contact link, reel/image section, center links, large nav links
 * Features: Italic serif headline, video reel preview, minimalist footer links, bold navigation
 */
function generateFooterStyle2(props: FooterProps): string {
    const {
        businessName,
        email,
        phone,
        address,
        featuredImage,
        socialLinks = [],
        visibility
    } = props

    const year = new Date().getFullYear()

    // Visibility defaults
    const showHeadline = visibility?.footer_headline !== false
    const showContact = visibility?.footer_contact !== false
    const showSocial = visibility?.footer_social !== false

    // Navigation links
    const navLinks = [
        { label: 'PRODUCTS', href: '#featured' },
        { label: 'ABOUT', href: '#about' },
        { label: 'CONTACT', href: '#contact' }
    ]

    // Default social links if none provided
    const defaultSocialLinks = [
        { platform: 'instagram', url: '#' },
        { platform: 'facebook', url: '#' },
        { platform: 'tiktok', url: '#' }
    ]
    const socialLinksToShow = socialLinks.length > 0 ? socialLinks : defaultSocialLinks

    return `
    <div class="footer-craft-wrapper" id="contact">
        <style>
            .footer-craft-wrapper {
                background-color: #ffffff;
                position: relative;
                overflow: hidden;
            }

            .footer-craft {
                max-width: 1400px;
                margin: 0 auto;
                padding: 5rem 2rem 3rem;
            }

            @media (min-width: 768px) {
                .footer-craft {
                    padding: 6rem 4rem 3rem;
                }
            }

            @media (min-width: 1024px) {
                .footer-craft {
                    padding: 8rem 5rem 4rem;
                }
            }

            /* Main Content Area */
            .footer-craft .content-area {
                margin-bottom: 4rem;
            }

            /* Headline - Large Italic */
            .footer-craft .headline {
                font-size: clamp(2rem, 5vw, 3.5rem);
                font-weight: 400;
                font-style: italic;
                line-height: 1.15;
                color: #1a1a1a;
                letter-spacing: -0.01em;
                margin: 0 0 1.5rem 0;
                max-width: 600px;
                /* Fade up animation */
                opacity: 0;
                transform: translateY(30px);
                animation: footer-craft-fade-up 0.8s ease-out 0.2s forwards;
            }

            @keyframes footer-craft-fade-up {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Contact Link */
            .footer-craft .contact-link {
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
                animation: footer-craft-fade-in 0.6s ease-out 0.4s forwards;
            }

            @keyframes footer-craft-fade-in {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            .footer-craft .contact-link:hover {
                opacity: 0.7;
            }

            .footer-craft .contact-link::before {
                content: '›';
                font-size: 1rem;
            }

            .footer-craft .contact-link span {
                text-decoration: underline;
                text-underline-offset: 3px;
            }

            /* Bottom Section - 3 Column Layout */
            .footer-craft .bottom-section {
                display: grid;
                grid-template-columns: 1fr;
                gap: 3rem;
                padding-top: 3rem;
                border-top: 1px solid rgba(26, 26, 26, 0.1);
            }

            @media (min-width: 768px) {
                .footer-craft .bottom-section {
                    grid-template-columns: 1fr auto 1fr;
                    gap: 2rem;
                    align-items: end;
                }
            }

            /* Left - Featured Image Section */
            .footer-craft .image-section {
                order: 2;
                /* Fade up animation */
                opacity: 0;
                transform: translateY(30px);
                animation: footer-craft-fade-up 0.8s ease-out 0.3s forwards;
            }

            @media (min-width: 768px) {
                .footer-craft .image-section {
                    order: 1;
                }
            }

            .footer-craft .image-container {
                position: relative;
                width: 100%;
                max-width: 280px;
                aspect-ratio: 16/10;
                border-radius: 8px;
                overflow: hidden;
                background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
            }

            .footer-craft .image-container img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                transition: transform 0.5s ease;
            }

            .footer-craft .image-container:hover img {
                transform: scale(1.05);
            }

            .footer-craft .image-label {
                position: absolute;
                top: 1rem;
                left: 1rem;
                font-size: 1.25rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }

            .footer-craft .image-year {
                position: absolute;
                bottom: 1rem;
                right: 1rem;
                font-size: 2rem;
                font-weight: 700;
                color: #ffffff;
                margin: 0;
                opacity: 0.9;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }

            /* Center - Footer Links */
            .footer-craft .footer-links {
                order: 3;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.75rem;
                /* Fade in animation */
                opacity: 0;
                animation: footer-craft-fade-in 0.6s ease-out 0.5s forwards;
            }

            @media (min-width: 768px) {
                .footer-craft .footer-links {
                    order: 2;
                    align-items: center;
                }
            }

            .footer-craft .footer-link {
                font-size: 0.6875rem;
                color: rgba(26, 26, 26, 0.5);
                text-decoration: none;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                transition: color 0.2s ease;
            }

            .footer-craft .footer-link:hover {
                color: #1a1a1a;
            }

            /* Right - Large Nav Links */
            .footer-craft .nav-links {
                order: 1;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.25rem;
                /* Fade in animation */
                opacity: 0;
                animation: footer-craft-fade-in 0.6s ease-out 0.4s forwards;
            }

            @media (min-width: 768px) {
                .footer-craft .nav-links {
                    order: 3;
                    align-items: flex-end;
                }
            }

            .footer-craft .nav-link {
                font-size: clamp(1.75rem, 4vw, 2.5rem);
                font-weight: 700;
                color: #1a1a1a;
                text-decoration: none;
                letter-spacing: 0.02em;
                line-height: 1.2;
                transition: opacity 0.2s ease;
            }

            .footer-craft .nav-link:hover {
                opacity: 0.6;
            }

            /* Contact Info Below */
            .footer-craft .contact-info {
                margin-top: 3rem;
                padding-top: 2rem;
                border-top: 1px solid rgba(26, 26, 26, 0.1);
                display: flex;
                flex-direction: column;
                gap: 1rem;
                /* Fade in animation */
                opacity: 0;
                animation: footer-craft-fade-in 0.6s ease-out 0.6s forwards;
            }

            @media (min-width: 768px) {
                .footer-craft .contact-info {
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                }
            }

            .footer-craft .contact-details {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            @media (min-width: 640px) {
                .footer-craft .contact-details {
                    flex-direction: row;
                    gap: 2rem;
                }
            }

            .footer-craft .contact-item {
                font-size: 0.8125rem;
                color: rgba(26, 26, 26, 0.6);
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .footer-craft .contact-item:hover {
                color: #1a1a1a;
            }

            .footer-craft .copyright {
                font-size: 0.75rem;
                color: rgba(26, 26, 26, 0.4);
                margin: 0;
            }

        </style>

        <footer class="footer-craft">
            <div class="content-area">
                ${showHeadline ? `
                <h2 class="headline font-playfair">LET'S CRAFT<br>YOUR PROJECT TOGETHER</h2>
                ` : ''}

                ${showContact ? `
                <a href="mailto:${email}" class="contact-link font-manrope">
                    <span>Contact us</span>
                </a>
                ` : ''}
            </div>

            <div class="bottom-section">
                <!-- Featured Image Section -->
                ${featuredImage ? `
                <div class="image-section">
                    <div class="image-container">
                        <img src="${featuredImage}" alt="${businessName} - Featured Work" loading="lazy">
                        <p class="image-label font-dm-sans">Reel</p>
                        <p class="image-year font-dm-sans">${year}</p>
                    </div>
                </div>
                ` : ''}

                <!-- Social Links -->
                ${showSocial ? `
                <div class="footer-links">
                    ${socialLinksToShow.map(link => `
                    <a href="${link.url}" class="footer-link font-manrope" target="_blank" rel="noopener noreferrer">${link.platform.toUpperCase()}</a>
                    `).join('')}
                </div>
                ` : ''}

                <!-- Navigation Links -->
                <nav class="nav-links">
                    ${navLinks.map(link => `
                    <a href="${link.href}" class="nav-link font-dm-sans">${link.label}</a>
                    `).join('')}
                </nav>
            </div>

            <div class="contact-info">
                <div class="contact-details">
                    ${address ? `<span class="contact-item font-manrope">${address}</span>` : ''}
                    <a href="mailto:${email}" class="contact-item font-manrope">${email}</a>
                    <a href="tel:${phone.replace(/\s/g, '')}" class="contact-item font-manrope">${phone}</a>
                </div>

                <p class="copyright font-manrope">© ${year} ${businessName}</p>
            </div>
        </footer>
    </div>`
}

/**
 * Get social media icon SVG
 */
function getSocialIcon(platform: string): string {
    const icons: Record<string, string> = {
        instagram: `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
        tiktok: `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>`,
        twitter: `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
        facebook: `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>`,
        linkedin: `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
        youtube: `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
    }
    return icons[platform.toLowerCase()] || icons.instagram
}

/**
 * Style 3 - Orange CTA Footer (Linea-inspired)
 * Features: Orange gradient background, large headline with italic accent,
 * description text, CTA button, social links, and bottom bar with copyright
 */
function generateFooterStyle3(props: FooterProps): string {
    const {
        businessName,
        email,
        phone,
        address,
        description = 'Book a quick call to see how we can help your business grow.',
        socialLinks = [],
        visibility
    } = props

    const year = new Date().getFullYear()

    // Visibility defaults
    const showHeadline = visibility?.footer_headline !== false
    const showDescription = visibility?.footer_description !== false
    const showContact = visibility?.footer_contact !== false
    const showSocial = visibility?.footer_social !== false

    // Default social links if none provided
    const defaultSocialLinks = [
        { platform: 'twitter', url: '#' },
        { platform: 'dribbble', url: '#' },
        { platform: 'behance', url: '#' }
    ]
    const socialLinksToShow = socialLinks.length > 0 ? socialLinks : defaultSocialLinks

    // Social icon SVGs
    const socialIcons: Record<string, string> = {
        twitter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
        dribbble: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.318 35.318 0 011.823 6.475 8.4 8.4 0 01-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 01-3.655 5.715z"/></svg>`,
        behance: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.799 5.698c.589 0 1.12.051 1.606.156.482.102.895.273 1.241.508.342.235.611.547.804.939.187.387.28.871.28 1.443 0 .62-.14 1.138-.421 1.551-.283.414-.7.753-1.256 1.015.757.219 1.318.602 1.69 1.146.374.549.557 1.206.557 1.976 0 .625-.119 1.166-.358 1.622a3.31 3.31 0 01-.979 1.146c-.406.301-.883.523-1.433.669-.543.143-1.117.217-1.724.217H2V5.698h5.799zm-.351 4.943c.475 0 .869-.114 1.176-.345.307-.228.463-.592.463-1.084 0-.277-.049-.503-.14-.676a1.074 1.074 0 00-.387-.419 1.582 1.582 0 00-.573-.214 3.31 3.31 0 00-.697-.069H4.709v2.807h2.739zm.151 5.239c.267 0 .521-.027.76-.081.241-.054.453-.142.636-.26.182-.117.332-.283.443-.495.112-.213.168-.488.168-.827 0-.659-.187-1.128-.553-1.413-.369-.283-.862-.427-1.477-.427H4.709v3.503h2.89zM15.326 15.93c.38.359.928.535 1.635.535.507 0 .952-.129 1.328-.391.374-.26.6-.525.68-.798h2.241c-.358 1.109-.899 1.903-1.62 2.381-.72.476-1.591.716-2.613.716-.714 0-1.358-.117-1.936-.349a4.07 4.07 0 01-1.479-1.001 4.513 4.513 0 01-.941-1.567c-.22-.612-.332-1.29-.332-2.035 0-.721.107-1.386.323-1.99a4.486 4.486 0 01.937-1.574 4.28 4.28 0 011.479-1.039c.583-.249 1.235-.374 1.958-.374.806 0 1.504.156 2.094.467.589.312 1.074.729 1.452 1.253.377.524.647 1.125.808 1.805.161.679.214 1.391.159 2.132h-6.709c.028.799.259 1.467.636 1.829zm2.854-4.669c-.3-.313-.762-.47-1.387-.47-.406 0-.747.072-1.015.218-.269.144-.484.323-.649.536-.163.213-.276.439-.338.68-.062.239-.1.458-.114.653h4.15c-.087-.667-.346-1.303-.647-1.617zM14.746 7.156h4.874v1.107h-4.874V7.156z"/></svg>`,
        instagram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
        facebook: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
        tiktok: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>`,
        linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    }

    // Format headline to add italic styling
    const formatHeadline = (text: string): string => {
        const italicPatterns = [
            /\b(easier|better|design|work|creative|solutions|together|grow|success)\b/gi,
        ]

        let formattedText = text
        italicPatterns.forEach(pattern => {
            formattedText = formattedText.replace(pattern, '<em>$1</em>')
        })

        return formattedText
    }

    return `
    <div class="footer-orange-wrapper" id="contact">
        <style>
            .footer-orange-wrapper {
                background: linear-gradient(135deg, #e85a30 0%, #f47340 50%, #e85a30 100%);
                position: relative;
                overflow: hidden;
            }

            /* Main CTA Section */
            .footer-orange .cta-section {
                padding: 5rem 1.5rem;
                max-width: 1200px;
                margin: 0 auto;
            }

            @media (min-width: 768px) {
                .footer-orange .cta-section {
                    padding: 6rem 2rem;
                }
            }

            @media (min-width: 1024px) {
                .footer-orange .cta-section {
                    padding: 8rem 3rem;
                }
            }

            /* Brand Logo */
            .footer-orange .brand-logo {
                font-size: 1.25rem;
                font-weight: 500;
                color: #ffffff;
                margin-bottom: 3rem;
                letter-spacing: -0.01em;
            }

            @media (min-width: 768px) {
                .footer-orange .brand-logo {
                    font-size: 1.5rem;
                    margin-bottom: 4rem;
                }
            }

            /* Headline */
            .footer-orange .headline {
                font-size: clamp(2rem, 5vw, 3.5rem);
                font-weight: 400;
                line-height: 1.15;
                color: #ffffff;
                letter-spacing: -0.02em;
                margin: 0 0 1.5rem 0;
                max-width: 600px;
            }

            .footer-orange .headline em {
                font-style: italic;
            }

            /* Description */
            .footer-orange .description {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.85);
                line-height: 1.6;
                margin: 0 0 2rem 0;
                max-width: 450px;
            }

            @media (min-width: 768px) {
                .footer-orange .description {
                    font-size: 1.0625rem;
                    margin: 0 0 2.5rem 0;
                }
            }

            /* CTA Button */
            .footer-orange .cta-button {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.875rem 1.5rem;
                background-color: #ffffff;
                color: #1a1a1a;
                border: none;
                border-radius: 8px;
                font-size: 0.9375rem;
                font-weight: 500;
                text-decoration: none;
                transition: all 0.2s ease;
                cursor: pointer;
                margin-bottom: 3rem;
            }

            @media (min-width: 768px) {
                .footer-orange .cta-button {
                    padding: 1rem 1.75rem;
                    border-radius: 10px;
                    margin-bottom: 4rem;
                }
            }

            .footer-orange .cta-button:hover {
                background-color: #f5f5f5;
                transform: translateY(-1px);
            }

            /* Social Links */
            .footer-orange .social-links {
                display: flex;
                gap: 0.75rem;
            }

            .footer-orange .social-link {
                width: 40px;
                height: 40px;
                background-color: rgba(0, 0, 0, 0.15);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                transition: all 0.2s ease;
            }

            .footer-orange .social-link:hover {
                background-color: rgba(0, 0, 0, 0.25);
                transform: translateY(-2px);
            }

            .footer-orange .social-link svg {
                width: 18px;
                height: 18px;
            }

            /* Bottom Bar */
            .footer-orange .bottom-bar {
                border-top: 1px solid rgba(255, 255, 255, 0.15);
                padding: 1.5rem 1.5rem;
            }

            @media (min-width: 768px) {
                .footer-orange .bottom-bar {
                    padding: 1.5rem 2rem;
                }
            }

            @media (min-width: 1024px) {
                .footer-orange .bottom-bar {
                    padding: 1.5rem 3rem;
                }
            }

            .footer-orange .bottom-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            @media (min-width: 768px) {
                .footer-orange .bottom-content {
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                }
            }

            .footer-orange .bottom-links {
                display: flex;
                gap: 1.5rem;
            }

            .footer-orange .bottom-link {
                font-size: 0.875rem;
                color: rgba(255, 255, 255, 0.7);
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .footer-orange .bottom-link:hover {
                color: #ffffff;
            }

            .footer-orange .copyright {
                font-size: 0.875rem;
                color: rgba(255, 255, 255, 0.7);
            }

            /* Contact Info - shown below description */
            .footer-orange .contact-info {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 2rem;
            }

            .footer-orange .contact-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9375rem;
                color: rgba(255, 255, 255, 0.9);
            }

            .footer-orange .contact-item a {
                color: rgba(255, 255, 255, 0.9);
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .footer-orange .contact-item a:hover {
                color: #ffffff;
                text-decoration: underline;
            }

            .footer-orange .contact-item svg {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
            }

            /* Scroll Animation */
            .footer-orange .fade-in-up {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.6s ease-out, transform 0.6s ease-out;
            }

            .footer-orange .fade-in-up.visible {
                opacity: 1;
                transform: translateY(0);
            }
        </style>

        <footer class="footer-orange">
            <div class="cta-section">
                <div class="brand-logo fade-in-up font-dm-sans">${businessName}</div>

                ${showHeadline ? `
                <h2 class="headline fade-in-up font-dm-sans">${formatHeadline(`We make design work easier for you.`)}</h2>
                ` : ''}

                ${showDescription ? `
                <p class="description fade-in-up font-manrope">${description}</p>
                ` : ''}

                ${showContact ? `
                <div class="contact-info fade-in-up">
                    ${email ? `
                    <div class="contact-item font-manrope">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        <a href="mailto:${email}">${email}</a>
                    </div>
                    ` : ''}
                    ${phone ? `
                    <div class="contact-item font-manrope">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                        </svg>
                        <a href="tel:${phone.replace(/\s/g, '')}">${phone}</a>
                    </div>
                    ` : ''}
                    ${address ? `
                    <div class="contact-item font-manrope">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>${address}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <a href="#contact" class="cta-button fade-in-up font-manrope">
                    Contact Us
                </a>

                ${showSocial ? `
                <div class="social-links fade-in-up">
                    ${socialLinksToShow.map(link => `
                    <a href="${link.url}" class="social-link" aria-label="${link.platform}" target="_blank" rel="noopener noreferrer">
                        ${socialIcons[link.platform.toLowerCase()] || socialIcons.instagram}
                    </a>
                    `).join('')}
                </div>
                ` : ''}
            </div>

            <div class="bottom-bar">
                <div class="bottom-content">
                    <div class="bottom-links">
                        <a href="#" class="bottom-link font-manrope">Thank You</a>
                        <a href="#" class="bottom-link font-manrope">Terms of Service</a>
                    </div>
                    <div class="copyright font-manrope">© ${year} ${businessName}. All rights reserved.</div>
                </div>
            </div>
        </footer>

        <script>
            // Intersection Observer for scroll animations
            (function() {
                const footerSection = document.querySelector('.footer-orange-wrapper');
                if (!footerSection) return;

                const fadeElements = footerSection.querySelectorAll('.fade-in-up');

                const observerOptions = {
                    root: null,
                    rootMargin: '0px 0px -50px 0px',
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
 * Style 4 - Dark Marquee Contact Footer
 * Dark background with scrolling "Let's Talk" / "Contact Us" marquee with uploaded business images,
 * quick links, social links, and contact info
 * Features: Infinite marquee animation, "Get In Touch" badge above carousel, clean grid layout
 */
function generateFooterStyle4(props: FooterProps): string {
    const {
        businessName,
        email,
        phone,
        address,
        description = 'We turn vision into reality through bold design, branding, tech, and purposeful innovation.',
        socialLinks = [],
        photos = [],
        visibility
    } = props

    const year = new Date().getFullYear()

    // Visibility defaults
    const showHeadline = visibility?.footer_headline !== false
    const showDescription = visibility?.footer_description !== false
    const showContact = visibility?.footer_contact !== false
    const showSocial = visibility?.footer_social !== false

    // Default social links if none provided
    const defaultSocialLinks = [
        { platform: 'instagram', url: '#' },
        { platform: 'dribbble', url: '#' },
        { platform: 'linkedin', url: '#' }
    ]
    const socialLinksToShow = socialLinks.length > 0 ? socialLinks : defaultSocialLinks

    // Quick links
    const quickLinks = [
        { label: 'Home', href: '#' },
        { label: 'About', href: '#about' },
        { label: 'Services', href: '#services' }
    ]

    // Use uploaded photos for marquee, with fallbacks
    const marqueeImages = photos.length >= 4
        ? photos.slice(0, 4)
        : photos.length > 0
            ? [...photos, ...photos, ...photos, ...photos].slice(0, 4) // Repeat if less than 4
            : [
                'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&h=150&fit=crop',
                'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=200&h=150&fit=crop',
                'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=150&fit=crop',
                'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=200&h=150&fit=crop'
            ]

    return `
    <div class="footer-marquee-wrapper" id="contact">
        <style>
            .footer-marquee-wrapper {
                background-color: var(--footer-bg, #0a0a0a);
                position: relative;
                overflow: hidden;
            }

            /* Badge Section - Above Marquee */
            .footer-marquee .badge-section {
                display: flex;
                justify-content: center;
                padding: 3rem 0 1.5rem 0;
            }

            .footer-marquee .marquee-badge {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background-color: var(--primary, #e85a30);
                border-radius: 100px;
                font-size: 0.75rem;
                font-weight: 500;
                color: #ffffff;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }

            .footer-marquee .marquee-badge .badge-dot {
                width: 6px;
                height: 6px;
                background-color: #ffffff;
                border-radius: 50%;
            }

            /* Marquee Section */
            .footer-marquee .marquee-section {
                position: relative;
                padding: 1.5rem 0 3rem 0;
                overflow: hidden;
            }

            @media (min-width: 768px) {
                .footer-marquee .marquee-section {
                    padding: 1.5rem 0 4rem 0;
                }
            }

            /* Marquee Track */
            .footer-marquee .marquee-track {
                display: flex;
                animation: footer-marquee-scroll 30s linear infinite;
                width: fit-content;
            }

            .footer-marquee .marquee-track:hover {
                animation-play-state: paused;
            }

            @keyframes footer-marquee-scroll {
                0% {
                    transform: translateX(0);
                }
                100% {
                    transform: translateX(-50%);
                }
            }

            .footer-marquee .marquee-content {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0 0.5rem;
            }

            @media (min-width: 768px) {
                .footer-marquee .marquee-content {
                    gap: 1.5rem;
                    padding: 0 0.75rem;
                }
            }

            .footer-marquee .marquee-text {
                font-size: clamp(2.5rem, 8vw, 5rem);
                font-weight: 600;
                color: var(--footer-headline, #ffffff);
                letter-spacing: -0.02em;
                white-space: nowrap;
                line-height: 1;
            }

            .footer-marquee .marquee-image {
                width: 80px;
                height: 60px;
                border-radius: 8px;
                overflow: hidden;
                flex-shrink: 0;
                filter: grayscale(100%);
                opacity: 0.7;
                transition: filter 0.3s ease, opacity 0.3s ease;
            }

            @media (min-width: 768px) {
                .footer-marquee .marquee-image {
                    width: 100px;
                    height: 75px;
                    border-radius: 10px;
                }
            }

            .footer-marquee .marquee-image:hover {
                filter: grayscale(0%);
                opacity: 1;
            }

            .footer-marquee .marquee-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            /* Second Row - Reversed Direction */
            .footer-marquee .marquee-track.reverse {
                animation: footer-marquee-scroll-reverse 30s linear infinite;
            }

            @keyframes footer-marquee-scroll-reverse {
                0% {
                    transform: translateX(-50%);
                }
                100% {
                    transform: translateX(0);
                }
            }

            /* Bottom Section */
            .footer-marquee .bottom-section {
                padding: 4rem 2rem;
                max-width: 1400px;
                margin: 0 auto;
            }

            @media (min-width: 768px) {
                .footer-marquee .bottom-section {
                    padding: 5rem 4rem;
                }
            }

            @media (min-width: 1024px) {
                .footer-marquee .bottom-section {
                    padding: 6rem 5rem;
                }
            }

            /* Grid Layout - 3 columns without newsletter */
            .footer-marquee .footer-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 3rem;
            }

            @media (min-width: 768px) {
                .footer-marquee .footer-grid {
                    grid-template-columns: 1.5fr 1fr 1fr 1fr;
                    gap: 2rem;
                }
            }

            /* About/Description Section */
            .footer-marquee .about-section {
                max-width: 320px;
            }

            .footer-marquee .about-title {
                font-size: 1rem;
                font-weight: 500;
                color: var(--footer-headline, #ffffff);
                margin: 0 0 1rem 0;
            }

            .footer-marquee .about-description {
                font-size: 0.875rem;
                color: var(--footer-text, rgba(255, 255, 255, 0.6));
                line-height: 1.6;
                margin: 0;
            }

            /* Footer Columns */
            .footer-marquee .footer-column h4 {
                font-size: 0.875rem;
                font-weight: 500;
                color: var(--footer-headline, #ffffff);
                margin: 0 0 1.25rem 0;
            }

            .footer-marquee .footer-links {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .footer-marquee .footer-link {
                font-size: 0.875rem;
                color: var(--footer-text, rgba(255, 255, 255, 0.6));
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .footer-marquee .footer-link:hover {
                color: var(--footer-headline, #ffffff);
            }

            /* Contact Info */
            .footer-marquee .contact-value {
                font-size: 0.875rem;
                color: var(--footer-text, rgba(255, 255, 255, 0.6));
                line-height: 1.6;
                margin: 0 0 0.5rem 0;
            }

            .footer-marquee .contact-value a {
                color: var(--footer-text, rgba(255, 255, 255, 0.6));
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .footer-marquee .contact-value a:hover {
                color: var(--footer-headline, #ffffff);
            }

            /* Copyright */
            .footer-marquee .copyright-section {
                margin-top: 4rem;
                padding-top: 2rem;
                border-top: 1px solid var(--footer-border, rgba(255, 255, 255, 0.1));
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            @media (min-width: 768px) {
                .footer-marquee .copyright-section {
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                }
            }

            .footer-marquee .copyright {
                font-size: 0.8125rem;
                color: var(--footer-text, rgba(255, 255, 255, 0.5));
                margin: 0;
            }

            .footer-marquee .legal-links {
                display: flex;
                gap: 1.5rem;
            }

            .footer-marquee .legal-link {
                font-size: 0.8125rem;
                color: var(--footer-text, rgba(255, 255, 255, 0.5));
                text-decoration: none;
                transition: color 0.2s ease;
            }

            .footer-marquee .legal-link:hover {
                color: var(--footer-headline, #ffffff);
            }

            /* Fade In Animation */
            .footer-marquee .fade-in-up {
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.6s ease-out, transform 0.6s ease-out;
            }

            .footer-marquee .fade-in-up.visible {
                opacity: 1;
                transform: translateY(0);
            }
        </style>

        <footer class="footer-marquee">
            <!-- Badge Section - Above Marquee -->
            ${showHeadline ? `
            <div class="badge-section">
                <div class="marquee-badge font-manrope">
                    <span class="badge-dot"></span>
                    Get In Touch
                </div>
            </div>
            ` : ''}

            <!-- Marquee Section -->
            ${showHeadline ? `
            <div class="marquee-section">
                <div class="marquee-track">
                    <div class="marquee-content">
                        <span class="marquee-text font-dm-sans">Let's Talk</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[0]}" alt="Talk" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Contact Us</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[1]}" alt="Contact" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Let's Talk</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[2]}" alt="Talk" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Contact Us</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[3]}" alt="Contact" loading="lazy">
                        </div>
                    </div>
                    <div class="marquee-content">
                        <span class="marquee-text font-dm-sans">Let's Talk</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[0]}" alt="Talk" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Contact Us</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[1]}" alt="Contact" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Let's Talk</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[2]}" alt="Talk" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Contact Us</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[3]}" alt="Contact" loading="lazy">
                        </div>
                    </div>
                </div>
                <div class="marquee-track reverse" style="margin-top: 1rem;">
                    <div class="marquee-content">
                        <span class="marquee-text font-dm-sans">Contact Us</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[1]}" alt="Contact" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Let's Talk</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[0]}" alt="Talk" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Contact Us</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[2]}" alt="Contact" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Let's Talk</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[3]}" alt="Talk" loading="lazy">
                        </div>
                    </div>
                    <div class="marquee-content">
                        <span class="marquee-text font-dm-sans">Contact Us</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[1]}" alt="Contact" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Let's Talk</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[0]}" alt="Talk" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Contact Us</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[2]}" alt="Contact" loading="lazy">
                        </div>
                        <span class="marquee-text font-dm-sans">Let's Talk</span>
                        <div class="marquee-image">
                            <img src="${marqueeImages[3]}" alt="Talk" loading="lazy">
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Bottom Section with Grid -->
            <div class="bottom-section">
                <div class="footer-grid fade-in-up">
                    <!-- About/Description Column (replaces newsletter) -->
                    <div class="about-section">
                        <h4 class="about-title font-manrope">About Us</h4>
                        ${showDescription ? `
                        <p class="about-description font-manrope">${description}</p>
                        ` : ''}
                    </div>

                    <!-- Quick Links -->
                    <div class="footer-column">
                        <h4 class="font-manrope">Quick Links</h4>
                        <ul class="footer-links">
                            ${quickLinks.map(link => `
                            <li><a href="${link.href}" class="footer-link font-manrope">${link.label}</a></li>
                            `).join('')}
                        </ul>
                    </div>

                    <!-- Follow Us -->
                    ${showSocial ? `
                    <div class="footer-column">
                        <h4 class="font-manrope">Follow Us</h4>
                        <ul class="footer-links">
                            ${socialLinksToShow.map(link => `
                            <li><a href="${link.url}" class="footer-link font-manrope" target="_blank" rel="noopener noreferrer">${link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}</a></li>
                            `).join('')}
                        </ul>
                    </div>
                    ` : ''}

                    <!-- Contact Us -->
                    ${showContact ? `
                    <div class="footer-column">
                        <h4 class="font-manrope">Contact Us</h4>
                        ${address ? `<p class="contact-value font-manrope">${address}</p>` : ''}
                        ${phone ? `<p class="contact-value font-manrope"><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></p>` : ''}
                        ${email ? `<p class="contact-value font-manrope"><a href="mailto:${email}">${email}</a></p>` : ''}
                    </div>
                    ` : ''}
                </div>

                <!-- Copyright -->
                <div class="copyright-section fade-in-up">
                    <p class="copyright font-manrope">© ${year} ${businessName}. All rights reserved.</p>
                    <div class="legal-links">
                        <a href="#" class="legal-link font-manrope">Privacy Policy</a>
                        <a href="#" class="legal-link font-manrope">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>

        <script>
            // Intersection Observer for footer animations
            (function() {
                const footerSection = document.querySelector('.footer-marquee-wrapper');
                if (!footerSection) return;

                const fadeElements = footerSection.querySelectorAll('.fade-in-up');

                if (!('IntersectionObserver' in window)) {
                    fadeElements.forEach(el => el.classList.add('visible'));
                    return;
                }

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry, index) => {
                        if (entry.isIntersecting) {
                            setTimeout(() => {
                                entry.target.classList.add('visible');
                            }, index * 100);
                            observer.unobserve(entry.target);
                        }
                    });
                }, {
                    root: null,
                    rootMargin: '0px 0px -50px 0px',
                    threshold: 0.1
                });

                fadeElements.forEach(el => observer.observe(el));
            })();
        </script>
    </div>`
}

/**
 * Get fields used by each footer style
 * Used to conditionally show/hide fields in the content editor
 */
export function getFooterStyleFields(style: string): {
    usesHeadline: boolean
    usesBadge: boolean
    usesDescription: boolean
    usesContact: boolean
    usesSocial: boolean
} {
    const styleFields: Record<string, {
        usesHeadline: boolean
        usesBadge: boolean
        usesDescription: boolean
        usesContact: boolean
        usesSocial: boolean
    }> = {
        '1': {
            usesHeadline: true,
            usesBadge: true,
            usesDescription: true,
            usesContact: true,
            usesSocial: true,
        },
        '2': {
            usesHeadline: true, // Large italic headline
            usesBadge: false, // No badge in style 2
            usesDescription: false, // No description in style 2
            usesContact: true, // Contact link and details
            usesSocial: true, // Social links
        },
        '3': {
            usesHeadline: true, // Large headline with italic accent
            usesBadge: false, // No badge in style 3
            usesDescription: true, // Description text
            usesContact: true, // Contact info (email, phone, address)
            usesSocial: true, // Social links
        },
        '4': {
            usesHeadline: true, // Marquee "Let's Talk" / "Contact Us"
            usesBadge: true, // "Get In Touch" badge
            usesDescription: true, // Newsletter description
            usesContact: true, // Contact info grid
            usesSocial: true, // Social links list
        },
    }

    return styleFields[style] || styleFields['1']
}

/**
 * Main generator function - routes to appropriate style
 */
export function generateFooterHtml(style: string, props: FooterProps): string {
    const generators: Record<string, (props: FooterProps) => string> = {
        '1': generateFooterStyle1,
        '2': generateFooterStyle2,
        '3': generateFooterStyle3,
        '4': generateFooterStyle4,
    }

    const generator = generators[style] || generators['1']
    return generator(props)
}

export type { FooterProps }
