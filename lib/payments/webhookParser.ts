/**
 * Wise balance deposit webhook payload parser.
 * Pure functions — no database or framework dependencies. Fully testable with Jest.
 *
 * Wise fires webhooks for various events. The "balance credit" event fires
 * when money is received into the platform's Wise account.
 */

export interface WiseDepositEvent {
    /** Wise transaction ID */
    transactionId: string
    /** Amount received */
    amount: number
    /** Currency code (should be PHP) */
    currency: string
    /** Reference/note from the sender */
    reference: string
    /** Sender name if available */
    senderName: string | null
    /** Raw event type from Wise */
    eventType: string
}

export interface ParseResult {
    success: boolean
    event?: WiseDepositEvent
    error?: string
}

/**
 * Parse a Wise webhook payload for balance credit events.
 * Returns a structured event or an error.
 *
 * Wise balance credit webhook payload structure:
 * {
 *   "event_type": "balances#credit",
 *   "data": {
 *     "resource": {
 *       "id": 12345,
 *       "type": "balance-credit",
 *       "profile_id": 67890,
 *       "amount": { "value": 5000, "currency": "PHP" },
 *       "reference": "ND-7K3M-X9P2",
 *       "sender_name": "Juan Dela Cruz"
 *     }
 *   }
 * }
 */
/**
 * Parse Wise deposit webhook. Handles all 4 documented event types:
 *
 * 1. "balances#credit" — multicurrency account credit
 *    data.amount (number), data.currency (string), data.resource.id
 *
 * 2. "balances#update" — balance change (filter transaction_type === "credit")
 *    data.amount (number), data.currency (string), data.transfer_reference (string)
 *
 * 3. "account-details-payment#state-change" — incoming pay-in
 *    data.transfer.amount (number), data.transfer.currency, data.sender.name
 *
 * 4. "swift-in#credit" — SWIFT incoming
 *    data.resource.settled_amount.value, data.resource.reference, data.resource.sender.name
 *
 * Ref: https://docs.wise.com/guides/developer/webhooks/event-types
 */
export function parseDepositWebhook(payload: unknown): ParseResult {
    if (!payload || typeof payload !== 'object') {
        return { success: false, error: 'Invalid payload: not an object' }
    }

    const root = payload as Record<string, any>
    const eventType = root.event_type

    if (!eventType) {
        return { success: false, error: 'Missing event_type' }
    }

    const d = root.data // shorthand for the data envelope

    // ── balances#credit ──
    // { data: { resource: { id }, amount: 1.23, currency: "PHP", transaction_type: "credit" } }
    if (eventType === 'balances#credit') {
        const amount = parseFloat(d?.amount ?? 0)
        if (!amount || amount <= 0) return { success: false, error: `Invalid amount: ${d?.amount}` }
        return {
            success: true,
            event: {
                transactionId: String(d?.resource?.id || d?.step_id || root.subscription_id || ''),
                amount,
                currency: d?.currency || 'PHP',
                reference: '', // balances#credit doesn't include a reference — we'll need to match by amount+timing
                senderName: null,
                eventType,
            },
        }
    }

    // ── balances#update (credit only) ──
    // { data: { amount: 70, currency: "GBP", transaction_type: "credit", transfer_reference: "BNK-123", step_id: 123 } }
    if (eventType === 'balances#update') {
        if (d?.transaction_type !== 'credit') {
            return { success: false, error: `Ignored balances#update with transaction_type: ${d?.transaction_type}` }
        }
        const amount = parseFloat(d?.amount ?? 0)
        if (!amount || amount <= 0) return { success: false, error: `Invalid amount: ${d?.amount}` }
        return {
            success: true,
            event: {
                transactionId: String(d?.step_id || d?.resource?.id || root.subscription_id || ''),
                amount,
                currency: d?.currency || 'PHP',
                reference: d?.transfer_reference || d?.channel_name || '',
                senderName: null,
                eventType,
            },
        }
    }

    // ── account-details-payment#state-change ──
    // { data: { transfer: { id, amount, currency }, sender: { name }, current_state: "COMPLETED" } }
    if (eventType === 'account-details-payment#state-change') {
        // Only process completed deposits
        if (d?.current_state !== 'COMPLETED') {
            return { success: false, error: `Ignored account-details-payment state: ${d?.current_state}` }
        }
        const transfer = d?.transfer
        const amount = parseFloat(transfer?.amount ?? 0)
        if (!amount || amount <= 0) return { success: false, error: `Invalid amount: ${transfer?.amount}` }
        return {
            success: true,
            event: {
                transactionId: String(transfer?.id || d?.resource?.id || ''),
                amount,
                currency: transfer?.currency || 'PHP',
                reference: d?.reference || '',
                senderName: d?.sender?.name || null,
                eventType,
            },
        }
    }

    // ── swift-in#credit ──
    // { data: { resource: { reference, settled_amount: { value, currency }, sender: { name } }, action: { id } } }
    if (eventType === 'swift-in#credit') {
        const res = d?.resource
        const amount = parseFloat(res?.settled_amount?.value ?? res?.instructed_amount?.value ?? 0)
        if (!amount || amount <= 0) return { success: false, error: `Invalid amount in swift-in` }
        return {
            success: true,
            event: {
                transactionId: String(d?.action?.id || res?.id || ''),
                amount,
                currency: res?.settled_amount?.currency || 'PHP',
                reference: res?.reference || '',
                senderName: res?.sender?.name || null,
                eventType,
            },
        }
    }

    // Unknown event type — ignore
    return { success: false, error: `Ignored event type: ${eventType}` }
}

/**
 * Determine payment status based on received vs expected amount.
 */
export function determinePaymentStatus(
    receivedAmount: number,
    expectedAmount: number,
    tolerance: number = 1 // PHP tolerance for rounding/fees
): 'matched' | 'partial' | 'overpaid' {
    if (receivedAmount >= expectedAmount - tolerance && receivedAmount <= expectedAmount + tolerance) {
        return 'matched'
    }
    if (receivedAmount < expectedAmount - tolerance) {
        return 'partial'
    }
    return 'overpaid'
}

/**
 * Calculate the amount to credit to a creator.
 * For partial payments, credit nothing (admin must handle).
 * For matched/overpaid, credit the expected amount (not more).
 */
export function calculateCreditAmount(
    receivedAmount: number,
    expectedAmount: number,
    tolerance: number = 1
): number {
    const status = determinePaymentStatus(receivedAmount, expectedAmount, tolerance)
    if (status === 'partial') return 0
    return expectedAmount // Credit expected amount, not overpayment
}
