import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  staticPageGenerationTimeout: 120,
  async redirects() {
    return [
      // Force www → apex so the Clerk proxy (which lives on apex) matches the host.
      // Without this, requests to www.negosyo-digital.com/clerk-proxy/... get blocked
      // by CORS because the browser sees a cross-origin request (www vs apex).
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.negosyo-digital.com' }],
        destination: 'https://negosyo-digital.com/:path*',
        permanent: true,
      },
    ]
  },
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
