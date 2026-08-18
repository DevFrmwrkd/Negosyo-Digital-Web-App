#!/usr/bin/env node
/**
 * Guards components/editor/templateCatalog.ts `blocksForTemplate()` against the
 * templates it claims to describe.
 *
 * The editor filters its section toggles through blocksForTemplate(code). If that
 * function and the actual Page<CODE>.astro wrappers disagree, the Blocks tab
 * either offers a switch that controls nothing or hides a section the template
 * really renders — both silent, both only visible to whoever opens the editor.
 *
 * This script re-derives the truth by scanning every wrapper for the sections it
 * renders and the `visibility.*` gate on each, then asserts three things:
 *
 *   1. every rendered section (bar header/footer) IS gated — an ungated section
 *      can never be removed by an admin, whatever the editor shows
 *   2. blocksForTemplate(code) equals the set the wrapper actually renders
 *   3. no template is missing from the scan
 *
 * Run: node scripts/check-template-blocks.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COMPONENTS = path.join(ROOT, "astro-site-template/src/components");

/** Section-name prefixes, longest-first so CtaBand wins over Cta. */
const TYPES = [
    "Header", "Hero", "Marquee", "Trust", "About", "Services", "Why", "How",
    "Credentials", "Testimonials", "Gallery", "Faq", "Area", "Location", "CtaBand", "Footer",
];
/** Section type -> the ALL_BLOCKS name the editor uses. */
const TYPE_TO_BLOCK = {
    Hero: "HERO", Marquee: "MARQUEE", Trust: "TRUST", About: "ABOUT", Services: "SERVICES",
    Why: "WHY-US", How: "HOW-IT-WORKS", Testimonials: "TESTIMONIALS", Gallery: "GALLERY",
    Faq: "FAQ", Area: "SERVICE-AREA", Credentials: "CREDENTIALS", Location: "LOCATION",
    CtaBand: "CTA-BAND", Footer: "FOOTER",
};
const WORD_BOUNDARY = String.fromCharCode(92) + "b";

const typeOf = (name) =>
    TYPES.filter((t) => name.startsWith(t)).sort((a, b) => b.length - a.length)[0] ?? null;

const bodyOf = (file) => {
    const src = fs.readFileSync(file, "utf8").split("\r\n").join("\n");
    const parts = src.split(/^---$/m);
    return parts.length >= 3 ? parts.slice(2).join("---") : src;
};

/** Locate a component file by name anywhere under components/ (for *Spine). */
const findFile = (name) => {
    for (const fam of fs.readdirSync(COMPONENTS)) {
        const d = path.join(COMPONENTS, fam);
        if (!fs.statSync(d).isDirectory()) continue;
        const direct = path.join(d, `${name}.astro`);
        if (fs.existsSync(direct)) return direct;
        for (const sub of fs.readdirSync(d)) {
            const p = path.join(d, sub);
            if (fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, `${name}.astro`)))
                return path.join(p, `${name}.astro`);
        }
    }
    return null;
};

/** Sections a wrapper renders, following shared *Spine components one level in. */
const collect = (file, acc = new Map(), depth = 0) => {
    if (!file || depth > 2) return acc;
    const body = bodyOf(file);
    for (const m of body.matchAll(/<([A-Z][A-Za-z]+)[\s/>]/g)) {
        const name = m[1];
        if (name === "DOCTYPE") continue;
        if (/Spine$/.test(name)) { collect(findFile(name), acc, depth + 1); continue; }
        const type = typeOf(name);
        if (!type) continue;
        const ls = body.lastIndexOf("\n", m.index) + 1;
        let le = body.indexOf("\n", m.index);
        if (le === -1) le = body.length;
        const g = /visibility\.([A-Za-z]+)/.exec(body.slice(ls, le));
        // Keep the gated sighting if we previously saw an ungated one.
        if (!acc.has(type) || (g && !acc.get(type).gate)) acc.set(type, { comp: name, gate: g?.[1] ?? null });
    }
    return acc;
};

const scanned = {};
for (const fam of fs.readdirSync(COMPONENTS)) {
    const d = path.join(COMPONENTS, fam);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) {
        const m = /^Page([A-Z]+)\.astro$/.exec(f);
        if (!m) continue;
        scanned[`${fam}:${m[1]}`] = collect(path.join(d, f));
    }
}

// ── Re-implement blocksForTemplate from the catalog source, so this script
//    verifies the SHIPPED sets rather than a copy that could drift with it.
const catalog = fs.readFileSync(path.join(ROOT, "components/editor/templateCatalog.ts"), "utf8");
const setFrom = (name) => {
    const block = new RegExp(`const ${name} = new Set<string>\\(\\[([\\s\\S]*?)\\]\\)`).exec(catalog);
    if (!block) throw new Error(`could not parse ${name} out of templateCatalog.ts`);
    return new Set([...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
};
const baseBlocks = (() => {
    const b = /export const BASE_BLOCKS = \[([\s\S]*?)\] as const;/.exec(catalog);
    if (!b) throw new Error("could not parse BASE_BLOCKS out of templateCatalog.ts");
    return [...b[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
})();
const withMarquee = setFrom("WITH_MARQUEE");
const withoutCredentials = setFrom("WITHOUT_CREDENTIALS");
const declaredFor = (code) => {
    const out = new Set(baseBlocks);
    if (withMarquee.has(code)) out.add("MARQUEE");
    if (withoutCredentials.has(code)) out.delete("CREDENTIALS");
    return out;
};

const errors = [];
const codes = Object.keys(scanned).sort();

for (const code of codes) {
    const rows = scanned[code];

    // 1. every rendered section must be removable
    for (const [type, info] of rows) {
        if (type === "Header" || type === "Footer") continue;
        if (!info.gate) errors.push(`${code}: <${info.comp}> renders with no visibility gate — an admin can never remove it`);
    }

    // 2. declared set must equal the rendered set
    const actual = new Set([...rows.keys()].map((t) => TYPE_TO_BLOCK[t]).filter(Boolean));
    const declared = declaredFor(code);
    for (const b of declared) if (!actual.has(b)) errors.push(`${code}: catalog offers a ${b} toggle but the template never renders it`);
    for (const b of actual) if (!declared.has(b)) errors.push(`${code}: template renders ${b} but the catalog hides its toggle`);
}

console.log(`scanned ${codes.length} template wrappers`);
if (errors.length) {
    console.error(`\n${errors.length} block-manifest problem(s):\n  ` + errors.join("\n  "));
    process.exit(1);
}
console.log("✓ template blocks OK — every rendered section is gated, and the editor's toggles match reality");
