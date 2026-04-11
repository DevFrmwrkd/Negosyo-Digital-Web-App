/**
 * Cloudflare API client for zones, DNS, and Pages custom domains.
 * https://developers.cloudflare.com/api/
 *
 * Used by convex/domains.ts — requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars.
 */

const CF_API = 'https://api.cloudflare.com/client/v4'

function getCreds() {
    const token = process.env.CLOUDFLARE_API_TOKEN
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    if (!token || !accountId) {
        throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set')
    }
    return { token, accountId }
}

async function cfRequest(path: string, options: RequestInit = {}): Promise<any> {
    const { token } = getCreds()
    const response = await fetch(`${CF_API}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    })
    const data = await response.json()
    if (!response.ok || data.success === false) {
        const errorMsg = data.errors?.map((e: any) => e.message).join(', ') || JSON.stringify(data)
        throw new Error(`Cloudflare API error (${response.status}): ${errorMsg}`)
    }
    return data.result
}

// ==================== ZONES ====================

export interface ZoneInfo {
    zoneId: string
    nameservers: string[]
    status: string
}

/**
 * Create a new DNS zone in Cloudflare.
 * Returns the zone ID and nameservers to set on the registrar.
 */
export async function createZone(domain: string): Promise<ZoneInfo> {
    const { accountId } = getCreds()
    const result = await cfRequest('/zones', {
        method: 'POST',
        body: JSON.stringify({
            name: domain,
            account: { id: accountId },
            type: 'full',
        }),
    })
    return {
        zoneId: result.id,
        nameservers: result.name_servers || [],
        status: result.status,
    }
}

/**
 * Get zone status — "pending" (waiting for NS update), "active", or "moved".
 */
export async function getZoneStatus(zoneId: string): Promise<string> {
    const result = await cfRequest(`/zones/${zoneId}`)
    return result.status
}

/**
 * Check if a domain is already managed by our Cloudflare account.
 */
export async function isDomainOwnedByUs(domain: string): Promise<{ owned: boolean; zoneId?: string }> {
    const result = await cfRequest(`/zones?name=${encodeURIComponent(domain)}`)
    if (Array.isArray(result) && result.length > 0) {
        return { owned: true, zoneId: result[0].id }
    }
    return { owned: false }
}

// ==================== PAGES CUSTOM DOMAINS ====================

/**
 * Attach a custom domain to a Cloudflare Pages project.
 * Cloudflare auto-creates the DNS records pointing to the Pages project.
 */
export async function addCustomDomainToPages(
    projectName: string,
    domain: string
): Promise<{ id: string; status: string }> {
    const { accountId } = getCreds()
    const result = await cfRequest(
        `/accounts/${accountId}/pages/projects/${projectName}/domains`,
        {
            method: 'POST',
            body: JSON.stringify({ name: domain }),
        }
    )
    return {
        id: result.id || domain,
        status: result.status || 'pending',
    }
}

/**
 * Get the status of a custom domain on a Pages project (includes SSL cert status).
 */
export async function getCustomDomainStatus(
    projectName: string,
    domain: string
): Promise<{ status: string; certificateStatus: string }> {
    const { accountId } = getCreds()
    const result = await cfRequest(
        `/accounts/${accountId}/pages/projects/${projectName}/domains/${domain}`
    )
    return {
        status: result.status || 'pending',
        certificateStatus: result.certificate_authority || result.verification_data?.status || 'pending',
    }
}

/**
 * Remove a custom domain from a Pages project (cleanup on failure/cancellation).
 */
export async function removeCustomDomainFromPages(
    projectName: string,
    domain: string
): Promise<void> {
    const { accountId } = getCreds()
    await cfRequest(
        `/accounts/${accountId}/pages/projects/${projectName}/domains/${domain}`,
        { method: 'DELETE' }
    )
}
