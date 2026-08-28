/**
 * ════════════════════════════════════════════════════════════════════════════
 *  ANNOUNCEMENT AUDIENCE — "who is actually going to receive this?"
 * ════════════════════════════════════════════════════════════════════════════
 *
 * A broadcast is the one admin action with no undo: once 140 emails leave, they
 * leave. So the rule deciding who gets one lives here as a pure function rather
 * than inline in the send path — the admin page and the sender must agree
 * exactly, or the count shown on the confirm dialog is a lie.
 *
 * Two exclusions apply to EVERY audience, deliberately not expressible as an
 * option:
 *
 *   * deleted accounts. `status: 'deleted'` and `isDeleted: true` both occur in
 *     this table; treating either as sendable mails someone who left.
 *   * rows without a usable email. Every creator has one today, which is
 *     precisely why an assumption would go unnoticed the day one doesn't.
 *
 * Unit-tested in __tests__/announcements/audience.test.ts.
 */

export type AudienceKey = 'certified' | 'active' | 'awaiting_approval' | 'all';

/** The minimum shape this logic needs. Matches the `creators` row. */
export interface AudienceRow {
    email?: string;
    role?: string;
    status?: string;
    isDeleted?: boolean;
    certifiedAt?: number;
    quizPassedAt?: number;
    rejectedAt?: number;
}

export const AUDIENCES: ReadonlyArray<{
    key: AudienceKey;
    label: string;
    description: string;
}> = [
    {
        key: 'certified',
        label: 'Certified creators',
        description: 'Approved by an admin and able to submit work. The safest default for anything operational.',
    },
    {
        key: 'active',
        label: 'All active creators',
        description: 'Everyone with a live account, certified or not. Excludes admins and rejected accounts.',
    },
    {
        key: 'awaiting_approval',
        label: 'Awaiting approval',
        description: 'Passed the quiz but not yet approved. Useful for chasing a stalled onboarding queue.',
    },
    {
        key: 'all',
        label: 'Everyone, admins included',
        description: 'Every live account on the platform. Includes you — use it to see exactly what creators receive.',
    },
];

/** Never sendable, whatever audience is chosen. */
export function isSendable(row: AudienceRow): boolean {
    if (row.isDeleted === true) return false;
    if (row.status === 'deleted') return false;
    if (!row.email || !row.email.includes('@')) return false;
    return true;
}

function isAdmin(row: AudienceRow): boolean {
    return row.role === 'admin';
}

function isRejected(row: AudienceRow): boolean {
    return typeof row.rejectedAt === 'number';
}

/**
 * Does this creator belong to the chosen audience?
 *
 * `all` still honours isSendable — "everyone" means every reachable live
 * account, not every row in the table.
 */
export function matchesAudience(row: AudienceRow, key: AudienceKey): boolean {
    if (!isSendable(row)) return false;

    switch (key) {
        case 'all':
            return true;

        case 'active':
            return !isAdmin(row) && !isRejected(row);

        case 'certified':
            return !isAdmin(row) && !isRejected(row) && typeof row.certifiedAt === 'number';

        case 'awaiting_approval':
            return (
                !isAdmin(row) &&
                !isRejected(row) &&
                typeof row.quizPassedAt === 'number' &&
                typeof row.certifiedAt !== 'number'
            );

        default: {
            // An unrecognised key must send to NOBODY. Defaulting to everyone
            // would turn a typo or a stale client into a full broadcast.
            const _exhaustive: never = key;
            return Boolean(_exhaustive) && false;
        }
    }
}

export function selectAudience<T extends AudienceRow>(rows: T[], key: AudienceKey): T[] {
    return rows.filter((r) => matchesAudience(r, key));
}
