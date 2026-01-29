import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/signup(.*)',
    '/forgot-password(.*)',
    '/reset-password(.*)',
    '/auth/callback(.*)',
    '/website/(.*)',
    '/preview/(.*)',
    '/api/webhooks(.*)',
]);

// Define admin routes
const isAdminRoute = createRouteMatcher([
    '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    // Allow public routes
    if (isPublicRoute(req)) {
        return;
    }

    // Protect all other routes
    await auth.protect();
});

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
