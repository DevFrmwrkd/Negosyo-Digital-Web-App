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

// ==================== WORKERS CUSTOM DOMAINS ====================

/**
 * Attach a custom domain (hostname) to a Cloudflare Worker.
 *
 * Spec: PUT /accounts/{account_id}/workers/domains
 * Body: { hostname, service, zone_id, environment }
 *
 * Cloudflare auto-creates DNS records and issues SSL certificates on attach —
 * no manual CNAME creation is required (unlike Pages). The zone must already
 * exist in the same Cloudflare account.
 *
 * Idempotent: re-attaching the same hostname to the same service is a no-op.
 */
export async function addCustomDomainToWorker(
    workerName: string,
    hostname: string,
    zoneId: string,
    environment: string = 'production'
): Promise<{ id: string; hostname: string; service: string }> {
    const { accountId } = getCreds()
    const result = await cfRequest(`/accounts/${accountId}/workers/domains`, {
        method: 'PUT',
        body: JSON.stringify({
            hostname,
            service: workerName,
            zone_id: zoneId,
            environment,
        }),
    })
    return {
        id: result.id || hostname,
        hostname: result.hostname || hostname,
        service: result.service || workerName,
    }
}

/**
 * Get the status of a custom domain attached to a Worker (SSL cert provisioning
 * state is implicit — once the record exists and zone is active, CF issues SSL).
 *
 * Spec: GET /accounts/{account_id}/workers/domains?hostname=...
 */
export async function getWorkerCustomDomainStatus(
    hostname: string
): Promise<{ status: string; id?: string }> {
    const { accountId } = getCreds()
    const result = await cfRequest(
        `/accounts/${accountId}/workers/domains?hostname=${encodeURIComponent(hostname)}`
    )
    const items = Array.isArray(result) ? result : []
    const match = items.find((d: any) => d?.hostname === hostname) || items[0]
    if (!match) return { status: 'pending' }
    return {
        status: match.cert_id ? 'active' : 'pending',
        id: match.id,
    }
}

/**
 * Remove a custom domain attachment from a Worker. Used for cleanup/migration.
 */
export async function removeCustomDomainFromWorker(domainId: string): Promise<void> {
    const { accountId } = getCreds()
    await cfRequest(`/accounts/${accountId}/workers/domains/${domainId}`, {
        method: 'DELETE',
    })
}

// ==================== PAGES CUSTOM DOMAINS (cleanup only) ====================

/**
 * Remove a custom domain from a Pages project. Kept for cleanup/migration when
 * a hostname was previously attached to a legacy Pages project and needs to be
 * moved to a Worker. New purchases should use addCustomDomainToWorker.
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

// ==================== DNS RECORD UTILITIES ====================

export async function listDnsRecords(zoneId: string): Promise<any[]> {
    const result = await cfRequest(`/zones/${zoneId}/dns_records?per_page=100`)
    return Array.isArray(result) ? result : []
}

export async function deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
    await cfRequest(`/zones/${zoneId}/dns_records/${recordId}`, { method: 'DELETE' })
}
