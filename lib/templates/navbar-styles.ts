/**
 * Navbar Style Generators
 * Navigation bar components for website templates
 */

interface NavbarProps {
    businessName: string
    links?: Array<{ label: string; href: string }>
    ctaText?: string
    ctaLink?: string
    headline?: string // For style 4 - navbar tagline
    visibility?: {
        navbar?: boolean
        navbar_headline?: boolean
    }
}

/**
 * Style 1 - Minimal Dark Navbar (Refit-inspired)
 * Dark transparent navbar with logo on left, navigation links on right
 * Features: brand name, horizontal navigation links
 */
function generateNavbarStyle1(props: NavbarProps): string {
    const { businessName, links, visibility } = props

    // Default navigation links if none provided
    const defaultLinks = [
        { label: 'About', href: '#about' },
        { label: 'Services', href: '#services' },
        { label: 'Featured', href: '#featured' },
        { label: 'Contacts', href: '#contact' }
    ]

    const navLinks = links && links.length > 0 ? links : defaultLinks
    const showNavbar = visibility?.navbar !== false

    if (!showNavbar) {
        return ''
    }

    return `
    <nav class="navbar-refit">
        <style>
            .navbar-refit {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                z-index: 100;
                padding: 1.5rem 2rem;
                margin-bottom: 1rem;
            }

            @media (min-width: 768px) {
                .navbar-refit {
                    padding: 1.75rem 4rem;
                    margin-bottom: 1.5rem;
                }
            }

            @media (min-width: 1024px) {
                .navbar-refit {
                    padding: 2rem 5rem;
                    margin-bottom: 2rem;
                }
            }

            .navbar-refit .navbar-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                max-width: 1400px;
                margin: 0 auto;
            }

            .navbar-refit .brand {
                font-size: 1.5rem;
                font-weight: 500;
                color: var(--hero-text, #ffffff);
                text-decoration: none;
                letter-spacing: -0.01em;
            }

            @media (min-width: 1024px) {
                .navbar-refit .brand {
                    font-size: 1.75rem;
                }
            }

            .navbar-refit .nav-links {
                display: none;
                align-items: center;
                gap: 2rem;
            }

            @media (min-width: 768px) {
                .navbar-refit .nav-links {
                    display: flex;
                }
            }

            .navbar-refit .nav-links a {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.7);
                text-decoration: none;
                transition: color 0.2s ease;
                letter-spacing: 0.01em;
            }

            @media (min-width: 1024px) {
                .navbar-refit .nav-links a {
                    font-size: 1.125rem;
                }
            }

            .navbar-refit .nav-links a:hover {
                color: var(--hero-text, #ffffff);
            }

            /* Mobile menu button */
            .navbar-refit .mobile-menu-btn {
                display: flex;
                flex-direction: column;
                gap: 5px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
            }

            @media (min-width: 768px) {
                .navbar-refit .mobile-menu-btn {
                    display: none;
                }
            }

            .navbar-refit .mobile-menu-btn span {
                display: block;
                width: 24px;
                height: 2px;
                background: var(--hero-text, #ffffff);
                border-radius: 1px;
                transition: all 0.3s ease;
            }

            /* Mobile menu */
            .navbar-refit .mobile-menu {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: rgba(10, 10, 10, 0.98);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                padding: 1.5rem 2rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .navbar-refit .mobile-menu.active {
                display: block;
            }

            .navbar-refit .mobile-menu a {
                display: block;
                padding: 0.75rem 0;
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.7);
                text-decoration: none;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                transition: color 0.2s ease;
            }

            .navbar-refit .mobile-menu a:last-child {
                border-bottom: none;
            }

            .navbar-refit .mobile-menu a:hover {
                color: var(--hero-text, #ffffff);
            }
        </style>

        <div class="navbar-container">
            <a href="#" class="brand font-dm-sans">${businessName}</a>

            <div class="nav-links font-manrope">
                ${navLinks.map(link => `<a href="${link.href}">${link.label}</a>`).join('\n                ')}
            </div>

            <button class="mobile-menu-btn" onclick="this.parentElement.parentElement.querySelector('.mobile-menu').classList.toggle('active')">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>

        <div class="mobile-menu font-manrope">
            ${navLinks.map(link => `<a href="${link.href}">${link.label}</a>`).join('\n            ')}
        </div>
    </nav>`
}

/**
 * Style 2 - Transparent Overlay Navbar (Prototype-inspired)
 * Minimal transparent navbar with brand on left, uppercase nav links on right
 * Features: uppercase links, clean spacing, works well with fullscreen hero
 */
function generateNavbarStyle2(props: NavbarProps): string {
    const { businessName, links, visibility } = props

    // Default navigation links if none provided
    const defaultLinks = [
        { label: 'Works', href: '#featured' },
        { label: 'About', href: '#about' },
        { label: 'Contact', href: '#contact' }
    ]

    const navLinks = links && links.length > 0 ? links : defaultLinks
    const showNavbar = visibility?.navbar !== false

    if (!showNavbar) {
        return ''
    }

    return `
    <nav class="navbar-overlay">
        <style>
            .navbar-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                z-index: 100;
                padding: 1.25rem 1.5rem;
                /* Fade in animation */
                opacity: 0;
                animation: navbar-fade-in 0.6s ease-out 0.3s forwards;
            }

            @keyframes navbar-fade-in {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @media (min-width: 768px) {
                .navbar-overlay {
                    padding: 1.5rem 3rem;
                }
            }

            @media (min-width: 1024px) {
                .navbar-overlay {
                    padding: 1.75rem 4rem;
                }
            }

            .navbar-overlay .navbar-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                max-width: 1600px;
                margin: 0 auto;
            }

            .navbar-overlay .brand {
                font-size: 0.875rem;
                font-weight: 700;
                color: #ffffff;
                text-decoration: none;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }

            @media (min-width: 768px) {
                .navbar-overlay .brand {
                    font-size: 1rem;
                }
            }

            .navbar-overlay .nav-links {
                display: none;
                align-items: center;
                gap: 1.5rem;
            }

            @media (min-width: 768px) {
                .navbar-overlay .nav-links {
                    display: flex;
                    gap: 2rem;
                }
            }

            @media (min-width: 1024px) {
                .navbar-overlay .nav-links {
                    gap: 2.5rem;
                }
            }

            .navbar-overlay .nav-links a {
                font-size: 0.75rem;
                font-weight: 500;
                color: #ffffff;
                text-decoration: none;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                transition: opacity 0.2s ease;
            }

            @media (min-width: 768px) {
                .navbar-overlay .nav-links a {
                    font-size: 0.8125rem;
                }
            }

            .navbar-overlay .nav-links a:hover {
                opacity: 0.7;
            }

            /* Mobile menu button */
            .navbar-overlay .mobile-menu-btn {
                display: flex;
                flex-direction: column;
                gap: 4px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
            }

            @media (min-width: 768px) {
                .navbar-overlay .mobile-menu-btn {
                    display: none;
                }
            }

            .navbar-overlay .mobile-menu-btn span {
                display: block;
                width: 20px;
                height: 1.5px;
                background: #ffffff;
                border-radius: 1px;
                transition: all 0.3s ease;
            }

            /* Mobile menu */
            .navbar-overlay .mobile-menu {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                padding: 1.5rem;
            }

            .navbar-overlay .mobile-menu.active {
                display: block;
            }

            .navbar-overlay .mobile-menu a {
                display: block;
                padding: 0.875rem 0;
                font-size: 0.75rem;
                font-weight: 500;
                color: #ffffff;
                text-decoration: none;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                transition: opacity 0.2s ease;
            }

            .navbar-overlay .mobile-menu a:last-child {
                border-bottom: none;
            }

            .navbar-overlay .mobile-menu a:hover {
                opacity: 0.7;
            }
        </style>

        <div class="navbar-container">
            <a href="#" class="brand font-dm-sans">${businessName}</a>

            <div class="nav-links font-manrope">
                ${navLinks.map(link => `<a href="${link.href}">${link.label}</a>`).join('\n                ')}
            </div>

            <button class="mobile-menu-btn" onclick="this.parentElement.parentElement.querySelector('.mobile-menu').classList.toggle('active')">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>

        <div class="mobile-menu font-manrope">
            ${navLinks.map(link => `<a href="${link.href}">${link.label}</a>`).join('\n            ')}
        </div>
    </nav>`
}

/**
 * Style 3 - Centered Links Navbar (Linea-inspired)
 * Clean white navbar with brand on left, centered navigation links, CTA button on right
 * Features: Light background, centered links, rounded CTA button, modern minimal design
 */
function generateNavbarStyle3(props: NavbarProps): string {
    const { businessName, links, ctaText, ctaLink, visibility } = props

    // Default navigation links if none provided
    const defaultLinks = [
        { label: 'Home', href: '#' },
        { label: 'Services', href: '#services' },
        { label: 'Products', href: '#featured' },
        { label: 'About', href: '#about' },
        { label: 'Contact', href: '#contact' }
    ]

    const navLinks = links && links.length > 0 ? links : defaultLinks
    const buttonText = ctaText || 'Get in Touch'
    const buttonLink = ctaLink || '#contact'
    const showNavbar = visibility?.navbar !== false

    if (!showNavbar) {
        return ''
    }

    return `
    <nav class="navbar-centered">
        <style>
            .navbar-centered {
                position: relative;
                z-index: 100;
                background-color: #ffffff;
                padding: 1rem 1.5rem;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                /* Fade in animation */
                opacity: 0;
                animation: navbar-centered-fade-in 0.6s ease-out 0.2s forwards;
            }

            @keyframes navbar-centered-fade-in {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @media (min-width: 768px) {
                .navbar-centered {
                    padding: 1rem 2rem;
                }
            }

            @media (min-width: 1024px) {
                .navbar-centered {
                    padding: 1.25rem 3rem;
                }
            }

            .navbar-centered .navbar-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                max-width: 1400px;
                margin: 0 auto;
            }

            .navbar-centered .brand {
                font-size: 1.25rem;
                font-weight: 600;
                color: #1a1a1a;
                text-decoration: none;
                letter-spacing: -0.01em;
            }

            @media (min-width: 768px) {
                .navbar-centered .brand {
                    font-size: 1.375rem;
                }
            }

            .navbar-centered .nav-links {
                display: none;
                align-items: center;
                gap: 1.5rem;
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                background-color: #ffffff;
                padding: 0.625rem 1.25rem;
                border-radius: 50px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
                border: 1px solid rgba(0, 0, 0, 0.06);
            }

            @media (min-width: 768px) {
                .navbar-centered .nav-links {
                    display: flex;
                    gap: 2rem;
                    padding: 0.75rem 1.5rem;
                }
            }

            @media (min-width: 1024px) {
                .navbar-centered .nav-links {
                    gap: 2.5rem;
                    padding: 0.75rem 2rem;
                }
            }

            .navbar-centered .nav-links a {
                font-size: 0.875rem;
                font-weight: 500;
                color: #4a4a4a;
                text-decoration: none;
                transition: color 0.2s ease;
                white-space: nowrap;
            }

            .navbar-centered .nav-links a:hover {
                color: #1a1a1a;
            }

            .navbar-centered .cta-button {
                display: none;
                padding: 0.625rem 1.25rem;
                font-size: 0.875rem;
                font-weight: 500;
                color: #ffffff;
                background-color: #e85a30;
                border: none;
                border-radius: 6px;
                text-decoration: none;
                cursor: pointer;
                transition: background-color 0.2s ease, transform 0.2s ease;
            }

            @media (min-width: 768px) {
                .navbar-centered .cta-button {
                    display: inline-flex;
                }
            }

            .navbar-centered .cta-button:hover {
                background-color: #d14a22;
                transform: translateY(-1px);
            }

            /* Mobile menu button */
            .navbar-centered .mobile-menu-btn {
                display: flex;
                flex-direction: column;
                gap: 5px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
            }

            @media (min-width: 768px) {
                .navbar-centered .mobile-menu-btn {
                    display: none;
                }
            }

            .navbar-centered .mobile-menu-btn span {
                display: block;
                width: 22px;
                height: 2px;
                background: #1a1a1a;
                border-radius: 1px;
                transition: all 0.3s ease;
            }

            /* Mobile menu */
            .navbar-centered .mobile-menu {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #ffffff;
                border-top: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                padding: 1rem 1.5rem;
                z-index: 99;
            }

            .navbar-centered .mobile-menu.active {
                display: block;
            }

            .navbar-centered .mobile-menu a {
                display: block;
                padding: 0.75rem 0;
                font-size: 0.9375rem;
                font-weight: 500;
                color: #4a4a4a;
                text-decoration: none;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                transition: color 0.2s ease;
            }

            .navbar-centered .mobile-menu a:last-child {
                border-bottom: none;
            }

            .navbar-centered .mobile-menu a:hover {
                color: #1a1a1a;
            }

            .navbar-centered .mobile-menu .mobile-cta {
                display: block;
                margin-top: 1rem;
                padding: 0.75rem 1.25rem;
                font-size: 0.9375rem;
                font-weight: 500;
                color: #ffffff;
                background-color: #e85a30;
                border: none;
                border-radius: 6px;
                text-decoration: none;
                text-align: center;
            }
        </style>

        <div class="navbar-container">
            <a href="#" class="brand font-dm-sans">${businessName}</a>

            <div class="nav-links font-manrope">
                ${navLinks.map(link => `<a href="${link.href}">${link.label}</a>`).join('\n                ')}
            </div>

            <a href="${buttonLink}" class="cta-button font-manrope">${buttonText}</a>

            <button class="mobile-menu-btn" onclick="this.parentElement.parentElement.querySelector('.mobile-menu').classList.toggle('active')">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>

        <div class="mobile-menu font-manrope">
            ${navLinks.map(link => `<a href="${link.href}">${link.label}</a>`).join('\n            ')}
            <a href="${buttonLink}" class="mobile-cta">${buttonText}</a>
        </div>
    </nav>`
}

/**
 * Style 4 - Headline Navbar with Bullet Links
 * Clean white navbar with brand on left, headline/tagline, bullet-style navigation links, CTA button on right
 * Features: Light background, navbar headline, bullet points before links, rounded CTA button
 */
function generateNavbarStyle4(props: NavbarProps): string {
    const { businessName, links, ctaText, ctaLink, headline, visibility } = props

    // Default navigation links if none provided
    const defaultLinks = [
        { label: 'Home', href: '#' },
        { label: 'About Us', href: '#about' },
        { label: 'Services', href: '#services' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Projects', href: '#featured' },
        { label: 'Blog', href: '#blog' }
    ]

    const navLinks = links && links.length > 0 ? links : defaultLinks
    const buttonText = ctaText || 'Contact Me'
    const buttonLink = ctaLink || '#contact'
    const navHeadline = headline || 'Timeless Designs Built To Be Desired'
    const showNavbar = visibility?.navbar !== false
    const showHeadline = visibility?.navbar_headline !== false

    if (!showNavbar) {
        return ''
    }

    return `
    <nav class="navbar-headline">
        <style>
            .navbar-headline {
                position: relative;
                z-index: 100;
                background-color: #ffffff;
                padding: 1rem 1.5rem;
                border-bottom: 1px solid rgba(0, 0, 0, 0.08);
                /* Fade in animation */
                opacity: 0;
                animation: navbar-headline-fade-in 0.6s ease-out 0.2s forwards;
            }

            @keyframes navbar-headline-fade-in {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @media (min-width: 768px) {
                .navbar-headline {
                    padding: 1rem 2rem;
                }
            }

            @media (min-width: 1024px) {
                .navbar-headline {
                    padding: 1.25rem 3rem;
                }
            }

            .navbar-headline .navbar-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                max-width: 1400px;
                margin: 0 auto;
                gap: 1.5rem;
            }

            /* Brand */
            .navbar-headline .brand {
                font-size: 1.125rem;
                font-weight: 600;
                color: #1a1a1a;
                text-decoration: none;
                letter-spacing: -0.01em;
                white-space: nowrap;
                flex-shrink: 0;
            }

            @media (min-width: 768px) {
                .navbar-headline .brand {
                    font-size: 1.25rem;
                }
            }

            /* Headline/Tagline */
            .navbar-headline .nav-headline {
                display: none;
                font-size: 0.8125rem;
                font-weight: 400;
                color: #666666;
                line-height: 1.4;
                max-width: 180px;
                flex-shrink: 0;
            }

            @media (min-width: 1024px) {
                .navbar-headline .nav-headline {
                    display: block;
                }
            }

            @media (min-width: 1200px) {
                .navbar-headline .nav-headline {
                    max-width: 220px;
                    font-size: 0.875rem;
                }
            }

            /* Navigation Links with Bullets */
            .navbar-headline .nav-links {
                display: none;
                align-items: center;
                gap: 0.25rem;
                flex-wrap: wrap;
                justify-content: center;
            }

            @media (min-width: 768px) {
                .navbar-headline .nav-links {
                    display: flex;
                    gap: 0.5rem;
                }
            }

            @media (min-width: 1024px) {
                .navbar-headline .nav-links {
                    gap: 0.75rem;
                }
            }

            .navbar-headline .nav-link-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .navbar-headline .nav-link-item::before {
                content: '';
                width: 5px;
                height: 5px;
                background-color: #e85a30;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .navbar-headline .nav-links a {
                font-size: 0.8125rem;
                font-weight: 500;
                color: #4a4a4a;
                text-decoration: none;
                transition: color 0.2s ease;
                white-space: nowrap;
            }

            @media (min-width: 1024px) {
                .navbar-headline .nav-links a {
                    font-size: 0.875rem;
                }
            }

            .navbar-headline .nav-links a:hover {
                color: #1a1a1a;
            }

            /* CTA Button */
            .navbar-headline .cta-button {
                display: none;
                align-items: center;
                gap: 0.5rem;
                padding: 0.625rem 1rem;
                font-size: 0.8125rem;
                font-weight: 500;
                color: #ffffff;
                background-color: #e85a30;
                border: none;
                border-radius: 50px;
                text-decoration: none;
                cursor: pointer;
                transition: background-color 0.2s ease, transform 0.2s ease;
                white-space: nowrap;
                flex-shrink: 0;
            }

            @media (min-width: 768px) {
                .navbar-headline .cta-button {
                    display: inline-flex;
                    padding: 0.75rem 1.25rem;
                    font-size: 0.875rem;
                }
            }

            .navbar-headline .cta-button:hover {
                background-color: #d14a22;
                transform: translateY(-1px);
            }

            .navbar-headline .cta-button .arrow-icon {
                width: 20px;
                height: 20px;
                background-color: #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .navbar-headline .cta-button .arrow-icon svg {
                width: 10px;
                height: 10px;
                stroke: #e85a30;
                stroke-width: 2.5;
            }

            /* Mobile menu button */
            .navbar-headline .mobile-menu-btn {
                display: flex;
                flex-direction: column;
                gap: 5px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
            }

            @media (min-width: 768px) {
                .navbar-headline .mobile-menu-btn {
                    display: none;
                }
            }

            .navbar-headline .mobile-menu-btn span {
                display: block;
                width: 22px;
                height: 2px;
                background: #1a1a1a;
                border-radius: 1px;
                transition: all 0.3s ease;
            }

            /* Mobile menu */
            .navbar-headline .mobile-menu {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #ffffff;
                border-top: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                padding: 1rem 1.5rem;
                z-index: 99;
            }

            .navbar-headline .mobile-menu.active {
                display: block;
            }

            .navbar-headline .mobile-menu .mobile-headline {
                font-size: 0.8125rem;
                color: #666666;
                margin-bottom: 1rem;
                padding-bottom: 0.75rem;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            }

            .navbar-headline .mobile-menu a {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 0;
                font-size: 0.9375rem;
                font-weight: 500;
                color: #4a4a4a;
                text-decoration: none;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                transition: color 0.2s ease;
            }

            .navbar-headline .mobile-menu a::before {
                content: '';
                width: 5px;
                height: 5px;
                background-color: #e85a30;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .navbar-headline .mobile-menu a:last-of-type {
                border-bottom: none;
            }

            .navbar-headline .mobile-menu a:hover {
                color: #1a1a1a;
            }

            .navbar-headline .mobile-menu .mobile-cta {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                margin-top: 1rem;
                padding: 0.75rem 1.25rem;
                font-size: 0.9375rem;
                font-weight: 500;
                color: #ffffff;
                background-color: #e85a30;
                border: none;
                border-radius: 50px;
                text-decoration: none;
                text-align: center;
            }

            .navbar-headline .mobile-menu .mobile-cta::before {
                display: none;
            }
        </style>

        <div class="navbar-container">
            <a href="#" class="brand font-dm-sans">${businessName}</a>

            ${showHeadline ? `
            <p class="nav-headline font-manrope">${navHeadline}</p>
            ` : ''}

            <div class="nav-links font-manrope">
                ${navLinks.map(link => `
                <span class="nav-link-item">
                    <a href="${link.href}">${link.label}</a>
                </span>
                `).join('')}
            </div>

            <a href="${buttonLink}" class="cta-button font-manrope">
                ${buttonText}
                <span class="arrow-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 17L17 7M17 7H7M17 7V17" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </span>
            </a>

            <button class="mobile-menu-btn" onclick="this.parentElement.parentElement.querySelector('.mobile-menu').classList.toggle('active')">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>

        <div class="mobile-menu font-manrope">
            ${showHeadline ? `<p class="mobile-headline">${navHeadline}</p>` : ''}
            ${navLinks.map(link => `<a href="${link.href}">${link.label}</a>`).join('\n            ')}
            <a href="${buttonLink}" class="mobile-cta">${buttonText}</a>
        </div>
    </nav>`
}

/**
 * Get fields used by each navbar style
 * Used to conditionally show/hide fields in the content editor
 */
export function getNavbarStyleFields(style: string): {
    usesHeadline: boolean
    usesCta: boolean
} {
    const styleFields: Record<string, {
        usesHeadline: boolean
        usesCta: boolean
    }> = {
        '1': {
            usesHeadline: false,
            usesCta: false,
        },
        '2': {
            usesHeadline: false,
            usesCta: false,
        },
        '3': {
            usesHeadline: false,
            usesCta: true,
        },
        '4': {
            usesHeadline: true,
            usesCta: true,
        },
    }

    return styleFields[style] || styleFields['1']
}

/**
 * Main generator function - routes to appropriate style
 */
export function generateNavbarHtml(style: string, props: NavbarProps): string {
    const generators: Record<string, (props: NavbarProps) => string> = {
        '1': generateNavbarStyle1,
        '2': generateNavbarStyle2,
        '3': generateNavbarStyle3,
        '4': generateNavbarStyle4,
    }

    const generator = generators[style] || generators['1']
    return generator(props)
}

export type { NavbarProps }
