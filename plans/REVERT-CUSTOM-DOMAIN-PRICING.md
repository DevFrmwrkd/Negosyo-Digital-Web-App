# Revert Custom Domain Test Pricing → Production

**Status:** ✅ REVERTED on April 12, 2026 — pricing is back to ₱1,500 production value
**Original test applied:** April 10, 2026 (₱100 for easier Wise payment flow testing)
**Kept for reference** — search this file for each change site if you need to re-apply test pricing in the future.

---

## ⚠ Also ensure Wise Creator Payout jar is configured

Before going live, confirm that the **Creator Payout jar** is set up so creator withdrawals pull from it instead of the main PHP balance:

```bash
# Required on production Convex
npx convex env set WISE_CREATOR_PAYOUT_BALANCE_ID "<creator_payout_jar_id>" --prod
```

Find the jar ID via:
```bash
curl -H "Authorization: Bearer $WISE_API_TOKEN" \
  "https://api.wise.com/v4/profiles/$WISE_PROFILE_ID/balances?types=SAVINGS"
```

Without this env var, creator withdrawals fall back to the main PHP balance, which mixes operating funds with creator payouts. See [WISE_PAYMENT_FLOW.md § Creator Payout Jar](../payments/WISE_PAYMENT_FLOW.md) for details.

**Related code changes (already applied):**
- `services/wise.ts` — `createQuote` accepts optional `sourceBalanceId`; `WiseConfig.creatorPayoutBalanceId` added
- `convex/wise.ts` — `getWiseConfig()` reads `WISE_CREATOR_PAYOUT_BALANCE_ID` env var and passes it through `createQuote`
- `docs/payments/WISE_PAYMENT_FLOW.md` — documents the Creator Payout jar flow

These are permanent — do NOT revert. They apply regardless of the ₱100/₱1,500 pricing.

---

## What changed for testing

When a creator types into the **Custom Domain (Optional)** field on the review page, the submission is auto-flagged with `submissionType: "with_custom_domain"` and the price is currently set to **₱100** instead of the production value of **₱1,500**.

**Standard tier (no custom domain) is unchanged at ₱1,000.** Only the with-custom-domain tier was lowered.

This is intentionally lower than the standard tier so that testing the bundled payment flow with Wise can be done with a minimal amount.

---

## Files changed

### 1. `convex/submissions.ts`

#### Change A — `submit` mutation (~line 218)
```ts
// CURRENT (TEST):
const submissionAmount = hasCustomDomain ? 100 : 1000;

// REVERT TO:
const submissionAmount = hasCustomDomain ? 1500 : 1000;
```

Also update the comment above the line:
```ts
// CURRENT (TEST):
// TEMP TEST PRICING: ₱100 for custom domain tier (was ₱1,500).
// See docs/plans/CUSTOM_DOMAIN_REVERT_PRICING.md to restore.

// REVERT TO:
// Pricing: ₱1,500 if a custom domain is requested, ₱1,000 otherwise.
// The extra ₱500 covers domain registration + setup automation.
```

#### Change B — `setDomainTier` mutation (~line 315)
```ts
// CURRENT (TEST):
// TEMP TEST PRICING: ₱100 for custom domain tier (was ₱1,500)
amount: args.submissionType === "with_custom_domain" ? 100 : 1000,

// REVERT TO:
amount: args.submissionType === "with_custom_domain" ? 1500 : 1000,
```

#### Change C — `setDomainTier` JSDoc (~line 270)
```ts
// CURRENT (TEST):
 *   - "with_custom_domain"   → ₱100 (TEST PRICING — was ₱1,500), requires requestedDomain
 * ...
 * See docs/plans/CUSTOM_DOMAIN_REVERT_PRICING.md to restore production pricing.

// REVERT TO:
 *   - "with_custom_domain"   → ₱1,500, requires requestedDomain
```
(Remove the line that links back to this revert doc.)

---

### 2. `convex/domains.ts` (~line 20)

```ts
// CURRENT (TEST):
const STANDARD_FEE_PHP = 1000;
// TEMP TEST PRICING: 100 (was 1500). See docs/plans/CUSTOM_DOMAIN_REVERT_PRICING.md
const WITH_DOMAIN_FEE_PHP = 100;
const DEFAULT_DOMAIN_BUDGET_PHP = 500;

// REVERT TO:
const STANDARD_FEE_PHP = 1000;
const WITH_DOMAIN_FEE_PHP = 1500;
const DEFAULT_DOMAIN_BUDGET_PHP = 500;
```

(Remove the comment line.)

---

### 3. `app/(app)/submit/review.tsx`

#### Change A — `totalAmount` derivation (~line 89)
```ts
// CURRENT (TEST):
// TEMP TEST PRICING: ₱100 for custom domain tier (was ₱1,500).
// See docs/plans/CUSTOM_DOMAIN_REVERT_PRICING.md to restore.
const totalAmount = wantsCustomDomain ? 100 : 1000;

// REVERT TO:
const totalAmount = wantsCustomDomain ? 1500 : 1000;
```

#### Change B — Body text in the custom domain card (~line 766)
```tsx
// CURRENT (TEST):
<Text className="text-xs text-zinc-600 leading-5 mb-3">
  Type a domain to add a custom domain — your fee automatically becomes
  ₱100 (TEST PRICING) and includes year 1 of the domain.
</Text>

// REVERT TO:
<Text className="text-xs text-zinc-600 leading-5 mb-3">
  Type a domain to add a custom domain — your fee automatically becomes
  ₱1,500 and includes year 1 of the domain.
</Text>
```

#### Change C — Header badge (~line 754)
```tsx
// CURRENT (TEST):
{wantsCustomDomain && (
  <View className="ml-2 px-2 py-0.5 bg-amber-100 rounded-full">
    <Text className="text-amber-700 text-[10px] font-bold">TEST ₱100</Text>
  </View>
)}

// REVERT TO:
{wantsCustomDomain && (
  <View className="ml-2 px-2 py-0.5 bg-emerald-100 rounded-full">
    <Text className="text-emerald-700 text-[10px] font-bold">+₱500</Text>
  </View>
)}
```

#### Change D — Total fee breakdown card (~line 922)
```tsx
// CURRENT (TEST):
{/* TEST MODE notice — replaces the production breakdown card.
    See docs/plans/CUSTOM_DOMAIN_REVERT_PRICING.md to restore. */}
{wantsCustomDomain && (
  <View className="border-t border-amber-200 pt-3 mt-1">
    <View className="flex-row items-center">
      <Ionicons name="flask-outline" size={14} color="#d97706" />
      <Text className="text-amber-700 text-xs font-bold ml-1">
        TEST PRICING — ₱100 flat (production: ₱1,500)
      </Text>
    </View>
  </View>
)}

// REVERT TO:
{/* Breakdown when custom domain is selected */}
{wantsCustomDomain && (
  <View className="border-t border-emerald-200 pt-3 mt-1">
    <View className="flex-row justify-between mb-1">
      <Text className="text-emerald-700 text-xs">Website creation</Text>
      <Text className="text-emerald-700 text-xs font-medium">₱1,000</Text>
    </View>
    <View className="flex-row justify-between">
      <Text className="text-emerald-700 text-xs">
        Custom domain (year 1 + setup)
      </Text>
      <Text className="text-emerald-700 text-xs font-medium">₱500</Text>
    </View>
  </View>
)}
```

---

## Things that DID NOT change (and should stay as-is)

These reference ₱500 / ₱1,500 for domain budget logic, NOT the bundled fee. **Do not touch them when reverting:**

- `DEFAULT_DOMAIN_BUDGET_PHP = 500` in `convex/domains.ts` — this is the per-domain registration budget cap (Hostinger price ceiling), not the test fee
- All `₱500 budget` references in `review.tsx` (e.g. line 239, 815, 979) — these refer to the domain price cap shown in availability errors, not the bundled fee

---

## How to revert (3-step checklist)

1. **Apply the file edits above** — search the codebase for `CUSTOM_DOMAIN_REVERT_PRICING` to find every spot that has a TEST comment pointing here
2. **Push to Convex production:**
   ```powershell
   cd C:\dev\ndm
   npx convex deploy
   ```
3. **Rebuild the mobile APK** with the production env:
   ```powershell
   Set-Location 'C:\dev\ndm\android'
   $env:NODE_OPTIONS='--max-old-space-size=8192'
   .\gradlew.bat assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
   ```

After reverting, do a final sanity check:
- Open the review page in the rebuilt APK
- Type a domain → fee should jump to ₱1,500 (not ₱100)
- Total fee card should show the ₱1,000 + ₱500 breakdown
- Header badge should be the green `+₱500` chip (not amber `TEST ₱100`)
- Submit a test submission → check `submissions[id].amount === 1500` in the Convex dashboard

---

## Search keys to find all change sites quickly

```
grep -r "CUSTOM_DOMAIN_REVERT_PRICING" .
grep -rn "TEST PRICING" convex app
grep -n "TEMP TEST PRICING" convex
```

Each occurrence is paired with a `// REVERT` reminder in the code itself.
