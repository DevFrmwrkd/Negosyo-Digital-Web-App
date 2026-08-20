/**
 * editorImageSlots — pure image helpers shared by the editors, extracted from
 * v1 SandboxEditor so v3 can reuse them without importing the 4000-line v1 file.
 *
 * The slot vocabulary + upload contract are lifted verbatim from
 * SandboxEditor.tsx (assignImageToSlot :784-835, handleAddPhoto :836-869, the
 * ed:click image-field heuristic :609). Keep in sync with v1 if that changes.
 */

/**
 * Return a NEW draft with `url` written into the image slot named by `slot`
 * (a data-field / data-image-field path). Pure — does not touch the iframe.
 *   hero.image            → images[0]
 *   about.image           → about_images[0]
 *   services.image        → services_image
 *   services.list.N.image → services[N].image
 *   gallery.tile.N        → featured_images[N]
 *   favicon               → favicon
 *   null                  → appended to images[] (the library)
 *   anything else         → written AT THAT PATH
 *
 * The named cases above are LEGACY STORAGE KEYS that the older templates read.
 * Everything else is a real dotted content path — gallery.items.2.image,
 * services.items.0.image, ctaBand.image, why.image — and the newer templates
 * read it exactly where it is written. This used to append those to images[]
 * instead, which put the photo back in the library and left the slot empty: the
 * admin picked a photo for a gallery tile and nothing changed on the page.
 */

/**
 * Immutable dotted-path write. Clones every object it passes through, so the
 * caller's draft is never mutated, and creates an ARRAY where the next segment
 * is a number — 'gallery.items.2.image' must build items as a list, not as an
 * object with a "2" key, or nothing downstream will iterate it.
 */
function setAtPath(root: any, path: string, value: unknown): void {
    const parts = path.split(".");
    let node: any = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const nextIsIndex = /^\d+$/.test(parts[i + 1]);
        const existing = node[key];
        node[key] = Array.isArray(existing)
            ? existing.slice()
            : (existing && typeof existing === "object")
                ? { ...existing }
                : (nextIsIndex ? [] : {});
        node = node[key];
    }
    node[parts[parts.length - 1]] = value;
}
export function applyImageSlot(draft: any, slot: string | null, url: string): any {
    const next = { ...(draft ?? {}) };
    const images = ((next.images as string[]) ?? []).slice();

    if (!slot) {
        next.images = [...images, url];
        return next;
    }
    if (slot === "favicon") {
        next.favicon = url;
    } else if (slot === "hero.image") {
        if (images.length === 0) images.push(url);
        else images[0] = url;
        next.images = images;
    } else if (slot === "about.image") {
        const about = ((next.about_images as string[]) ?? []).slice();
        if (about.length === 0) about.push(url);
        else about[0] = url;
        next.about_images = about;
    } else if (slot === "services.image") {
        next.services_image = url;
    } else if (slot.startsWith("services.list.") && slot.endsWith(".image")) {
        const idx = parseInt(slot.split(".")[2] || "0", 10);
        const list = ((next.services as any[]) ?? []).slice();
        while (list.length <= idx) list.push({ name: "", description: "" });
        list[idx] = { ...(list[idx] || {}), image: url };
        next.services = list;
    } else if (slot.startsWith("gallery.tile.")) {
        const idx = parseInt(slot.split(".")[2] || "0", 10);
        const featured = ((next.featured_images as string[]) ?? []).slice();
        while (featured.length <= idx) featured.push("");
        featured[idx] = url;
        next.featured_images = featured;
    } else {
        // A real content path. See the note above the function.
        setAtPath(next, slot, url);
    }
    return next;
}

/**
 * Does this data-field path point at an image slot (route the click to the
 * image picker rather than a text input)? Mirrors v1's heuristic.
 */
export function isImageField(field: string): boolean {
    return /\.(image|photo|tile|thumb)(\.|$)|^hero\.image$|^about\.image$|^gallery\.tile\./.test(field);
}

/**
 * Upload an image to the shared /api/upload-image endpoint (10MB, image/* —
 * same limits v1 enforces) and return the stored URL. Throws a human message
 * on validation / network / server failure so callers can toast it.
 */
export async function uploadImage(file: File, submissionId: string): Promise<string> {
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB.");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("submissionId", submissionId);
    const res = await fetch("/api/upload-image", { method: "POST", body: fd });
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Upload failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    const url: string | undefined = data?.url;
    if (!url) throw new Error("Upload succeeded but no URL returned");
    return url;
}
