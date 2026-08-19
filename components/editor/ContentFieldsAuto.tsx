"use client";

/**
 * ContentFieldsAuto — collapsible Content-tab form generated from
 * `genericContentSchema`. Renders one group per page section, every
 * editable field, supports lists (add/remove rows), and writes through
 * to the parent draft via dotted-path setters.
 *
 * The component is intentionally stateless about the draft — parent
 * owns it. Calls:
 *   - getValue(path)     → read current value (string for text/textarea,
 *                          [] or array for lists, object for the row payloads).
 *   - setValue(path, v)  → write a value at the dotted path.
 *   - openImagePicker(path) → triggers the SandboxEditor image picker.
 *   - pushLiveText(path, value) → optional live-update to iframe.
 *
 * The Group component handles its own collapsed state. Each input adds
 * `data-field-input="<path>"` so the existing iframe→sidebar focus flow
 * (and the new selection-pulse) still works.
 */

import { useMemo, useState } from "react";
import {
    GENERIC_CONTENT_SCHEMA,
    GROUP_BLOCK,
    type GroupSpec,
    type FieldSpec,
    type ListSpec,
} from "./genericContentSchema";
import { sectionsForTemplate } from "./templateCatalog";
import { TEMPLATE_FIELD_PATHS } from "./templateFieldPaths.generated";

export interface ContentFieldsAutoProps {
    getValue: (path: string) => any;
    setValue: (path: string, value: any) => void;
    openImagePicker: (path: string) => void;
    pushLiveText?: (path: string, value: any) => void;
    /** Comma-joined ids of groups that start expanded. Default: hero + first. */
    expandedInitial?: string[];
    /**
     * The selected template, e.g. "hospitality:BJ". When given, the group list
     * is filtered to the sections that template actually renders, ordered the
     * way the page renders them, and titled with the template's own name for
     * each section. Omit it and the full generic schema shows, unchanged.
     */
    templateCode?: string;
}

/**
 * The groups to show for a template: page order, the template's own names, and
 * nothing for a section it does not render.
 *
 * FAILS OPEN. A group with no GROUP_BLOCK entry ('header'), or an unrecognised
 * template code, keeps the full generic schema — a missing field an owner needs
 * is a worse failure than a spare one they can ignore.
 */
/**
 * The content paths a template actually binds, or null when we cannot tell.
 * null means DO NOT FILTER — an unrecognised template shows the whole schema.
 */
function boundPathsFor(templateCode: string | undefined): Set<string> | null {
    const list = templateCode ? TEMPLATE_FIELD_PATHS[templateCode] : undefined;
    return list && list.length ? new Set(list) : null;
}

/**
 * Does this template draw anything for this field?
 *
 * TWO WAYS TO SURVIVE, and the second matters as much as the first:
 *
 *   1. the template binds the path (or its href companion, or a fallback path)
 *   2. THE FIELD ALREADY HOLDS A VALUE
 *
 * Rule 2 exists because hiding an input does not delete what is behind it. An
 * owner who typed a price under one template, then switched to a template that
 * draws no price, would otherwise have that value stranded in storage with no
 * way to reach or clear it — and it would reappear the moment they switched
 * back. A field with content in it always stays reachable.
 */
function fieldSurvives(
    f: FieldSpec,
    bound: Set<string> | null,
    hasValue: (path: string) => boolean,
): boolean {
    if (!bound) return true;
    if (bound.has(f.path)) return true;
    if (f.hrefPath && bound.has(f.hrefPath)) return true;
    if (f.fallbackPaths?.some((p) => bound.has(p))) return true;
    return hasValue(f.path) || (!!f.hrefPath && hasValue(f.hrefPath));
}

/**
 * A list keeps only the row fields the template draws, and disappears entirely
 * when it draws none of them. Item paths are normalised the way the generator
 * writes them: services.items.N.title covers every row.
 */
function narrowList(
    l: ListSpec,
    bound: Set<string> | null,
    rowHasValue: (listPath: string, key: string) => boolean,
): ListSpec | null {
    if (!bound) return l;
    const compose = (key: string) => (key ? l.path + ".N." + key : l.path + ".N");
    const itemFields = (l.itemFields ?? []).filter(
        (f) => bound.has(compose(f.path)) || rowHasValue(l.path, f.path),
    );
    if (!itemFields.length) return null;
    return itemFields.length === (l.itemFields ?? []).length ? l : { ...l, itemFields };
}

function groupsForTemplate(
    templateCode: string | undefined,
    hasValue: (path: string) => boolean,
    rowHasValue: (listPath: string, key: string) => boolean,
): GroupSpec[] {
    if (!templateCode) return GENERIC_CONTENT_SCHEMA;
    const sections = sectionsForTemplate(templateCode);
    if (!sections.length) return GENERIC_CONTENT_SCHEMA;

    const labelByBlock = new Map(sections.map((s) => [s.block, s.label]));
    const orderByBlock = new Map(sections.map((s, i) => [s.block, i]));
    const bound = boundPathsFor(templateCode);

    const kept = GENERIC_CONTENT_SCHEMA.filter((g) => {
        const block = GROUP_BLOCK[g.id];
        return !block || labelByBlock.has(block);
    });

    const rank = (g: GroupSpec) => {
        const block = GROUP_BLOCK[g.id];
        // Unmapped groups (the header) sit above the page, so they lead.
        if (!block) return -1;
        return orderByBlock.get(block) ?? Number.MAX_SAFE_INTEGER;
    };

    return kept
        .slice()
        .sort((a, b) => rank(a) - rank(b))
        .map((g) => {
            const label = labelByBlock.get(GROUP_BLOCK[g.id] ?? "");
            const titled = label && label !== g.title ? { ...g, title: label } : g;
            if (!bound) return titled;
            const fields = titled.fields
                .map((f) =>
                    f.kind === "list"
                        ? narrowList(f as ListSpec, bound, rowHasValue)
                        : fieldSurvives(f as FieldSpec, bound, hasValue) ? f : null,
                )
                .filter(Boolean) as GroupSpec["fields"];
            return fields.length === titled.fields.length ? titled : { ...titled, fields };
        })
        // A section whose every field this template leaves undrawn has nothing
        // to edit. Dropping it beats an expandable group that opens on nothing.
        .filter((g) => g.fields.length > 0);
}

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--sx-ink-soft, #94a3b8)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    background: "var(--sx-panel, #18212F)",
    border: "1px solid var(--sx-rule, #232E3D)",
    borderRadius: 6,
    color: "var(--sx-ink, #E8EDF3)",
    fontSize: 13,
    fontFamily: "var(--sx-sans, ui-sans-serif, system-ui, sans-serif)",
    outline: "none",
};

const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 70,
    resize: "vertical",
    fontFamily: "var(--sx-sans, ui-sans-serif, system-ui, sans-serif)",
};

const hintStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--sx-ink-mute, #64748b)",
    marginTop: 4,
};

const fieldWrapStyle: React.CSSProperties = {
    marginBottom: 12,
};

function isListSpec(x: FieldSpec | ListSpec): x is ListSpec {
    return (x as ListSpec).kind === 'list';
}

function joinPath(...parts: Array<string | number>): string {
    return parts
        .filter((p) => p !== '' && p !== null && p !== undefined)
        .map((p) => String(p))
        .join('.');
}

export default function ContentFieldsAuto({
    getValue,
    setValue,
    openImagePicker,
    pushLiveText,
    expandedInitial,
    templateCode,
}: ContentFieldsAutoProps) {
    // getValue is intentionally NOT a dependency: re-narrowing on every
    // keystroke would make an input vanish the moment its value was cleared.
    // The set is computed for the template, and a field that held a value when
    // the panel opened stays reachable for the whole session.
    const groups = useMemo(
        () => {
            const hasValue = (path: string) => {
                const v = getValue(path);
                return v !== undefined && v !== null && v !== "";
            };
            const rowHasValue = (listPath: string, key: string) => {
                const rows = getValue(listPath);
                if (!Array.isArray(rows)) return false;
                return rows.some((row: any) => {
                    const v = key ? row?.[key] : row;
                    return v !== undefined && v !== null && v !== "";
                });
            };
            return groupsForTemplate(templateCode, hasValue, rowHasValue);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [templateCode],
    );
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        const defaults = expandedInitial ?? ['header', 'hero'];
        for (const id of defaults) init[id] = true;
        return init;
    });

    const toggle = (id: string) =>
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    const handleTextChange = (path: string, value: string) => {
        setValue(path, value);
        pushLiveText?.(path, value);
    };

    return (
        <div>
            {groups.map((group) => (
                <GroupRender
                    key={group.id}
                    group={group}
                    isOpen={!!expanded[group.id]}
                    onToggle={() => toggle(group.id)}
                    getValue={getValue}
                    setValue={setValue}
                    openImagePicker={openImagePicker}
                    onTextChange={handleTextChange}
                />
            ))}
        </div>
    );
}

interface GroupRenderProps {
    group: GroupSpec;
    isOpen: boolean;
    onToggle: () => void;
    getValue: (path: string) => any;
    setValue: (path: string, value: any) => void;
    openImagePicker: (path: string) => void;
    onTextChange: (path: string, value: string) => void;
}

function GroupRender({ group, isOpen, onToggle, getValue, setValue, openImagePicker, onTextChange }: GroupRenderProps) {
    return (
        <div
            style={{
                marginBottom: 10,
                borderRadius: 10,
                background: "var(--sx-panel-2, #141B27)",
                border: "1px solid var(--sx-rule, #232E3D)",
                overflow: "hidden",
            }}
        >
            <button
                type="button"
                onClick={onToggle}
                style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: 0,
                    padding: "12px 14px",
                    color: "var(--sx-ink, #E8EDF3)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                }}
            >
                <span>
                    <span style={{
                        fontSize: 12,
                        fontFamily: "var(--sx-mono, ui-monospace, monospace)",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--sx-accent, #E4B05E)",
                        marginRight: 8,
                    }}>{group.id}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{group.title}</span>
                </span>
                <span
                    aria-hidden
                    style={{
                        transition: "transform .15s",
                        transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        fontSize: 12,
                        color: "var(--sx-ink-soft, #94a3b8)",
                    }}
                >▾</span>
            </button>
            {isOpen && (
                <div style={{ padding: "0 14px 14px" }}>
                    {group.description && (
                        <p style={{
                            fontSize: 11,
                            color: "var(--sx-ink-soft, #94a3b8)",
                            margin: "0 0 12px",
                            lineHeight: 1.5,
                        }}>
                            {group.description}
                        </p>
                    )}
                    {group.fields.map((f, i) => (
                        <FieldRender
                            key={`${group.id}-${i}`}
                            field={f}
                            getValue={getValue}
                            setValue={setValue}
                            openImagePicker={openImagePicker}
                            onTextChange={onTextChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface FieldRenderProps {
    field: FieldSpec | ListSpec;
    getValue: (path: string) => any;
    setValue: (path: string, value: any) => void;
    openImagePicker: (path: string) => void;
    onTextChange: (path: string, value: string) => void;
}

function FieldRender({ field, getValue, setValue, openImagePicker, onTextChange }: FieldRenderProps) {
    if (isListSpec(field)) {
        return (
            <ListField
                spec={field}
                getValue={getValue}
                setValue={setValue}
                openImagePicker={openImagePicker}
                onTextChange={onTextChange}
            />
        );
    }
    return (
        <ScalarField
            spec={field}
            getValue={getValue}
            setValue={setValue}
            openImagePicker={openImagePicker}
            onTextChange={onTextChange}
        />
    );
}

/**
 * Resolve the visible value for a field: prefer the primary path, but if
 * empty, walk fallbackPaths in order. Writes always go to the primary so
 * the admin's edit becomes the source of truth.
 */
function readWithFallbacks(getValue: (p: string) => any, primary: string, fallbacks?: string[]): any {
    const primaryVal = getValue(primary);
    if (primaryVal !== undefined && primaryVal !== null && primaryVal !== '') return primaryVal;
    if (fallbacks) {
        for (const fb of fallbacks) {
            const v = getValue(fb);
            if (v !== undefined && v !== null && v !== '') return v;
        }
    }
    return primaryVal;
}

function ScalarField({ spec, getValue, setValue, openImagePicker, onTextChange }: { spec: FieldSpec } & Omit<FieldRenderProps, 'field'>) {
    const value = readWithFallbacks(getValue, spec.path, spec.fallbackPaths);
    const stringValue = value == null ? '' : String(value);

    if (spec.kind === 'image') {
        return (
            <div style={fieldWrapStyle}>
                <label style={labelStyle}>{spec.label}</label>
                <button
                    type="button"
                    onClick={() => openImagePicker(spec.path)}
                    style={{
                        ...inputStyle,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                    }}
                    data-field-input={spec.path}
                >
                    <span style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        opacity: stringValue ? 1 : 0.5,
                        fontSize: 12,
                        fontFamily: "var(--sx-mono, ui-monospace, monospace)",
                    }}>
                        {stringValue || '(click to pick an image)'}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}>📷</span>
                </button>
                {spec.hint && <div style={hintStyle}>{spec.hint}</div>}
            </div>
        );
    }

    if (spec.kind === 'link') {
        const hrefPath = spec.hrefPath || `${spec.path}.href`;
        const hrefValue = readWithFallbacks(getValue, hrefPath, spec.hrefFallbackPaths);
        const hrefString = hrefValue == null ? '' : String(hrefValue);
        return (
            <div style={fieldWrapStyle}>
                <label style={labelStyle}>{spec.label}</label>
                <input
                    type="text"
                    value={stringValue}
                    onChange={(e) => onTextChange(spec.path, e.target.value)}
                    placeholder={spec.placeholder || 'Button text'}
                    style={inputStyle}
                    data-field-input={spec.path}
                />
                <input
                    type="text"
                    value={hrefString}
                    onChange={(e) => onTextChange(hrefPath, e.target.value)}
                    placeholder="https://… or #anchor"
                    style={{
                        ...inputStyle,
                        marginTop: 6,
                        fontFamily: "var(--sx-mono, ui-monospace, monospace)",
                        fontSize: 12,
                    }}
                    data-field-input={hrefPath}
                />
                {spec.hint && <div style={hintStyle}>{spec.hint}</div>}
            </div>
        );
    }

    if (spec.kind === 'textarea') {
        return (
            <div style={fieldWrapStyle}>
                <label style={labelStyle}>{spec.label}</label>
                <textarea
                    value={stringValue}
                    onChange={(e) => onTextChange(spec.path, e.target.value)}
                    placeholder={spec.placeholder}
                    style={textareaStyle}
                    data-field-input={spec.path}
                />
                {spec.hint && <div style={hintStyle}>{spec.hint}</div>}
            </div>
        );
    }

    return (
        <div style={fieldWrapStyle}>
            <label style={labelStyle}>{spec.label}</label>
            <input
                type="text"
                value={stringValue}
                onChange={(e) => onTextChange(spec.path, e.target.value)}
                placeholder={spec.placeholder}
                style={inputStyle}
                data-field-input={spec.path}
            />
            {spec.hint && <div style={hintStyle}>{spec.hint}</div>}
        </div>
    );
}

function ListField({ spec, getValue, setValue, openImagePicker, onTextChange }: { spec: ListSpec } & Omit<FieldRenderProps, 'field'>) {
    let raw = getValue(spec.path);
    if ((!Array.isArray(raw) || raw.length === 0) && spec.fallbackPaths) {
        for (const fb of spec.fallbackPaths) {
            const v = getValue(fb);
            if (Array.isArray(v) && v.length > 0) {
                raw = v;
                break;
            }
        }
    }
    const list: any[] = Array.isArray(raw) ? raw : [];

    const handleAdd = () => {
        const newItem = spec.newItem !== undefined ? spec.newItem : '';
        const cloned = JSON.parse(JSON.stringify(newItem));
        setValue(spec.path, [...list, cloned]);
    };
    const handleRemove = (idx: number) => {
        setValue(spec.path, list.filter((_, i) => i !== idx));
    };
    const handleMove = (from: number, dir: -1 | 1) => {
        const to = from + dir;
        if (to < 0 || to >= list.length) return;
        const next = list.slice();
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        setValue(spec.path, next);
    };

    // Determine whether items are strings (when itemFields has a single
    // field with path '') vs objects (any other shape).
    const isStringList = spec.itemFields.length === 1 && spec.itemFields[0].path === '';
    const canAdd = !spec.fixed && (spec.maxItems === undefined || list.length < spec.maxItems);

    return (
        <div style={{
            ...fieldWrapStyle,
            paddingTop: 6,
            paddingBottom: 6,
            borderTop: "1px dashed var(--sx-rule, #232E3D)",
            borderBottom: "1px dashed var(--sx-rule, #232E3D)",
        }}>
            <div style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{spec.label} ({list.length})</span>
                {canAdd && (
                    <button
                        type="button"
                        onClick={handleAdd}
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 8px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#E4B05E',
                            borderRadius: 4,
                            cursor: 'pointer',
                            letterSpacing: '0.04em',
                        }}
                    >+ Add</button>
                )}
            </div>
            {list.length === 0 && (
                <div style={{ ...hintStyle, padding: '8px 0' }}>No items yet.</div>
            )}
            {list.map((item, idx) => {
                const itemPath = joinPath(spec.path, idx);
                return (
                    <div
                        key={idx}
                        style={{
                            position: 'relative',
                            background: 'var(--sx-panel, #18212F)',
                            border: '1px solid var(--sx-rule, #232E3D)',
                            borderRadius: 8,
                            padding: '10px 10px 8px',
                            marginBottom: 8,
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                            paddingBottom: 6,
                            borderBottom: '1px solid var(--sx-rule, #232E3D)',
                        }}>
                            <span style={{
                                fontSize: 10,
                                fontFamily: 'var(--sx-mono, ui-monospace, monospace)',
                                color: 'var(--sx-ink-mute, #64748b)',
                                letterSpacing: '0.08em',
                            }}>#{idx + 1}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    type="button"
                                    onClick={() => handleMove(idx, -1)}
                                    disabled={idx === 0}
                                    title="Move up"
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--sx-rule, #232E3D)',
                                        color: 'var(--sx-ink-soft, #94a3b8)',
                                        width: 22,
                                        height: 20,
                                        borderRadius: 4,
                                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                        opacity: idx === 0 ? 0.4 : 1,
                                        fontSize: 10,
                                    }}
                                >↑</button>
                                <button
                                    type="button"
                                    onClick={() => handleMove(idx, 1)}
                                    disabled={idx === list.length - 1}
                                    title="Move down"
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--sx-rule, #232E3D)',
                                        color: 'var(--sx-ink-soft, #94a3b8)',
                                        width: 22,
                                        height: 20,
                                        borderRadius: 4,
                                        cursor: idx === list.length - 1 ? 'not-allowed' : 'pointer',
                                        opacity: idx === list.length - 1 ? 0.4 : 1,
                                        fontSize: 10,
                                    }}
                                >↓</button>
                                {!spec.fixed && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(idx)}
                                        title="Remove"
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid rgba(220,38,38,0.4)',
                                            color: '#ef4444',
                                            width: 22,
                                            height: 20,
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            fontSize: 10,
                                        }}
                                    >✕</button>
                                )}
                            </div>
                        </div>
                        {isStringList ? (
                            // Render the single field at the item path itself.
                            <ScalarField
                                spec={{ ...spec.itemFields[0], path: itemPath }}
                                getValue={getValue}
                                setValue={setValue}
                                openImagePicker={openImagePicker}
                                onTextChange={onTextChange}
                            />
                        ) : (
                            spec.itemFields.map((sub, sidx) => {
                                const subPath = joinPath(itemPath, sub.path);
                                return (
                                    <ScalarField
                                        key={sidx}
                                        spec={{ ...sub, path: subPath }}
                                        getValue={getValue}
                                        setValue={setValue}
                                        openImagePicker={openImagePicker}
                                        onTextChange={onTextChange}
                                    />
                                );
                            })
                        )}
                    </div>
                );
            })}
        </div>
    );
}
