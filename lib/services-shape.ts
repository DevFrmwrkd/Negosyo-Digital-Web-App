/**
 * `content.services` has TWO shapes in the wild, and code that assumes one of
 * them crashes on the other.
 *
 *   legacy  — a bare array:  [{ name, description }, …]
 *   nested  — a wrapper:     { tag, headline, items: [{ title, desc }, …] }
 *
 * The nested form is what lib/services/groq.service.ts emits and what every
 * current .astro template reads. The bare array predates it and is still stored
 * on older submissions. astro-builder has carried a `servicesNested` check for
 * exactly this reason since long before either shape was written down.
 *
 * A third source made it urgent: a draft-normalisation change briefly reshaped
 * `services` to the nested form on SAVE, so rows saved during that window carry
 * the wrapper even though their consumers were written for the array. Those rows
 * are still out there, so coercing at read time is what heals them — a migration
 * would only fix the ones that exist today.
 *
 * Use this anywhere you are about to call an array method on `content.services`.
 */
export function asServiceArray(services: unknown): any[] {
    if (Array.isArray(services)) return services;
    const items = (services as any)?.items;
    return Array.isArray(items) ? items : [];
}

/**
 * A display label for one service row, tolerant of both field vocabularies:
 * the legacy `{ name, description }` and the schema's `{ title, desc }`.
 */
export function serviceLabel(row: any): string {
    if (!row) return '';
    if (typeof row === 'string') return row;
    return String(row.title ?? row.name ?? '').trim();
}
