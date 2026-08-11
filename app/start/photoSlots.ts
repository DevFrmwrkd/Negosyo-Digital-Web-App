/**
 * The named photo slots, and the array they compact into.
 *
 * THE CONTRACT, AND WHY IT IS FRAGILE. `submissions.photos` has no roles in it —
 * convex/hyperagent.ts:23 assigns them purely by index:
 *
 *     PHOTO_ROLES = ['headshot','interior_1','interior_2','exterior','product_1','product_2']
 *
 * and the loop at :85-88 walks the two arrays in lockstep. Index IS meaning.
 * Send the storefront where the portrait belongs and every photo on the
 * generated site is mislabelled, silently, with nothing in the pipeline to
 * notice. The creator funnel feeds that mapping an unordered `multiple` file
 * picker (app/submit/photos/page.tsx:292-299); asking the owner slot by slot is
 * strictly better input than anything the funnel gets today.
 *
 * The optional portrait is the interesting case. It sits at index 0, so a
 * skipped portrait must be sent as an EMPTY STRING rather than compacted away —
 * dropping the slot would slide interior_1 into the headshot role and take every
 * other role with it. An empty string is inert on both consumers (see the
 * verification comment on normalizePhotos in convex/ownerIntake.ts): the Studio
 * loop leaves it unresolved while `i` keeps advancing, and the generate route
 * filters it out of both branches.
 */

export interface PhotoSlot {
    /** Position in `submissions.photos`. This is the role. Never reorder. */
    index: number;
    /** The PHOTO_ROLES entry `index` maps to. Documentation, not data. */
    role: string;
    label: string;
    hint: string;
    /** Only the portrait. Everything else is required for a usable site. */
    optional?: true;
    /** Shown only when the owner says they sell something visible. */
    productsOnly?: true;
}

/**
 * Listed in DISPLAY order, not index order — the three photos every business can
 * take are asked for first, the optional portrait after them, products last.
 * `index` carries the role, so the display order is free to be kind.
 */
export const PHOTO_SLOTS: readonly PhotoSlot[] = [
    {
        index: 1,
        role: "interior_1",
        label: "Inside your place",
        hint: "Stand at the door and shoot inward. Lights on.",
    },
    {
        index: 2,
        role: "interior_2",
        label: "Inside, another angle",
        hint: "Turn around and take one more from the other side.",
    },
    {
        index: 3,
        role: "exterior",
        label: "Your storefront from the street",
        hint: "Step back far enough that your sign fits in the frame.",
    },
    {
        index: 0,
        role: "headshot",
        label: "You or your staff",
        hint: "Optional, but people trust a face. Skip it if you'd rather not.",
        optional: true,
    },
    {
        index: 4,
        role: "product_1",
        label: "Something you sell",
        hint: "One item, close up, on a plain background if you can.",
        productsOnly: true,
    },
    {
        index: 5,
        role: "product_2",
        label: "Another thing you sell",
        hint: "A second one, so the page has variety.",
        productsOnly: true,
    },
];

/** Copied verbatim from app/submit/photos/page.tsx:102-120 — the same ceiling
 *  and the same allow-list, because the Airtable/Studio pipeline downstream is
 *  the same one. The third check there, "max 10 files total", is structural
 *  here: six named slots cannot exceed convex/ownerIntake.ts's MAX_PHOTOS. */
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png"];

/** null when the file is fine, otherwise the sentence to show the owner. */
export function validatePhotoFile(file: File): string | null {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        return "Photos have to be JPG or PNG. Try taking the shot with your phone camera.";
    }
    if (file.size > MAX_PHOTO_BYTES) {
        return "That photo is over 10MB. Take it at a smaller size, or pick another one.";
    }
    return null;
}

/** The slots actually on screen for this owner. */
export function visibleSlots(hasProducts: boolean): readonly PhotoSlot[] {
    return PHOTO_SLOTS.filter((slot) => !slot.productsOnly || hasProducts);
}

/** Every non-optional visible slot filled. Also the ≥3 floor the mutation
 *  enforces: the three required slots are exactly three real photos. */
export function requiredSlotsFilled(photos: Record<number, string>, hasProducts: boolean): boolean {
    return visibleSlots(hasProducts).every((slot) => slot.optional || !!photos[slot.index]);
}

/**
 * Flatten the slots into the positional array `submitOwnerIntake` expects.
 *
 * Indices 0–3 are fixed positions and are emitted even when blank (only index 0
 * ever can be — the mutation rejects a hole anywhere else, deliberately, because
 * a hole further in means the client mis-ordered and the roles are already
 * wrong).
 *
 * The product tail is the one place compaction is safe, and it is done on
 * purpose: product_1 and product_2 are the same role in two positions, so an
 * owner who fills only the second slot gets their photo moved into the first
 * rather than a rejected submission. A short array is legal — both consumers
 * bound their loop by `photos.length`.
 */
export function buildPhotoArray(photos: Record<number, string>, hasProducts: boolean): string[] {
    const ordered = [photos[0] ?? "", photos[1] ?? "", photos[2] ?? "", photos[3] ?? ""];
    if (hasProducts) {
        for (const index of [4, 5]) {
            const url = photos[index];
            if (url) ordered.push(url);
        }
    }
    return ordered;
}
