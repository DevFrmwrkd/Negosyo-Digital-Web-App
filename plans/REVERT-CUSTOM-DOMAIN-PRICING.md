# Revert Custom Domain Pricing: ₱100 → ₱1,500

**Status:** Test pricing currently active
**Created:** April 2026
**Purpose:** Temporary low pricing for end-to-end testing of the custom domain purchase pipeline

## Why this exists

The custom domain feature charges business owners ₱1,500 normally (₱500 of which covers a year of domain registration via Hostinger). For end-to-end testing of the full pipeline (Wise payment → webhook → Hostinger purchase → Cloudflare zone → SSL → live site), the ₱1,500 was temporarily lowered to **₱100** so test transactions don't burn real money.

When testing is complete, all changes below must be reverted before production launch.

---

## Files to revert (4 changes total)

### 1. `app/submit/review/page.tsx`

**Line ~43** — `totalAmount` calculation:

```diff
- // TEST PRICING: custom domain is temporarily ₱100 instead of ₱1,500 (revert via plans/REVERT-CUSTOM-DOMAIN-PRICING.md)
- const totalAmount = wantsCustomDomain ? 100 : 1000
+ const totalAmount = wantsCustomDomain ? 1500 : 1000
```

**Line ~345** — Section comment:

```diff
- {/* Custom Domain (optional) — typing here auto-flags submission as ₱100 (TEST PRICING — normally ₱1,500) */}
+ {/* Custom Domain (optional) — typing here auto-flags submission as ₱1,500 */}
```

**Line ~353** — Header badge:

```diff
- {wantsCustomDomain ? 'TEST: ₱100' : 'Not included'}
+ {wantsCustomDomain ? '+₱500' : 'Not included'}
```

**Line ~357** — Description text:

```diff
- Leave this blank for the standard package (₱1,000, free subdomain). Type a domain to add a custom domain — your fee automatically becomes ₱100 (TEST PRICING) and includes year 1 of the domain.
+ Leave this blank for the standard package (₱1,000, free subdomain). Type a domain to add a custom domain — your fee automatically becomes ₱1,500 and includes year 1 of the domain.
```

**Line ~390** — Availability success message:

```diff
- ✓ Available · ₱{domainCheck.pricePHP} (within budget — included in your ₱100 test fee)
+ ✓ Available · ₱{domainCheck.pricePHP} (within budget — included in your ₱1,500 fee)
```

---

### 2. `convex/submissions.ts`

**Line ~324-328** — `submit` mutation amount:

```diff
  const updates: any = {
      submissionType: args.submissionType,
-     // TEST PRICING: custom domain temporarily ₱100 instead of ₱1,500
-     // See plans/REVERT-CUSTOM-DOMAIN-PRICING.md to restore
-     amount: isWithDomain ? 100 : 1000,
+     amount: isWithDomain ? 1500 : 1000,
      domainStatus: isWithDomain ? 'pending_payment' : 'not_requested',
  };
```

---

### 3. `convex/schema.ts`

**Line ~126** — Comment on the `submissionType` literal:

```diff
- v.literal('with_custom_domain')     // TEST: ₱100 (normally ₱1,500) — includes custom domain
+ v.literal('with_custom_domain')     // ₱1,500 — includes custom domain
```

---

### 4. `app/admin/submissions/[id]/page.tsx`

**Pricing & Domain widget** — the fallback amount for custom domain:

```diff
  {/* TEST PRICING: ₱100 for custom domain, normally ₱1,500 — see plans/REVERT-CUSTOM-DOMAIN-PRICING.md */}
- ₱{((submissionData as any)?.amount || ((submissionData as any)?.requestedDomain ? 100 : 1000)).toLocaleString()}
+ ₱{((submissionData as any)?.amount || ((submissionData as any)?.requestedDomain ? 1500 : 1000)).toLocaleString()}
```

---

## Quick revert (search & replace)

If you'd rather grep your way through:

```bash
# Search for all test-pricing markers
grep -rn "TEST PRICING\|TEST: ₱100\|? 100 :" \
  app/submit/review/page.tsx \
  convex/submissions.ts \
  convex/schema.ts \
  app/admin/submissions/\[id\]/page.tsx

# Then manually fix each match per the diffs above
```

---

## After reverting

1. **Delete this file** — `plans/REVERT-CUSTOM-DOMAIN-PRICING.md`
2. **Run** `npm run build` to confirm no broken references
3. **Run** `npm test` to confirm Jest tests still pass (50 tests)
4. **Deploy** to Convex: `npx convex deploy` (schema comment change is cosmetic but the deploy refreshes generated types)
5. **Smoke test**: visit the review page on a draft submission, type a domain, confirm the total summary shows ₱1,500 again

---

## What stays the same (do NOT change)

These are unrelated and should remain at their current values:

- **Standard tier price**: ₱1,000 (only the with_custom_domain tier was lowered)
- **Domain budget**: ₱500 max for Hostinger registration (this is the budget the platform allocates for the actual domain cost — independent of the tier price)
- **Renewal disclaimer text**: still mentions "~₱1,120/year for year 2+" — this is the actual Hostinger renewal cost the business owner will eventually pay, not a tier price
- **Wise payment flow**: still uses `submission.amount` so once you revert to 1500, the payment email and webhook matching will use the correct amount automatically

---

## Files that mention 1500 but should NOT change

These contain ₱1,500 references in documentation/architecture text — they describe the production pricing model and don't need to be edited for testing:

- `docs/changes/CUSTOM-DOMAIN-PURCHASE-PLAN.md`
- `docs/changes/HOSTINGER-CUSTOM-DOMAIN.md`
- `docs/wise/WISE-PAYMENT-RE-ENGINEERING.md`
- `docs/wise/WISE-PAYMENT-FLOW-MOBILE.md`
- `docs/wise/WISE-PAYMENT-ARCHITECTURE.md`

(Doc text still says ₱1,500 because that's the real production price. The code is the only thing currently overriding it for testing.)
