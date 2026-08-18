import { ConvexError } from "convex/values";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Shared auth helpers used by mutations, queries, and actions.
 *
 * The mobile-side Outscraper + Drive modules expect `requireAdmin(ctx)` and
 * `requireAuth(ctx)` to work in any Convex context — including actions, which
 * can't read DB directly. For action callers we hop through the Convex API
 * (`ctx.runQuery`) to look up the creator record.
 */

/**
 * Auth failures are thrown as ConvexError, never as a plain Error.
 *
 * A production deployment redacts the MESSAGE of every server throw — the
 * client gets "[Request ID: …] Server Error" and nothing more. A ConvexError's
 * `data` is the sole exception: it crosses to the client verbatim. Same note
 * as app/start/page.tsx.
 *
 * This is not cosmetic. When creators:markQuizPassed hit an unauthenticated
 * socket in prod, the mobile app could only show the creator an alert reading
 * "Server Error" — no hint that signing out and back in would fix it. Now the
 * reason is at least *available*, on `error.data`.
 *
 * Availability is not delivery, and the message stays redacted either way, so
 * a client only benefits once it reads `.data`:
 *
 *     error instanceof ConvexError && typeof error.data === "string"
 *         ? error.data
 *         : "Something went wrong."
 *
 * The web reads it (app/certification-quiz/page.tsx, app/start/page.tsx). The
 * MOBILE APP DOES NOT YET — ndm/app/(app)/certification-quiz.tsx alerts
 * `err?.message`, and providers/AppProviders.tsx decides whether to offer its
 * auth-recovery screen by testing /not authenticated/i against `err.message`,
 * which on a production build is always the redacted string. Until those move
 * to `.data`, the phone still shows "Server Error" and that recovery screen
 * still cannot fire in prod.
 *
 * Keep the literal words "Not authenticated" at the START of NOT_AUTHENTICATED
 * — that is what the mobile recovery screen matches on once it reads `.data`.
 */
export const NOT_AUTHENTICATED =
    "Not authenticated — your session could not be verified. Sign out and back in, then try again.";
export const ADMIN_REQUIRED = "Forbidden: admin access required";

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

function isActionCtx(ctx: AnyCtx): ctx is ActionCtx {
    return typeof (ctx as any).runQuery === "function" && (ctx as any).db === undefined;
}

/**
 * Require a signed-in Clerk identity. Returns the identity object.
 * Throws "Not authenticated" if no Clerk session attached to the call.
 */
export async function requireAuth(ctx: AnyCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError(NOT_AUTHENTICATED);
    return identity;
}

/**
 * Require a signed-in admin. Returns the creator record so callers can use
 * `me.clerkId` / `me._id` without re-fetching.
 *
 * Action variant uses `internal.creators.getMeForAuthInternal` (an internal
 * query introduced just for this), since actions can't reach `ctx.db` directly.
 */
export async function requireAdmin(ctx: AnyCtx) {
    const identity = await requireAuth(ctx);

    let me: any;
    if (isActionCtx(ctx)) {
        // Lazy import to avoid circular ref at module-eval time.
        const { internal } = await import("../_generated/api");
        me = await ctx.runQuery(internal.creators.getMeForAuthInternal, {
            clerkId: identity.subject,
        });
    } else {
        me = await (ctx as QueryCtx | MutationCtx).db
            .query("creators")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .first();
    }

    if (!me || me.role !== "admin") {
        throw new ConvexError(ADMIN_REQUIRED);
    }
    return { identity, me };
}
