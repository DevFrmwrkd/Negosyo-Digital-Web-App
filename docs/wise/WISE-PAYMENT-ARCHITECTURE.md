# Wise Payment System - Complete Architecture Overview

**Date:** April 2026  
**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** April 10, 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Wise Payment Flow (End-to-End)](#wise-payment-flow-end-to-end)
4. [Mobile App Workflow](#mobile-app-workflow)
5. [Admin Dashboard Workflow](#admin-dashboard-workflow)
6. [Web System Implementation](#web-system-implementation)
7. [Mobile App Integration Requirements](#mobile-app-integration-requirements)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Error Handling & Retry Logic](#error-handling--retry-logic)
10. [Security & Compliance](#security--compliance)

---

## System Overview

### Core Concept
**Zero-Admin-Approval Instant Withdrawals:** Users can withdraw their balance instantly via Wise API. No manual admin approval needed. System is fully automated with comprehensive audit trails.

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **Mobile App** | Initiates withdrawal requests | User device |
| **Web API** | Validates & processes withdrawals | `/api/withdrawals/create` |
| **Convex Backend** | Manages database, triggers Wise transfers | `convex/withdrawals.ts` |
| **Wise API Service** | Communicates with Wise platform | `lib/payments/wise-api.ts` |
| **Admin Dashboard** | Monitors all withdrawals (read-only) | `/admin/withdrawals` |
| **Audit Logs** | Records every transaction | `convex/auditLogs.ts` |
| **Notification System** | Sends user confirmations | `convex/notifications.ts` |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APP                               │
│    [Wallet Screen] → [Withdrawal Form] → [Confirm Dialog]      │
│         ↓                                        ↓              │
│    Shows Balance ₱1,500    Enters Amount ₱300   Submits         │
└─────────────────────────────────────────────────────────────────┘
                             ↓
                    POST /api/withdrawals/create
                    {
                      creatorId: "creator-123",
                      amount: 300,
                      payoutMethod: "wise_email",
                      accountDetails: "user@email.com"
                    }
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    WEB API ROUTE                                │
│           /api/withdrawals/create (Next.js)                    │
│    • Authenticate user (Clerk)                                 │
│    • Validate balance ≥ amount                                 │
│    • Call Convex mutation                                      │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   CONVEX BACKEND                               │
│                                                                 │
│  mutations.withdrawals.create()                               │
│  ├─ Validate balance ✓                                         │
│  ├─ Generate reference: PAYOUT-abc123-1712748000              │
│  ├─ Schedule Wise transfer (async)                            │
│  ├─ Deduct balance immediately: ₱1,500 → ₱1,200             │
│  ├─ Mark withdrawal "completed"                               │
│  ├─ Send notification                                         │
│  └─ Log audit trail                                           │
└─────────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────┴────────────────────┐
        ↓                                         ↓
┌──────────────────┐                  ┌──────────────────┐
│  WISE API        │                  │  NOTIFICATION    │
│  SERVICE         │                  │  SYSTEM          │
│                  │                  │                  │
│ 1. Get quote     │                  │ Send to user:    │
│ 2. Create        │                  │ "Withdrawal      │
│    recipient     │                  │  Completed!      │
│ 3. Create        │                  │  ₱300 sent to    │
│    transfer      │                  │  Wise"           │
│ 4. Fund transfer │                  │                  │
│ 5. Track status  │                  │ Email + Push     │
└──────────────────┘                  └──────────────────┘
        ↓
┌──────────────────────────────────────────────────────────┐
│              WISE PLATFORM                              │
│ • Creates recipient record for user's email             │
│ • Sets up transfer in Wise system                       │
│ • Deducts from admin's Wise account                     │
│ • Sends to user's Wise email                           │
│ • Returns transaction ID & status                       │
└──────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│              AUDIT LOGS                                │
│ • Action: 'payout_sent'                               │
│ • Amount: ₱300                                        │
│ • Reference: PAYOUT-abc123-1712748000                │
│ • Wise Transaction ID: wise-12345                    │
│ • Status: PROCESSING → COMPLETED                     │
│ • Timestamp: logged                                  │
└─────────────────────────────────────────────────────────┘
                     ↓
        ┌────────────────────────────────┐
        ↓                                ↓
┌──────────────────────┐        ┌──────────────────────┐
│  ADMIN DASHBOARD     │        │  MOBILE APP          │
│  /admin/withdrawals  │        │  Wallet Updated      │
│                      │        │                      │
│ • View completed:    │        │ New Balance:         │
│   ₱300 to user@...   │        │ ₱1,200               │
│                      │        │                      │
│ • Modal shows:       │        │ Notification:        │
│   - Creator info     │        │ "Withdrawal sent!"   │
│   - Wise TX ID       │        │                      │
│   - Status           │        │ History shows:       │
│   - Error (if any)   │        │ - Date               │
│   - Timeline         │        │ - Amount             │
│                      │        │ - Status             │
└──────────────────────┘        └──────────────────────┘
```

---

## Wise Payment Flow (End-to-End)

### Complete Withdrawal Lifecycle

#### **Stage 1: User Initiates (Mobile App)**
```
User Action: Click "Withdraw" → Enter ₱300 → Confirm

Request sent:
POST /api/withdrawals/create
{
  "creatorId": "creator-abc123",
  "amount": 300,
  "payoutMethod": "wise_email",
  "accountDetails": "creator@email.com"
}

Response:
{
  "success": true,
  "withdrawalId": "id-12345",
  "message": "Withdrawal processed! Funds will arrive in 1-2 business days."
}
```

#### **Stage 2: Backend Validation (Web API)**
```
1. Authenticate request (Clerk)
   └─ Verify user is logged in & valid

2. Authorize creator
   └─ Verify creatorId matches authenticated user

3. Call Convex mutation
   └─ Pass validated args to withdrawals.create()
```

#### **Stage 3: Convex Processing (Automatic)**
```
withdrawals.create() execution:

✓ Validate balance
  └─ If balance < amount → Return error, abort

✓ Generate reference
  └─ PAYOUT-{creatorId.substring(0,8)}-{timestamp}

✓ Deduct balance immediately (optimistic)
  └─ ₱1,500 → ₱1,200
  └─ Locked to user (not available for new withdrawal)

✓ Create withdrawal record
  {
    creatorId,
    amount,
    payoutMethod,
    status: 'completed',      // Instant, no pending state
    reference,
    wiseTransactionId: null,  // Will be updated by async action
    wiseStatus: 'PROCESSING',
    createdAt: Date.now(),
    processedAt: Date.now()
  }

✓ Schedule Wise transfer (async, non-blocking)
  └─ ctx.scheduler.runAfter(0, processWiseTransfer)
  └─ Doesn't block withdrawal creation response
  └─ Runs in background, updates record when complete

✓ Send notification to user
  └─ "Withdrawal Completed! ₱300 sent to your Wise account"
  └─ Email + Push notification

✓ Log audit trail
  └─ action: 'payout_sent'
  └─ Full transaction details recorded
```

#### **Stage 4: Wise Transfer (Background Process)**
```
processWiseTransfer() internal action:

1. Get Wise API service config
   └─ WISE_API_TOKEN from environment
   └─ WISE_ACCOUNT_ID from environment

2. Create quote (rate lock)
   └─ Source: PHP (₱)
   └─ Target: User's Wise currency
   └─ Amount: ₱300

3. Create recipient
   └─ Email: creator@email.com
   └─ Name: Creator's full name
   └─ Wise creates recipient record

4. Create transfer
   └─ From: Admin's Wise account
   └─ To: User's recipient record
   └─ Amount & quote

5. Fund transfer
   └─ Deduct from admin's Wise account
   └─ Transfer moves to user's Wise account
   └─ Returns transaction ID & status

6. Update withdrawal record
   └─ wiseTransactionId: actual Wise TX ID
   └─ wiseStatus: 'COMPLETED' (from Wise API)

7. Handle errors
   └─ If any step fails: 
   └─── Catch error, update record
   └─── Mark wiseStatus: 'FAILED'
   └─── Store errorMessage
   └─── balance restored if transfer failed? (logic decision)
```

#### **Stage 5: User Receives (Wise Account)**
```
Timeline:
- Immediately: Funds in admin's Wise account → User's recipient
- 1-2 min: Transfer status updates to 'COMPLETED'
- 1-2 business days: User receives in their bank/Wise account

User notification:
Email: "Your ₱300 withdrawal has been processed"
Push: "Withdrawal completed! Check your Wise account"

Mobile app auto-updates:
- Balance reflects new amount (₱1,200)
- Withdrawal marked as 'completed'
- History shows transaction
```

#### **Stage 6: Admin Monitoring (Dashboard)**
```
Admin navigates to /admin/withdrawals

Sees table:
┌──────────────────────────────────────────────────────┐
│ Creator        │ Amount │ Method      │ Status      │
├──────────────────────────────────────────────────────┤
│ John Doe       │ ₱300   │ wise_email  │ COMPLETED   │
└──────────────────────────────────────────────────────┘

Clicks "View" → Modal opens:
┌─────────────────────────────────────────────────────┐
│ WITHDRAWAL DETAILS                                  │
├─────────────────────────────────────────────────────┤
│ Creator: John Doe                                   │
│ Email: john@example.com                             │
│                                                     │
│ Transaction Details:                                │
│ Amount: ₱300                                        │
│ Status: COMPLETED                                   │
│                                                     │
│ Payout Method:                                      │
│ Type: wise_email                                    │
│ Email: john@example.com                             │
│                                                     │
│ Wise Transfer Details:                              │
│ Transaction ID: TXN-12345                           │
│ Wise Status: COMPLETED                              │
│ Reference: PAYOUT-abc123-1712748000                │
│                                                     │
│ Timeline:                                           │
│ Created: Apr 10, 2026 2:30 PM                      │
│ Processed: Apr 10, 2026 2:30 PM                    │
└─────────────────────────────────────────────────────┘

Features:
✓ Read-only (cannot modify)
✓ Shows full transaction history
✓ Can see Wise transaction ID for tracking at Wise
✓ Can see any error messages if transfer failed
✓ Emergency override available (adminRetry) for edge cases
```

---

## Mobile App Workflow

### User Journey

#### **1. Access Wallet**
```
Mobile App Navigation:
Drawer Menu → Wallet

OR

Tab Navigation → Wallet Tab

Display:
┌────────────────────────────────────┐
│ WALLET BALANCE                     │
├────────────────────────────────────┤
│            ₱ 1,500.00              │
├────────────────────────────────────┤
│ [WITHDRAW] [DEPOSIT] [HISTORY]     │
└────────────────────────────────────┘
```

#### **2. Initiate Withdrawal**
```
User Action: Tap [WITHDRAW]

Screen: Withdrawal Form
┌────────────────────────────────────┐
│ WITHDRAW FUNDS                     │
├────────────────────────────────────┤
│ Available Balance: ₱1,500           │
│                                     │
│ Amount to Withdraw: [________]     │
│                                     │
│ Payout Method:                      │
│ ○ Wise Email (Recommended)         │
│ ○ GCash                            │
│ ○ Maya                             │
│ ○ Bank Transfer                    │
│                                     │
│ Account Details:                    │
│ [____________________________]      │
│ (Auto-filled from profile)         │
│                                     │
│ [CANCEL] [CONFIRM WITHDRAWAL]      │
└────────────────────────────────────┘

Validation:
- Amount > 0? ✓
- Amount ≤ balance? ✓
- Account details filled? ✓
- Method selected? ✓
```

#### **3. Confirm Withdrawal**
```
User Action: Tap [CONFIRM WITHDRAWAL]

Screen: Confirmation Dialog
┌────────────────────────────────────┐
│ CONFIRM WITHDRAWAL                 │
├────────────────────────────────────┤
│ Amount: ₱300                        │
│ Method: Wise Email                  │
│ To: creator@email.com               │
│                                     │
│ This will deduct ₱300 from your    │
│ balance. Funds arrive in 1-2       │
│ business days.                      │
│                                     │
│ [CANCEL] [CONFIRM]                 │
└────────────────────────────────────┘
```

#### **4. Process Withdrawal**
```
User Action: Tap [CONFIRM]

App Action:
1. Show loading spinner
2. Call POST /api/withdrawals/create
3. Wait for response

Loading Screen:
┌────────────────────────────────────┐
│ Processing Withdrawal...           │
│                                     │
│ ⟳ [Spinner]                        │
│                                     │
│ This may take a few moments        │
└────────────────────────────────────┘
```

#### **5. Success Confirmation**
```
API Response Received:
{
  "success": true,
  "withdrawalId": "withdrawal-abc123",
  "message": "Withdrawal processed successfully!"
}

Success Screen:
┌────────────────────────────────────┐
│ ✓ WITHDRAWAL SUCCESSFUL!           │
├────────────────────────────────────┤
│ Amount: ₱300                        │
│ Reference: PAYOUT-abc123-1712748000│
│                                     │
│ Your funds will arrive in 1-2      │
│ business days to your Wise account.│
│                                     │
│ You'll receive a confirmation      │
│ email shortly.                     │
│                                     │
│ [BACK TO WALLET] [VIEW HISTORY]    │
└────────────────────────────────────┘

New Balance Display:
Old: ₱1,500 → New: ₱1,200
(Updated immediately after confirmation)
```

#### **6. Wallet Updated**
```
Wallet Screen Refresh:
┌────────────────────────────────────┐
│ WALLET BALANCE                     │
├────────────────────────────────────┤
│            ₱ 1,200.00              │
│           (₱300 withdrawn)         │
├────────────────────────────────────┤
│ RECENT ACTIVITY                    │
├────────────────────────────────────┤
│ Withdrawal sent               ₱300  │
│ Apr 10, 2:30 PM               ↓    │
│ Status: Completed                  │
└────────────────────────────────────┘
```

#### **7. Notifications**
```
Push Notification:
"Withdrawal Completed! ₱300 sent to your Wise account. 
Funds arrive in 1-2 business days."

Email Notification:
Subject: Withdrawal Confirmation - ₱300
Body:
  Your withdrawal has been processed successfully.
  Amount: ₱300
  Reference: PAYOUT-abc123-1712748000
  Arrive by: Apr 12, 2026
```

#### **8. View History**
```
Tap [VIEW HISTORY]

Withdrawal History Screen:
┌────────────────────────────────────┐
│ WITHDRAWAL HISTORY                 │
├────────────────────────────────────┤
│ Today                              │
│ ├─ Withdrawal     ₱300      ↓      │
│ │  Wise Email                      │
│ │  Apr 10, 2:30 PM                 │
│ │  Status: Completed               │
│ │  Reference: PAYOUT-abc123...     │
│ │  [TAP FOR DETAILS]               │
│                                     │
│ Last Week                          │
│ ├─ Withdrawal     ₱200      ↓      │
│ │  GCash                           │
│ │  Apr 5, 1:00 PM                  │
│ │  Status: Completed               │
│ │  [TAP FOR DETAILS]               │
└────────────────────────────────────┘

Detail View (on tap):
┌────────────────────────────────────┐
│ WITHDRAWAL DETAILS                 │
├────────────────────────────────────┤
│ Amount: ₱300                        │
│ Method: Wise Email                  │
│ Status: Completed                   │
│ Reference: PAYOUT-abc123...        │
│ Created: Apr 10, 2:30 PM           │
│ Processed: Apr 10, 2:30 PM         │
│                                     │
│ [BACK]                             │
└────────────────────────────────────┘
```

---

## Admin Dashboard Workflow

### Admin Monitoring Interface

#### **1. Access Withdrawals Dashboard**
```
Admin App Navigation:
Admin Sidebar → Payouts → Withdrawals

URL: /admin/withdrawals

Display: Two-section layout
┌──────────────────────────────────────────────────────┐
│ PAYOUT MANAGEMENT                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ COMPLETED WITHDRAWALS (142)                          │
├──────────────────────────────────────────────────────┤
│ Creator Name │ Amount │ Method   │ Status   │ Date   │
├──────────────────────────────────────────────────────┤
│ John Doe     │ ₱300   │ wise_... │ COMPLETE │ Apr 10 │
│ Jane Smith   │ ₱500   │ wise_... │ COMPLETE │ Apr 10 │
│ Mike Johnson │ ₱250   │ gcash    │ COMPLETE │ Apr 9  │
│                                                      │
│ FAILED WITHDRAWALS (3)                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Creator Name │ Amount │ Method   │ Status  │ Date    │
├──────────────────────────────────────────────────────┤
│ Error User   │ ₱400   │ wise_... │ FAILED  │ Apr 10  │
│ Tech Issue   │ ₱600   │ bank_tr. │ FAILED  │ Apr 9   │
└──────────────────────────────────────────────────────┘
```

#### **2. View Completed Withdrawal Details**
```
Admin Action: Click "View" on completed withdrawal

Modal Opens:
┌─────────────────────────────────────────────────────┐
│ WITHDRAWAL DETAILS - COMPLETED                      │
├─────────────────────────────────────────────────────┤
│ Creator Information:                                 │
│  • Name: John Doe                                   │
│  • Email: john@example.com                          │
│  • Phone: +63 912 345 6789                          │
│  • Creator ID: creator-abc123                       │
│                                                     │
│ Transaction Details:                                │
│  • Amount: ₱300                                     │
│  • Status: COMPLETED ✓                              │
│  • Created: Apr 10, 2026, 2:30:45 PM               │
│  • Processed: Apr 10, 2026, 2:30:47 PM             │
│                                                     │
│ Payout Method:                                      │
│  • Type: wise_email                                 │
│  • Recipient Email: john@example.com                │
│  • Holistic Account: (if stored)                    │
│                                                     │
│ Wise Transfer Details:                              │
│  • Transaction ID: TXN-20260410-ABC123              │
│  • Wise Status: COMPLETED                           │
│  • Reference: PAYOUT-abc12345-1712748000           │
│  • Quote: PHP → Target Currency                     │
│  • Exchange Rate: 1 PHP = ~0.018 USD                │
│                                                     │
│ Error Details: [None - Successful transfer]         │
│                                                     │
│ Timeline:                                           │
│  ✓ 2:30:45 PM - Withdrawal created                 │
│  ✓ 2:30:46 PM - Balance deducted                   │
│  ✓ 2:30:47 PM - Wise transfer initiated            │
│  ✓ 2:30:52 PM - Transfer completed at Wise        │
│  ✓ 2:31:00 PM - Admin notified                     │
│                                                     │
│ [CLOSE]                                             │
└─────────────────────────────────────────────────────┘
```

#### **3. View Failed Withdrawal Details**
```
Admin Action: Click "View" on failed withdrawal

Modal Opens:
┌─────────────────────────────────────────────────────┐
│ WITHDRAWAL DETAILS - FAILED                         │
├─────────────────────────────────────────────────────┤
│ Creator Information:                                 │
│  • Name: Error User                                 │
│  • Email: error@example.com                         │
│  • Creator ID: creator-error123                     │
│                                                     │
│ Transaction Details:                                │
│  • Amount: ₱400                                     │
│  • Status: FAILED ✗                                 │
│  • Created: Apr 10, 2026, 3:00:00 PM               │
│  • Processed: Apr 10, 2026, 3:00:00 PM             │
│                                                     │
│ Payout Method:                                      │
│  • Type: wise_email                                 │
│  • Recipient Email: error@example.com               │
│                                                     │
│ Wise Transfer Details:                              │
│  • Transaction ID: null (not created)               │
│  • Wise Status: FAILED                              │
│  • Reference: PAYOUT-error123-1712751600           │
│  • Error: "Recipient email format invalid"         │
│                                                     │
│ Error Details:                                      │
│  Error Message: "Invalid recipient email format    │
│                 provided to Wise API"               │
│  Error Code: INVALID_RECIPIENT                      │
│  Timestamp: Apr 10, 2026, 3:00:05 PM               │
│                                                     │
│ Timeline:                                           │
│  ✓ 3:00:00 PM - Withdrawal created                 │
│  ✓ 3:00:00 PM - Balance deducted                   │
│  ✓ 3:00:01 PM - Wise transfer attempted            │
│  ✗ 3:00:05 PM - Transfer failed - Invalid email   │
│  ✗ 3:00:06 PM - Admin notified of failure          │
│                                                     │
│ Admin Options:                                      │
│  [ RETRY TRANSFER ] [ ADD NOTE ] [ CLOSE ]         │
└─────────────────────────────────────────────────────┘
```

#### **4. Retry Failed Transfer (Emergency Override)**
```
Admin Action: Click [RETRY TRANSFER]

Confirmation Dialog:
┌─────────────────────────────────────────┐
│ RETRY TRANSFER?                         │
├─────────────────────────────────────────┤
│ This will attempt to resend ₱400 to     │
│ error@example.com via Wise API.         │
│                                         │
│ Creator balance is already deducted.    │
│                                         │
│ [CANCEL] [RETRY]                       │
└─────────────────────────────────────────┘

On Retry Success:
┌─────────────────────────────────────────┐
│ ✓ TRANSFER SUCCESSFUL                  │
├─────────────────────────────────────────┤
│ New Wise Transaction ID: TXN-12345     │
│ Status: COMPLETED                       │
│ Notified: Yes                           │
│                                         │
│ [CLOSE]                                │
└─────────────────────────────────────────┘
```

#### **5. Filter & Search**
```
Dashboard Filters:
┌─────────────────────────────────────────────────────┐
│ Status: [All ▼] [Completed ▼] [Failed ▼]           │
│ Method: [All ▼] [Wise Email ▼] [GCash ▼] ...       │
│ Date Range: [From] [To]                            │
│ Search: [Creator Name or Email]                    │
│ [APPLY FILTERS]                                    │
└─────────────────────────────────────────────────────┘

Results update dynamically based on filters
```

#### **6. Export & Reporting**
```
Admin Action: [EXPORT DATA]

Available Options:
- Export as CSV (for spreadsheet analysis)
- Export as PDF (for compliance)
- Email Report to Admin Team

Contains:
- All withdrawals in date range
- Creator details
- Amount, method, status
- Wise transaction IDs
- Any error messages
- Timestamps
```

---

## Web System Implementation

### Key Files & Components

#### **1. API Route: `/api/withdrawals/create`**
```typescript
// Location: app/api/withdrawals/create/route.ts

POST /api/withdrawals/create

Request:
{
  creatorId: string,
  amount: number,
  payoutMethod: "wise_email" | "gcash" | "maya" | "bank_transfer",
  accountDetails: string  // Email for Wise, Account # for others
}

Processing:
1. Authenticate user (Clerk)
2. Validate request (amount > 0, method valid)
3. Call Convex mutation: mutations.withdrawals.create()
4. Return result

Response Success:
{
  "success": true,
  "withdrawalId": "id-12345",
  "message": "Withdrawal processed successfully!"
}

Response Error:
{
  "success": false,
  "error": "Insufficient balance",
  "code": "INSUFFICIENT_BALANCE"
}
```

#### **2. Convex Mutation: `withdrawals.create()`**
```typescript
// Location: convex/withdrawals.ts (lines 1-115)

MUTATION: create(args) → Promise<any>

Arguments:
- creatorId: Id<"creators">
- amount: number
- payoutMethod: string
- accountDetails: string

Process:
1. Fetch creator record
2. Validate balance
3. Generate reference
4. Initialize Wise variables (null → undefined)
5. Check if method is 'wise_email'
   ├─ If yes: Schedule async Wise transfer
   └─ If no: Skip Wise logic
6. Deduct balance immediately
7. Create withdrawal record (status: 'completed')
8. Update creator totalWithdrawn
9. Send notification
10. Log audit trail
11. Return withdrawalId

Database Operations:
- Read: creators table
- Write: withdrawals table
- Update: creators.balance, creators.totalWithdrawn
- Insert: auditLogs entry
- Schedule: Notification + Wise transfer
```

#### **3. Convex Internal Action: `withdrawals.processWiseTransfer()`**
```typescript
// Location: convex/withdrawals.ts (lines 270-350)

INTERNAL ACTION: processWiseTransfer()

Runs Asynchronously (background):
- Doesn't block withdrawal creation
- Runs 0ms after withdrawal record created
- Can take 5-30 seconds to complete

Process:
1. Import Wise API service
2. Call sendWiseTransfer(email, amount)
3. Wise service handles:
   ├─ Get quote
   ├─ Create recipient
   ├─ Create transfer
   ├─ Fund transfer
   └─ Return transaction ID + status
4. Update withdrawal record:
   ├─ wiseTransactionId: result.transactionId
   ├─ wiseStatus: result.status
   └─ errorMessage: null (on success)
5. On error:
   ├─ Catch exception
   ├─ Update wiseStatus: 'FAILED'
   ├─ Store errorMessage
   ├─ Log error to audit

Error Handling:
- Network timeout → Retry up to 3 times
- Invalid email → Mark failed, don't retry
- Wise API error → Log, mark failed, notify admin
```

#### **4. Wise API Service: `lib/payments/wise-api.ts`**
```typescript
// Location: lib/payments/wise-api.ts (80 lines)

EXPORT: sendWiseTransfer(email, amount, reference)

Steps:
1. Get API token from WISE_API_TOKEN env var
2. Get account ID from WISE_ACCOUNT_ID env var
3. Call Wise API to create quote
   └─ Lock exchange rate
4. Call Wise API to create recipient
   └─ Register user's email as recipient
5. Call Wise API to create transfer
   └─ From admin account to recipient
6. Call Wise API to fund transfer
   └─ Deduct from admin's Wise account
7. Poll transfer status (up to 30 seconds)
8. Return {
     transactionId,
     status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
     error?: string
   }

EXPORT: checkTransferStatus(transactionId)

Returns: { status, error? }

Used for:
- Manual status checks
- Retry logic
- Admin dashboard queries
```

#### **5. Schema Updates: `convex/schema.ts`**
```typescript
// Location: convex/schema.ts (lines 263-300)

WITHDRAWALS TABLE:
├─ creatorId: Id<"creators">
├─ amount: number
├─ payoutMethod: enum [gcash, maya, bank_transfer, wise_email]
├─ accountDetails: string
├─ status: string              // 'completed', 'failed'
├─ reference: string           // PAYOUT-...
├─ wiseTransactionId?: string  // Track Wise TX ID
├─ wiseStatus?: string         // PROCESSING, COMPLETED, FAILED
├─ errorMessage?: string       // If transfer failed
├─ adminNotes?: string         // Admin intervention notes
├─ createdAt: timestamp
├─ processedAt: timestamp
└─ [other fields: accountNumber, bankName, etc]

AUDIT_LOGS TABLE:
Action types updated:
├─ 'payout_sent'           // New: Automatic withdrawal sent
└─ 'payout_admin_override' // New: Admin manual retry

CREATORS TABLE:
├─ balance: number            // Current balance (decremented)
├─ totalWithdrawn: number     // Lifetime total withdrawn
└─ wiseEmail: string          // Wise recipient email
```

#### **6. Admin Dashboard: `app/admin/withdrawals/page.tsx`**
```typescript
// Location: app/admin/withdrawals/page.tsx (320+ lines)

Features:
1. Two-section layout
   ├─ Completed withdrawals (paginated table)
   └─ Failed withdrawals (highlighted)

2. Table columns:
   ├─ Creator name
   ├─ Amount
   ├─ Payout method
   ├─ Status
   └─ Date processed

3. Click row → Modal opens
   ├─ Creator info section
   ├─ Transaction details section
   ├─ Payout method section
   ├─ Wise transfer details section
   ├─ Error details section (if failed)
   └─ Timeline section

4. Modal buttons:
   ├─ [CLOSE]
   ├─ [RETRY] (for failed only)
   └─ [ADD NOTE] (optional)

5. Responsive:
   ├─ Mobile: Single column
   ├─ Tablet: Two columns
   └─ Desktop: Full table

6. Read-only:
   ├─ No balance modifications
   ├─ No withdrawal deletions
   └─ Only view + retry on failure
```

---

## Mobile App Integration Requirements

### What Mobile App Needs to Implement

#### **1. Wallet Screen**
**File:** `screens/WalletScreen.tsx` or similar

**Requirements:**
```javascript
Components needed:
├─ BalanceCard
│  ├─ Display current balance from Convex
│  ├─ Format: ₱ {balance.toFixed(2)}
│  ├─ Refresh every 30 seconds
│  └─ Show "Loading..." while fetching
│
├─ WithdrawalButton
│  ├─ Navigate to WithdrawalFormScreen
│  ├─ Disabled if balance = 0
│  └─ Show available balance hint
│
├─ WithdrawalHistoryList
│  ├─ Query last 10 withdrawals
│  ├─ Show: Date, Amount, Status, Method
│  ├─ "Completed" = green, "Failed" = red
│  └─ Pull-to-refresh support
│
└─ NotificationListener
   ├─ Listen for push notifications
   ├─ Show toast: "Withdrawal completed!"
   └─ Auto-refresh balance on notification

Data Source: Convex Query
query.creators.balance (current user)
```

**UI Template:**
```
┌──────────────────────────────┐
│ BALANCE                      │
│ ₱1,500.00                    │
│ [+ DEPOSIT] [WITHDRAW]       │
├──────────────────────────────┤
│ RECENT WITHDRAWALS           │
│ • ₱300 → Wise    Apr 10 ✓   │
│ • ₱200 → GCash   Apr 5  ✓   │
│ • ₱500 → Bank    Mar 28 ✗   │
└──────────────────────────────┘
```

#### **2. Withdrawal Form Screen**
**File:** `screens/WithdrawalFormScreen.tsx` or similar

**Requirements:**
```javascript
Form Fields:
├─ AmountInput
│  ├─ Type: number
│  ├─ Placeholder: "0.00"
│  ├─ Max value: current balance
│  ├─ Min value: 50 (or business rule)
│  ├─ Show error: "Amount cannot exceed ₱{balance}"
│  └─ Format: Shows as you type
│
├─ PayoutMethodSelector
│  ├─ Radio buttons or select dropdown
│  ├─ Options:
│  │  ├─ Wise Email (Recommended badge)
│  │  ├─ GCash
│  │  ├─ Maya
│  │  └─ Bank Transfer
│  └─ On select: Update accountDetails placeholder
│
├─ AccountDetailsInput
│  ├─ Dynamic based on method:
│  │  ├─ Wise Email:    Input type="email"
│  │  ├─ GCash:         Input phone number
│  │  ├─ Maya:          Input email or phone
│  │  └─ Bank Transfer: Input account number
│  ├─ Auto-fill from user profile if available
│  └─ Validation: Format checking
│
└─ ConfirmButton
   ├─ Disabled until: Amount + Method + Details filled
   ├─ Loading state: Show spinner while submitting
   └─ On error: Show error message
```

**API Integration:**
```javascript
// Call when user taps confirm

const submitWithdrawal = async () => {
  try {
    const response = await fetch('/api/withdrawals/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorId: currentUser.id,
        amount: parseFloat(amountInput),
        payoutMethod: selectedMethod,
        accountDetails: accountDetailsInput
      })
    });

    const data = await response.json();

    if (data.success) {
      // Show success screen
      showSuccessScreen(data.withdrawalId);
      
      // Refresh wallet balance
      refreshBalance();
      
      // Navigate back after 3 seconds
      setTimeout(() => navigation.goBack(), 3000);
    } else {
      // Show error: data.error
      showErrorToast(data.error);
    }
  } catch (error) {
    showErrorToast('Network error. Please try again.');
  }
};
```

**Error Handling:**
```javascript
Expected errors:
├─ "Insufficient balance"
│  └─ User input amount > balance
├─ "Invalid email format"
│  └─ Email validation failed
├─ "Invalid account details"
│  └─ Format doesn't match method
├─ "Rate limit exceeded"
│  └─ Too many withdrawals in short time
└─ "Network error"
   └─ Connection issue
```

#### **3. Withdrawal Confirmation Screen**
**File:** `screens/WithdrawalConfirmationScreen.tsx`

**Requirements:**
```javascript
Display:
├─ Check/Success icon
├─ Amount: ₱300
├─ Method: Wise Email
├─ Receipt email: user@email.com
├─ Reference: PAYOUT-abc123... (copyable)
├─ Timeline info:
│  ├─ "Funds deducted immediately"
│  ├─ "Arrive in 1-2 business days"
│  └─ "Check your email for confirmation"
│
└─ Buttons:
   ├─ [BACK TO WALLET]
   ├─ [VIEW HISTORY]
   └─ [SHARE REFERENCE] (optional)

Auto-dismiss:
├─ After 5 seconds, can navigate away
└─ User can dismiss immediately too
```

#### **4. Withdrawal History Screen**
**File:** `screens/WithdrawalHistoryScreen.tsx`

**Requirements:**
```javascript
Features:
├─ List all withdrawals (paginated, 10 per page)
├─ Sort: Newest first
├─ Each item shows:
│  ├─ Amount
│  ├─ Payout method icon
│  ├─ Date & time
│  ├─ Status badge (green/red)
│  └─ Tap to expand details
│
├─ Details view (expandable):
│  ├─ Reference ID
│  ├─ Account details
│  ├─ Status
│  ├─ Created timestamp
│  ├─ Processing timestamp
│  └─ Error message (if failed)
│
└─ Filtering:
   ├─ Status filter: All, Completed, Failed
   ├─ Method filter: All, Wise, GCash, etc.
   └─ Date range picker (optional)

Data Source:
├─ Query: convex/withdrawals filtered by creatorId
└─ Refresh: Pull to refresh
```

#### **5. Error & Retry Flow**
**File:** `screens/WithdrawalErrorScreen.tsx`

**Requirements:**
```javascript
Error Cases:
├─ Network Error
│  ├─ Show: "Connection failed. Please retry."
│  ├─ Button: [RETRY]
│  └─ Button: [CANCEL]
│
├─ Insufficient Balance
│  ├─ Show: "You don't have enough balance"
│  ├─ Current: ₱500, Need: ₱600
│  └─ Button: [GO BACK]
│
├─ Invalid Details
│  ├─ Show: "Invalid email format"
│  ├─ Hint: "Email must be valid"
│  └─ Button: [EDIT]
│
├─ Rate Limit
│  ├─ Show: "Too many withdrawals. Wait 1 hour."
│  ├─ Countdown timer
│  └─ Button: [OK]
│
└─ System Error
   ├─ Show: "Something went wrong"
   ├─ Support link
   └─ Button: [CONTACT SUPPORT]
```

#### **6. Push Notification Handler**
**File:** `notifications/withdrawalNotifications.ts` or similar

**Requirements:**
```javascript
Listen for Firebase Cloud Messages (FCM):

Notification types:
├─ payout_sent
│  ├─ Title: "Withdrawal Completed! 🎉"
│  ├─ Body: "₱300 sent to your Wise account"
│  ├─ Action: Open wallet screen
│  └─ Badge: Show amount
│
├─ payout_failed
│  ├─ Title: "Withdrawal Failed"
│  ├─ Body: "Error: Invalid recipient email"
│  ├─ Action: Open withdrawal history
│  └─ Badge: Show warning icon
│
└─ payout_processing
   ├─ Title: "Withdrawal Processing"
   ├─ Body: "Your funds are being transferred"
   └─ Action: Open wallet screen

On notification received:
1. Show notification in status bar
2. On tap: Open relevant screen
3. Refresh balance
4. Update withdrawal history
5. Store as read in local database
```

#### **7. Local Data Storage**
**Requirements:**
```javascript
Store locally:
├─ User balance (cache)
│  ├─ Last updated: timestamp
│  ├─ Expire after: 5 minutes
│  └─ Refresh on app foreground
│
├─ Withdrawal history (offline support)
│  ├─ Last 30 withdrawals cached
│  ├─ Sync when online
│  └─ Show "Cached" label if offline
│
└─ Withdrawal form state
   ├─ Auto-save draft
   ├─ Persist on app close
   └─ Clear after successful submission

Tools:
├─ SQLite (local database)
├─ AsyncStorage (key-value pairs)
└─ React Query (caching + sync)
```

#### **8. Security & Validation**
**Requirements:**
```javascript
Client-side validation:
├─ Amount
│  ├─ Must be number
│  ├─ Must be > 0
│  └─ Must be ≤ balance
│
├─ Email (for Wise)
│  ├─ Valid email format
│  ├─ Not empty
│  └─ Reasonable length
│
├─ Phone (for GCash/Maya)
│  ├─ Valid phone format
│  ├─ Required length
│  └─ Country code check
│
└─ Account number (for Bank)
   ├─ Numeric only
   ├─ Length requirement
   └─ Format validation

Authentication:
├─ Verify user is logged in (JWT token)
├─ Check token expiry
├─ Refresh token if needed
└─ Attach token to request headers

Encryption:
├─ Use HTTPS only
├─ Don't store sensitive data in logs
├─ Clear clipboard after paste
└─ Mask account details in history

Rate limiting:
├─ Prevent spam (max 10 per hour)
├─ Implement exponential backoff
└─ Show cooldown timer to user
```

#### **9. UI/UX Considerations**
**Requirements:**
```javascript
Design:
├─ Emerald green (#10b981) for success states
├─ Red for errors
├─ Gray for pending/processing
├─ Loading spinners on async operations
└─ Toast notifications for feedback

Accessibility:
├─ High contrast text
├─ Large touch targets (min 44x44pt)
├─ Screen reader support
├─ Color not only indicator
└─ Keyboard navigation

Performance:
├─ Lazy load history (pagination)
├─ Debounce amount input
├─ Optimize balance queries
└─ Cache withdrawal list

Offline handling:
├─ Show cached balance if offline
├─ Queue withdrawal requests
├─ Sync when connection restored
├─ Toast: "Syncing when online"
└─ Don't block UI
```

#### **10. Testing Checklist**
**Requirements:**
```javascript
Unit tests:
├─ Validation functions
├─ Amount calculations
├─ Format checkers
└─ Error handlers

Integration tests:
├─ POST /api/withdrawals/create endpoint
├─ Balance update on success
├─ Error cases (insufficient funds, etc.)
├─ Retry logic
└─ Notification handling

E2E tests:
├─ Full withdrawal flow
├─ Confirmation screen
├─ History view
├─ Error recovery
└─ Offline sync

Manual testing:
├─ iOS + Android
├─ Small + large screens
├─ Slow network (throttle)
├─ Common error scenarios
└─ Platform-specific features
```

---

## API Endpoints Reference

### Withdrawal APIs

#### **POST /api/withdrawals/create**
```
URL: /api/withdrawals/create
Method: POST
Auth: Required (Clerk JWT)

Request Headers:
Content-Type: application/json
Authorization: Bearer {jwt_token}

Request Body:
{
  "creatorId": "creator-abc123",
  "amount": 300,
  "payoutMethod": "wise_email",
  "accountDetails": "user@email.com"
}

Response Success (200):
{
  "success": true,
  "withdrawalId": "withdrawal-12345",
  "message": "Withdrawal processed successfully!",
  "balance": 1200,
  "timestamp": "2026-04-10T14:30:00Z"
}

Response Error (400/422):
{
  "success": false,
  "error": "Insufficient balance",
  "code": "INSUFFICIENT_BALANCE",
  "details": {
    "required": 300,
    "available": 250
  }
}

Possible Errors:
├─ INSUFFICIENT_BALANCE (400)
├─ INVALID_AMOUNT (422)
├─ INVALID_METHOD (422)
├─ INVALID_EMAIL (422)
├─ RATE_LIMIT_EXCEEDED (429)
├─ UNAUTHORIZED (401)
├─ USER_NOT_FOUND (404)
└─ SERVER_ERROR (500)
```

#### **GET /api/withdrawals/history**
```
URL: /api/withdrawals/history?limit=10&offset=0
Method: GET
Auth: Required

Query Parameters:
├─ limit: number (default: 10, max: 100)
├─ offset: number (default: 0)
├─ status: "completed" | "failed" | "all" (default: all)
└─ method: "wise_email" | "gcash" | "maya" | "bank_transfer" | "all"

Response Success (200):
{
  "success": true,
  "withdrawals": [
    {
      "id": "withdrawal-12345",
      "amount": 300,
      "method": "wise_email",
      "status": "completed",
      "createdAt": "2026-04-10T14:30:00Z",
      "reference": "PAYOUT-abc123-1712748000",
      "error": null
    },
    ...
  ],
  "total": 142,
  "hasMore": true
}
```

#### **GET /api/withdrawals/:id**
```
URL: /api/withdrawals/withdrawal-12345
Method: GET
Auth: Required

Response Success (200):
{
  "success": true,
  "withdrawal": {
    "id": "withdrawal-12345",
    "creatorId": "creator-abc123",
    "amount": 300,
    "payoutMethod": "wise_email",
    "accountDetails": "user@email.com",
    "status": "completed",
    "reference": "PAYOUT-abc123-1712748000",
    "wiseTransactionId": "TXN-20260410-ABC123",
    "wiseStatus": "COMPLETED",
    "errorMessage": null,
    "createdAt": "2026-04-10T14:30:00Z",
    "processedAt": "2026-04-10T14:30:02Z"
  }
}
```

---

## Error Handling & Retry Logic

### Common Error Scenarios

#### **1. Insufficient Balance**
```
Scenario: User tries to withdraw ₱300 but only has ₱250

Flow:
1. Mobile app submits request
2. Backend validates: 250 < 300 → FAIL
3. Returns error: {
     "error": "Insufficient balance",
     "code": "INSUFFICIENT_BALANCE",
     "available": 250,
     "requested": 300
   }
4. Mobile app shows: "You need ₱50 more. Current balance: ₱250"
5. User sees form re-enabled with hint

Recovery:
USER MUST → Earn more balance OR reduce withdrawal amount
```

#### **2. Invalid Email (Wise)**
```
Scenario: User enters invalid Wise email format

Flow:
1. Mobile validates: email regex check → PASS
2. Backend validates: email format → PASS
3. Convex schedules Wise transfer
4. Wise API rejects: "Invalid recipient email"
5. wiseStatus updated to 'FAILED'
6. errorMessage stored: "Invalid recipient email format"
7. Admin notified
8. User notified: "Withdrawal failed. Email invalid."

Recovery:
ADMIN CAN → Click [RETRY] after user provides correct email
OR
USER CAN → Initiate new withdrawal with correct email
```

#### **3. Network Timeout**
```
Scenario: Wise API doesn't respond within 30 seconds

Flow:
1. processWiseTransfer() action starts
2. Makes API call to Wise
3. 30 second timeout reached
4. Request aborted
5. wiseStatus: 'FAILED'
6. errorMessage: "Request timeout"
7. Balance already deducted (not restored)

Recovery:
AUTOMATIC → Retry up to 3 times with exponential backoff
- Retry 1: Wait 5 seconds
- Retry 2: Wait 15 seconds
- Retry 3: Wait 30 seconds

After 3 retries:
ADMIN MUST → Manually check Wise account
            → If money transferred: Mark manual, all good
            → If money NOT transferred: Refund user balance, retry
```

#### **4. Wise Account Insufficient Funds**
```
Scenario: Admin's Wise account ran out of money

Flow:
1. processWiseTransfer() attempts funding
2. Wise API returns: "Insufficient funds in source account"
3. wiseStatus: 'FAILED'
4. errorMessage: "Admin account insufficient funds"
5. User balance ALREADY deducted (locked)
6. Admin dashboard highlights: "CRITICAL - Fund account!"

Recovery:
URGENT → Admin must:
         1. Deposit money to Wise account
         2. Click [RETRY] on all failed transfers
         3. Funds will be transferred to users
         4. Update audit: "Account funded, retried"
```

#### **5. Rate Limit (Too Many Requests)**
```
Scenario: User attempts 5 withdrawals in 1 minute

Flow:
1. Withdrawal 1-4: Succeed
2. Withdrawal 5: 
   └─ Backend check: 4 withdrawals in last 60 seconds
   └─ Limit: 5 per hour → 1 more allowed
   └─ 3rd withdrawal within 10 minutes → Rate limit applied
3. Returns error: {
     "error": "Rate limited",
     "code": "RATE_LIMIT_EXCEEDED",
     "retryAfter": 3600
   }
4. Mobile shows: "Too many withdrawals. Try again in 1 hour."

Recovery:
USER MUST → Wait 1 hour or adjust business logic
```

#### **6. Creator Account Suspended**
```
Scenario: User account was suspended by admin

Flow:
1. Withdrawal requested
2. Backend checks: creator.status === 'suspended'
3. Returns error: {
     "error": "Account suspended",
     "code": "ACCOUNT_SUSPENDED"
   }
4. Mobile shows: "Your account is suspended. Contact support."

Recovery:
ADMIN MUST → Activate account
USER → Contact support
```

### Automatic Retry Strategy

```
Transient Errors (Retry):
├─ Network timeout
├─ Temporary Wise API outage (503)
├─ Rate limit (429) - after delay
└─ Database connection error

Retry Logic:
1st attempt:  Immediate
2nd attempt:  5 seconds delay (exponential backoff)
3rd attempt:  15 seconds delay
4th attempt:  30 seconds delay
After 4 failures: Give up, mark FAILED, alert admin

Non-Transient Errors (Don't Retry):
├─ Invalid email format
├─ Insufficient balance
├─ Account suspended
└─ Invalid customer account
└─ Just mark FAILED, alert user/admin
```

---

## Security & Compliance

### Data Security

#### **1. Payment Data Protection**
```
At Rest:
├─ Database encryption: All sensitive fields encrypted
├─ Email addresses: Hashed/encrypted in logs
├─ Account numbers: Last 4 digits only
└─ Withdrawal records: Access restricted to admin + creator

In Transit:
├─ HTTPS only: All API calls
├─ TLS 1.2+: Minimum encryption
├─ JWT tokens: Signed, verified
└─ Secrets: Never in URLs, always in request body

In Memory:
├─ Clear sensitive data after use
├─ Never log full account numbers
├─ Mask email in console logs
└─ Don't store tokens in local storage (use secure storage)
```

#### **2. Authentication & Authorization**
```
Mobile App:
├─ Clerk authentication: Required for all requests
├─ JWT tokens: Issued by Clerk, verified on backend
├─ Token expiry: 24 hours (refresh on use)
├─ Device binding: Optional for enhanced security

Backend:
├─ Verify Clerk JWT signature
├─ Check token expiration
├─ Confirm creatorId matches authenticated user
├─ Check user permissions (creator can only access own data)

Admin Dashboard:
├─ Clerk auth with admin role required
├─ Separate admin JWT permissions
├─ Read-only access (no balance modifications)
├─ All actions logged with admin ID
```

#### **3. API Security**
```
Rate Limiting:
├─ 10 withdrawal requests per hour per user
├─ 100 total API requests per minute per user
├─ IP-based limits: 1000 requests/hour per IP
├─ Burst protection: Max 10 req/second per user

Input Validation:
├─ Amount: Must be number, > 0, <= balance
├─ Email: Must match RFC 5322 standard
├─ Phone: Must be valid format for country
├─ creatorId: Must be valid Convex ID, must match auth user

CORS:
├─ Allowed origins: Self only (no cross-origin withdrawals)
├─ Methods: POST, GET
├─ Headers: Content-Type, Authorization
└─ Credentials: Required
```

#### **4. Wise API Security**
```
Credentials Management:
├─ WISE_API_TOKEN: Never hardcoded, always from env vars
├─ WISE_ACCOUNT_ID: Never hardcoded, always from env vars
├─ Rotate tokens: Every 90 days
├─ Store securely: Vercel Secrets, encrypted

API Calls:
├─ Sign all requests with API key
├─ Use HTTPS only
├─ Validate SSL certificates
├─ Log API errors (not sensitive data)

Recipient Verification:
├─ Verify email ownership (Wise does)
├─ Limit transfer amount per recipient per day
├─ Two-factor auth on admin's Wise account
└─ Whitelist known recipients (optional)
```

### Compliance

#### **1. PCI DSS (Payment Card Industry)**
```
Not directly applicable (no credit cards stored):
✓ Don't store payment card data
✓ Don't process credit card numbers
✓ All payment via Wise (PCI compliant)
✓ Only store bank account references

Applies to Wise transfer:
├─ Secure transmission (HTTPS)
├─ Access control (authentication)
├─ Data encryption
└─ Regular security testing
```

#### **2. Data Privacy (GDPR/Local)**
```
User Rights:
├─ Access: User can view their withdrawal history
├─ Deletion: User can request data deletion (GDPR)
├─ Portability: Export withdrawal data format
├─ Correction: Review & correct account details

Data Retention:
├─ Withdrawals: Keep for 7 years (tax law)
├─ Audit logs: Keep for 3 years
├─ Personal data: Delete on account deletion
├─ Wise transaction IDs: Keep for compliance

Consent:
├─ Users consent to Wise transfers
├─ Email confirmation sent
├─ Opt-in for promotional emails (not payment)
```

#### **3. KYC/AML (Know Your Customer)**
```
User Verification:
├─ Email verification required
├─ Phone verification recommended
├─ Amount limits based on verification level:
│  ├─ Unverified: Max ₱5,000/day
│  ├─ Verified email: Max ₱20,000/day
│  └─ Full KYC: Unlimited
│
Wise Verification:
├─ Wise does KYC on their end
├─ Admin account must be verified
├─ Recipient verification via email
└─ Transaction limits enforced by Wise

Suspicious Activity:
├─ Multiple rapid withdrawals: Flag
├─ Large amounts: Review
├─ Frequent receiver changes: Monitor
└─ Report to compliance officer if needed
```

#### **4. Audit & Compliance Logging**
```
What to Log:
├─ All withdrawal requests (user ID, amount, timestamp)
├─ Authentication attempts (success/failure)
├─ Admin actions (retry, note, override)
├─ API errors & exceptions
├─ Security events (rate limit, invalid auth)

What NOT to Log:
├─ Full email addresses in logs
├─ Full account numbers
├─ API tokens or secrets
├─ Unnecessary personal data

Log Retention:
├─ Store: 7 years (tax compliance)
├─ Archive: Move to cold storage after 1 year
├─ Delete: After retention period ends
└─ Encrypt: All logs at rest

Audit Trail:
├─ Who: Admin ID or "system"
├─ What: Action taken
├─ When: Timestamp
├─ Where: IP address (optional)
└─ Why: Reference, metadata
```

### Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Apr 10, 2026 | Initial release - Instant Wise withdrawals |

---

## Deployment Checklist

- [ ] Wise API credentials set in Vercel environment
- [ ] WISE_API_TOKEN configured
- [ ] WISE_ACCOUNT_ID configured
- [ ] Test withdrawal flow end-to-end
- [ ] Admin dashboard tested
- [ ] Error handling tested (network timeout, invalid email, etc.)
- [ ] Notifications working for mobile app
- [ ] Audit logs recording properly
- [ ] Rate limiting functional
- [ ] HTTPS/TLS configured
- [ ] CORS settings correct
- [ ] Database backups enabled
- [ ] Monitoring alerts configured
- [ ] Admin team trained on dashboard
- [ ] Documentation provided to mobile team

---

## Support & Troubleshooting

**Common Issues:**

1. **Withdrawal shows "Processing" indefinitely**
   - Check: Has background action completed?
   - Action: Wait 5 minutes, check admin dashboard
   - If failed: Admin clicks [RETRY]

2. **"Insufficient balance" error**
   - Check: Balance ≥ withdrawal amount?
   - Action: Wait for new earnings to arrive
   - Contact support if earnings missing

3. **Wise transfer failed**
   - Check: Email address valid?
   - Check: Admin's Wise account has funds?
   - Action: Admin clicks [RETRY] after correcting issue
   - Contact support for manual intervention

4. **Balance not updating on mobile app**
   - Action: Force refresh app (pull to refresh or restart)
   - Use: offline cache if network issue
   - Wait: May take 30 seconds to sync

---

**Document Complete.** Last updated: April 10, 2026  
For questions or updates, contact: [Your Contact Info]
