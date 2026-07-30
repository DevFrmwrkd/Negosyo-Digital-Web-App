/**
 * Gate for the outreach tracker (separate repo: tendso-outreach-tracker, same
 * Convex deployment). Helpers only — no Convex functions live in this file.
 *
 * The tracker is an internal tool for two people, so it does not use Clerk. It
 * authenticates with one shared passcode held in an env var on this deployment,
 * plus a name picked from OUTREACH_TEAM so every log row is attributable.
 *
 * Set on the Convex deployment (Dashboard -> Settings -> Environment Variables):
 *   OUTREACH_PASSCODE   long random string — this is the only thing protecting the data
 *   OUTREACH_TEAM       Bryan,Joan
 *
 * Known tradeoff: anyone holding the passcode can read the member list and write
 * logs, and nothing stops Bryan picking "Joan". Acceptable for a two-person tool.
 * To upgrade to real accounts later, reimplement these two helpers on top of
 * ctx.auth.getUserIdentity() — no caller changes shape.
 */
import { ConvexError } from 'convex/values';

const DEFAULT_TEAM = ['Bryan', 'Joan'];

export function outreachTeam(): string[] {
    const raw = process.env.OUTREACH_TEAM;
    if (!raw) return DEFAULT_TEAM;
    const names = raw
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
    return names.length > 0 ? names : DEFAULT_TEAM;
}

/** Throws unless `passcode` matches OUTREACH_PASSCODE. Call first in every outreach function. */
export function requirePasscode(passcode: string): void {
    const expected = process.env.OUTREACH_PASSCODE;
    if (!expected) {
        throw new ConvexError('OUTREACH_PASSCODE is not set on this Convex deployment.');
    }
    if (passcode !== expected) {
        throw new ConvexError('Wrong passcode.');
    }
}

/** Passcode check + resolve the actor to its canonical spelling from OUTREACH_TEAM. */
export function requireActor(passcode: string, actorName: string): string {
    requirePasscode(passcode);
    const match = outreachTeam().find(
        (name) => name.toLowerCase() === actorName.trim().toLowerCase(),
    );
    if (!match) {
        throw new ConvexError(`"${actorName}" is not on OUTREACH_TEAM.`);
    }
    return match;
}
