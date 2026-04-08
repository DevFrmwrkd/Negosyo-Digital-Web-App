import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  staticPageGenerationTimeout: 120,
  outputFileTracingIncludes: {
    '/api/generate-website': [
      // Astro template source files (loaded via fs, not import — invisible to nft)
      './astro-site-template/src/**/*',
      './astro-site-template/astro.config.mjs',
      './astro-site-template/tsconfig.json',
      './astro-site-template/package.json',
      // Astro CLI + its runtime deps (invoked via execSync, not import — invisible to nft)
      './node_modules/astro/**/*',
      './node_modules/vite/**/*',
      './node_modules/rollup/**/*',
      './node_modules/esbuild/**/*',
      './node_modules/@astrojs/**/*',
      './node_modules/@tailwindcss/**/*',
      './node_modules/tailwindcss/**/*',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dytrdgnyvvcsyjaswqcm.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.convex.cloud',
        port: '',
        pathname: '/api/storage/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
