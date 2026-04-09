/**
 * Security utilities: rate limiting, input validation, URL sanitization.
 */

// ==================== RATE LIMITER ====================
// In-memory sliding window rate limiter. Resets on deployment (stateless between instances).
// For production scale, replace with Upstash Redis or similar.

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore) {
        if (now > entry.resetAt) rateLimitStore.delete(key)
    }
}, 60_000) // Clean every minute

/**
 * Check rate limit for a given key (e.g., userId or IP).
 * Returns { allowed, remaining, resetAt } or throws if exceeded.
 */
export function checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
): { allowed: boolean; remaining: number } {
    const now = Date.now()
    const entry = rateLimitStore.get(key)

    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, remaining: maxRequests - 1 }
    }

    if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0 }
    }

    entry.count++
    return { allowed: true, remaining: maxRequests - entry.count }
}

// Preset rate limit configs
export const RATE_LIMITS = {
    // Expensive operations: 5 per minute per user
    expensive: { maxRequests: 5, windowMs: 60_000 },
    // Standard API calls: 30 per minute per user
    standard: { maxRequests: 30, windowMs: 60_000 },
    // Email sending: 10 per minute per user
    email: { maxRequests: 10, windowMs: 60_000 },
    // Destructive operations: 3 per minute per user
    destructive: { maxRequests: 3, windowMs: 60_000 },
}

// ==================== INPUT VALIDATION ====================

/**
 * Validate that a value is a non-empty string within length limits.
 */
export function validateString(
    value: unknown,
    fieldName: string,
    { minLength = 1, maxLength = 10_000 }: { minLength?: number; maxLength?: number } = {}
): string {
    if (typeof value !== 'string') {
        throw new ValidationError(`${fieldName} must be a string`)
    }
    if (value.length < minLength) {
        throw new ValidationError(`${fieldName} is required`)
    }
    if (value.length > maxLength) {
        throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength}`)
    }
    return value
}

/**
 * Validate that a value looks like a Convex document ID (alphanumeric string).
 */
export function validateId(value: unknown, fieldName: string): string {
    const str = validateString(value, fieldName, { maxLength: 100 })
    if (!/^[a-zA-Z0-9_]+$/.test(str)) {
        throw new ValidationError(`${fieldName} contains invalid characters`)
    }
    return str
}

/**
 * Validate email format.
 */
export function validateEmail(value: unknown, fieldName: string): string {
    const str = validateString(value, fieldName, { maxLength: 320 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        throw new ValidationError(`${fieldName} is not a valid email address`)
    }
    return str
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ValidationError'
    }
}

// ==================== URL SANITIZATION ====================

// Allowed domains for server-side fetches (prevents SSRF)
const ALLOWED_FETCH_DOMAINS = [
    'convex.cloud',
    'r2.dev',
    'r2.cloudflarestorage.com',
    'supabase.co',
    'airtableusercontent.com',
]

/**
 * Validate that a URL is safe to fetch from the server (prevents SSRF).
 * Only allows HTTPS URLs from known domains.
 */
export function validateFetchUrl(url: string): string {
    try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:') {
            throw new ValidationError('Only HTTPS URLs are allowed')
        }
        const isAllowed = ALLOWED_FETCH_DOMAINS.some(domain =>
            parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
        )
        if (!isAllowed) {
            throw new ValidationError(`Domain ${parsed.hostname} is not allowed`)
        }
        return url
    } catch (e) {
        if (e instanceof ValidationError) throw e
        throw new ValidationError('Invalid URL format')
    }
}

/**
 * Sanitize a filename for Content-Disposition header (prevents header injection).
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^\w\s.-]/g, '_') // Remove special chars
        .replace(/\s+/g, '_')       // Replace spaces
        .substring(0, 200)           // Limit length
        || 'download'
}
