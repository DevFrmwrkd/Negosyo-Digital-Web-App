# Website Schema Separation Plan

## Current Problem

The `generatedWebsites` table has a single `extractedContent: v.any()` field that contains ALL website content as a JSON blob:

```typescript
generatedWebsites: defineTable({
    submissionId: v.id('submissions'),
    templateName: v.string(),
    extractedContent: v.any(),      // ❌ ALL content crammed here (no type safety)
    customizations: v.optional(v.any()), // ❌ Also untyped
    htmlContent: v.optional(v.string()),
    // ... technical fields
})
```

### Problems:
1. **No type safety** - `v.any()` means no validation
2. **Content mixed with technical data** - Hard to maintain
3. **Cannot query individual fields** - Must fetch entire blob

---

## Proposed Solution: Single Content Table

Keep `creators`, `submissions`, and `generatedWebsites` as-is, but add **ONE new table** to store all website content with proper typing.

```
┌─────────────────┐         ┌─────────────────────┐
│   submissions   │         │  generatedWebsites  │
│  (business data)│         │  (technical only)   │
└────────┬────────┘         └──────────┬──────────┘
         │                             │
         │                             │
         └──────────┬──────────────────┘
                    │
                    ▼
           ┌─────────────────┐
           │ websiteContent  │
           │ (all content +  │
           │  styles in one  │
           │  typed table)   │
           └─────────────────┘
```

---

## New Table: `websiteContent`

One table with all content fields properly typed:

```typescript
websiteContent: defineTable({
    websiteId: v.id('generatedWebsites'),

    // ==================== BUSINESS INFO ====================
    businessName: v.string(),
    tagline: v.string(),
    aboutText: v.string(),
    tone: v.optional(v.string()),

    // ==================== HERO SECTION ====================
    heroHeadline: v.optional(v.string()),
    heroSubheadline: v.optional(v.string()),
    heroBadgeText: v.optional(v.string()),
    heroTestimonial: v.optional(v.string()),
    heroCtaLabel: v.optional(v.string()),
    heroCtaLink: v.optional(v.string()),

    // ==================== ABOUT SECTION ====================
    aboutHeadline: v.optional(v.string()),
    aboutDescription: v.optional(v.string()),
    uniqueSellingPoints: v.optional(v.array(v.string())),

    // ==================== SERVICES SECTION ====================
    servicesHeadline: v.optional(v.string()),
    servicesSubheadline: v.optional(v.string()),
    services: v.optional(v.array(v.object({
        name: v.string(),
        description: v.string(),
        icon: v.optional(v.string()),
    }))),

    // ==================== FEATURED SECTION ====================
    featuredHeadline: v.optional(v.string()),
    featuredSubheadline: v.optional(v.string()),
    featuredProducts: v.optional(v.array(v.object({
        title: v.string(),
        description: v.string(),
        image: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        testimonial: v.optional(v.object({
            quote: v.string(),
            author: v.string(),
            avatar: v.optional(v.string()),
        })),
    }))),

    // ==================== CONTACT INFO ====================
    contact: v.optional(v.object({
        email: v.string(),
        phone: v.string(),
        address: v.optional(v.string()),
        whatsapp: v.optional(v.string()),
        messenger: v.optional(v.string()),
    })),

    // ==================== FOOTER ====================
    footerDescription: v.optional(v.string()),
    socialLinks: v.optional(v.array(v.object({
        platform: v.string(),
        url: v.string(),
    }))),

    // ==================== NAVIGATION ====================
    navbarLinks: v.optional(v.array(v.object({
        label: v.string(),
        href: v.string(),
    }))),

    // ==================== IMAGES ====================
    images: v.optional(v.object({
        hero: v.optional(v.array(v.string())),
        about: v.optional(v.array(v.string())),
        services: v.optional(v.array(v.string())),
        featured: v.optional(v.array(v.string())),
        gallery: v.optional(v.array(v.string())),
    })),

    // ==================== VISIBILITY SETTINGS ====================
    visibility: v.optional(v.object({
        navbar: v.optional(v.boolean()),
        heroSection: v.optional(v.boolean()),
        heroHeadline: v.optional(v.boolean()),
        heroTagline: v.optional(v.boolean()),
        heroDescription: v.optional(v.boolean()),
        heroTestimonial: v.optional(v.boolean()),
        heroButton: v.optional(v.boolean()),
        heroImage: v.optional(v.boolean()),
        aboutSection: v.optional(v.boolean()),
        aboutBadge: v.optional(v.boolean()),
        aboutHeadline: v.optional(v.boolean()),
        aboutDescription: v.optional(v.boolean()),
        aboutImages: v.optional(v.boolean()),
        servicesSection: v.optional(v.boolean()),
        servicesBadge: v.optional(v.boolean()),
        servicesHeadline: v.optional(v.boolean()),
        servicesSubheadline: v.optional(v.boolean()),
        servicesImage: v.optional(v.boolean()),
        servicesList: v.optional(v.boolean()),
        featuredSection: v.optional(v.boolean()),
        featuredHeadline: v.optional(v.boolean()),
        featuredSubheadline: v.optional(v.boolean()),
        featuredProducts: v.optional(v.boolean()),
        footerSection: v.optional(v.boolean()),
        footerBadge: v.optional(v.boolean()),
        footerHeadline: v.optional(v.boolean()),
        footerDescription: v.optional(v.boolean()),
        footerContact: v.optional(v.boolean()),
        footerSocial: v.optional(v.boolean()),
    })),

    // ==================== CUSTOMIZATIONS (STYLES) ====================
    customizations: v.optional(v.object({
        navbarStyle: v.optional(v.string()),
        heroStyle: v.optional(v.string()),
        aboutStyle: v.optional(v.string()),
        servicesStyle: v.optional(v.string()),
        featuredStyle: v.optional(v.string()),
        footerStyle: v.optional(v.string()),
        colorScheme: v.optional(v.string()),
        fontPairing: v.optional(v.string()),
    })),

    // ==================== METADATA ====================
    updatedAt: v.number(),
})
    .index('by_websiteId', ['websiteId'])
```

---

## Refactored `generatedWebsites` Table

The `generatedWebsites` table becomes technical/deployment data only:

```typescript
generatedWebsites: defineTable({
    submissionId: v.id('submissions'),
    templateName: v.string(),

    // DEPRECATED - kept for backward compatibility during migration
    extractedContent: v.optional(v.any()),
    customizations: v.optional(v.any()),

    // Technical/build data
    htmlContent: v.optional(v.string()),
    cssContent: v.optional(v.string()),
    htmlStorageId: v.optional(v.id('_storage')),

    // Publishing/deployment
    status: v.union(v.literal('draft'), v.literal('published')),
    publishedUrl: v.optional(v.string()),
    netlifySiteId: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
})
```

---

## Migration Strategy

### Phase 1: Add New Table
1. Add `websiteContent` table to `schema.ts`
2. Deploy schema
3. No breaking changes

### Phase 2: Migrate Data
1. Create migration function that:
   - Reads `extractedContent` from each `generatedWebsites` record
   - Creates corresponding `websiteContent` record with typed fields
2. Run migration

### Phase 3: Update Application
1. Update mutations to write to `websiteContent` table
2. Update queries to read from `websiteContent` table
3. Keep `extractedContent` as fallback for unmigrated data

### Phase 4: Cleanup
1. Remove reads from `extractedContent`
2. Mark `extractedContent` as deprecated
3. Eventually remove field

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Tables | 3 | 4 (3 existing + 1 new) |
| Content storage | `v.any()` blob | Typed fields |
| Type safety | None | Full typing |
| Separation | Mixed | Content vs Technical |
| Complexity | Low | Still low |

---

## Files to Modify

### Convex Files
1. `convex/schema.ts` - Add `websiteContent` table
2. `convex/websiteContent.ts` (new) - CRUD operations
3. `convex/generatedWebsites.ts` - Update to use new table
4. `convex/migrations/migrateContent.ts` (new) - Migration function

### Frontend Files (After Migration)
1. `app/api/generate-website/route.ts` - Write to new table
2. `components/editor/VisualEditor.tsx` - Read/write new table
3. `components/ContentEditor.tsx` - Read/write new table

---

## Next Steps

1. Review and approve this plan
2. Add `websiteContent` table to schema
3. Create migration function
4. Run migration
5. Update application code
