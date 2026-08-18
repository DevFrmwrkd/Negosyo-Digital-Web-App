/**
 * editorConstants — shared theme/blocks/bridge constants for the submission
 * editors. Copy-extracted from SandboxEditor.tsx so SandboxEditorV2 reuses the
 * exact same option ids + block visibility keys + bridge field map WITHOUT
 * touching v1 (converge in a follow-up PR).
 */

import type { TemplateFamily } from "./templateCatalog";

// ── COLOR SCHEMES (astro theme engine ids) ───────────────────────────────
// "auto" = derive from photos/business. The rest map 1:1 to buildOverrideCss
// schemes in astro-site-template/src/lib/genericThemeOverrides.ts. NOTE:
// "professional" is a real astro scheme; v1's picker list omitted it, so it's
// added here for the curated palettes.
export const COLOR_SCHEMES = [
    { id: "auto",         label: "Auto (from photos)" },
    { id: "blue",         label: "Blue · Professional" },
    { id: "green",        label: "Green · Fresh" },
    { id: "purple",       label: "Purple · Creative" },
    { id: "orange",       label: "Orange · Energetic" },
    { id: "dark",         label: "Dark · Elegant" },
    { id: "pink",         label: "Pink · Vibrant" },
    { id: "brown",        label: "Brown · Natural" },
    { id: "red",          label: "Red · Intense" },
    { id: "yellow",       label: "Yellow · Bright" },
    { id: "maroon",       label: "Maroon · Rich" },
    { id: "black",        label: "Black · Monochrome" },
    { id: "gold",         label: "Gold · Premium (cream)" },
    { id: "whitegold",    label: "White & Gold · Luxe" },
    { id: "professional", label: "Professional · Corporate" },
] as const;

export const FONT_PAIRINGS = [
    { id: "modern",       label: "Modern (Default)" },
    { id: "classic",      label: "Classic Serif" },
    { id: "elegant",      label: "Elegant Display" },
    { id: "bold",         label: "Bold & Loud" },
    { id: "minimal",      label: "Minimal Sans" },
    { id: "professional", label: "Professional Sans" },
    { id: "creative",     label: "Creative Bold" },
    { id: "tech",         label: "Tech Mono" },
    { id: "friendly",     label: "Friendly Rounded" },
    { id: "luxury",       label: "Luxury Serif" },
    { id: "gourmet",      label: "Gourmet Elegant" },
] as const;

// ── 16 v01 BLOCKS · toggleable sections ──────────────────────────────────
// `visKey` is the SNAKE_CASE key written into content.visibility.* that the
// generate-website route maps to the astro visibility block.
export const ALL_BLOCKS: Array<{ name: string; tag: "required" | "recommended"; visKey: string }> = [
    { name: "HERO",             tag: "required",    visKey: "hero_section" },
    { name: "MARQUEE",          tag: "recommended", visKey: "marquee_block" },
    { name: "TRUST",            tag: "recommended", visKey: "trust_block" },
    { name: "ABOUT",            tag: "recommended", visKey: "about_section" },
    { name: "SERVICES",         tag: "required",    visKey: "services_section" },
    { name: "WHY-US",           tag: "recommended", visKey: "why_us_block" },
    { name: "HOW-IT-WORKS",     tag: "recommended", visKey: "how_it_works_block" },
    { name: "TESTIMONIALS",     tag: "recommended", visKey: "testimonials_block" },
    { name: "GALLERY",          tag: "recommended", visKey: "featured_section" },
    { name: "FAQ",              tag: "recommended", visKey: "faq_block" },
    { name: "SERVICE-AREA",     tag: "recommended", visKey: "service_area_block" },
    { name: "CREDENTIALS",      tag: "recommended", visKey: "credentials_block" },
    { name: "LOCATION",         tag: "recommended", visKey: "location_block" },
    { name: "CTA-BAND",         tag: "recommended", visKey: "cta_band_block" },
    { name: "CLICK-TO-MESSAGE", tag: "recommended", visKey: "click_to_message" },
    { name: "FOOTER",           tag: "required",    visKey: "footer_section" },
    { name: "SCROLL-TO-TOP",    tag: "recommended", visKey: "scroll_top_button" },
];

// ── Bridge field mapping ──────────────────────────────────────────────────
// Draft state path → data-field selector inside the preview iframe. The bridge
// updates any [data-field="<value>"] element on postMessage ed:update.
export const STATE_TO_BRIDGE: Record<string, string> = {
    business_name: "business.name",
    tagline: "hero.headline",
    about: "hero.description",
    hero_badge_text: "hero.badge_text",
    hero_testimonial: "hero.testimonial",
    about_headline: "about.headline",
    about_description: "about.description",
    services_headline: "services.headline",
    services_subheadline: "services.subheadline",
    "contact.phone": "contact.phone",
    "contact.email": "contact.email",
    "contact.address": "contact.address",
};

// ── Curated color-scheme suggestions per template family ──────────────────
// A short, on-brand subset the v2 rail surfaces first; any COLOR_SCHEMES id is
// still selectable. All ids must exist in COLOR_SCHEMES above.
export const CURATED: Record<TemplateFamily, string[]> = {
    generic:     ["brown", "green", "blue", "orange", "professional", "dark"],
    restaurant:  ["orange", "brown", "red", "maroon", "gold"],
    barbershop:  ["brown", "dark", "black", "maroon", "orange"],
    salonspa:    ["pink", "purple", "maroon", "gold", "whitegold"],
    autoshop:    ["orange", "red", "dark", "black", "blue"],
    shirtstore:  ["brown", "black", "maroon", "professional", "blue"],
    retail:      ["brown", "black", "maroon", "professional", "blue"],
    medical:     ["green", "blue", "professional", "whitegold"],
    fitness:     ["red", "orange", "dark", "black", "yellow"],
    education:   ["blue", "green", "purple", "professional", "orange"],
    trades:      ["blue", "dark", "black", "orange", "professional"],
    foodcraft:   ["pink", "gold", "orange", "maroon"],
    services:    ["blue", "green", "professional", "whitegold"],
    filipino:    ["orange", "maroon", "gold", "purple", "green", "brown"],
    hospitality: ["brown", "green", "maroon", "dark", "red", "black", "pink"],
    layouts:     ["blue", "green", "purple", "orange", "brown", "maroon", "professional", "dark"],
};
