/**
 * Live USD → PHP exchange rate via Frankfurter API.
 * https://frankfurter.dev/ — free, no API key, no quotas, ECB-sourced rates.
 *
 * Cached in-memory for 1 hour to avoid hammering the API on every domain check.
 * Falls back to a sane default if the API is unreachable.
 */

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v2/rates?base=USD&quotes=PHP'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const FALLBACK_RATE = 58 // Reasonable fallback if Frankfurter is down (slightly conservative)

let cachedRate: number | null = null
let cacheExpiresAt: number = 0

/**
 * Get the current USD → PHP exchange rate.
 * Cached for 1 hour. Falls back to FALLBACK_RATE if API is unreachable.
 *
 * Override via env var FX_USD_PHP_OVERRIDE if set (useful for tests / fixed pricing).
 */
export async function getUsdToPhpRate(): Promise<number> {
    // Allow env-var override (for tests, fixed pricing periods, etc.)
    const override = process.env.FX_USD_PHP_OVERRIDE
    if (override) {
        const parsed = parseFloat(override)
        if (!isNaN(parsed) && parsed > 0) return parsed
    }

    // Return cached value if still valid
    const now = Date.now()
    if (cachedRate !== null && now < cacheExpiresAt) {
        return cachedRate
    }

    // Fetch fresh rate from Frankfurter
    try {
        const response = await fetch(FRANKFURTER_URL, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        // Frankfurter v2 response shape: { date, rates: [{ base, quote, rate }] }
        const rate = data?.rates?.[0]?.rate
        if (typeof rate === 'number' && rate > 0) {
            cachedRate = rate
            cacheExpiresAt = now + CACHE_TTL_MS
            console.log(`[FX] Updated USD→PHP rate: ${rate.toFixed(4)}`)
            return rate
        }
        throw new Error('Invalid rate format')
    } catch (error) {
        console.warn(`[FX] Failed to fetch USD→PHP rate, using fallback (${FALLBACK_RATE}):`, error)
        return FALLBACK_RATE
    }
}

/**
 * Convert USD to PHP using the current rate (rounded up to nearest peso).
 */
export async function usdToPhp(usd: number): Promise<number> {
    const rate = await getUsdToPhpRate()
    return Math.ceil(usd * rate)
}
