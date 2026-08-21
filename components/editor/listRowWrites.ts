/**
 * listRowWrites — ONE rule, enforced at every place a list row can be written.
 *
 *   A write to a single leaf inside a list row must carry the WHOLE DISPLAYED
 *   LIST with it.
 *
 * WHY. The editor sidebar shows a list it may never have read from the draft.
 * ListField reads `spec.path`, else `spec.fallbackPaths`, and the caller's
 * getValue falls through again to the submission-derived defaults
 * (lib/derive-content-defaults.ts). So a panel can legitimately show four
 * gallery tiles while `draft.gallery.items` holds NOTHING.
 *
 * Writing one leaf of one row at `gallery.items.3.caption` then creates a
 * fresh SPARSE array with a single partial row — and JSON.stringify turns the
 * holes into null on the way to Convex:
 *
 *     panel showed 4 rows  ->  {"items":[null,null,null,{"caption":"…"}]}
 *
 * The three siblings are gone, the toast is honest, and two templates
 * (FaqBB.astro:43, FooterF.astro:33) dereference the null and throw the whole
 * rebuild. Add / Remove / Reorder never had the bug because they already write
 * the whole array; this module gives every OTHER writer the same behaviour.
 *
 * MATERIALISE ON WRITE, NEVER ON RENDER. Nothing here runs unless the admin
 * actually edits a row, so merely OPENING a submission still persists nothing:
 * the derived defaults stay derived, re-derived on every build, and an
 * untouched draft stays clean.
 *
 * Pure + framework-free on purpose — the .tsx sidebar, both editor shells and
 * the tests all import the same functions, so none of them can drift.
 */

import { listShapeForRowPath } from './genericContentSchema';

/** Which row of a list a dotted path addresses, and where inside that row. */
export interface RowTarget {
    /** Row index, e.g. 3 for `gallery.items.3.caption`. */
    index: number;
    /**
     * Path INSIDE the row — '' when the row itself is the value
     * (`about.paragraphs.2`, `footer.notes.0`), otherwise possibly dotted
     * (`cta.text`, for a link field whose hrefPath reaches deeper than one key).
     */
    subPath: string;
}

/** A whole-array write: exactly what setValue should be handed instead. */
export interface ListWrite {
    path: string;
    value: any[];
}

const INDEX_RE = /^\d+$/;

/**
 * Split `path` against `listPath`.
 *
 * Returns null — meaning "not a row of this list, leave the write alone" — for
 * a path outside the list, and for one whose first segment after the list is
 * not an index (`gallery.items` itself, `gallery.itemsHeadline`, `…items.all`).
 */
export function splitRowPath(listPath: string, path: string): RowTarget | null {
    if (!listPath || !path) return null;
    const prefix = listPath + '.';
    if (!path.startsWith(prefix)) return null;
    const rest = path.slice(prefix.length);
    const dot = rest.indexOf('.');
    const head = dot === -1 ? rest : rest.slice(0, dot);
    if (!INDEX_RE.test(head)) return null;
    const index = Number(head);
    if (!Number.isSafeInteger(index)) return null;
    return { index, subPath: dot === -1 ? '' : rest.slice(dot + 1) };
}

/**
 * Clone one container on the way down to the leaf.
 *
 * Deliberately identical to useEditorDraft's setValue (and v1's setDeepDraft):
 * array-ness is preserved, a numeric next segment builds an ARRAY rather than
 * an object with a "2" key, and a non-empty STRING parent is upgraded to
 * `{ lead }` instead of being dropped — so a legacy row that is still a bare
 * string (`services: ['Haircut']`) keeps its text when a sub-field is typed
 * over it. Routing the row through this instead of through the whole-path
 * setter must not change WHAT lands in the draft; only WHERE it lands.
 */
function cloneContainer(node: any, nextIsIndex: boolean): any {
    if (Array.isArray(node)) return node.slice();
    if (node && typeof node === 'object') return { ...node };
    if (typeof node === 'string' && node.trim()) return nextIsIndex ? [] : { lead: node };
    return nextIsIndex ? [] : {};
}

/**
 * Return a NEW row with `value` written at `subPath`. Never mutates `row` —
 * the row is still referenced by the array the caller read out of the draft
 * (and, for a derived list, by the memo that derived it), so mutating in place
 * would edit state nobody asked to change. That is why the MUTATING setAtPath
 * in editorImageSlots.ts is not reused here.
 *
 * An empty `subPath` means the row IS the value (string lists).
 */
export function setRowValue(row: any, subPath: string, value: any): any {
    if (!subPath) return value;
    const parts = subPath.split('.');
    const root = cloneContainer(row, INDEX_RE.test(parts[0]));
    let cur: any = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        cur[k] = cloneContainer(cur[k], INDEX_RE.test(parts[i + 1]));
        cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
    return root;
}

/**
 * The whole list, with one leaf of one row changed. `list.slice()` copies holes
 * as holes, so an array that ALREADY carries damage is passed through as it is
 * rather than being quietly rewritten — repairing it is not this write's job.
 */
export function withRowValue(list: any[], index: number, subPath: string, value: any): any[] {
    const next = list.slice();
    next[index] = setRowValue(next[index], subPath, value);
    return next;
}

/**
 * Turn a leaf write into a whole-array write, against a list the caller ALREADY
 * HOLDS (the sidebar's ListField, which rendered from it).
 *
 * null means "not ours", and the caller must fall back to its plain setValue:
 *   · the path is not under `listPath`, or its next segment is not an index
 *   · the index is outside the displayed list
 *
 * The out-of-range case does NOT invent the missing rows. Padding out to index
 * 7 of a 4-row list would ship three blank tiles the owner never asked for;
 * guessing is the thing this module exists to stop.
 */
export function rowWriteInList(
    listPath: string,
    list: any[] | null | undefined,
    path: string,
    value: any,
): ListWrite | null {
    if (!Array.isArray(list)) return null;
    const target = splitRowPath(listPath, path);
    if (!target) return null;
    if (target.index >= list.length) return null;
    return { path: listPath, value: withRowValue(list, target.index, target.subPath, value) };
}

/**
 * The rows a list DISPLAYS — the same chain ContentFieldsAuto's ListField
 * walks, so a write materialises exactly what the admin was looking at:
 *   1. the primary path in the draft
 *   2. the schema's read-only fallbackPaths
 *   3. whatever else `read` chains on (both editors pass a getValue that ends
 *      in the submission-derived defaults)
 *
 * null means there is no list to preserve, and the caller should just write.
 */
export function displayedList(
    read: (path: string) => any,
    listPath: string,
    fallbackPaths?: string[],
): any[] | null {
    const primary = read(listPath);
    if (Array.isArray(primary) && primary.length > 0) return primary;
    for (const fb of fallbackPaths ?? []) {
        const v = read(fb);
        if (Array.isArray(v) && v.length > 0) return v;
    }
    return Array.isArray(primary) ? primary : null;
}

/**
 * Turn a leaf write into a whole-array write with NO list in scope — the image
 * picker, the link popover, a photo dropped onto a slot, an inline commit. The
 * list is recovered from the schema (which paths are lists, and what each one
 * falls back to) plus the caller's own read chain.
 *
 * null means the path is not a schema list row, or the list is empty/absent —
 * either way the plain write was already correct and loses nothing.
 */
export function rowWriteFromSchema(
    read: (path: string) => any,
    path: string,
    value: any,
): ListWrite | null {
    const shape = listShapeForRowPath(path);
    if (!shape) return null;
    const list = displayedList(read, shape.path, shape.fallbackPaths);
    if (!list) return null;
    return rowWriteInList(shape.path, list, path, value);
}

/**
 * A drop-in setValue that is safe for list rows. Wrap a raw dotted-path writer
 * once, at the top of an editor, and every downstream caller — sidebar form,
 * picker, popover — is covered without having to know this rule exists.
 *
 * ONE call, always. Reading the list and writing it back in two steps would
 * race a second write on stale draft state.
 */
export function listSafeSetValue(
    read: (path: string) => any,
    write: (path: string, value: any) => void,
): (path: string, value: any) => void {
    return (path: string, value: any) => {
        const w = rowWriteFromSchema(read, path, value);
        if (w) write(w.path, w.value);
        else write(path, value);
    };
}
