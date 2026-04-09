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
export function parseDepositWebhook(payload: unknown): ParseResult {
    if (!payload || typeof payload !== 'object') {
        return { success: false, error: 'Invalid payload: not an object' }
    }

    const data = payload as Record<string, any>
    const eventType = data.event_type

    // Only process balance credit events
    if (!eventType) {
        return { success: false, error: 'Missing event_type' }
    }

    if (eventType !== 'balances#credit') {
        return { success: false, error: `Ignored event type: ${eventType}` }
    }

    const resource = data.data?.resource
    if (!resource) {
        return { success: false, error: 'Missing data.resource' }
    }

    const transactionId = String(resource.id || '')
    if (!transactionId) {
        return { success: false, error: 'Missing transaction ID' }
    }

    const amount = resource.amount?.value
    const currency = resource.amount?.currency
    if (typeof amount !== 'number' || amount <= 0) {
        return { success: false, error: `Invalid amount: ${amount}` }
    }
    if (!currency) {
        return { success: false, error: 'Missing currency' }
    }

    const reference = String(resource.reference || resource.details?.reference || '')
    const senderName = resource.sender_name || resource.details?.sender_name || null

    return {
        success: true,
        event: {
            transactionId,
            amount,
            currency,
            reference,
            senderName,
            eventType,
        },
    }
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
