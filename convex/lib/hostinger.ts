/**
 * Hostinger API client for domain registration.
 *
 * Endpoints verified against the official OpenAPI spec:
 *   https://developers.hostinger.com/openapi/openapi.json
 * Cross-referenced with the official MCP server:
 *   https://github.com/hostinger/api-mcp-server
 *
 * Used by convex/domains.ts. Auth via Bearer token in HOSTINGER_API_KEY env var.
 *
 * IMPORTANT: After registering a domain, the pipeline immediately calls disableAutoRenewal()
 * to prevent the platform from being charged for year 2+ renewals. The business owner is
 * responsible for renewing the domain themselves after year 1.
 *
 * The auto-renewal endpoint operates on a SUBSCRIPTION (not a domain), so we have to look
 * up the subscription created by the purchase via the subscription list endpoint.
 */

import { usdToPhp } from './fxRate'

const BASE_URL = 'https://developers.hostinger.com/api'

/**
 * TLDs blocked from the standard tier (too expensive for the ₱500 budget).
 * .ph costs ~$50/year — would exceed the platform's per-domain subsidy.
 * Configurable via env var BLOCKED_TLDS_OVERRIDE (comma-separated).
 */
function getBlockedTlds(): string[] {
    const override = process.env.BLOCKED_TLDS_OVERRIDE
    if (override) return override.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    return ['ph']
}
export const BLOCKED_TLDS = getBlockedTlds()

function getHostingerToken(): string {
    const token = process.env.HOSTINGER_API_KEY
    if (!token) {
        throw new Error('HOSTINGER_API_KEY env var must be set')
    }
    return token
}

function getPaymentMethodId(): number {
    const id = process.env.HOSTINGER_PAYMENT_METHOD_ID
    if (!id) {
        throw new Error('HOSTINGER_PAYMENT_METHOD_ID env var must be set (saved card ID from Hostinger Billing → Payment Methods)')
    }
    const parsed = parseInt(id, 10)
    if (isNaN(parsed)) throw new Error('HOSTINGER_PAYMENT_METHOD_ID must be a numeric ID')
    return parsed
}

async function hostingerRequest(path: string, options: RequestInit = {}): Promise<any> {
    const token = getHostingerToken()
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options.headers || {}),
        },
    })

    let data: any = null
    const text = await response.text()
    if (text) {
        try { data = JSON.parse(text) } catch { /* non-JSON body */ }
    }

    if (!response.ok) {
        const errorMsg =
            data?.error?.message ||
            data?.message ||
            data?.errors?.[0]?.message ||
            text ||
            `HTTP ${response.status}`
        throw new Error(`Hostinger API error (${response.status}): ${errorMsg}`)
    }
    return data
}

// ==================== TYPES ====================

export interface AvailabilityResult {
    available: boolean
    priceUSD: number
    pricePHP: number
    premium: boolean
    tld: string
    reason?: string
    /** The Hostinger catalog item_id needed for purchasing this domain (year 1) */
    itemId?: string
}

export interface RegistrationResult {
    /** Hostinger order ID returned from the purchase endpoint */
    orderId: string
    /** Subscription ID for this domain (used to disable auto-renewal). Looked up after purchase. */
    subscriptionId?: string
    /** Estimated expiry — Hostinger sets this; we approximate as 1 year from now */
    expiresAt: number
}

export interface RegistrantContact {
    firstName: string
    lastName: string
    email: string
    phone: string         // E.164 format e.g. "+639171234567"
    address: string
    city: string
    state: string         // province/region
    postalCode: string
    country: string       // ISO 3166-1 alpha-2, e.g. "PH"
}

export interface PaymentMethodStatus {
    connected: boolean
    brand?: string
    lastFour?: string
    error?: string
}

// ==================== AVAILABILITY ====================
// Spec: POST /api/domains/v1/availability
// Body: { domain: string (without TLD), tlds: string[] (without leading dot), with_alternatives?: boolean }
// e.g. POST /api/domains/v1/availability  {"domain":"juansbakery","tlds":["com","net"],"with_alternatives":false}

/**
 * Check if a domain is available for registration.
 * `domain` parameter accepts the FULL domain (e.g. "juansbakery.com") and is split internally.
 * Returns { available: false, reason: 'unsupported_tld' } for blocked TLDs (.ph).
 */
export async function checkAvailability(domain: string): Promise<AvailabilityResult> {
    const normalized = domain.trim().toLowerCase()
    const parts = normalized.split('.')
    if (parts.length < 2) {
        throw new Error('Invalid domain format')
    }
    const baseName = parts[0]
    const tld = parts.slice(1).join('.')

    // Block expensive TLDs from standard tier
    if (BLOCKED_TLDS.includes(tld)) {
        return {
            available: false,
            priceUSD: 0,
            pricePHP: 0,
            premium: false,
            tld,
            reason: `.${tld} is not supported in the standard package (too expensive for the included domain budget)`,
        }
    }

    try {
        const data = await hostingerRequest('/domains/v1/availability', {
            method: 'POST',
            body: JSON.stringify({
                domain: baseName,
                tlds: [tld],
                with_alternatives: false,
            }),
        })

        // Hostinger response shape (from MCP types): array of { domain, tld, is_available, restriction, item_id, price? }
        // The exact response shape isn't fully documented — be defensive.
        const results = Array.isArray(data) ? data : (data?.data || data?.results || [data])
        const ours = results.find(
            (r: any) => r?.domain === normalized || r?.tld === tld || r?.is_available !== undefined
        ) || results[0]

        if (!ours) {
            throw new Error('Empty availability response')
        }

        const isAvailable = ours.is_available === true || ours.available === true
        const isPremium = ours.is_premium === true || ours.premium === true
        const itemId = ours.item_id || ours.itemId || undefined
        // Pricing may be nested under price.amount or price.usd or item.price
        const priceUSD = parseFloat(
            ours.price?.amount || ours.price?.usd || ours.item?.price || ours.price || '0'
        )

        const pricePHP = priceUSD > 0 ? await usdToPhp(priceUSD) : 0

        return {
            available: isAvailable,
            priceUSD,
            pricePHP,
            premium: isPremium,
            tld,
            itemId,
        }
    } catch (error) {
        console.error(`[HOSTINGER] checkAvailability failed for ${normalized}:`, error)
        // Re-throw so the caller knows the check failed (don't silently mark as available)
        throw error
    }
}

// ==================== SUGGESTIONS ====================

/**
 * Suggest alternative domains by checking common TLD variants.
 * Hostinger's `with_alternatives: true` returns these in one call — we use that for efficiency.
 */
export async function suggestAlternatives(
    baseName: string,
    maxBudgetPHP: number = 500
): Promise<Array<{ domain: string; priceUSD: number; pricePHP: number; withinBudget: boolean }>> {
    // Skip blocked TLDs
    const candidateTlds = ['com', 'shop', 'store', 'online', 'xyz', 'site', 'co'].filter(
        (t) => !BLOCKED_TLDS.includes(t)
    )

    try {
        const data = await hostingerRequest('/domains/v1/availability', {
            method: 'POST',
            body: JSON.stringify({
                domain: baseName,
                tlds: candidateTlds,
                with_alternatives: true,
            }),
        })

        const results = Array.isArray(data) ? data : (data?.data || data?.results || [])
        const suggestions: Array<{ domain: string; priceUSD: number; pricePHP: number; withinBudget: boolean }> = []

        for (const r of results) {
            if (!r?.is_available && !r?.available) continue
            if (r?.is_premium === true || r?.premium === true) continue
            const fullDomain = r.domain || `${baseName}.${r.tld}`
            const priceUSD = parseFloat(r.price?.amount || r.price?.usd || r.price || '0')
            if (priceUSD <= 0) continue
            const pricePHP = await usdToPhp(priceUSD)
            suggestions.push({
                domain: fullDomain,
                priceUSD,
                pricePHP,
                withinBudget: pricePHP <= maxBudgetPHP,
            })
            if (suggestions.length >= 8) break
        }

        return suggestions.sort((a, b) => {
            if (a.withinBudget !== b.withinBudget) return a.withinBudget ? -1 : 1
            return a.pricePHP - b.pricePHP
        })
    } catch (error) {
        console.warn('[HOSTINGER] suggestAlternatives failed:', error)
        return []
    }
}

// ==================== CATALOG LOOKUP ====================

/**
 * Get the catalog item_id for a domain TLD.
 * The item_id is required by the purchase endpoint.
 * Spec: GET /api/billing/v1/catalog (filter by category=domain, name matches TLD)
 */
export async function getCatalogItemId(tld: string): Promise<string | null> {
    try {
        const data = await hostingerRequest(`/billing/v1/catalog?category=domain`, { method: 'GET' })
        const items = Array.isArray(data) ? data : (data?.data || data?.items || [])

        // Find the item matching this TLD
        const match = items.find((item: any) => {
            const name = (item.name || item.title || item.slug || '').toLowerCase()
            return name.includes(`.${tld}`) || name === tld || name === `.${tld}`
        })

        if (match) {
            return String(match.id || match.item_id || '')
        }

        // If catalog search fails, try using the TLD directly as the item_id
        // (some registrar APIs accept the TLD name as the item identifier)
        console.warn(`[HOSTINGER] No catalog item found for .${tld}, will try domain name as item_id`)
        return null
    } catch (error) {
        console.warn(`[HOSTINGER] Catalog lookup failed for .${tld}:`, error)
        return null
    }
}

// ==================== REGISTRATION ====================
// Spec: POST /api/domains/v1/portfolio
// Body: { domain, item_id, payment_method_id?, domain_contacts?, additional_details?, coupons? }
// Response: Order resource (we extract order id; subscription id requires a follow-up lookup)

/**
 * Register a domain for 1 year using a saved Hostinger payment method.
 * Requires the `itemId` from a prior availability check (returned in AvailabilityResult.itemId).
 *
 * The contact info is used as registrant + admin + tech contact (per ICANN requirements).
 *
 * IMPORTANT: After successful registration, the caller MUST immediately call:
 *   1. findSubscriptionForDomain(domain) → get subscriptionId
 *   2. disableAutoRenewal(subscriptionId)
 */
export async function registerDomain(
    domain: string,
    itemId: string,
    contact: RegistrantContact
): Promise<RegistrationResult> {
    const normalized = domain.trim().toLowerCase()
    const tld = normalized.split('.').slice(1).join('.')

    if (BLOCKED_TLDS.includes(tld)) {
        throw new Error(`Cannot register .${tld} — TLD is blocked from standard tier`)
    }

    // item_id is required by Hostinger — if not provided, try the domain name itself
    const effectiveItemId = itemId || normalized

    const paymentMethodId = getPaymentMethodId()

    // Hostinger expects a `domain_contacts` object. Field names follow common WHOIS conventions.
    // The exact schema isn't fully documented in the OpenAPI public spec — we send standard fields.
    const contactObject = {
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        address1: contact.address,
        city: contact.city,
        state: contact.state,
        zip: contact.postalCode,
        country: contact.country,
    }

    const data = await hostingerRequest('/domains/v1/portfolio', {
        method: 'POST',
        body: JSON.stringify({
            domain: normalized,
            item_id: effectiveItemId,
            payment_method_id: paymentMethodId,
            domain_contacts: {
                owner: contactObject,
                admin: contactObject,
                billing: contactObject,
                tech: contactObject,
            },
        }),
    })

    // Response is an Order resource. Field names per Billing.V1.Order.OrderResource spec.
    const orderId = String(data?.id || data?.order_id || data?.data?.id || normalized)
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year

    return {
        orderId,
        expiresAt,
    }
}

/**
 * Find the subscription ID for a recently-purchased domain.
 * Called immediately after registerDomain so we can disable auto-renewal.
 *
 * Lists all subscriptions and finds the one matching this domain (typically the most recent).
 */
export async function findSubscriptionForDomain(domain: string): Promise<string | null> {
    const normalized = domain.trim().toLowerCase()
    try {
        const data = await hostingerRequest('/billing/v1/subscriptions', { method: 'GET' })
        const subs = Array.isArray(data) ? data : (data?.data || data?.subscriptions || [])

        // Find a subscription whose name/domain field matches our domain
        // Hostinger subscriptions usually have a `name` or `domain` field with the domain name
        const match = subs.find((s: any) => {
            const candidates = [s?.name, s?.domain, s?.product_name, s?.title].filter(Boolean)
            return candidates.some((c: string) => c?.toLowerCase().includes(normalized))
        })

        if (match) {
            return String(match.id || match.subscription_id || '')
        }
        return null
    } catch (error) {
        console.warn(`[HOSTINGER] findSubscriptionForDomain failed for ${normalized}:`, error)
        return null
    }
}

/**
 * CRITICAL: Disable auto-renewal for a subscription immediately after registration.
 * This prevents the platform's payment method from being charged for year 2+.
 *
 * Spec: DELETE /api/billing/v1/subscriptions/{subscriptionId}/auto-renewal/disable
 */
export async function disableAutoRenewal(subscriptionId: string): Promise<void> {
    if (!subscriptionId) throw new Error('subscriptionId required to disable auto-renewal')
    await hostingerRequest(`/billing/v1/subscriptions/${subscriptionId}/auto-renewal/disable`, {
        method: 'DELETE',
    })
}

/**
 * Update nameservers for a domain (used after Cloudflare zone is created).
 * Spec: PUT /api/domains/v1/portfolio/{domain}/nameservers
 * Body: { ns1, ns2, ns3?, ns4? }
 */
export async function updateNameservers(domain: string, nameservers: string[]): Promise<void> {
    const normalized = domain.trim().toLowerCase()
    if (nameservers.length < 2) {
        throw new Error('At least 2 nameservers required')
    }
    const body: Record<string, string> = {
        ns1: nameservers[0],
        ns2: nameservers[1],
    }
    if (nameservers[2]) body.ns3 = nameservers[2]
    if (nameservers[3]) body.ns4 = nameservers[3]

    await hostingerRequest(`/domains/v1/portfolio/${normalized}/nameservers`, {
        method: 'PUT',
        body: JSON.stringify(body),
    })
}

/**
 * Get domain info (registration date, expiry, nameservers).
 * Spec: GET /api/domains/v1/portfolio/{domain}
 */
export async function getDomainInfo(domain: string): Promise<{
    domain: string
    expirationDate: number
    nameservers: string[]
}> {
    const normalized = domain.trim().toLowerCase()
    const data = await hostingerRequest(`/domains/v1/portfolio/${normalized}`, { method: 'GET' })
    return {
        domain: normalized,
        expirationDate: data?.expires_at ? new Date(data.expires_at).getTime() : 0,
        nameservers: data?.nameservers || [],
    }
}

// ==================== PAYMENT METHOD STATUS ====================
// Spec: GET /api/billing/v1/payment-methods

/**
 * Get payment method status for the saved card.
 * Used by the admin UI widget to confirm card is connected and active.
 */
export async function getPaymentMethodStatus(): Promise<PaymentMethodStatus> {
    try {
        const paymentMethodId = process.env.HOSTINGER_PAYMENT_METHOD_ID
        if (!process.env.HOSTINGER_API_KEY || !paymentMethodId) {
            return {
                connected: false,
                error: 'HOSTINGER_API_KEY or HOSTINGER_PAYMENT_METHOD_ID not configured',
            }
        }

        const data = await hostingerRequest('/billing/v1/payment-methods', { method: 'GET' })
        const methods = Array.isArray(data) ? data : (data?.data || data?.payment_methods || [])

        const ours = methods.find((m: any) =>
            String(m.id) === paymentMethodId || String(m.payment_method_id) === paymentMethodId
        )

        if (!ours) {
            return {
                connected: false,
                error: `Payment method ID ${paymentMethodId} not found in Hostinger account`,
            }
        }

        return {
            connected: true,
            brand: (ours.brand || ours.card_brand || ours.type || 'CARD').toUpperCase(),
            lastFour: ours.last_four || ours.last4 || ours.card_last_four || '????',
        }
    } catch (error: any) {
        return {
            connected: false,
            error: error.message || 'Failed to fetch payment method status',
        }
    }
}
