import {
    parseDepositWebhook,
    determinePaymentStatus,
    calculateCreditAmount,
} from '../../lib/payments/webhookParser'

describe('webhookParser', () => {
    describe('parseDepositWebhook', () => {
        const validPayload = {
            event_type: 'balances#credit',
            data: {
                resource: {
                    id: 123456789,
                    amount: { value: 5000, currency: 'PHP' },
                    reference: 'ND-7K3M-X9P2',
                    sender_name: 'Juan Dela Cruz',
                },
            },
        }

        it('parses a valid balance credit event', () => {
            const result = parseDepositWebhook(validPayload)
            expect(result.success).toBe(true)
            expect(result.event).toEqual({
                transactionId: '123456789',
                amount: 5000,
                currency: 'PHP',
                reference: 'ND-7K3M-X9P2',
                senderName: 'Juan Dela Cruz',
                eventType: 'balances#credit',
            })
        })

        it('rejects null payload', () => {
            const result = parseDepositWebhook(null)
            expect(result.success).toBe(false)
            expect(result.error).toContain('not an object')
        })

        it('ignores non-credit event types', () => {
            const result = parseDepositWebhook({
                event_type: 'transfers#state-change',
                data: { resource: { id: 1 } },
            })
            expect(result.success).toBe(false)
            expect(result.error).toContain('Ignored event type')
        })

        it('rejects payload missing data.resource', () => {
            const result = parseDepositWebhook({
                event_type: 'balances#credit',
                data: {},
            })
            expect(result.success).toBe(false)
            expect(result.error).toContain('Missing data.resource')
        })

        it('rejects payload with invalid amount', () => {
            const result = parseDepositWebhook({
                event_type: 'balances#credit',
                data: {
                    resource: {
                        id: 1,
                        amount: { value: 0, currency: 'PHP' },
                        reference: 'ND-7K3M-X9P2',
                    },
                },
            })
            expect(result.success).toBe(false)
            expect(result.error).toContain('Invalid amount')
        })

        it('handles missing sender name gracefully', () => {
            const payload = {
                event_type: 'balances#credit',
                data: {
                    resource: {
                        id: 999,
                        amount: { value: 1000, currency: 'PHP' },
                        reference: 'ND-AAAA-BBBB',
                    },
                },
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(true)
            expect(result.event?.senderName).toBe(null)
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
