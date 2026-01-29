
export interface ColorScheme {
    primary: string
    secondary: string
    accent: string
    background: string
    light: string
}

export const colorSchemes: Record<string, ColorScheme> = {
    // The default "Green Fresh" scheme used in templates
    default: {
        primary: '#6B8F71',
        secondary: '#1F2933',
        accent: '#4ECDC4',
        background: '#F6F7F5',
        light: '#FFFFFF'
    },
    blue: {
        primary: '#3B82F6',
        secondary: '#1E3A8A',
        accent: '#60A5FA',
        background: '#EFF6FF',
        light: '#FFFFFF'
    },
    purple: {
        primary: '#8B5CF6',
        secondary: '#4C1D95',
        accent: '#A78BFA',
        background: '#F5F3FF',
        light: '#FFFFFF'
    },
    orange: {
        primary: '#F97316',
        secondary: '#7C2D12',
        accent: '#FB923C',
        background: '#FFF7ED',
        light: '#FFFFFF'
    },
    dark: {
        primary: '#D1D5DB',
        secondary: '#ffffff',  // White text for dark backgrounds
        accent: '#9CA3AF',
        background: '#111827',
        light: '#1a1a2e'  // Dark card background
    }
}

export function generateColorSchemeCss(schemeId: string): string {
    const scheme = colorSchemes[schemeId] || colorSchemes['default']

    // For dark scheme, use dark background with light text
    // For other schemes, use dark hero with accent colors
    const isDark = schemeId === 'dark'

    return `
    <style id="theme-colors">
        :root {
            --primary: ${scheme.primary};
            --secondary: ${scheme.secondary};
            --accent: ${scheme.accent};
            --background: ${scheme.background};
            --light: ${scheme.light};

            /* Hero section variables */
            --hero-bg: ${isDark ? scheme.background : scheme.secondary};
            --hero-text: ${isDark ? scheme.primary : '#ffffff'};
            --hero-accent: ${scheme.primary};

            /* About section variables */
            --about-bg: ${isDark ? scheme.background : scheme.background};
            --about-headline: ${isDark ? '#ffffff' : scheme.secondary};
            --about-text: ${isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(31, 41, 51, 0.75)'};
            --about-badge-bg: ${isDark ? 'rgba(255, 255, 255, 0.1)' : scheme.secondary};
            --about-badge-text: #ffffff;

            /* Services section variables */
            --services-bg: ${isDark ? scheme.background : '#ffffff'};
            --services-headline: ${isDark ? '#ffffff' : scheme.secondary};
            --services-text: ${isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(31, 41, 51, 0.65)'};
            --services-badge-bg: ${isDark ? 'rgba(255, 255, 255, 0.1)' : scheme.secondary};
            --services-badge-text: #ffffff;
            --services-icon: ${isDark ? '#ffffff' : scheme.secondary};
            --services-border: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(31, 41, 51, 0.1)'};
            --services-accent: ${scheme.primary};

            /* Featured section variables */
            --featured-bg: ${isDark ? scheme.background : '#F6F7F5'};
            --featured-headline: ${isDark ? '#ffffff' : scheme.secondary};
            --featured-text: ${isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(31, 41, 51, 0.65)'};
            --featured-card-bg: ${isDark ? '#1a1a2e' : '#ffffff'};
            --featured-card-alt-bg: ${isDark ? '#0f0f1a' : scheme.secondary};
            --featured-tag-bg: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(31, 41, 51, 0.05)'};
            --featured-border: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(31, 41, 51, 0.1)'};
            --featured-accent: ${scheme.primary};

            /* Footer section variables */
            --footer-bg: ${isDark ? '#0a0a0f' : scheme.secondary};
            --footer-text: #ffffff;
            --footer-text-muted: rgba(255, 255, 255, 0.65);
            --footer-text-dim: rgba(255, 255, 255, 0.5);
            --footer-border: rgba(255, 255, 255, 0.1);
            --footer-badge-bg: rgba(255, 255, 255, 0.1);
            --footer-social-bg: rgba(255, 255, 255, 0.1);
            --footer-social-hover: rgba(255, 255, 255, 0.2);
        }

        /* Hero section color overrides */
        .hero-refit-wrapper {
            background-color: var(--hero-bg) !important;
        }
        .hero-refit h1 {
            color: var(--hero-text) !important;
        }
        .hero-refit .description {
            color: rgba(255, 255, 255, 0.65) !important;
        }
        .hero-refit .availability-badge .dot {
            background: var(--hero-accent) !important;
        }
        .hero-refit .cta-button {
            background: var(--hero-text) !important;
            color: var(--hero-bg) !important;
        }
        .hero-refit .cta-button .arrow-icon {
            background: var(--hero-bg) !important;
        }
        .hero-refit .cta-button .arrow-icon svg {
            stroke: var(--hero-text) !important;
        }
        .hero-refit .testimonial-stars svg {
            fill: var(--hero-accent) !important;
        }

        /* About section color overrides */
        .about-refit-wrapper {
            background-color: var(--about-bg) !important;
        }
        .about-refit .headline {
            color: var(--about-headline) !important;
        }
        .about-refit .description {
            color: var(--about-text) !important;
        }
        .about-refit .about-badge {
            background-color: var(--about-badge-bg) !important;
            color: var(--about-badge-text) !important;
        }

        /* Services section color overrides */
        .services-refit-wrapper {
            background-color: var(--services-bg) !important;
        }
        .services-refit .headline {
            color: var(--services-headline) !important;
        }
        .services-refit .subheadline {
            color: var(--services-text) !important;
        }
        .services-refit .services-badge {
            background-color: var(--services-badge-bg) !important;
            color: var(--services-badge-text) !important;
        }
        .services-refit .service-name {
            color: var(--services-headline) !important;
        }
        .services-refit .service-description {
            color: var(--services-text) !important;
        }
        .services-refit .service-icon {
            color: var(--services-icon) !important;
        }
        .services-refit .service-toggle {
            color: var(--services-icon) !important;
        }
        .services-refit .service-item {
            border-color: var(--services-border) !important;
        }
        .services-refit .service-header:hover .service-name {
            color: var(--services-accent) !important;
        }

        /* Featured section color overrides */
        .featured-refit-wrapper {
            background-color: var(--featured-bg) !important;
        }
        .featured-refit .headline {
            color: var(--featured-headline) !important;
        }
        .featured-refit .subheadline {
            color: var(--featured-text) !important;
        }
        .featured-refit .product-card:nth-child(odd) {
            background-color: var(--featured-card-bg) !important;
        }
        .featured-refit .product-card:nth-child(even) {
            background-color: var(--featured-card-alt-bg) !important;
        }
        .featured-refit .product-title {
            color: var(--featured-headline) !important;
        }
        .featured-refit .product-description {
            color: var(--featured-text) !important;
        }
        .featured-refit .product-tag {
            background-color: var(--featured-tag-bg) !important;
            color: var(--featured-headline) !important;
        }
        .featured-refit .testimonial {
            border-top-color: var(--featured-border) !important;
        }
        .featured-refit .testimonial-quote {
            color: var(--featured-text) !important;
        }
        .featured-refit .testimonial-quote::before {
            color: var(--featured-accent) !important;
        }
        .featured-refit .testimonial-author {
            color: var(--featured-headline) !important;
        }
        /* Dark card (even) text colors - force white */
        .featured-refit .product-card:nth-child(even) .product-title {
            color: #ffffff !important;
        }
        .featured-refit .product-card:nth-child(even) .product-description {
            color: rgba(255, 255, 255, 0.75) !important;
        }
        .featured-refit .product-card:nth-child(even) .product-tag {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
        }
        .featured-refit .product-card:nth-child(even) .testimonial {
            border-top-color: rgba(255, 255, 255, 0.1) !important;
        }
        .featured-refit .product-card:nth-child(even) .testimonial-quote {
            color: rgba(255, 255, 255, 0.75) !important;
        }
        .featured-refit .product-card:nth-child(even) .testimonial-author {
            color: #ffffff !important;
        }
        .featured-refit .product-card:nth-child(even) .testimonial-avatar-placeholder {
            color: #ffffff !important;
        }

        /* Footer section color overrides */
        .footer-refit-wrapper {
            background-color: var(--footer-bg) !important;
        }
        .footer-refit .footer-headline {
            color: var(--footer-text) !important;
        }
        .footer-refit .footer-description {
            color: var(--footer-text-muted) !important;
        }
        .footer-refit .footer-badge {
            background-color: var(--footer-badge-bg) !important;
            color: var(--footer-text) !important;
        }
        .footer-refit .contact-label {
            color: var(--footer-text) !important;
        }
        .footer-refit .contact-value {
            color: var(--footer-text-muted) !important;
        }
        .footer-refit .contact-value:hover {
            color: var(--footer-text) !important;
        }
        .footer-refit .social-section {
            border-top-color: var(--footer-border) !important;
        }
        .footer-refit .social-label {
            color: var(--footer-text) !important;
        }
        .footer-refit .social-link {
            background-color: var(--footer-social-bg) !important;
            color: var(--footer-text) !important;
        }
        .footer-refit .social-link:hover {
            background-color: var(--footer-social-hover) !important;
        }
        .footer-refit .copyright {
            border-top-color: var(--footer-border) !important;
        }
        .footer-refit .copyright-text {
            color: var(--footer-text-dim) !important;
        }
        .footer-refit .copyright-link {
            color: var(--footer-text-dim) !important;
        }
        .footer-refit .copyright-link:hover {
            color: var(--footer-text) !important;
        }

        /* Override generic utility classes used in templates */
        .text-\\[\\#6B8F71\\] { color: var(--primary) !important; }
        .bg-\\[\\#6B8F71\\] { background-color: var(--primary) !important; }
        .border-\\[\\#6B8F71\\] { border-color: var(--primary) !important; }

        .text-\\[\\#1F2933\\] { color: var(--secondary) !important; }
        .bg-\\[\\#1F2933\\] { background-color: var(--secondary) !important; }

        .text-\\[\\#4ECDC4\\] { color: var(--accent) !important; }
        .bg-\\[\\#F6F7F5\\] { background-color: var(--background) !important; }

        /* ========================================
           STYLE 2 & 3 VARIANT OVERRIDES
           ======================================== */

        /* --- Navbar Style 3 (Centered Links) --- */
        .navbar-centered {
            background-color: ${isDark ? scheme.background : '#ffffff'} !important;
        }
        .navbar-centered .brand {
            color: var(--secondary) !important;
        }
        .navbar-centered .nav-links a {
            color: ${isDark ? '#9CA3AF' : '#4a4a4a'} !important;
        }
        .navbar-centered .nav-links a:hover {
            color: ${isDark ? '#D1D5DB' : '#1a1a1a'} !important;
        }
        .navbar-centered .cta-button {
            background-color: var(--primary) !important;
            color: ${isDark ? '#111827' : '#ffffff'} !important;
        }
        .navbar-centered .cta-button:hover {
            opacity: 0.9 !important;
        }
        .navbar-centered .mobile-cta {
            background-color: var(--primary) !important;
            color: ${isDark ? '#111827' : '#ffffff'} !important;
        }
        .navbar-centered .mobile-menu {
            background-color: ${isDark ? scheme.background : '#ffffff'} !important;
        }
        .navbar-centered .mobile-menu a {
            color: ${isDark ? '#9CA3AF' : '#4a4a4a'} !important;
        }

        /* --- Navbar Style 4 (Headline with Bullets) --- */
        .navbar-headline {
            background-color: ${isDark ? scheme.background : '#ffffff'} !important;
            border-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'} !important;
        }
        .navbar-headline .brand {
            color: var(--secondary) !important;
        }
        .navbar-headline .nav-headline {
            color: ${isDark ? '#9CA3AF' : '#666666'} !important;
        }
        .navbar-headline .nav-link-item::before {
            background-color: var(--primary) !important;
        }
        .navbar-headline .nav-links a {
            color: ${isDark ? '#9CA3AF' : '#4a4a4a'} !important;
        }
        .navbar-headline .nav-links a:hover {
            color: ${isDark ? '#D1D5DB' : '#1a1a1a'} !important;
        }
        .navbar-headline .cta-button {
            background-color: var(--primary) !important;
            color: ${isDark ? '#111827' : '#ffffff'} !important;
        }
        .navbar-headline .cta-button:hover {
            opacity: 0.9 !important;
        }
        .navbar-headline .cta-button .arrow-icon {
            background-color: ${isDark ? '#111827' : '#ffffff'} !important;
        }
        .navbar-headline .cta-button .arrow-icon svg {
            stroke: var(--primary) !important;
        }
        .navbar-headline .mobile-menu {
            background-color: ${isDark ? scheme.background : '#ffffff'} !important;
        }
        .navbar-headline .mobile-menu .mobile-headline {
            color: ${isDark ? '#9CA3AF' : '#666666'} !important;
        }
        .navbar-headline .mobile-menu a {
            color: ${isDark ? '#9CA3AF' : '#4a4a4a'} !important;
            border-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'} !important;
        }
        .navbar-headline .mobile-menu a::before {
            background-color: var(--primary) !important;
        }
        .navbar-headline .mobile-menu .mobile-cta {
            background-color: var(--primary) !important;
            color: ${isDark ? '#111827' : '#ffffff'} !important;
        }

        /* --- Hero Style 3 (Centered Carousel - Linea) --- */
        .hero-linea-wrapper {
            background-color: var(--background) !important;
        }
        .hero-linea h1 {
            color: var(--secondary) !important;
        }
        .hero-linea .business-badge {
            color: var(--services-text) !important;
        }
        .hero-linea .description {
            color: var(--services-text) !important;
        }
        .hero-linea .cta-button {
            background-color: var(--primary) !important;
            color: ${isDark ? '#111827' : '#ffffff'} !important;
        }
        .hero-linea .cta-button:hover {
            opacity: 0.9 !important;
        }

        /* --- Hero Style 4 (Services List Dark) --- */
        .hero-services-wrapper {
            background-color: var(--hero-bg) !important;
        }
        .hero-services-bg-fallback {
            background: ${isDark ? `linear-gradient(135deg, ${scheme.background} 0%, ${scheme.light} 100%)` : 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)'} !important;
        }
        .hero-services-headline {
            color: var(--hero-text) !important;
        }
        .hero-services-badge {
            background-color: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
        }
        .hero-services-badge .badge-dot {
            background-color: var(--hero-accent) !important;
        }
        .hero-services-badge span {
            color: rgba(255, 255, 255, 0.85) !important;
        }
        .hero-services-label {
            color: rgba(255, 255, 255, 0.5) !important;
        }
        .hero-services-item .item-number {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: var(--hero-accent) !important;
        }
        .hero-services-item .item-text {
            color: rgba(255, 255, 255, 0.75) !important;
        }
        .hero-services-right {
            border-left-color: rgba(255, 255, 255, 0.15) !important;
        }

        /* --- About Style 2 (Minimal Italic) --- */
        .about-minimal-wrapper {
            background-color: ${isDark ? scheme.background : '#ffffff'} !important;
        }
        .about-minimal .description {
            color: var(--secondary) !important;
        }
        .about-minimal .about-link {
            color: var(--secondary) !important;
        }

        /* --- About Style 3 (Linea Tags) --- */
        .about-linea-wrapper {
            background-color: ${isDark ? scheme.background : '#ffffff'} !important;
        }
        .about-linea .headline {
            color: var(--secondary) !important;
        }
        .about-linea .content-card {
            background-color: ${isDark ? '#1a1a2e' : '#ffffff'} !important;
            box-shadow: ${isDark ? '0 4px 40px rgba(0, 0, 0, 0.3)' : '0 4px 40px rgba(0, 0, 0, 0.08)'} !important;
        }
        .about-linea .section-tagline {
            color: var(--secondary) !important;
        }
        .about-linea .description {
            color: var(--services-text) !important;
        }
        .about-linea .tag-icon {
            color: var(--primary) !important;
        }
        .about-linea .tag {
            color: var(--secondary) !important;
            background-color: ${isDark ? 'rgba(255, 255, 255, 0.05)' : '#fafafa'} !important;
            border-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#f0f0f0'} !important;
        }

        /* --- About Style 4 (Quote with Logo Carousel) --- */
        .about-quote-wrapper {
            background-color: var(--background) !important;
        }
        .about-quote .badge-dot {
            background-color: var(--primary) !important;
        }
        .about-quote .badge-text {
            color: var(--services-text) !important;
        }
        .about-quote .description {
            color: var(--secondary) !important;
        }
        .about-quote .reveal-word {
            opacity: 0.15;
        }
        .about-quote .reveal-word.revealed {
            opacity: 1;
        }
        .about-quote .reveal-word.italic-accent {
            color: var(--services-text) !important;
        }
        .about-quote .reveal-word.italic-accent.revealed {
            color: var(--services-text) !important;
        }
        .about-quote-carousel::before {
            background: linear-gradient(to right, var(--background), transparent) !important;
        }
        .about-quote-carousel::after {
            background: linear-gradient(to left, var(--background), transparent) !important;
        }
        .about-quote .carousel-item {
            opacity: ${isDark ? '0.6' : '0.5'};
            filter: ${isDark ? 'grayscale(100%) brightness(1.5)' : 'grayscale(100%)'};
        }
        .about-quote .carousel-item:hover {
            opacity: 1;
            filter: grayscale(0%);
        }

        /* --- Services Style 2 (Minimal Grid) --- */
        .services-minimal-wrapper {
            background-color: ${isDark ? scheme.background : '#ffffff'} !important;
        }
        .services-minimal .headline {
            color: var(--secondary) !important;
        }
        .services-minimal .category-number {
            color: var(--primary) !important;
        }
        .services-minimal .category-name {
            color: var(--secondary) !important;
        }
        .services-minimal .service-description {
            color: var(--services-text) !important;
        }

        /* --- Services Style 3 (Card Grid) --- */
        .services-cards-wrapper {
            background-color: ${isDark ? scheme.background : '#ffffff'} !important;
        }
        .services-cards .badge {
            color: var(--services-text) !important;
        }
        .services-cards .headline {
            color: var(--secondary) !important;
        }
        .services-cards .service-card {
            background-color: ${isDark ? '#1a1a2e' : '#ffffff'} !important;
            border-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#f0f0f0'} !important;
        }
        .services-cards .card-title {
            color: var(--secondary) !important;
        }
        .services-cards .card-description {
            color: var(--services-text) !important;
        }
        .services-cards .card-icon {
            background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : `${scheme.primary}15`} !important;
            color: var(--primary) !important;
        }

        /* --- Services Style 4 (Stats Grid with Quote) --- */
        .services-stats-wrapper {
            background-color: var(--background) !important;
        }
        .services-stats .badge-dot {
            background-color: var(--primary) !important;
        }
        .services-stats .badge-text {
            color: var(--services-text) !important;
        }
        .services-stats .description {
            color: var(--secondary) !important;
        }
        .services-stats .description em {
            color: var(--services-text) !important;
        }
        .services-stats .stat-value {
            color: var(--secondary) !important;
        }
        .services-stats .stat-label {
            color: var(--services-text) !important;
        }
        .services-stats .image-section img {
            filter: ${isDark ? 'grayscale(100%) brightness(0.8)' : 'grayscale(100%)'};
        }
        .services-stats .image-section:hover img {
            filter: grayscale(0%);
        }

        /* --- Featured Style 2 (Portfolio Stack) --- */
        .featured-portfolio-wrapper {
            background-color: ${isDark ? scheme.background : '#ffffff'} !important;
        }
        .featured-portfolio .headline {
            color: var(--secondary) !important;
        }
        .featured-portfolio .subheadline {
            color: var(--featured-text) !important;
        }
        .featured-portfolio .current-number {
            color: var(--secondary) !important;
        }
        .featured-portfolio .total-number {
            color: var(--featured-text) !important;
        }
        .featured-portfolio .category-name {
            color: var(--featured-text) !important;
        }
        .featured-portfolio .item-title {
            color: var(--featured-text) !important;
        }
        .featured-portfolio .item-number {
            color: var(--featured-text) !important;
        }
        .featured-portfolio .product-list-item {
            border-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(26, 26, 26, 0.1)'} !important;
        }
        .featured-portfolio .product-list-item:hover .item-title,
        .featured-portfolio .product-list-item.active .item-title {
            color: var(--secondary) !important;
        }
        @media (max-width: 1023px) {
            .featured-portfolio .product-list-item {
                border-color: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(26, 26, 26, 0.1)'} !important;
            }
            .featured-portfolio .product-list-item:hover,
            .featured-portfolio .product-list-item.active {
                background-color: ${isDark ? '#ffffff' : '#1a1a1a'} !important;
            }
            .featured-portfolio .product-list-item:hover .item-title,
            .featured-portfolio .product-list-item.active .item-title {
                color: ${isDark ? '#1a1a1a' : '#ffffff'} !important;
            }
        }

        /* --- Featured Style 3 (Gallery Grid) --- */
        .featured-gallery-wrapper {
            background-color: var(--background) !important;
        }
        .featured-gallery .badge {
            color: var(--services-text) !important;
        }
        .featured-gallery .headline {
            color: var(--secondary) !important;
        }

        /* --- Featured Style 4 (Staggered Masonry Grid) --- */
        .featured-masonry-wrapper {
            background-color: var(--background) !important;
        }
        .featured-masonry .badge-dot {
            background-color: var(--primary) !important;
        }
        .featured-masonry .badge-text {
            color: var(--featured-text) !important;
        }
        .featured-masonry .headline {
            color: var(--secondary) !important;
        }
        .featured-masonry .cta-button {
            background-color: var(--primary) !important;
            color: ${isDark ? '#111827' : '#ffffff'} !important;
        }
        .featured-masonry .cta-button .arrow-icon {
            background-color: ${isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'} !important;
        }
        .featured-masonry .cta-button .arrow-icon svg {
            stroke: ${isDark ? '#111827' : '#ffffff'} !important;
        }
        .featured-masonry .project-title {
            color: var(--secondary) !important;
        }
        .featured-masonry .project-date {
            color: var(--featured-text) !important;
        }
        .featured-masonry .project-image {
            background-color: ${isDark ? '#1a1a2e' : '#e5e5e5'} !important;
        }

        /* --- Footer Style 3 (Orange CTA) --- */
        .footer-orange-wrapper {
            background: ${isDark
                ? `linear-gradient(135deg, ${scheme.light} 0%, #0f0f1a 50%, ${scheme.light} 100%)`
                : `linear-gradient(135deg, var(--primary) 0%, ${scheme.primary}dd 50%, var(--primary) 100%)`} !important;
        }
        .footer-orange .brand-logo {
            color: #ffffff !important;
        }
        .footer-orange .headline {
            color: #ffffff !important;
        }
        .footer-orange .description {
            color: rgba(255, 255, 255, 0.85) !important;
        }
        .footer-orange .contact-item {
            color: rgba(255, 255, 255, 0.9) !important;
        }
        .footer-orange .contact-item a {
            color: rgba(255, 255, 255, 0.9) !important;
        }
        .footer-orange .cta-button {
            background-color: #ffffff !important;
            color: ${isDark ? scheme.light : scheme.primary} !important;
        }
        .footer-orange .social-link {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
        }
        .footer-orange .social-link:hover {
            background-color: rgba(255, 255, 255, 0.2) !important;
        }
        .footer-orange .bottom-link {
            color: rgba(255, 255, 255, 0.7) !important;
        }
        .footer-orange .bottom-link:hover {
            color: #ffffff !important;
        }
        .footer-orange .copyright {
            color: rgba(255, 255, 255, 0.7) !important;
        }

        /* --- Footer Style 4 (Dark Marquee Contact) --- */
        .footer-marquee-wrapper {
            --footer-bg: ${isDark ? scheme.light : '#0a0a0a'};
            --footer-headline: #ffffff;
            --footer-text: rgba(255, 255, 255, 0.6);
            --footer-border: rgba(255, 255, 255, 0.15);
            background-color: var(--footer-bg) !important;
        }
        .footer-marquee .marquee-badge {
            background-color: var(--primary) !important;
        }
        .footer-marquee .marquee-text {
            color: var(--footer-headline) !important;
        }
        .footer-marquee .newsletter-title {
            color: var(--footer-headline) !important;
        }
        .footer-marquee .newsletter-input {
            border-color: var(--footer-border) !important;
            color: #ffffff !important;
        }
        .footer-marquee .newsletter-input::placeholder {
            color: var(--footer-text) !important;
        }
        .footer-marquee .newsletter-input:focus {
            border-color: var(--primary) !important;
        }
        .footer-marquee .newsletter-button {
            background-color: var(--primary) !important;
        }
        .footer-marquee .newsletter-description {
            color: var(--footer-text) !important;
        }
        .footer-marquee .footer-column h4 {
            color: var(--footer-headline) !important;
        }
        .footer-marquee .footer-link {
            color: var(--footer-text) !important;
        }
        .footer-marquee .footer-link:hover {
            color: var(--footer-headline) !important;
        }
        .footer-marquee .contact-value {
            color: var(--footer-text) !important;
        }
        .footer-marquee .contact-value a {
            color: var(--footer-text) !important;
        }
        .footer-marquee .contact-value a:hover {
            color: var(--footer-headline) !important;
        }
        .footer-marquee .copyright-section {
            border-top-color: var(--footer-border) !important;
        }
        .footer-marquee .copyright {
            color: var(--footer-text) !important;
        }
        .footer-marquee .legal-link {
            color: var(--footer-text) !important;
        }
        .footer-marquee .legal-link:hover {
            color: var(--footer-headline) !important;
        }
    </style>
    `
}
