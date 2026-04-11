import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  staticPageGenerationTimeout: 120,
  async rewrites() {
    return [
      {
        source: '/clerk-proxy/:path*',
        destination: 'https://clerk.negosyo-digital.com/:path*',
      },
    ]
  },
  outputFileTracingIncludes: {
    '/api/generate-website': [
      // Astro template: source, config, and its own self-contained node_modules
      // (installed by "cd astro-site-template && npm install" during build step)
      './astro-site-template/src/**/*',
      './astro-site-template/tsconfig.json',
      './astro-site-template/package.json',
      './astro-site-template/node_modules/**/*',
      // Worker script (executed via execSync, invisible to nft)
      './astro-site-template/build-worker.mjs',
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
