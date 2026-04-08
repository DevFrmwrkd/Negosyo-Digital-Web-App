/**
 * Astro build worker — runs as a standalone Node.js child process.
 *
 * Usage: node astro-build-worker.mjs <astroDir>
 *
 * This script is forked from astro-builder.ts because:
 * 1. Astro uses dynamic requires, native binaries, and ESM internals that break webpack bundling
 * 2. Running as a child process lets Node.js resolve all deps from node_modules at runtime
 * 3. On Vercel, /var/task/node_modules/ has everything — no need for webpack to trace it
 */

import { build } from 'astro'
import tailwindcssVite from '@tailwindcss/vite'
import path from 'path'

const astroDir = process.argv[2]
if (!astroDir) {
    console.error('Usage: node astro-build-worker.mjs <astroDir>')
    process.exit(1)
}

try {
    await build({
        root: astroDir,
        configFile: false,
        output: 'static',
        logLevel: 'silent',
        vite: {
            plugins: [tailwindcssVite()],
            build: { cssMinify: true },
            // Vite cache must be in a writable location — the symlinked node_modules is read-only
            cacheDir: path.join(astroDir, '.vite-cache'),
        },
        build: {
            inlineStylesheets: 'always',
        },
    })
    console.log('ASTRO_BUILD_SUCCESS')
} catch (error) {
    console.error('ASTRO_BUILD_ERROR:', error.message || error)
    process.exit(1)
}
