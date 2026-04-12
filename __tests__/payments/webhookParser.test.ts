import {
    parseDepositWebhook,
    determinePaymentStatus,
    calculateCreditAmount,
} from '../../lib/payments/webhookParser'

describe('webhookParser', () => {
    describe('parseDepositWebhook', () => {
        // ── balances#credit (from Wise docs) ──
        it('parses balances#credit event', () => {
            const payload = {
                data: {
                    resource: { type: 'balance-account', id: 111, profile_id: 222 },
                    transaction_type: 'credit',
                    amount: 5000,
                    currency: 'PHP',
                    post_transaction_balance_amount: 6000,
                    occurred_at: '2026-04-13T12:00:00.000Z',
                },
                subscription_id: '01234567-89ab-cdef',
                event_type: 'balances#credit',
                schema_version: '4.0.0',
                sent_at: '2026-04-13T12:00:01.000Z',
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(true)
            expect(result.event?.amount).toBe(5000)
            expect(result.event?.currency).toBe('PHP')
            expect(result.event?.transactionId).toBe('111')
            expect(result.event?.eventType).toBe('balances#credit')
        })

        // ── balances#update (credit) ──
        it('parses balances#update credit event', () => {
            const payload = {
                data: {
                    resource: { id: 2, profile_id: 2, type: 'balance-account' },
                    amount: 100,
                    balance_id: 111,
                    channel_name: 'TRANSFER',
                    currency: 'PHP',
                    occurred_at: '2026-04-13T14:55:38.123Z',
                    post_transaction_balance_amount: 200,
                    step_id: 1234567,
                    transaction_type: 'credit',
                    transfer_reference: 'BNK-1234567',
                },
                subscription_id: 'f2264fe5-a0f5-4dab',
                event_type: 'balances#update',
                schema_version: '4.0.0',
                sent_at: '2026-04-13T14:55:39.456Z',
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(true)
            expect(result.event?.amount).toBe(100)
            expect(result.event?.currency).toBe('PHP')
            expect(result.event?.reference).toBe('BNK-1234567')
            expect(result.event?.transactionId).toBe('1234567')
        })

        // ── balances#update (debit — should be ignored) ──
        it('ignores balances#update debit event', () => {
            const payload = {
                data: {
                    resource: { id: 2, profile_id: 2, type: 'balance-account' },
                    amount: 50,
                    currency: 'PHP',
                    transaction_type: 'debit',
                },
                event_type: 'balances#update',
                schema_version: '4.0.0',
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(false)
            expect(result.error).toContain('debit')
        })

        // ── account-details-payment#state-change (COMPLETED) ──
        it('parses account-details-payment COMPLETED event', () => {
            const payload = {
                data: {
                    resource: { id: 12345, profile_id: 1, type: 'balance-account' },
                    account_details_id: '1',
                    target_account_id: '12345',
                    transfer: { id: 36454, type: 'credit', amount: 1500, currency: 'PHP' },
                    sender: { name: 'Juan Dela Cruz', account_number: '12345678' },
                    current_state: 'COMPLETED',
                    previous_state: 'PROCESSING',
                    occurred_at: '2026-04-13T11:10:13.789Z',
                },
                subscription_id: '36c3f762-560d',
                event_type: 'account-details-payment#state-change',
                schema_version: '4.0.0',
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(true)
            expect(result.event?.amount).toBe(1500)
            expect(result.event?.currency).toBe('PHP')
            expect(result.event?.senderName).toBe('Juan Dela Cruz')
            expect(result.event?.transactionId).toBe('36454')
        })

        // ── account-details-payment PROCESSING — should be ignored ──
        it('ignores account-details-payment PROCESSING state', () => {
            const payload = {
                data: {
                    transfer: { id: 36454, amount: 1500, currency: 'PHP' },
                    current_state: 'PROCESSING',
                },
                event_type: 'account-details-payment#state-change',
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(false)
            expect(result.error).toContain('PROCESSING')
        })

        // ── swift-in#credit ──
        it('parses swift-in#credit event', () => {
            const payload = {
                data: {
                    action: { type: 'credit', id: 12345, profile_id: 222 },
                    resource: {
                        id: '55555',
                        reference: '/RFB/ND-7K3M-X9P2',
                        sender: { name: 'GEORGE SMITH' },
                        settled_amount: { value: 786.54, currency: 'PHP' },
                    },
                    occurred_at: '2026-04-13T12:34:56.789Z',
                },
                event_type: 'swift-in#credit',
                schema_version: '4.0.0',
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(true)
            expect(result.event?.amount).toBe(786.54)
            expect(result.event?.reference).toBe('/RFB/ND-7K3M-X9P2')
            expect(result.event?.senderName).toBe('GEORGE SMITH')
        })

        // ── Generic rejection tests ──
        it('rejects null payload', () => {
            const result = parseDepositWebhook(null)
            expect(result.success).toBe(false)
            expect(result.error).toContain('not an object')
        })

        it('rejects missing event_type', () => {
            const result = parseDepositWebhook({ data: {} })
            expect(result.success).toBe(false)
            expect(result.error).toContain('Missing event_type')
        })

        it('ignores unknown event types', () => {
            const result = parseDepositWebhook({ event_type: 'transfers#state-change', data: { resource: { id: 1 } } })
            expect(result.success).toBe(false)
            expect(result.error).toContain('Ignored event type')
        })

        it('rejects balances#credit with zero amount', () => {
            const payload = {
                data: { resource: { id: 1 }, amount: 0, currency: 'PHP' },
                event_type: 'balances#credit',
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(false)
            expect(result.error).toContain('Invalid amount')
        })
    })

    describe('determinePaymentStatus', () => {
        it('returns matched for exact amount', () => {
            expect(determinePaymentStatus(5000, 5000)).toBe('matched')
        })

        it('returns matched within tolerance', () => {
            expect(determinePaymentStatus(4999.5, 5000)).toBe('matched')
            expect(determinePaymentStatus(5000.5, 5000)).toBe('matched')
        })

        it('returns partial when received < expected', () => {
            expect(determinePaymentStatus(4000, 5000)).toBe('partial')
        })

        it('returns overpaid when received > expected', () => {
            expect(determinePaymentStatus(6000, 5000)).toBe('overpaid')
        })
    })

    describe('calculateCreditAmount', () => {
        it('credits expected amount when matched', () => {
            expect(calculateCreditAmount(5000, 5000)).toBe(5000)
        })

        it('credits 0 for partial payment', () => {
            expect(calculateCreditAmount(4000, 5000)).toBe(0)
        })

        it('credits expected amount (not overpayment) for overpaid', () => {
            expect(calculateCreditAmount(6000, 5000)).toBe(5000)
        })
    })
})
