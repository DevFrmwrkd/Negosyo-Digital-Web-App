/**
 * Outreach tracker API — consumed by the standalone frontend in the
 * tendso-outreach-tracker repo, which talks to this same Convex deployment.
 *
 * The one job of this module: make it impossible for Bryan and Joan to message
 * the same Discord member twice without noticing. Everything hangs off that.
 *
 * The member list itself is synced from Discord by convex/discordMembers.ts.
 * Nothing in the Next.js web app reads or writes these tables.
 */
import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { outreachChannel, outreachStatus } from './schema';
import { outreachTeam, requireActor, requirePasscode } from './outreachAuth';

/** Rows returned per search. Deliberately small — you pick a person, you don't browse. */
const PAGE = 50;

/** Every status except 'new'. Counting these is cheap; counting 'new' is not (see `stats`). */
const CONTACTED_STATUSES: Doc<'discordMembers'>['status'][] = [
    'claimed',
    'messaged',
    'replied',
    'not_interested',
    'converted',
];

/**
 * Non-throwing passcode check for the sign-in screen. Returns the team list only
 * once the passcode is right, so the name picker can't be used to enumerate names.
 */
export const checkPasscode = query({
    args: { passcode: v.string() },
    handler: async (_ctx, { passcode }) => {
        const expected = process.env.OUTREACH_PASSCODE;
        if (!expected) {
            return { ok: false, configured: false, team: [] as string[] };
        }
        if (passcode !== expected) {
            return { ok: false, configured: true, team: [] as string[] };
        }
        return { ok: true, configured: true, team: outreachTeam() };
    },
});

/**
 * The search bar. Empty term = the default list, ordered most-recently-touched
 * first with never-contacted members last (undefined sorts after numbers on a
 * descending index scan), which makes "what's been happening" the landing view.
 */
export const searchMembers = query({
    args: {
        passcode: v.string(),
        term: v.string(),
        status: v.optional(outreachStatus),
    },
    handler: async (ctx, { passcode, term, status }) => {
        requirePasscode(passcode);
        const needle = term.trim().toLowerCase();

        if (needle.length > 0) {
            return await ctx.db
                .query('discordMembers')
                .withSearchIndex('search_members', (q) => {
                    const base = q.search('searchText', needle).eq('active', true);
                    return status === undefined ? base : base.eq('status', status);
                })
                .take(PAGE);
        }

        if (status !== undefined) {
            return await ctx.db
                .query('discordMembers')
                .withIndex('by_active_status', (q) => q.eq('active', true).eq('status', status))
                .take(PAGE);
        }

        return await ctx.db
            .query('discordMembers')
            .withIndex('by_active_activity', (q) => q.eq('active', true))
            .order('desc')
            .take(PAGE);
    },
});

/** One member plus their full touch history — powers the log dialog. */
export const memberDetail = query({
    args: { passcode: v.string(), memberId: v.id('discordMembers') },
    handler: async (ctx, { passcode, memberId }) => {
        requirePasscode(passcode);
        const member = await ctx.db.get(memberId);
        if (!member) return null;

        const logs = await ctx.db
            .query('outreachLogs')
            .withIndex('by_member', (q) => q.eq('memberId', memberId))
            .order('desc')
            .take(25);

        return { member, logs };
    },
});

/**
 * Header counts + last sync result.
 *
 * 'new' is derived (total - contacted) rather than counted, because scanning every
 * untouched member on each render would read the whole table. The total comes from
 * the outreachMeta singleton, which the sync writes.
 */
export const stats = query({
    args: { passcode: v.string() },
    handler: async (ctx, { passcode }) => {
        requirePasscode(passcode);

        const meta = await ctx.db
            .query('outreachMeta')
            .withIndex('by_key', (q) => q.eq('key', 'singleton'))
            .unique();

        const counts: Record<string, number> = {
            new: 0,
            claimed: 0,
            messaged: 0,
            replied: 0,
            not_interested: 0,
            converted: 0,
        };

        let contacted = 0;
        for (const status of CONTACTED_STATUSES) {
            const rows = await ctx.db
                .query('discordMembers')
                .withIndex('by_active_status', (q) => q.eq('active', true).eq('status', status))
                .collect();
            counts[status] = rows.length;
            contacted += rows.length;
        }

        const total = Math.max(meta?.activeMembers ?? 0, contacted);
        counts.new = Math.max(0, total - contacted);

        return {
            total,
            contacted,
            counts,
            lastSyncAt: meta?.lastSyncAt,
            lastSyncAdded: meta?.lastSyncAdded,
            lastSyncError: meta?.lastSyncError,
        };
    },
});

/** Live activity feed — this is what makes "the other one instantly sees" true. */
export const recentActivity = query({
    args: { passcode: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, { passcode, limit }) => {
        requirePasscode(passcode);
        return await ctx.db
            .query('outreachLogs')
            .withIndex('by_created')
            .order('desc')
            .take(Math.min(Math.max(limit ?? 25, 1), 100));
    },
});

/**
 * Record a touch. Appends to outreachLogs and mirrors the new state onto the
 * member row. Returns the previous state so the UI can say "heads up, Joan had
 * already messaged them" right after the write.
 */
export const logContact = mutation({
    args: {
        passcode: v.string(),
        actorName: v.string(),
        memberId: v.id('discordMembers'),
        status: outreachStatus,
        channel: v.optional(outreachChannel),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const actor = requireActor(args.passcode, args.actorName);

        const member = await ctx.db.get(args.memberId);
        if (!member) throw new ConvexError('That member no longer exists.');

        const now = Date.now();
        const note = args.note?.trim() ? args.note.trim().slice(0, 1000) : undefined;

        await ctx.db.insert('outreachLogs', {
            memberId: args.memberId,
            discordId: member.discordId,
            memberName: member.displayName,
            actorName: actor,
            status: args.status,
            channel: args.channel,
            note,
            createdAt: now,
        });

        await ctx.db.patch(args.memberId, {
            status: args.status,
            lastActorName: actor,
            lastActivityAt: now,
            lastNote: note,
            contactCount: member.contactCount + 1,
        });

        return {
            ok: true,
            previousStatus: member.status,
            previousActor: member.lastActorName,
        };
    },
});

/**
 * Delete one log row and roll the member back to whatever the next-newest row
 * says (or 'new' if that was the only one). Mis-logging on the wrong person is
 * the most likely mistake here, so it needs to be one click to fix.
 */
export const undoLog = mutation({
    args: { passcode: v.string(), actorName: v.string(), logId: v.id('outreachLogs') },
    handler: async (ctx, args) => {
        requireActor(args.passcode, args.actorName);

        const row = await ctx.db.get(args.logId);
        if (!row) return { ok: true };

        await ctx.db.delete(args.logId);

        const member = await ctx.db.get(row.memberId);
        if (!member) return { ok: true };

        const [previous] = await ctx.db
            .query('outreachLogs')
            .withIndex('by_member', (q) => q.eq('memberId', row.memberId))
            .order('desc')
            .take(1);

        // patch() removes a field when handed undefined, which is what we want for
        // a member rolled all the way back to untouched.
        await ctx.db.patch(row.memberId, {
            status: previous?.status ?? 'new',
            lastActorName: previous?.actorName,
            lastActivityAt: previous?.createdAt,
            lastNote: previous?.note,
            contactCount: Math.max(0, member.contactCount - 1),
        });

        return { ok: true };
    },
});
