/**
 * templateCatalog — shared template inventory for the submission editors.
 *
 * Copy-extracted from SandboxEditor.tsx so the redesigned SandboxEditorV2 can
 * reuse the exact same `family:code` template ids + `/template-previews/*.html`
 * thumbnails WITHOUT touching v1. v1 will be converged onto this file in a
 * follow-up PR; until then a parity test (templateCatalog.test) guards against
 * drift (catalog length must equal the number of files in public/template-previews).
 *
 * Each `code` maps to `customizations.heroStyle` (e.g. "generic:A"), which the
 * astro router (astro-site-template/src/pages/index.astro) resolves at build time.
 */

export type TemplateFamily =
    | "generic" | "barbershop" | "salonspa" | "autoshop" | "restaurant"
    | "shirtstore" | "retail" | "medical" | "fitness" | "education"
    | "trades" | "foodcraft" | "services" | "layouts";

export interface TemplateDef {
    letter: string;
    code: string;
    label: string;
    tagline: string;
    preview: string;
}

const GENERIC_TEMPLATES: TemplateDef[] = [
    { letter: "A", code: "generic:A", label: "Ironwood",      tagline: "Paper + gold · café",           preview: "/template-previews/a.html" },
    { letter: "B", code: "generic:B", label: "Stillwater",    tagline: "Teal + peach · yoga / studio",  preview: "/template-previews/b.html" },
    { letter: "C", code: "generic:C", label: "Cedar & Stone", tagline: "Amber + forest · build trades", preview: "/template-previews/c.html" },
    { letter: "D", code: "generic:D", label: "Northpoint",    tagline: "Lime on dark · tech / IT",      preview: "/template-previews/d.html" },
    { letter: "E", code: "generic:E", label: "Wash House",    tagline: "Blue + yellow · laundry",       preview: "/template-previews/e.html" },
];

const BARBERSHOP_TEMPLATES: TemplateDef[] = [
    { letter: "F", code: "barbershop:F", label: "Forge",     tagline: "Paper + brass · classic",      preview: "/template-previews/f.html" },
    { letter: "G", code: "barbershop:G", label: "Cinematic", tagline: "Oversized type · editorial",   preview: "/template-previews/g.html" },
    { letter: "H", code: "barbershop:H", label: "Kinetic",   tagline: "Black + green · energetic",     preview: "/template-previews/h.html" },
    { letter: "I", code: "barbershop:I", label: "Minimal",   tagline: "Neutral grayscale · refined",   preview: "/template-previews/i.html" },
    { letter: "J", code: "barbershop:J", label: "Stacked",   tagline: "Stone + dark red · bold serif", preview: "/template-previews/j.html" },
];

const SALONSPA_TEMPLATES: TemplateDef[] = [
    { letter: "K",  code: "salonspa:K",  label: "Atelier",  tagline: "Pearl + brass · refined salon",    preview: "/template-previews/k.html" },
    { letter: "L",  code: "salonspa:L",  label: "Botanica", tagline: "Sage + cream · botanical spa",     preview: "/template-previews/l.html" },
    { letter: "M",  code: "salonspa:M",  label: "Clinic",   tagline: "Mist + teal · clinical aesthetic", preview: "/template-previews/m.html" },
    { letter: "N",  code: "salonspa:N",  label: "Vogue",    tagline: "Mauve pink · editorial beauty",    preview: "/template-previews/n.html" },
    { letter: "O",  code: "salonspa:O",  label: "Bloom",    tagline: "Mauve + cream · romantic",         preview: "/template-previews/o.html" },
    { letter: "AN", code: "salonspa:AN", label: "Héla · Poblacion Atelier", tagline: "Atelier nights · salon & spa", preview: "/template-previews/an.html" },
];

const AUTOSHOP_TEMPLATES: TemplateDef[] = [
    { letter: "P",  code: "autoshop:P",  label: "Foundry",      tagline: "Concrete + hazard orange · industrial", preview: "/template-previews/p.html" },
    { letter: "Q",  code: "autoshop:Q",  label: "Meridian",     tagline: "Clean steel · precision service",       preview: "/template-previews/q.html" },
    { letter: "R",  code: "autoshop:R",  label: "Volt",         tagline: "Electric accent · EV / modern",         preview: "/template-previews/r.html" },
    { letter: "S",  code: "autoshop:S",  label: "Redline",      tagline: "Bold red · performance shop",           preview: "/template-previews/s.html" },
    { letter: "T",  code: "autoshop:T",  label: "Maple Street", tagline: "Warm neighbourhood · trusted garage",   preview: "/template-previews/t.html" },
    { letter: "AF", code: "autoshop:AF", label: "Job-Sheet Industrial", tagline: "Hazard yellow · repair shops", preview: "/template-previews/af.html" },
    { letter: "AP", code: "autoshop:AP", label: "Vulca Garage & Detailing", tagline: "Volcanic grit · garage & detailing", preview: "/template-previews/ap.html" },
];

const RESTAURANT_TEMPLATES: TemplateDef[] = [
    { letter: "U",  code: "restaurant:U",  label: "Harvest", tagline: "Rustic + olive · farm-to-table", preview: "/template-previews/u.html" },
    { letter: "V",  code: "restaurant:V",  label: "Atelier", tagline: "Minimal · refined dining",       preview: "/template-previews/v.html" },
    { letter: "W",  code: "restaurant:W",  label: "Press",   tagline: "Bold type · casual eatery",      preview: "/template-previews/w.html" },
    { letter: "X",  code: "restaurant:X",  label: "Ember",   tagline: "Cinematic · fine dining",        preview: "/template-previews/x.html" },
    { letter: "Y",  code: "restaurant:Y",  label: "Garden",  tagline: "Playful · cafe / brunch",        preview: "/template-previews/y.html" },
    { letter: "AE", code: "restaurant:AE", label: "Smoke & Banana Leaf", tagline: "Charcoal + ember · grills & BBQ", preview: "/template-previews/ae.html" },
    { letter: "AM", code: "restaurant:AM", label: "Kalan · Mercado Nocturne", tagline: "Ember + night market · restaurants", preview: "/template-previews/am.html" },
];

const SHIRTSTORE_TEMPLATES: TemplateDef[] = [
    { letter: "Z",  code: "shirtstore:Z",  label: "Editorial",  tagline: "Warm editorial · apparel brand", preview: "/template-previews/z.html" },
    { letter: "AA", code: "shirtstore:AA", label: "Streetwear", tagline: "Bold urban · drops / merch",     preview: "/template-previews/aa.html" },
    { letter: "AB", code: "shirtstore:AB", label: "Artisan",    tagline: "Handmade · small-batch",         preview: "/template-previews/ab.html" },
    { letter: "AC", code: "shirtstore:AC", label: "Modern",     tagline: "Clean minimal · DTC store",      preview: "/template-previews/ac.html" },
    { letter: "AD", code: "shirtstore:AD", label: "Kinetic",    tagline: "Energetic · statement tees",     preview: "/template-previews/ad.html" },
];

const RETAIL_TEMPLATES: TemplateDef[] = [
    { letter: "AG", code: "retail:AG", label: "Broadsheet Catalog", tagline: "Newsprint + red ink · hardware", preview: "/template-previews/ag.html" },
    { letter: "AO", code: "retail:AO", label: "Domingo · Catálogo", tagline: "Sunday catalog · retail & shops", preview: "/template-previews/ao.html" },
];

const MEDICAL_TEMPLATES: TemplateDef[] = [
    { letter: "AH", code: "medical:AH", label: "Clinical Editorial",  tagline: "Porcelain + seafoam · dental / derma", preview: "/template-previews/ah.html" },
    { letter: "AQ", code: "medical:AQ", label: "Batis Dental Studio", tagline: "Fresh spring · dental & clinics",      preview: "/template-previews/aq.html" },
];

const FITNESS_TEMPLATES: TemplateDef[] = [
    { letter: "AI", code: "fitness:AI", label: "Brutalist Fight Poster", tagline: "Red/black halftone · boxing gyms", preview: "/template-previews/ai.html" },
    { letter: "AR", code: "fitness:AR", label: "Kalasag Strength Co.",   tagline: "Shield-strong · gyms & strength",  preview: "/template-previews/ar.html" },
];

const EDUCATION_TEMPLATES: TemplateDef[] = [
    { letter: "AJ", code: "education:AJ", label: "Notebook Modern",         tagline: "Ruled paper · tutoring centers",       preview: "/template-previews/aj.html" },
    { letter: "AT", code: "education:AT", label: "Talíno Learning Studio",  tagline: "Bright + smart · tutoring & learning", preview: "/template-previews/at.html" },
];

const TRADES_TEMPLATES: TemplateDef[] = [
    { letter: "AK", code: "trades:AK", label: "Blueprint Cyanotype",     tagline: "Cyan blueprint · aircon / electrical", preview: "/template-previews/ak.html" },
    { letter: "AU", code: "trades:AU", label: "Volt & Line Electrical",  tagline: "Live wire · electrical & trades",      preview: "/template-previews/au.html" },
];

const FOODCRAFT_TEMPLATES: TemplateDef[] = [
    { letter: "AL", code: "foodcraft:AL", label: "Pastel Deco Panaderia", tagline: "Cream + terracotta · bakeries", preview: "/template-previews/al.html" },
];

const SERVICES_TEMPLATES: TemplateDef[] = [
    { letter: "AS", code: "services:AS", label: "Labaná Laundry & Press", tagline: "Crisp + clean · laundry & services", preview: "/template-previews/as.html" },
];

/** Families in rail-display order, each with a human label. */
export const TEMPLATE_FAMILIES: Array<{ family: TemplateFamily; label: string; templates: TemplateDef[] }> = [
    { family: "generic",    label: "Generic",     templates: GENERIC_TEMPLATES },
    { family: "restaurant", label: "Restaurant",  templates: RESTAURANT_TEMPLATES },
    { family: "barbershop", label: "Barbershop",  templates: BARBERSHOP_TEMPLATES },
    { family: "salonspa",   label: "Salon & Spa", templates: SALONSPA_TEMPLATES },
    { family: "autoshop",   label: "Auto",        templates: AUTOSHOP_TEMPLATES },
    { family: "shirtstore", label: "Apparel",     templates: SHIRTSTORE_TEMPLATES },
    { family: "retail",     label: "Retail",      templates: RETAIL_TEMPLATES },
    { family: "medical",    label: "Medical",     templates: MEDICAL_TEMPLATES },
    { family: "fitness",    label: "Fitness",     templates: FITNESS_TEMPLATES },
    { family: "education",  label: "Education",   templates: EDUCATION_TEMPLATES },
    { family: "trades",     label: "Trades",      templates: TRADES_TEMPLATES },
    { family: "foodcraft",  label: "Foodcraft",   templates: FOODCRAFT_TEMPLATES },
    { family: "services",   label: "Services",    templates: SERVICES_TEMPLATES },
];

export const ALL_TEMPLATES: TemplateDef[] = TEMPLATE_FAMILIES.flatMap((f) => f.templates);

/** business_type bucket labels (carried forward on save). */
export const TEMPLATE_BUCKETS = [
    { id: "barber",     label: "Barber",     business: "Barber Shop",       desc: "Vintage masculine · heritage" },
    { id: "salon",      label: "Beauty",     business: "Salon / Spa",       desc: "Luxe ethereal · soft & feminine" },
    { id: "auto",       label: "Automotive", business: "Auto Shop",         desc: "Industrial · technical · rugged" },
    { id: "restaurant", label: "Food",       business: "Restaurant / Café", desc: "Warm · appetizing · hospitable" },
    { id: "clinic",     label: "Medical",    business: "Clinic / Dental",   desc: "Clean · trustworthy · professional" },
    { id: "retail",     label: "Retail",     business: "Retail Store",      desc: "Blueprint · clear · catalog" },
    { id: "fitness",    label: "Fitness",    business: "Gym / Studio",      desc: "Kinetic · bold · confident" },
    { id: "education",  label: "Education",  business: "School / Workshop", desc: "Warm · inviting · academic" },
    { id: "services",   label: "Services",   business: "Trades / Services", desc: "Service area · utility · clear" },
] as const;

/** Family of a heroStyle code, e.g. "restaurant:AM" → "restaurant". */
export function familyOf(code: string | undefined | null): TemplateFamily | null {
    if (!code) return null;
    const fam = code.split(":")[0] as TemplateFamily;
    return TEMPLATE_FAMILIES.some((f) => f.family === fam) ? fam : null;
}

export function templateByCode(code: string | undefined | null): TemplateDef | undefined {
    if (!code) return undefined;
    return ALL_TEMPLATES.find((t) => t.code === code);
}
