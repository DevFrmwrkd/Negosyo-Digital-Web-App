# Hostinger Custom Domain — Mobile App Changes

**Date:** April 2026
**Web project status:** ✅ Implemented (this Next.js project)
**Mobile project status:** ⏳ Pending (this doc explains what to add)

This document tracks the **mobile app** changes needed to align with the new automated custom domain feature that has been implemented in the Negosyo Digital web platform (Next.js + Convex). The web side handles domain registration, Cloudflare setup, and the admin UI. The mobile app needs UI changes so creators can pick a custom domain during the submission flow.

---

## Background — what changed on the web side

The custom domain feature was reworked to use **Hostinger's API** as the registrar (replacing Porkbun). **No more tier picker** — the creator just types into an optional domain input field on the review page, and the system auto-flags the submission as ₱1,500 (vs ₱1,000 for standard) based on whether the field is filled.

The full pipeline is now:

```
Creator types in OPTIONAL custom domain field on review page
  • Empty   → standard tier (₱1,000), no domain
  • Filled  → with_custom_domain tier (₱1,500), runs live availability check
  ↓
Creator submits → submission is created with submissionType + requestedDomain saved (auto-derived)
  ↓
Admin approves + sends payment email → business owner pays via Wise
  ↓
Wise webhook → auto-credits creator → triggers domains.setupForSubmission
  ↓
Hostinger API: re-check availability → get item_id → register domain → find subscription → disable auto-renewal
  ↓
Cloudflare API: create zone → attach to Pages project → wait for SSL
  ↓
Domain LIVE → creator gets push notification + business owner gets renewal disclaimer email
```

**Key business rules** the mobile app must communicate to creators:
- **Year 1 included free** in the ₱1,500 tier
- **Year 2+** is the business owner's responsibility (~₱1,120/year)
- Auto-renewal is **DISABLED** by default — domain expires unless business owner manually renews
- **`.ph` is blocked** from the standard tier (too expensive)
- Domain budget cap: **₱500** per domain (the platform's subsidy)

---

## What the mobile app needs to add

### 1. Convex schema awareness — new fields on `submissions`

The submissions table now has these new optional fields. The mobile app should know about them when reading/writing submissions:

```typescript
submissions: {
  // ... existing fields ...
  submissionType?: 'standard' | 'with_custom_domain'
  requestedDomain?: string                  // e.g. "juansbakery.com"
  domainStatus?: 'not_requested' | 'pending_payment' | 'registering'
                | 'configuring_dns' | 'provisioning_ssl' | 'live' | 'failed'
  domainFailureReason?: string
  registrarOrderId?: string
  domainExpiresAt?: number                  // timestamp 1 year from registration
  cloudflareZoneId?: string
}
```

### 2. New Convex mutation — `submissions.setDomainTier`

Already exists on the Convex backend. The mobile app should call it just before `submissions.submit()`:

```typescript
api.submissions.setDomainTier({
  id: submissionId,
  submissionType: 'with_custom_domain' | 'standard',
  requestedDomain: 'juansbakery.com' | undefined,
})
```

This mutation:
- Sets `submissionType` and `requestedDomain` on the submission
- Updates `amount` to ₱1,000 (standard) or ₱1,500 (with custom domain)
- Sets `domainStatus` to `'pending_payment'` or `'not_requested'`

**Validation**: throws if `submissionType === 'with_custom_domain'` but no domain is provided.

### 3. New Convex action — `domains.checkDomainAvailability`

Already exists as a public action. The mobile app calls it directly via the Convex client:

```typescript
const result = await convex.action(api.domains.checkDomainAvailability, {
  domain: 'juansbakery.com',
  maxBudgetPHP: 500,
})

// result shape:
{
  valid: boolean
  available?: boolean
  domain?: string
  priceUSD?: number
  pricePHP?: number
  withinBudget?: boolean       // true if pricePHP <= 500
  premium?: boolean            // true for premium domains (not eligible)
  reason?: string              // e.g. "Domain is already registered" or ".ph not supported"
  error?: string
  suggestions?: Array<{        // populated when domain is taken
    domain: string
    priceUSD: number
    pricePHP: number
    withinBudget: boolean
  }>
}
```

**Important caveats:**
- The action makes live HTTP calls to Hostinger's API — it can take 1-3 seconds
- **Must be debounced** in the UI (500ms recommended) to avoid hammering the API on every keystroke
- Hostinger has rate limits — don't poll faster than the user is typing
- The action is rate-limited per user via Convex (3-5 calls per minute should be safe)

### 4. Review screen — single optional domain input (no tier picker!)

**File:** `screens/SubmissionReviewScreen.tsx` (or whatever the mobile equivalent is)

**Important UX decision:** There is **NO tier picker** anymore. Just one optional text input. The tier is **auto-derived** from whether the input has content:

- **Empty input** → tier is `standard`, fee is **₱1,000**
- **Non-empty input** → tier is `with_custom_domain`, fee is **₱1,500**, runs availability check

Add a new section ABOVE the Terms checkbox / Submit button:

```
┌────────────────────────────────────────────┐
│ 🌐 Custom Domain (Optional)     [+₱500]    │  ← badge updates when filled
├────────────────────────────────────────────┤
│ Leave blank for the standard package       │
│ (₱1,000, free subdomain). Type a domain    │
│ to add a custom domain — your fee          │
│ automatically becomes ₱1,500 and includes  │
│ year 1 of the domain.                      │
│                                            │
│ ┌──────────────────────────────────────┐   │
│ │ yourbusiness.com (leave blank...) [✓]│   │  ← live availability indicator
│ └──────────────────────────────────────┘   │
│ ✓ Available · ₱504 (within budget)         │
│                                            │
│ ⚠ Year 1 included free.                    │
│   Year 2+ is ~₱1,120/year and is the       │
│   business owner's responsibility.         │
│   We do NOT auto-renew. We'll send         │
│   a reminder 30 days before expiry.        │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ Total business owner fee      ₱1,500       │  ← updates live based on input
└────────────────────────────────────────────┘
```

State (notice — no `tier` state, it's derived):
```typescript
const [domainInput, setDomainInput] = useState('')
const [checking, setChecking] = useState(false)
const [result, setResult] = useState<DomainCheckResult | null>(null)

// AUTO-DERIVED — not state
const wantsCustomDomain = domainInput.trim().length > 0
const tier: 'standard' | 'with_custom_domain' = wantsCustomDomain ? 'with_custom_domain' : 'standard'
const totalAmount = wantsCustomDomain ? 1500 : 1000
```

**Behavior:**
- Single TextInput with placeholder `e.g. yourbusiness.com (leave blank for standard)`
- On every change, debounce 500ms
- **If empty after debounce**, clear the result and skip the API call (user just wants standard tier)
- **If non-empty**, call `convex.action(api.domains.checkDomainAvailability, { domain, maxBudgetPHP: 500 })`
- Show spinner inside input while checking
- After response, show result icon: green check | red X | amber warning (over budget)
- A **"+₱500"** badge appears in the section header when the input is filled
- A **total fee summary card** below the section shows ₱1,000 or ₱1,500 dynamically
- Renewal disclaimer is **only shown when the input is filled** (not for standard tier)

### 5. Suggestions list (only when input has content + domain is taken)

When `result.suggestions` is non-empty:

```
Try these alternatives:
┌──────────────────────────────────────┐
│ • juansbakery.shop      ✓ ₱112       │  ← tap to use
│ • juansbakery.store     ✓ ₱280       │
│ • juansbakery.online    ✓ ₱56        │
│ • juansbakery.xyz       ✓ ₱112       │
└──────────────────────────────────────┘
```

On tap, set `domainInput` to the chosen domain and re-trigger the check.

### 6. Disable submit when domain input is invalid

The Submit button should be disabled if:
- The input is **non-empty** AND
- (`result?.available !== true` OR `result?.withinBudget !== true`)

If the input is empty, submit is always allowed (creator wants the standard tier).

If the input has content but the domain is taken/over-budget, show an inline error explaining: *"The custom domain you typed is not available or exceeds the ₱500 budget. Either pick a different domain or clear the field to submit without a custom domain."*

### 7. Save tier + domain on submit

Before calling the existing `submissions.submit()` mutation, call `setDomainTier` with the **auto-derived** tier:

```typescript
const handleSubmit = async () => {
  // Validate: if user typed a domain, it must be valid
  if (wantsCustomDomain && (!result?.available || !result?.withinBudget)) {
    showError('The custom domain you typed is not available or over budget. Clear the field to submit without one, or pick a different domain.')
    return
  }

  // 1. Save tier + domain choice (auto-derived from input)
  await convex.mutation(api.submissions.setDomainTier, {
    id: submissionId,
    submissionType: tier,                                       // auto-derived
    requestedDomain: wantsCustomDomain ? domainInput.trim().toLowerCase() : undefined,
  })

  // 2. Submit (existing flow)
  await convex.mutation(api.submissions.submit, { id: submissionId })

  // 3. Navigate to success
  navigation.replace('SubmissionSuccess')
}
```

### 9. Success screen — explain what happens next

On the post-submission success screen, if the creator picked the custom domain tier, add a section explaining:

> 🌐 **Custom domain coming soon**
>
> You picked `juansbakery.com`. Once the business owner pays, the domain will be automatically registered and connected to the website. This usually takes 2-6 minutes.
>
> You'll get a notification when it's live!

Read `submission.requestedDomain` from Convex to display the chosen domain.

### 10. Submission detail screen — show domain status

When viewing a paid submission, show its domain lifecycle:

```typescript
// Read submission.domainStatus from Convex
switch (submission.domainStatus) {
  case 'pending_payment': return '⏳ Awaiting business owner payment'
  case 'registering':     return '🔄 Registering domain...'
  case 'configuring_dns': return '🔄 Configuring DNS...'
  case 'provisioning_ssl': return '🔄 Provisioning SSL certificate...'
  case 'live':            return `✅ Live at ${submission.requestedDomain}`
  case 'failed':          return `❌ Setup failed: ${submission.domainFailureReason}`
  default:                return null
}
```

For `live` status, make the domain a tappable link that opens the website:
```typescript
Linking.openURL(`https://${submission.requestedDomain}`)
```

### 11. Push notification handler — `website_live` type

Already supported by the existing notification system. When a `website_live` notification arrives, the data payload includes:

```typescript
{
  type: 'website_live',
  title: 'Your website is now live!',
  body: 'juansbakery.com is up and running.',
  data: {
    submissionId: 'jd7...',
    url: 'https://juansbakery.com',
  }
}
```

Mobile handler should:
1. Display the notification with the icon
2. On tap, navigate to the submission detail screen
3. Auto-refresh the wallet balance (since payment was just credited)

---

## Wallet earnings — explain the payment source

When a creator earns from a custom-domain submission, the wallet should show the source clearly. The earnings record now includes the payment reference and a `paymentRefCode` in the metadata. Mobile can display:

```
+₱800   For "Juans Bakery"  · Auto-paid via Wise
```

Optional: add a small badge if the submission included a custom domain:
```
+₱800   For "Juans Bakery"  · Auto-paid via Wise · 🌐 Custom domain
```

---

## What does NOT need to change on mobile

- ✅ The withdrawal flow (creator → Wise) is unchanged
- ✅ Push notification infrastructure is unchanged
- ✅ Submission flow up to the review page is unchanged (info → photos → interview → review)
- ✅ Auth (Clerk) is unchanged
- ✅ Convex client setup is unchanged

---

## Testing checklist for mobile

### Basic flow
- [ ] Leave domain field BLANK → total shows ₱1,000, "+₱500" badge hidden, submit creates submission with `submissionType: 'standard'`, `amount: 1000`, no `requestedDomain`
- [ ] Type a known-available domain → total shows ₱1,500, "+₱500" badge appears, renewal disclaimer appears, submit creates submission with `submissionType: 'with_custom_domain'`, `amount: 1500`, `requestedDomain` set
- [ ] Clear the field after typing → total reverts to ₱1,000, badge disappears, submission falls back to standard tier
- [ ] Verify the auto-derive logic: `wantsCustomDomain = domainInput.trim().length > 0`

### Availability check (only fires when input is non-empty)
- [ ] Empty input → no API call (verify in network log)
- [ ] Type a domain → spinner appears → result shows within 2 seconds
- [ ] Type a known-taken domain (e.g. `google.com`) → shows "not available" + suggestions
- [ ] Tap a suggestion → domain input updates and re-checks
- [ ] Type a `.ph` domain → shows "not supported in standard package"
- [ ] Type a domain over ₱500 budget → shows "available but over budget" warning
- [ ] Clear the input after a check → result vanishes, no stale data

### Validation
- [ ] Submit button DISABLED when input has content but domain is taken/over-budget (with inline error)
- [ ] Submit button ENABLED when input is empty (standard tier)
- [ ] Submit button ENABLED when input has a valid available domain
- [ ] Inline error tells user to either fix or clear the field

### Lifecycle
- [ ] After business owner pays → push notification arrives → domain status updates
- [ ] Submission detail page shows live status with clickable URL
- [ ] Wallet balance refreshes after webhook fires

### Edge cases
- [ ] Network error during availability check → shows "couldn't check, try again"
- [ ] Slow Hostinger response → spinner stays visible
- [ ] Re-typing the same domain doesn't make a duplicate API call (debounce works)
- [ ] Going back to review screen and changing tier preserves the domain input

---

## Environment variables (mobile app)

No new env vars needed on the mobile side. The mobile app just calls Convex actions/mutations — Hostinger credentials live on the Convex backend.

---

## Open questions for mobile team

1. **Do you want to show the live exchange rate?** The web side now uses a live USD→PHP rate (via Frankfurter API, cached 1 hour). Domain prices in PHP may shift slightly day-to-day. If the mobile shows a price, it should re-check on submit to confirm.

2. **Should the renewal disclaimer require an acknowledgment checkbox?** Currently the web side just shows it as a notice. For legal clarity, consider requiring the creator to tap "I understand" before they can submit (only when the input is filled).

3. **Domain ownership transfer flow** — after year 1, business owners may want to transfer the domain to their own registrar. This isn't built yet on either web or mobile. Should we support it as a future feature?

---

## Backend reference (already implemented)

### Convex modules
- `convex/lib/hostinger.ts` — Hostinger API client (verified against [openapi.json](https://developers.hostinger.com/openapi/openapi.json))
- `convex/lib/fxRate.ts` — Live USD→PHP rate via [Frankfurter API](https://frankfurter.dev/)
- `convex/lib/cloudflare.ts` — Cloudflare zone + Pages custom domain API
- `convex/domains.ts` — `checkDomainAvailability` (action), `setupForSubmission` (internal action), `purchaseDomainForSubmission` (admin action)
- `convex/payments.ts::creditCreatorForPayment` — auto-triggers `domains.setupForSubmission` after payment
- `convex/submissions.ts::setDomainTier` — mutation called from review screen

### Next.js API routes
- `POST /api/check-domain` — creator-facing availability check (public, rate-limited)
- `POST /api/admin/check-domain` — admin version
- `POST /api/admin/purchase-domain` — admin manual purchase trigger
- `GET /api/admin/hostinger-status` — payment method widget
- `POST /api/internal/send-domain-live-email` — domain-live email with renewal disclaimer

### Admin UI
- `/admin/submissions/[id]/domain` — per-submission domain management page

---

## Hostinger API endpoints used (verified against OpenAPI spec)

| Operation | Method | Path |
|-----------|--------|------|
| Check availability | POST | `/api/domains/v1/availability` |
| Purchase domain | POST | `/api/domains/v1/portfolio` |
| Update nameservers | PUT | `/api/domains/v1/portfolio/{domain}/nameservers` |
| List subscriptions | GET | `/api/billing/v1/subscriptions` |
| Disable auto-renewal | DELETE | `/api/billing/v1/subscriptions/{subscriptionId}/auto-renewal/disable` |
| List payment methods | GET | `/api/billing/v1/payment-methods` |
| Get domain info | GET | `/api/domains/v1/portfolio/{domain}` |

**Auth**: `Authorization: Bearer {HOSTINGER_API_KEY}` header on all requests.

**Important quirk**: Auto-renewal is on a **subscription** (not a domain), so after registering, we have to look up the subscription via `GET /billing/v1/subscriptions` and find the one matching our domain name. We wait 3 seconds after purchase for Hostinger to create the subscription record.

---

## File reference map

| File | Purpose |
|------|---------|
| `convex/lib/hostinger.ts` | Hostinger API client (registrar) |
| `convex/lib/fxRate.ts` | Live USD→PHP rate (Frankfurter API) |
| `convex/lib/cloudflare.ts` | Cloudflare zone + Pages custom domain |
| `convex/domains.ts` | Orchestration: check, purchase, setup pipeline |
| `convex/submissions.ts` | `setDomainTier` mutation |
| `convex/payments.ts` | Auto-triggers domain setup after payment |
| `app/submit/review/page.tsx` | Web reference implementation of the picker UI |
| `app/admin/submissions/[id]/domain/page.tsx` | Admin domain management page |
| `lib/email/templates.ts` | `getDomainLiveEmailHtml` (renewal disclaimer email) |

---

## Migration notes

- **Old Porkbun code is fully deleted.** Mobile doesn't need to remove anything since mobile never integrated with the registrar directly.
- **The architecture is registrar-agnostic** — if Hostinger ever stops working, swapping to another registrar only requires changing `convex/lib/hostinger.ts`. The mobile app would not need any code changes for that swap.
