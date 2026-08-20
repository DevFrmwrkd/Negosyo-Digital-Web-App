#!/usr/bin/env node
/**
 * TYPE THAT GROWS AS THE VIEWPORT NARROWS.
 *
 * A wrapper sets a base `font-size: clamp(min, Nvw, max)` and then a narrower
 * breakpoint restates it. If the restated clamp yields MORE at the breakpoint
 * than the base clamp yields one pixel above it, the heading JUMPS UP as the
 * window gets smaller — and shrinks again when it grows.
 *
 * Four wrappers shipped exactly that. `clamp(31px,4vw,54px)` has bottomed out
 * on its 31px floor by 775px, while the <=760 pass's 7.2vw hits its 40px
 * ceiling immediately, so the headline stepped 31px -> 40px at the boundary.
 * No screenshot shows it: at 1440 and at 375 the page is right, and the fault
 * lives in the one pixel either side of 760 — which is where a tablet in
 * landscape and a half-width desktop window sit.
 *
 * BASELINE. This check was written against a codebase that already had the bug
 * in many wrappers. Failing all of them at once would only mean the check gets
 * switched off, so the known set is recorded in type-ladder-baseline.json and
 * only a NEW one fails the run. Fix one and delete its line from the baseline;
 * the check then holds it fixed and fails if it comes back. The baseline is a
 * debt register, not a list of things that are fine.
 *
 * Run: node scripts/check-type-ladders.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COMPONENTS = path.join(ROOT, "astro-site-template/src/components");
const BASELINE = path.join(__dirname, "type-ladder-baseline.json");

/** clamp()/px/vw/rem evaluated at one viewport width. Anything else -> null. */
const evalSize = (expr, vw) => {
    const px = (v) => {
        v = v.trim();
        let m = /^([\d.]+)px$/.exec(v);
        if (m) return parseFloat(m[1]);
        m = /^([\d.]+)vw$/.exec(v);
        if (m) return (parseFloat(m[1]) * vw) / 100;
        m = /^([\d.]+)rem$/.exec(v);
        if (m) return parseFloat(m[1]) * 16;
        return null;
    };
    const s = expr.trim();
    const m = /^clamp\(([^,]+),([^,]+),([^)]+)\)$/.exec(s);
    if (m) {
        const lo = px(m[1]), mid = px(m[2]), hi = px(m[3]);
        if (lo === null || mid === null || hi === null) return null;
        return Math.min(Math.max(mid, lo), hi);
    }
    return px(s);
};

/**
 * selector -> [{ maxW, expr }] for every font-size in the file, carrying the
 * max-width context it was declared under. Comments are stripped first so a
 * commented-out rule is not read as live CSS.
 */
const fontSizeRules = (file) => {
    const css = fs
        .readFileSync(file, "utf8")
        .split("\r\n")
        .join("\n")
        .replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = new Map();
    const mq = [];
    let depth = 0;
    const re = /([^{}]+)\{|\}/g;
    let m;
    while ((m = re.exec(css))) {
        if (m[0] === "}") {
            depth--;
            if (mq.length && mq[mq.length - 1].d === depth) mq.pop();
            continue;
        }
        const head = m[1].trim();
        if (head.startsWith("@media")) {
            const w = /max-width:\s*(\d+)px/.exec(head);
            mq.push({ d: depth, maxW: w ? parseInt(w[1], 10) : Infinity });
            depth++;
            continue;
        }
        if (head.startsWith("@")) { depth++; continue; }
        const start = m.index + m[0].length;
        const body = css.slice(start, css.indexOf("}", start));
        const fsz = /font-size:\s*([^;]+);/.exec(body);
        if (fsz) {
            const maxW = mq.length ? Math.min(...mq.map((x) => x.maxW)) : Infinity;
            for (const sel of head.split(",").map((s) => s.trim()).filter(Boolean)) {
                if (!rules.has(sel)) rules.set(sel, []);
                rules.get(sel).push({ maxW, expr: fsz[1].trim() });
            }
        }
        depth++;
    }
    return rules;
};

const WRAPPERS = [];
for (const fam of fs.readdirSync(COMPONENTS)) {
    const d = path.join(COMPONENTS, fam);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) {
        if (/^Page[A-Z]+\.astro$/.test(f)) WRAPPERS.push(path.join(d, f));
    }
}
WRAPPERS.sort();

const baseline = new Set(
    fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).known : []
);

const found = [];
const fresh = [];

for (const F of WRAPPERS) {
    const name = path.basename(F);
    for (const [sel, defs] of fontSizeRules(F)) {
        if (defs.length < 2) continue;
        // The last rule whose media context contains w wins, which is how the
        // cascade resolves these: same specificity, source order decides.
        const at = (w) => {
            let val = null;
            for (const d of defs) {
                if (w > d.maxW) continue;
                const v = evalSize(d.expr, w);
                if (v !== null) val = v;
            }
            return val;
        };
        // Scanning widths ASCENDING, so "grows as it narrows" is the value at
        // the WIDER w being SMALLER than at w-1.
        let prev = null;
        let worst = null;
        for (let w = 320; w <= 1600; w++) {
            const v = at(w);
            if (v === null) { prev = null; continue; }
            if (prev !== null && v < prev - 0.01) {
                const jump = prev - v;
                if (!worst || jump > worst.jump) worst = { w, jump, wide: v, narrow: prev };
            }
            prev = v;
        }
        if (!worst) continue;
        const key = name + "  " + sel;
        found.push(key);
        if (!baseline.has(key)) {
            fresh.push(
                key +
                "\n      at " + worst.w + "px it is " + worst.wide.toFixed(2) +
                "px; at " + (worst.w - 1) + "px it is " + worst.narrow.toFixed(2) +
                "px — GROWS " + worst.jump.toFixed(2) + "px as the viewport narrows" +
                "\n      " + defs.map((d) => (d.maxW === Infinity ? "base" : "<=" + d.maxW) + ": " + d.expr).join("  |  ")
            );
        }
    }
}

const stale = [...baseline].filter((k) => !found.includes(k));

console.log("scanned " + WRAPPERS.length + " template wrappers");

if (fresh.length) {
    console.error("\n" + fresh.length + " NEW type ladder(s) that grow as the viewport narrows:\n  " + fresh.join("\n  "));
    console.error("\nCap the narrow clamp's MAX at what the base clamp yields AT the breakpoint,");
    console.error("so the two curves meet instead of stepping. Do not add it to the baseline.");
    process.exit(1);
}
if (stale.length) {
    console.error("\n" + stale.length + " baseline entr(ies) no longer fail. Delete them from");
    console.error("scripts/type-ladder-baseline.json so the fix stays fixed:\n  " + stale.join("\n  "));
    process.exit(1);
}
console.log(
    "\u2713 type ladders OK — nothing grows its type as the viewport narrows, beyond the " +
    baseline.size + " already recorded in scripts/type-ladder-baseline.json"
);
