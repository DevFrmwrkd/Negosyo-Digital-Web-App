/**
 * Payment reference code generation, validation, and extraction.
 * Pure functions — no database or framework dependencies. Fully testable with Jest.
 *
 * Format: ND-XXXX-YYYY (e.g., ND-7K3M-X9P2)
 * Alphabet: 23456789ABCDEFGHJKMNPQRSTUVWXYZ (no 0/O/1/I/L confusion)
 */

const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LENGTH = 8 // 4+4 characters of entropy
const PREFIX = 'ND'
const PATTERN = /ND-([23456789A-HJ-NP-Z]{4})-([23456789A-HJ-NP-Z]{4})/i

/**
 * Generate a random payment reference code.
 * Returns format: "ND-XXXX-YYYY"
 */
export function generateReferenceCode(): string {
    const chars: string[] = []
    const randomBytes = new Uint8Array(CODE_LENGTH)
    crypto.getRandomValues(randomBytes)
    for (let i = 0; i < CODE_LENGTH; i++) {
        chars.push(SAFE_ALPHABET[randomBytes[i] % SAFE_ALPHABET.length])
    }
    return `${PREFIX}-${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

/**
 * Validate that a string is a well-formed reference code.
 */
export function isValidReferenceCode(code: string): boolean {
    return PATTERN.test(normalizeCode(code))
}

/**
 * Normalize a reference code: uppercase, strip extra spaces, ensure dashes.
 * "nd 7k3m x9p2" → "ND-7K3M-X9P2"
 */
export function normalizeCode(input: string): string {
    const upper = input.trim().toUpperCase().replace(/\s+/g, '-')
    // If it matches without prefix, add it
    if (/^[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/.test(upper)) {
        return `${PREFIX}-${upper}`
    }
    // If it has the prefix but spaces instead of dashes
    const noDash = upper.replace(/[^A-Z0-9]/g, '')
    if (noDash.startsWith(PREFIX) && noDash.length === PREFIX.length + CODE_LENGTH) {
        const body = noDash.slice(PREFIX.length)
        return `${PREFIX}-${body.slice(0, 4)}-${body.slice(4)}`
    }
    return upper
}

/**
 * Extract a reference code from free-form text.
 * e.g., "Payment for ND-7K3M-X9P2 thank you" → "ND-7K3M-X9P2"
 * Returns null if no valid code found.
 */
export function extractReferenceFromText(text: string): string | null {
    const match = text.toUpperCase().match(PATTERN)
    if (!match) return null
    return `${PREFIX}-${match[1]}-${match[2]}`
}

/**
 * Check if a character is in the safe alphabet.
 */
export function isSafeChar(char: string): boolean {
    return SAFE_ALPHABET.includes(char.toUpperCase())
}

export { SAFE_ALPHABET, PREFIX, PATTERN }
