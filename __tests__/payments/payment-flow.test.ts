import {
    generateReferenceCode,
    isValidReferenceCode,
    normalizeCode,
    extractReferenceFromText,
    isSafeChar,
    SAFE_ALPHABET,
    PREFIX,
} from '@/lib/payments/referenceCode'
import {
    parseDepositWebhook,
    determinePaymentStatus,
    calculateCreditAmount,
    WiseDepositEvent,
} from '@/lib/payments/webhookParser'

describe('Payment Flow Tests', () => {
    // ===== REFERENCE CODE GENERATION & VALIDATION =====

    describe('Reference Code Generation', () => {
        test('1. Should generate valid reference codes in ND-XXXX-YYYY format', () => {
            const code = generateReferenceCode()
            expect(code).toMatch(/^ND-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/)
        })

        test('2. Should generate unique reference codes', () => {
            const codes = new Set()
            for (let i = 0; i < 100; i++) {
                codes.add(generateReferenceCode())
            }
            expect(codes.size).toBe(100)
        })

        test('3. Should only use safe alphabet characters (no 0/O/1/I/L confusion)', () => {
            for (let i = 0; i < 50; i++) {
                const code = generateReferenceCode()
                const chars = code.replace(/[-ND]/g, '')
                for (const char of chars) {
                    expect(SAFE_ALPHABET.includes(char)).toBe(true)
                }
            }
        })
    })

    describe('Reference Code Validation', () => {
        test('4. Should validate correctly formatted reference codes', () => {
            const validCodes = ['ND-7K3M-X9P2', 'ND-ABCD-EFGH', 'ND-2222-3333']
            for (const code of validCodes) {
                expect(isValidReferenceCode(code)).toBe(true)
            }
        })

        test('5. Should reject invalid reference codes', () => {
            const invalidCodes = [
                'ND-0000-XXXX', // contain 0
                'ND-OOOO-XXXX', // contain O
                'ND-1111-XXXX', // contain 1
                'XX-7K3M-X9P2', // wrong prefix
                'ND-7K3M', // missing second group
                'ND-XXXX-', // incomplete
                '',
            ]
            for (const code of invalidCodes) {
                expect(isValidReferenceCode(code)).toBe(false)
            }
        })

        test('6. Should validate case-insensitively', () => {
            expect(isValidReferenceCode('nd-7k3m-x9p2')).toBe(true)
            expect(isValidReferenceCode('ND-7K3M-X9P2')).toBe(true)
            expect(isValidReferenceCode('Nd-7k3M-x9P2')).toBe(true)
        })
    })

    describe('Reference Code Normalization', () => {
        test('7. Should normalize codes to uppercase with proper dashes', () => {
            expect(normalizeCode('nd-7k3m-x9p2')).toBe('ND-7K3M-X9P2')
            expect(normalizeCode('ND 7K3M X9P2')).toBe('ND-7K3M-X9P2')
            expect(normalizeCode('  nd7k3mx9p2  ')).toBe('ND-7K3M-X9P2')
        })

        test('8. Should normalize codes without prefix', () => {
            expect(normalizeCode('7K3M-X9P2')).toBe('ND-7K3M-X9P2')
            expect(normalizeCode('7k3m x9p2')).toBe('ND-7K3M-X9P2')
        })

        test('9. Should handle mixed formatting variations', () => {
            const variations = [
                'nd-7k3m-x9p2',
                'ND-7K3M-X9P2',
                'nd 7k3m x9p2',
                'ND 7K3M X9P2',
                '7k3m-x9p2',
                '7K3M X9P2',
            ]
            for (const variant of variations) {
                expect(normalizeCode(variant)).toBe('ND-7K3M-X9P2')
            }
        })
    })

    describe('Reference Code Extraction from Text', () => {
        test('10. Should extract reference code from plain text', () => {
            const result = extractReferenceFromText('Payment for ND-7K3M-X9P2 thank you')
            expect(result).toBe('ND-7K3M-X9P2')
        })

        test('11. Should extract code from various text patterns', () => {
            const patterns = [
                { text: 'ND-7K3M-X9P2', expected: 'ND-7K3M-X9P2' },
                {
                    text: 'Please credit submission ND-7K3M-X9P2 for Juan',
                    expected: 'ND-7K3M-X9P2',
                },
                { text: 'ref: nd-7k3m-x9p2', expected: 'ND-7K3M-X9P2' },
                {
                    text: 'This is submission ND-ABCD-EFGH confirmation',
                    expected: 'ND-ABCD-EFGH',
                },
            ]
            for (const { text, expected } of patterns) {
                expect(extractReferenceFromText(text)).toBe(expected)
            }
        })

        test('12. Should return null when no valid code found', () => {
            const noCodeTexts = [
                'No code here',
                'ND-0000-XXXX invalid format',
                'reference code missing',
                '',
                'ND-7K3M', // incomplete
            ]
            for (const text of noCodeTexts) {
                expect(extractReferenceFromText(text)).toBeNull()
            }
        })

        test('13. Should extract first occurrence when multiple codes present', () => {
            const text = 'Payment ND-7K3M-X9P2 or ND-ABCD-EFGH'
            expect(extractReferenceFromText(text)).toBe('ND-7K3M-X9P2')
        })
    })

    // ===== WEBHOOK PARSING =====

    describe('Webhook Parsing - Valid Events', () => {
        test('14. Should parse valid Wise balance credit webhook', () => {
            // Verified payload format from Wise docs:
            // https://docs.wise.com/guides/developer/webhooks/event-types
            const payload = {
                event_type: 'balances#credit',
                data: {
                    resource: { type: 'balance-account', id: 12345, profile_id: 222 },
                    transaction_type: 'credit',
                    amount: 5000,
                    currency: 'PHP',
                    post_transaction_balance_amount: 6000,
                    occurred_at: '2026-04-13T12:00:00.000Z',
                },
                subscription_id: '01234567-89ab',
                schema_version: '4.0.0',
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(true)
            expect(result.event?.transactionId).toBe('12345')
            expect(result.event?.amount).toBe(5000)
            expect(result.event?.currency).toBe('PHP')
        })
    })

    describe('Webhook Parsing - Error Cases', () => {
        test('15. Should reject non-object payloads', () => {
            expect(parseDepositWebhook(null).success).toBe(false)
            expect(parseDepositWebhook(undefined).success).toBe(false)
            expect(parseDepositWebhook('string').success).toBe(false)
            expect(parseDepositWebhook(123).success).toBe(false)
        })

        test('16. Should reject payloads without event_type', () => {
            const payload = {
                data: {
                    resource: {
                        id: 12345,
                        amount: { value: 5000, currency: 'PHP' },
                    },
                },
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(false)
            expect(result.error).toContain('Missing event_type')
        })

        test('17. Should ignore non-balance-credit events', () => {
            const payload = {
                event_type: 'transfers#state-change',
                data: {
                    resource: {
                        id: 12345,
                        amount: { value: 5000, currency: 'PHP' },
                    },
                },
            }
            const result = parseDepositWebhook(payload)
            expect(result.success).toBe(false)
            expect(result.error).toContain('Ignored event type')
        })

        test('18. Should reject payloads with missing required fields', () => {
            const basePayload = {
                event_type: 'balances#credit',
                data: {
                    resource: {
                        type: 'balance-credit',
                    },
                },
            }
            const invalidPayloads = [
                { ...basePayload, data: { resource: {} } }, // missing all fields
                {
                    ...basePayload,
                    data: { resource: { id: 0, amount: { value: 5000, currency: 'PHP' } } },
                }, // invalid id
                {
                    ...basePayload,
                    data: {
                        resource: { id: 123, amount: { value: null, currency: 'PHP' } },
                    },
                }, // invalid amount
                { ...basePayload, data: { resource: { id: 123, amount: { value: -100 } } } }, // negative amount
            ]

            for (const payload of invalidPayloads) {
                const result = parseDepositWebhook(payload)
                expect(result.success).toBe(false)
            }
        })
    })

    // ===== PAYMENT STATUS DETERMINATION =====

    describe('Payment Status Determination', () => {
        test('19. Should determine payment status correctly', () => {
            // Matched: received within tolerance of expected
            expect(determinePaymentStatus(5000, 5000)).toBe('matched')
            expect(determinePaymentStatus(5001, 5000)).toBe('matched')
            expect(determinePaymentStatus(4999, 5000)).toBe('matched')

            // Partial: received significantly less
            expect(determinePaymentStatus(4000, 5000)).toBe('partial')
            expect(determinePaymentStatus(100, 5000)).toBe('partial')

            // Overpaid: received significantly more
            expect(determinePaymentStatus(5200, 5000)).toBe('overpaid')
            expect(determinePaymentStatus(10000, 5000)).toBe('overpaid')
        })

        test('20. Should respect tolerance parameter for payment matching', () => {
            // With default tolerance (1)
            expect(determinePaymentStatus(5002, 5000, 1)).toBe('overpaid')
            expect(determinePaymentStatus(4998, 5000, 1)).toBe('partial')

            // With larger tolerance (50)
            expect(determinePaymentStatus(5050, 5000, 50)).toBe('matched')
            expect(determinePaymentStatus(4950, 5000, 50)).toBe('matched')
            expect(determinePaymentStatus(5051, 5000, 50)).toBe('overpaid')
        })
    })

    // ===== CREDIT CALCULATION =====

    describe('Credit Amount Calculation', () => {
        test('Should calculate credit amount based on payment status', () => {
            // Matched: credit expected amount
            expect(calculateCreditAmount(5000, 5000)).toBe(5000)
            expect(calculateCreditAmount(5001, 5000)).toBe(5000)

            // Partial: credit nothing (admin handles)
            expect(calculateCreditAmount(4000, 5000)).toBe(0)
            expect(calculateCreditAmount(100, 5000)).toBe(0)

            // Overpaid: credit expected amount (not overpayment)
            expect(calculateCreditAmount(5200, 5000)).toBe(5000)
            expect(calculateCreditAmount(10000, 5000)).toBe(5000)
        })
    })

    // ===== HELPER FUNCTIONS =====

    describe('Safe Alphabet Validation', () => {
        test('Should validate characters in safe alphabet', () => {
            const validChars = SAFE_ALPHABET.split('')
            for (const char of validChars) {
                expect(isSafeChar(char)).toBe(true)
            }

            const invalidChars = ['0', 'O', '1', 'I', 'L', '@', '#', '%']
            for (const char of invalidChars) {
                expect(isSafeChar(char)).toBe(false)
            }
        })
    })
})
