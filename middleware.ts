import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/signup(.*)',
    '/forgot-password(.*)',
    '/reset-password(.*)',
    '/auth/(.*)',
    '/website/(.*)',
    '/preview/(.*)',
    '/api/webhooks(.*)',
    '/privacy-policy(.*)',
    '/terms-of-service(.*)',
]);

// Define admin routes
const isAdminRoute = createRouteMatcher([
    '/admin(.*)',
]);

export default clerkMiddleware(
    async (auth, req) => {
        // Allow public routes
        if (isPublicRoute(req)) {
            return;
        }

        // Protect all other routes
        await auth.protect();
    },
    {
        // Clerk proxy — only enabled when CLERK_PROXY_URL env var is set.
        // Set to the absolute URL of the proxy endpoint (e.g. "https://negosyo-digital.com/clerk-proxy").
        // Requires the Clerk custom domain (clerk.negosyo-digital.com) to be configured
        // in the Clerk dashboard + DNS CNAME pointing to Clerk's frontend API.
        ...(process.env.CLERK_PROXY_URL ? { proxyUrl: process.env.CLERK_PROXY_URL } : {}),
    }
);

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
