import {
    generateReferenceCode,
    isValidReferenceCode,
    normalizeCode,
    extractReferenceFromText,
    SAFE_ALPHABET,
} from '../../lib/payments/referenceCode'

describe('referenceCode', () => {
    describe('generateReferenceCode', () => {
        it('generates code in ND-XXXX-YYYY format', () => {
            const code = generateReferenceCode()
            expect(code).toMatch(/^ND-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
        })

        it('uses only safe alphabet characters (no 0/O/1/I/L)', () => {
            for (let i = 0; i < 100; i++) {
                const code = generateReferenceCode()
                const body = code.replace('ND-', '').replace('-', '')
                for (const char of body) {
                    expect(SAFE_ALPHABET.includes(char)).toBe(true)
                }
                // Specifically check forbidden characters
                expect(code).not.toMatch(/[01OIL]/)
            }
        })

        it('generates different codes on consecutive calls', () => {
            const codes = new Set()
            for (let i = 0; i < 50; i++) {
                codes.add(generateReferenceCode())
            }
            expect(codes.size).toBe(50)
        })
    })

    describe('isValidReferenceCode', () => {
        it('validates a properly formatted code', () => {
            expect(isValidReferenceCode('ND-7K3M-X9P2')).toBe(true)
        })

        it('rejects code with invalid characters', () => {
            expect(isValidReferenceCode('ND-7K3M-X9P0')).toBe(false) // 0 is forbidden
            expect(isValidReferenceCode('ND-7K3M-X9OL')).toBe(false) // O and L forbidden
        })

        it('rejects code with wrong format', () => {
            expect(isValidReferenceCode('ABC-7K3M-X9P2')).toBe(false) // Wrong prefix
            expect(isValidReferenceCode('ND-7K3-X9P2')).toBe(false)   // Wrong length
            expect(isValidReferenceCode('totally invalid')).toBe(false)
            expect(isValidReferenceCode('')).toBe(false)
        })

        it('accepts lowercase input', () => {
            expect(isValidReferenceCode('nd-7k3m-x9p2')).toBe(true)
        })
    })

    describe('normalizeCode', () => {
        it('uppercases lowercase input', () => {
            expect(normalizeCode('nd-7k3m-x9p2')).toBe('ND-7K3M-X9P2')
        })

        it('handles spaces instead of dashes', () => {
            expect(normalizeCode('ND 7K3M X9P2')).toBe('ND-7K3M-X9P2')
        })

        it('trims whitespace', () => {
            expect(normalizeCode('  ND-7K3M-X9P2  ')).toBe('ND-7K3M-X9P2')
        })
    })

    describe('extractReferenceFromText', () => {
        it('extracts code from free-text', () => {
            expect(extractReferenceFromText('Payment for ND-7K3M-X9P2 thank you')).toBe('ND-7K3M-X9P2')
        })

        it('extracts code at start of text', () => {
            expect(extractReferenceFromText('ND-7K3M-X9P2')).toBe('ND-7K3M-X9P2')
        })

        it('extracts code from lowercase text', () => {
            expect(extractReferenceFromText('payment nd-7k3m-x9p2')).toBe('ND-7K3M-X9P2')
        })

        it('returns null when no code present', () => {
            expect(extractReferenceFromText('Payment for invoice 123')).toBe(null)
        })

        it('returns null for malformed code', () => {
            expect(extractReferenceFromText('Payment for ND-7K3-X9P2 (typo)')).toBe(null)
        })
    })
})
