# Devpatch Test Plan — Admin Dashboard Backend Wiring

## Prerequisites

1. Run `npx convex dev` to deploy the new schema + backend functions
2. Run `npm run dev` to start the Next.js app
3. Log in as an admin user

---

## Test 1: Approve Submission (Audit + Notification + Analytics + Referral)

**Steps:**
1. Go to `/admin` — find a submission with status "submitted" or "in_review"
2. Click the submission to view details
3. Click "Mark as In Review" (if submitted)
4. Generate the website if not already generated
5. Click "Approve"

**Expected Results:**
- Submission status changes to "approved"
- Go to `/admin/audit` — a green "Approved" entry should appear with the business name
- The `submissions` table should have `reviewedBy` (your Clerk ID) and `reviewedAt` set
- An `analytics` record should be created/updated with `approvedCount` incremented
- A `notifications` record should be created with type `submission_approved`
- If the creator was referred: a `referrals` record should change from "pending" to "qualified" with ₱100 `bonusAmount`

---

## Test 2: Reject Submission (With Reason)

**Steps:**
1. Go to `/admin` — find a submission with status "submitted" or "in_review"
2. Click to view details
3. Click "Reject"
4. A modal should appear — enter a rejection reason (e.g., "Incomplete photos")
5. Click "Reject" in the modal

**Expected Results:**
- Submission status changes to "rejected"
- The `rejectionReason` field is set on the submission
- Go to `/admin/audit` — a red "Rejected" entry should appear with the reason in Details
- An `analytics` record should show `rejectedCount` incremented
- A `notifications` record should be created with type `submission_rejected` including the reason

---

## Test 3: Publish Website (Deploy Audit Trail)

**Steps:**
1. Go to `/admin` — find an approved submission
2. Generate the website if needed
3. Click "Publish Website"
4. Wait for deployment to complete

**Expected Results:**
- Website deploys to Cloudflare Pages
- Status changes to "deployed"
- Published URL is shown with "Visit Published Site" link
- Go to `/admin/audit` — a blue "Deployed" entry should appear with the website URL
- A `notifications` record should be created with type `website_live`
- `analytics` should show `websitesLive` incremented

---

## Test 4: Mark as Paid (Earning Record + Audit)

**Steps:**
1. Go to `/admin/payouts` — find a submission with a pending payout request
2. Click "Mark Paid" on an individual payout

**Expected Results:**
- Submission status changes to "completed"
- Go to `/admin/audit` — an orange "Payment Sent" entry should appear with the amount
- An `earnings` record should be created with `type: "submission_approved"` and the payout amount
- The creator's `balance` and `totalEarnings` should increase by the payout amount
- A `notifications` record should be created with type `payout_sent`
- `analytics` should show `earningsTotal` incremented by the payout amount

---

## Test 5: Audit Logs Page

**Steps:**
1. Go to `/admin/audit`

**Expected Results:**
- All admin actions are listed in reverse chronological order
- Each entry shows: Timestamp, Admin ID (truncated), Action (color badge), Target type, Details
- Filter tabs work:
  - "All" — shows everything
  - "Approvals" — only green "Approved" entries
  - "Rejections" — only red "Rejected" entries
  - "Deployments" — only blue "Deployed" and purple "Website Generated" entries
  - "Payments" — only orange "Payment Sent" entries
- Clicking "View Submission" on a submission target navigates to the submission detail page
- Details column shows business name, rejection reason (red), amount (orange), and website URL (blue link)

---

## Test 6: Audit Logs Navigation

**Steps:**
1. Go to `/admin`
2. Verify the "Audit Logs" button is visible in the header nav bar (next to Creators and Payouts)
3. Click "Audit Logs"

**Expected Results:**
- Navigates to `/admin/audit`
- Page loads with the audit log table

---

## Test 7: Republish After Edit

**Steps:**
1. Find a deployed submission
2. Go to the Content tab and make a change
3. Save the content
4. Click "Republish Website"

**Expected Results:**
- Website re-deploys with updated content
- Status stays as "deployed" (should NOT reset to "website_generated")
- Published URL remains the same

---

## Test 8: Unpublish Website

**Steps:**
1. Find a deployed submission with a published URL
2. Click "Unpublish" (red button)

**Expected Results:**
- Cloudflare Pages project is deleted
- Published URL disappears from the UI
- Status changes back to "approved"

---

## Schema Verification

After running `npx convex dev`, verify these new tables exist in the Convex dashboard:

| Table | Expected |
|-------|----------|
| `auditLogs` | Indexes: by_admin, by_target, by_action, by_timestamp |
| `earnings` | Indexes: by_creator, by_submission |
| `withdrawals` | Indexes: by_creator, by_status |
| `payoutMethods` | Index: by_creator |
| `leads` | Indexes: by_submission, by_creator, by_status |
| `leadNotes` | Index: by_lead |
| `notifications` | Indexes: by_creator, by_creator_unread |
| `pushTokens` | Indexes: by_creator, by_token |
| `referrals` | Indexes: by_referrer, by_referred, by_status |
| `analytics` | Indexes: by_creator_period, by_period |
| `websiteAnalytics` | Indexes: by_submission_date, by_date |
| `settings` | Index: by_key |

**New fields on existing tables:**

| Table | New Fields |
|-------|-----------|
| `creators` | referredByCode, totalWithdrawn, submissionCount, level, updatedAt, lastActiveAt |
| `submissions` | rejectionReason, reviewedBy, reviewedAt, businessDescription, province, barangay, postalCode, coordinates, aiGeneratedContent, platformFee |
| `generatedWebsites` | subdomain, customDomain |

---

## Cron Job Verification

- A daily cron job `aggregate-daily-analytics` should be registered in the Convex dashboard
- It runs at midnight UTC and aggregates daily analytics into monthly records

---

## Files Changed

### New Files (12 backend + 1 UI + 1 doc)
- `convex/auditLogs.ts`
- `convex/notifications.ts`
- `convex/referrals.ts`
- `convex/earnings.ts`
- `convex/withdrawals.ts`
- `convex/payoutMethods.ts`
- `convex/leads.ts`
- `convex/leadNotes.ts`
- `convex/settings.ts`
- `convex/analytics.ts`
- `convex/analyticsJobs.ts`
- `convex/crons.ts`
- `app/admin/audit/page.tsx`
- `docs/Devpatch-Test.md`

### Modified Files
- `convex/schema.ts` — 12 new tables + new fields on creators/submissions/generatedWebsites
- `convex/admin.ts` — 4 wired mutations (approveSubmission, rejectSubmission, markDeployed, markPaid)
- `convex/creators.ts` — referral wiring in create mutation
- `convex/submissions.ts` — analytics wiring + new optional fields
- `app/admin/page.tsx` — added Audit Logs nav link
- `app/admin/submissions/[id]/page.tsx` — wired mutations, rejection reason modal, markDeployed on publish
- `app/admin/payouts/page.tsx` — wired markPaid with adminId
