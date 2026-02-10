export interface SiteData {
  layout: LayoutProps;
  customizations: Customizations;
  visibility: VisibilitySettings;
  hero: HeroProps;
  about: AboutProps;
  services: ServicesProps;
  gallery: GalleryProps;
  contact: ContactProps;
}

export interface LayoutProps {
  businessName: string;
  tagline: string;
  navLinks: NavLink[];
  socialLinks: SocialLink[];
  colorScheme: string;
  fontPairing: string;
  contact: ContactInfo;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address?: string;
  whatsapp?: string;
  messenger?: string;
}

export interface Customizations {
  heroStyle: 'A' | 'B' | 'C' | 'D';
  aboutStyle: 'A' | 'B' | 'C' | 'D';
  servicesStyle: 'A' | 'B' | 'C' | 'D';
  galleryStyle: 'A' | 'B' | 'C' | 'D';
  contactStyle: 'A' | 'B' | 'C' | 'D';
}

export interface VisibilitySettings {
  heroSection?: boolean;
  heroHeadline?: boolean;
  heroTagline?: boolean;
  heroDescription?: boolean;
  heroTestimonial?: boolean;
  heroButton?: boolean;
  heroImage?: boolean;
  aboutSection?: boolean;
  aboutBadge?: boolean;
  aboutHeadline?: boolean;
  aboutDescription?: boolean;
  aboutImages?: boolean;
  aboutTagline?: boolean;
  aboutTags?: boolean;
  servicesSection?: boolean;
  servicesBadge?: boolean;
  servicesHeadline?: boolean;
  servicesSubheadline?: boolean;
  servicesImage?: boolean;
  servicesList?: boolean;
  gallerySection?: boolean;
  galleryHeadline?: boolean;
  gallerySubheadline?: boolean;
  galleryItems?: boolean;
  galleryImages?: boolean;
  contactSection?: boolean;
  contactBadge?: boolean;
  contactHeadline?: boolean;
  contactDescription?: boolean;
  contactInfo?: boolean;
  contactSocial?: boolean;
}

export interface HeroProps {
  businessName: string;
  headline: string;
  description: string;
  badgeText?: string;
  testimonial?: string;
  ctaLabel?: string;
  ctaLink?: string;
  photos: string[];
  services?: Array<{ name: string; description: string }>;
  visibility?: Partial<VisibilitySettings>;
}

export interface AboutProps {
  businessName: string;
  description: string;
  headline?: string;
  tagline?: string;
  tags?: string[];
  usps?: string[];
  photos: string[];
  visibility?: Partial<VisibilitySettings>;
}

export interface ServicesProps {
  headline?: string;
  subheadline?: string;
  services: Array<{
    name: string;
    description: string;
    icon?: string;
  }>;
  photos: string[];
  visibility?: Partial<VisibilitySettings>;
}

export interface GalleryProps {
  headline?: string;
  subheadline?: string;
  items: Array<{
    title: string;
    description: string;
    image?: string;
    tags?: string[];
    testimonial?: {
      quote: string;
      author: string;
      avatar?: string;
    };
  }>;
  images?: string[];
  ctaText?: string;
  ctaLink?: string;
  photos: string[];
  visibility?: Partial<VisibilitySettings>;
}

export interface ContactProps {
  businessName: string;
  email: string;
  phone: string;
  address?: string;
  whatsapp?: string;
  messenger?: string;
  description?: string;
  socialLinks?: SocialLink[];
  featuredImage?: string;
  photos: string[];
  visibility?: Partial<VisibilitySettings>;
}
