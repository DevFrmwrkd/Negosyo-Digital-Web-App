/**
 * Discord guild member sync for the outreach tracker.
 *
 * Pulls the full member list over the REST API (no gateway bot needed) and mirrors
 * it into `discordMembers`. Reuses the DISCORD_BOT_TOKEN / DISCORD_GUILD_ID env vars
 * already set on this deployment for /ask and the approvals poller.
 *
 * ONE-TIME DISCORD SETUP: listing guild members is a privileged operation. In the
 * Discord Developer Portal open the app -> Bot -> Privileged Gateway Intents and
 * turn on "SERVER MEMBERS INTENT". Without it every request comes back 403.
 *
 * Runs every 6 hours from convex/crons.ts, and on demand from the tracker's
 * "Sync now" button (`syncNow`).
 *
 * Members are never deleted — leaving the guild only flips `active` to false, so a
 * member who rejoins still carries their outreach history.
 */
import { ConvexError, v } from 'convex/values';
import { action, internalAction, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { requirePasscode } from './outreachAuth';

const DISCORD_API = 'https://discord.com/api/v10';

/** Discord's hard maximum for GET /guilds/{id}/members. */
const PAGE_SIZE = 1000;

/** Members written per mutation. Keeps each transaction well inside Convex's limits. */
const UPSERT_CHUNK = 200;

/** Safety stop: 60 pages = 60k members. */
const MAX_PAGES = 60;

/** Batches of stale rows deactivated per sync. 40 * 500 = 20k departures in one run. */
const MAX_DEACTIVATE_BATCHES = 40;

/**
 * Result of a sync run. Declared explicitly (rather than inferred) because
 * `syncNow` calls `syncGuildMembers` from the same module — without an annotation
 * TypeScript hits a circular inference on `internal.discordMembers`.
 */
export type SyncResult = {
    skipped: boolean;
    fetched: number;
    added: number;
    deactivated: number;
};

type DiscordGuildMember = {
    user?: {
        id: string;
        username: string;
        global_name?: string | null;
        avatar?: string | null;
        bot?: boolean;
    };
    nick?: string | null;
    roles?: string[];
    joined_at?: string;
};

const memberRow = v.object({
    discordId: v.string(),
    username: v.string(),
    displayName: v.string(),
    nickname: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    joinedAt: v.optional(v.number()),
    roles: v.array(v.string()),
});

type MemberRow = {
    discordId: string;
    username: string;
    displayName: string;
    nickname?: string;
    avatarUrl?: string;
    joinedAt?: number;
    roles: string[];
};

/** Discord's fallback avatar bucket for accounts with no custom avatar: (id >> 22) % 6. */
function defaultAvatarIndex(userId: string): number {
    try {
        return Number(BigInt(userId) >> 22n) % 6;
    } catch {
        return 0;
    }
}

function avatarUrlFor(user: NonNullable<DiscordGuildMember['user']>): string {
    if (user.avatar) {
        const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=64`;
    }
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex(user.id)}.png`;
}

/** Returns null for bots — they are never outreach targets, so they never enter the table. */
function toMemberRow(member: DiscordGuildMember): MemberRow | null {
    const user = member.user;
    if (!user?.id || user.bot) return null;

    const nickname = member.nick?.trim() || undefined;
    const joinedAt = member.joined_at ? Date.parse(member.joined_at) : NaN;

    return {
        discordId: user.id,
        username: user.username,
        displayName: nickname || user.global_name?.trim() || user.username,
        nickname,
        avatarUrl: avatarUrlFor(user),
        joinedAt: Number.isNaN(joinedAt) ? undefined : joinedAt,
        roles: member.roles ?? [],
    };
}

/** One page of members, retrying rate limits and 5xx. `after` is the highest id seen so far. */
async function fetchMemberPage(
    guildId: string,
    token: string,
    after: string,
): Promise<DiscordGuildMember[]> {
    const url = `${DISCORD_API}/guilds/${guildId}/members?limit=${PAGE_SIZE}&after=${after}`;

    for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(url, { headers: { Authorization: `Bot ${token}` } });

        if (res.status === 429 || res.status >= 500) {
            const retryAfter = Number(res.headers.get('retry-after') ?? '1');
            const waitMs = Math.min(10, Math.max(1, retryAfter)) * 1000;
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
        }

        if (res.status === 403) {
            throw new ConvexError(
                'Discord returned 403 for the member list. Enable "Server Members Intent" ' +
                    '(Developer Portal -> your app -> Bot -> Privileged Gateway Intents) and ' +
                    'confirm the bot is a member of DISCORD_GUILD_ID.',
            );
        }

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new ConvexError(`Discord ${res.status}: ${body.slice(0, 300)}`);
        }

        return (await res.json()) as DiscordGuildMember[];
    }

    throw new ConvexError('Discord kept rate-limiting the member list. Try again in a minute.');
}

/**
 * Insert new members, refresh the Discord-owned fields on existing ones.
 *
 * Only touches fields Discord owns — outreach state (status, lastActorName,
 * contactCount, creatorId) is never overwritten by a sync.
 */
export const upsertMembers = internalMutation({
    args: { rows: v.array(memberRow), syncedAt: v.number() },
    handler: async (ctx, { rows, syncedAt }) => {
        let added = 0;

        for (const row of rows) {
            const searchText = [row.username, row.displayName, row.nickname]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const existing = await ctx.db
                .query('discordMembers')
                .withIndex('by_discord_id', (q) => q.eq('discordId', row.discordId))
                .unique();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    username: row.username,
                    displayName: row.displayName,
                    nickname: row.nickname,
                    avatarUrl: row.avatarUrl,
                    joinedAt: row.joinedAt,
                    roles: row.roles,
                    searchText,
                    active: true,
                    lastSyncedAt: syncedAt,
                });
            } else {
                await ctx.db.insert('discordMembers', {
                    ...row,
                    searchText,
                    active: true,
                    lastSyncedAt: syncedAt,
                    status: 'new',
                    contactCount: 0,
                });
                added++;
            }
        }

        return { added, processed: rows.length };
    },
});

/**
 * Flip members Discord no longer returns to inactive. Anything still carrying an
 * older lastSyncedAt than this run's start was not in the guild any more.
 */
export const deactivateStale = internalMutation({
    args: { before: v.number() },
    handler: async (ctx, { before }) => {
        const stale = await ctx.db
            .query('discordMembers')
            .withIndex('by_active_synced', (q) => q.eq('active', true).lt('lastSyncedAt', before))
            .take(500);

        for (const member of stale) {
            await ctx.db.patch(member._id, { active: false });
        }

        return stale.length;
    },
});

/** Upsert the outreachMeta singleton the header reads. */
export const recordSync = internalMutation({
    args: {
        at: v.number(),
        activeMembers: v.optional(v.number()),
        fetched: v.optional(v.number()),
        added: v.optional(v.number()),
        deactivated: v.optional(v.number()),
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('outreachMeta')
            .withIndex('by_key', (q) => q.eq('key', 'singleton'))
            .unique();

        const patch = {
            lastSyncAt: args.at,
            lastSyncFetched: args.fetched,
            lastSyncAdded: args.added,
            lastSyncDeactivated: args.deactivated,
            lastSyncError: args.error,
        };

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...patch,
                // A failed run must not zero out the count the header displays.
                activeMembers: args.activeMembers ?? existing.activeMembers,
            });
        } else {
            await ctx.db.insert('outreachMeta', {
                key: 'singleton',
                activeMembers: args.activeMembers ?? 0,
                ...patch,
            });
        }
    },
});

/**
 * Full guild sync. Safe to run repeatedly — it is an upsert, not a rebuild.
 *
 * No-ops (rather than throwing) when the Discord env vars are missing, so the cron
 * stays quiet on a deployment that has not been configured yet.
 */
export const syncGuildMembers = internalAction({
    args: {},
    handler: async (ctx): Promise<SyncResult> => {
        const token = process.env.DISCORD_BOT_TOKEN;
        const guildId = process.env.DISCORD_GUILD_ID;

        if (!token || !guildId) {
            console.warn('[OUTREACH] DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not set — skipping sync');
            return { skipped: true, fetched: 0, added: 0, deactivated: 0 };
        }

        const startedAt = Date.now();
        let fetched = 0;
        let added = 0;
        let after = '0';

        try {
            for (let page = 0; page < MAX_PAGES; page++) {
                const batch = await fetchMemberPage(guildId, token, after);
                if (batch.length === 0) break;

                const rows = batch
                    .map(toMemberRow)
                    .filter((row): row is MemberRow => row !== null);

                for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
                    const result = await ctx.runMutation(internal.discordMembers.upsertMembers, {
                        rows: rows.slice(i, i + UPSERT_CHUNK),
                        syncedAt: startedAt,
                    });
                    added += result.added;
                }
                fetched += rows.length;

                // Paginate by the highest id in the raw batch (bots included, or we
                // would loop forever on a page that is entirely bots).
                const lastId = batch[batch.length - 1]?.user?.id;
                if (!lastId) break;
                after = lastId;

                if (batch.length < PAGE_SIZE) break;
            }

            let deactivated = 0;
            for (let i = 0; i < MAX_DEACTIVATE_BATCHES; i++) {
                const count = await ctx.runMutation(internal.discordMembers.deactivateStale, {
                    before: startedAt,
                });
                deactivated += count;
                if (count === 0) break;
            }

            await ctx.runMutation(internal.discordMembers.recordSync, {
                at: startedAt,
                activeMembers: fetched,
                fetched,
                added,
                deactivated,
                // Explicitly clear any error from a previous failed run.
                error: undefined,
            });

            return { skipped: false, fetched, added, deactivated };
        } catch (err) {
            const message =
                err instanceof ConvexError
                    ? String(err.data)
                    : ((err as Error)?.message ?? String(err));
            await ctx.runMutation(internal.discordMembers.recordSync, {
                at: startedAt,
                error: message.slice(0, 500),
            });
            throw err;
        }
    },
});

/** Passcode-gated "Sync now" for the tracker header. */
export const syncNow = action({
    args: { passcode: v.string() },
    handler: async (ctx, { passcode }): Promise<SyncResult> => {
        requirePasscode(passcode);
        return await ctx.runAction(internal.discordMembers.syncGuildMembers, {});
    },
});
