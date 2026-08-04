#!/usr/bin/env node
/**
 * Guards against template-catalog ↔ preview drift.
 * Every `code` in components/editor/templateCatalog.ts must have a matching
 * public/template-previews/<letter>.html, and the counts must be equal.
 *
 * Run: node scripts/check-template-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const catalog = fs.readFileSync(path.join(ROOT, "components/editor/templateCatalog.ts"), "utf8");
const codes = [...new Set([...catalog.matchAll(/code:\s*"([a-z]+:[A-Z]+)"/g)].map((m) => m[1]))];

const previewDir = path.join(ROOT, "public/template-previews");
const previews = fs.readdirSync(previewDir).filter((f) => f.endsWith(".html"));

console.log(`catalog codes: ${codes.length}, preview files: ${previews.length}`);

const missing = codes.filter((code) => !previews.includes(code.split(":")[1].toLowerCase() + ".html"));
if (missing.length) {
    console.error("MISSING previews for:\n  " + missing.join("\n  "));
    process.exit(1);
}
if (codes.length !== previews.length) {
    const extra = previews.filter((f) => !codes.some((c) => c.split(":")[1].toLowerCase() + ".html" === f));
    console.error(`COUNT MISMATCH: ${codes.length} codes vs ${previews.length} previews. Orphan previews: ${extra.join(", ") || "(none)"}`);
    process.exit(1);
}
console.log("✓ template parity OK");
