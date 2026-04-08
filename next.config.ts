import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  staticPageGenerationTimeout: 120,
  outputFileTracingIncludes: {
    '/api/generate-website': [
      // Astro template source files (loaded via fs, invisible to nft)
      './astro-site-template/src/**/*',
      './astro-site-template/tsconfig.json',
      './astro-site-template/package.json',
      // Astro build script (executed via fork, invisible to nft)
      './lib/astro-build-worker.mjs',
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
