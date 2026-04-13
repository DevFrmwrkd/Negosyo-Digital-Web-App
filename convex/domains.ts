import { v } from 'convex/values'
import { action, mutation, query, internalAction, internalMutation, internalQuery } from './_generated/server'
import { internal, api } from './_generated/api'
import { Id } from './_generated/dataModel'
import {
    checkAvailability as registrarCheckAvailability,
    suggestAlternatives as registrarSuggestAlternatives,
    registerDomain as registrarRegister,
    disableAutoRenewal as registrarDisableAutoRenewal,
    findSubscriptionForDomain as registrarFindSubscription,
    getCatalogItemId as registrarGetCatalogItemId,
    updateNameservers,
    getPaymentMethodStatus as registrarGetPaymentMethodStatus,
    listPaymentMethods as registrarListPaymentMethods,
    listWhoisProfiles as registrarListWhoisProfiles,
    type RegistrantContact,
} from './lib/hostinger'
import {
    createZone,
    getZoneStatus,
    isDomainOwnedByUs,
    addCustomDomainToWorker,
    getWorkerCustomDomainStatus,
    removeCustomDomainFromPages,
    listDnsRecords,
    deleteDnsRecord,
} from './lib/cloudflare'

/**
 * Build the registrant contact info from a submission's business owner fields.
 * Throws a clear error if any required field is missing.
 * Phone numbers in PH local format (09...) are normalized to E.164 (+63...).
 */
function buildContactFromSubmission(submission: any): RegistrantContact {
    const missing: string[] = []
    if (!submission.ownerName) missing.push('ownerName')
    if (!submission.ownerEmail) missing.push('ownerEmail')
    if (!submission.ownerPhone) missing.push('ownerPhone')
    if (!submission.address) missing.push('address')
    if (!submission.city) missing.push('city')
    if (missing.length > 0) {
        throw new Error(`Cannot register domain: business owner info incomplete. Missing: ${missing.join(', ')}`)
    }

    const nameParts = String(submission.ownerName).trim().split(/\s+/)
    const firstName = nameParts[0] || 'Owner'
    const lastName = nameParts.slice(1).join(' ') || firstName

    // Normalize PH phone numbers: "09171234567" → "+639171234567"
    let phone = String(submission.ownerPhone).replace(/[^\d+]/g, '')
    if (phone.startsWith('09')) {
        phone = '+63' + phone.substring(1)
    } else if (phone.startsWith('9') && phone.length === 10) {
        phone = '+63' + phone
    } else if (!phone.startsWith('+')) {
        phone = '+' + phone
    }

    return {
        firstName,
        lastName,
        email: submission.ownerEmail,
        phone,
        address: submission.address,
        city: submission.city,
        // ICANN/WHOIS requires state + postal code; fall back to sensible PH defaults
        // when the submission didn't capture them.
        state: submission.province || submission.city || 'Metro Manila',
        postalCode: submission.postalCode || '1000',
        country: 'PH',
    }
}

// ==================== PUBLIC ACTIONS ====================

/**
 * Check if a domain is available for purchase.
 * Returns price and availability + alternative suggestions if taken.
 * Used by admin UI and mobile review page.
 */
export const checkDomainAvailability = action({
    args: {
        domain: v.string(),
        maxBudgetPHP: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Basic format validation
        const normalized = args.domain.trim().toLowerCase()
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(normalized)) {
            return {
                valid: false,
                error: 'Invalid domain format',
            }
        }

        try {
            // First check if WE already own it in Cloudflare
            const owned = await isDomainOwnedByUs(normalized)
            if (owned.owned) {
                return {
                    valid: true,
                    available: false,
                    reason: 'This domain is already in our system',
                    domain: normalized,
                }
            }

            // Check availability via Porkbun
            const result = await registrarCheckAvailability(normalized)
            const maxBudget = args.maxBudgetPHP ?? 500
            const withinBudget = result.pricePHP <= maxBudget

            if (!result.available) {
                // Fetch alternatives
                const baseName = normalized.split('.')[0]
                const suggestions = await registrarSuggestAlternatives(baseName, maxBudget)
                return {
                    valid: true,
                    available: false,
                    reason: 'Domain is already registered',
                    domain: normalized,
                    suggestions,
                }
            }

            if (result.premium) {
                return {
                    valid: true,
                    available: false,
                    reason: 'Premium domain (not eligible for standard pricing)',
                    domain: normalized,
                    priceUSD: result.priceUSD,
                    pricePHP: result.pricePHP,
                }
            }

            return {
                valid: true,
                available: true,
                domain: normalized,
                priceUSD: result.priceUSD,
                pricePHP: result.pricePHP,
                withinBudget,
                tld: result.tld,
            }
        } catch (error: any) {
            console.error('[DOMAINS] Availability check failed:', error)
            return {
                valid: false,
                error: error.message || 'Availability check failed',
            }
        }
    },
})

// ==================== ADMIN ACTIONS ====================

/**
 * Manually trigger domain purchase + setup for a submission (admin action).
 * Used when the creator didn't pick a domain initially or when admin wants to purchase
 * a custom domain on behalf of a submission.
 */
export const purchaseDomainForSubmission = action({
    args: {
        submissionId: v.id('submissions'),
        domain: v.string(),
        adminClerkId: v.string(),
    },
    handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
        // Verify admin
        const creator = await ctx.runQuery(api.creators.getByClerkId, { clerkId: args.adminClerkId })
        if (!creator || creator.role !== 'admin') {
            throw new Error('Admin access required')
        }

        const submission = await ctx.runQuery(internal.submissions.getByIdInternal, {
            id: args.submissionId,
        })
        if (!submission) {
            throw new Error('Submission not found')
        }

        // Save the requested domain + upgrade tier
        await ctx.runMutation(internal.domains.setRequestedDomain, {
            submissionId: args.submissionId,
            domain: args.domain.trim().toLowerCase(),
        })

        // Schedule the full setup pipeline
        await ctx.scheduler.runAfter(0, internal.domains.setupForSubmission, {
            submissionId: args.submissionId,
        })

        // Audit log
        await ctx.runMutation(internal.auditLogs.log, {
            adminId: args.adminClerkId,
            action: 'website_deployed',
            targetType: 'submission',
            targetId: args.submissionId,
            metadata: {
                action: 'custom_domain_purchase_initiated',
                domain: args.domain,
                businessName: submission.businessName,
            },
        })

        return {
            success: true,
            message: `Domain purchase started for ${args.domain}. This will take 2-6 minutes.`,
        }
    },
})

// ==================== INTERNAL HELPERS ====================

export const setRequestedDomain = internalMutation({
    args: {
        submissionId: v.id('submissions'),
        domain: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.submissionId, {
            requestedDomain: args.domain,
            submissionType: 'with_custom_domain',
            domainStatus: 'pending_payment',
        } as any)
    },
})

export const setDomainStatus = internalMutation({
    args: {
        submissionId: v.id('submissions'),
        status: v.union(
            v.literal('not_requested'),
            v.literal('pending_payment'),
            v.literal('registering'),
            v.literal('configuring_dns'),
            v.literal('provisioning_ssl'),
            v.literal('live'),
            v.literal('failed')
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.submissionId, {
            domainStatus: args.status,
        } as any)
    },
})

export const setDomainFailed = internalMutation({
    args: {
        submissionId: v.id('submissions'),
        reason: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.submissionId, {
            domainStatus: 'failed',
            domainFailureReason: args.reason,
        } as any)
    },
})

export const setRegistrarMetadata = internalMutation({
    args: {
        submissionId: v.id('submissions'),
        orderId: v.string(),
        expiresAt: v.number(),
        costPHP: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const patch: any = {
            registrarOrderId: args.orderId,
            domainExpiresAt: args.expiresAt,
        }
        if (args.costPHP !== undefined && args.costPHP > 0) {
            patch.domainCostPHP = args.costPHP
        }
        await ctx.db.patch(args.submissionId, patch)
    },
})

/**
 * Sum of all Hostinger custom-domain registration fees the platform has paid.
 * Subtracted from gross earnings on the admin dashboard to show net revenue.
 */
export const getTotalHostingerDomainCostsPHP = query({
    args: {},
    handler: async (ctx) => {
        const submissions = await ctx.db
            .query('submissions')
            .withIndex('by_domainStatus')
            .collect()
        let total = 0
        for (const s of submissions) {
            const cost = (s as any).domainCostPHP
            if (typeof cost === 'number' && cost > 0) total += cost
        }
        return total
    },
})

/**
 * One-off backfill: set a submission's `domainCostPHP` field manually for
 * registrations that happened before cost capture was wired into the pipeline.
 */
export const backfillDomainCostPHP = internalMutation({
    args: {
        submissionId: v.id('submissions'),
        costPHP: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.submissionId, {
            domainCostPHP: args.costPHP,
        } as any)
    },
})

export const setCloudflareZone = internalMutation({
    args: {
        submissionId: v.id('submissions'),
        zoneId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.submissionId, {
            cloudflareZoneId: args.zoneId,
        } as any)
    },
})

export const setCustomDomainOnWebsite = internalMutation({
    args: {
        submissionId: v.id('submissions'),
        customDomain: v.string(),
    },
    handler: async (ctx, args) => {
        const website = await ctx.db
            .query('generatedWebsites')
            .withIndex('by_submissionId', (q) => q.eq('submissionId', args.submissionId))
            .first()
        if (!website) throw new Error('Generated website not found')

        await ctx.db.patch(website._id, {
            customDomain: args.customDomain,
            publishedUrl: `https://${args.customDomain}`,
        })
    },
})

export const getSubmissionDomainInfo = query({
    args: { submissionId: v.id('submissions') },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.submissionId)
        if (!submission) return null
        return {
            submissionType: (submission as any).submissionType,
            requestedDomain: (submission as any).requestedDomain,
            domainStatus: (submission as any).domainStatus,
            domainFailureReason: (submission as any).domainFailureReason,
            registrarOrderId: (submission as any).registrarOrderId,
            domainExpiresAt: (submission as any).domainExpiresAt,
            cloudflareZoneId: (submission as any).cloudflareZoneId,
        }
    },
})

// ==================== FULL SETUP PIPELINE ====================

/**
 * Full domain setup pipeline:
 * 1. Re-verify availability
 * 2. Register with Porkbun
 * 3. Create Cloudflare zone
 * 4. Update Porkbun nameservers → Cloudflare
 * 5. Wait for zone active
 * 6. Attach to Pages project
 * 7. Wait for SSL
 * 8. Mark live + notify creator
 */
export const setupForSubmission = internalAction({
    args: { submissionId: v.id('submissions') },
    handler: async (ctx, args) => {
        const submission = await ctx.runQuery(internal.submissions.getByIdInternal, {
            id: args.submissionId,
        })
        if (!submission) {
            console.error(`[DOMAINS] Submission ${args.submissionId} not found`)
            return
        }

        const domain = (submission as any).requestedDomain
        if (!domain) {
            console.log(`[DOMAINS] Submission ${args.submissionId} has no requested domain, skipping`)
            return
        }

        const website = await ctx.runQuery(internal.generatedWebsites.getBySubmissionInternal, {
            submissionId: args.submissionId,
        })
        if (!website?.cfPagesProjectName) {
            await ctx.runMutation(internal.domains.setDomainFailed, {
                submissionId: args.submissionId,
                reason: 'No Cloudflare Pages project found for this submission',
            })
            return
        }

        try {
            console.log(`[DOMAINS] Starting setup for ${domain} (submission ${args.submissionId})`)

            // Step 1: Re-verify availability
            await ctx.runMutation(internal.domains.setDomainStatus, {
                submissionId: args.submissionId,
                status: 'registering',
            })
            const availCheck = await registrarCheckAvailability(domain)
            if (!availCheck.available) {
                throw new Error(`Domain ${domain} is no longer available`)
            }

            // Step 1b: Get catalog item_id (required for purchase).
            // Hostinger rejects arbitrary values — must come from availability response or catalog endpoint.
            let itemId: string | undefined = availCheck.itemId
            if (!itemId) {
                const tld = domain.split('.').slice(1).join('.')
                console.log(`[DOMAINS] No item_id from availability check, looking up catalog for .${tld}`)
                itemId = (await registrarGetCatalogItemId(tld)) ?? undefined
            }
            if (!itemId) {
                throw new Error(`Could not resolve Hostinger catalog item_id for ${domain}. Catalog lookup returned no match — check Hostinger logs.`)
            }
            console.log(`[DOMAINS] Using item_id: ${itemId} for ${domain}`)

            // Step 2: Register. Hostinger will use the pre-created WHOIS profile
            // for this TLD (verified inside registrarRegister).
            const reg = await registrarRegister(domain, itemId!)
            await ctx.runMutation(internal.domains.setRegistrarMetadata, {
                submissionId: args.submissionId,
                orderId: reg.orderId,
                expiresAt: reg.expiresAt,
                costPHP: reg.totalPHP,
            })
            console.log(`[DOMAINS] Hostinger charged $${reg.totalUSD.toFixed(2)} (₱${reg.totalPHP.toFixed(2)}) for ${domain}`)

            // Schedule the 30-day-before-expiry renewal reminder email.
            // Convex schedulers persist long-future jobs reliably.
            const reminderAt = reg.expiresAt - 30 * 24 * 60 * 60 * 1000
            if (reminderAt > Date.now()) {
                await ctx.scheduler.runAt(
                    reminderAt,
                    internal.domains.sendDomainRenewalReminderEmailAction,
                    { submissionId: args.submissionId }
                )
                console.log(`[DOMAINS] Scheduled renewal reminder for ${domain} at ${new Date(reminderAt).toISOString()}`)
            }
            console.log(`[DOMAINS] Registered ${domain} with Hostinger, orderId: ${reg.orderId}`)

            // Step 2b: CRITICAL — find the subscription created by the purchase, then disable auto-renewal
            // Platform pays year 1 only; business owner is responsible for renewing themselves.
            // Hostinger's auto-renewal endpoint operates on a SUBSCRIPTION, not a domain directly.
            try {
                // Wait briefly for Hostinger to create the subscription record after purchase
                await new Promise((resolve) => setTimeout(resolve, 3000))
                const subscriptionId = await registrarFindSubscription(domain)
                if (!subscriptionId) {
                    throw new Error('Subscription not found for domain after registration')
                }
                await registrarDisableAutoRenewal(subscriptionId)
                console.log(`[DOMAINS] ✓ Auto-renewal disabled for subscription ${subscriptionId} (${domain})`)
            } catch (renewalError: any) {
                // Don't fail the whole pipeline — domain is registered, just log loudly so admin can clean up
                console.error(`[DOMAINS] ⚠ Failed to disable auto-renewal for ${domain}:`, renewalError)
                await ctx.runMutation(internal.auditLogs.log, {
                    adminId: 'system:domain-setup',
                    action: 'manual_override',
                    targetType: 'submission',
                    targetId: args.submissionId,
                    metadata: {
                        action: 'auto_renewal_disable_failed',
                        domain,
                        warning: 'Domain registered but auto-renewal could NOT be disabled. Manually disable in Hostinger dashboard (Billing → Subscriptions → find this domain → toggle off auto-renewal) before next year to avoid charges.',
                        error: String(renewalError?.message || renewalError),
                    },
                })
            }

            // Step 3: Create Cloudflare zone
            await ctx.runMutation(internal.domains.setDomainStatus, {
                submissionId: args.submissionId,
                status: 'configuring_dns',
            })
            const zone = await createZone(domain)
            await ctx.runMutation(internal.domains.setCloudflareZone, {
                submissionId: args.submissionId,
                zoneId: zone.zoneId,
            })
            console.log(`[DOMAINS] Created Cloudflare zone ${zone.zoneId} for ${domain}`)

            // Step 4: Point Porkbun nameservers to Cloudflare
            try {
                await updateNameservers(domain, zone.nameservers)
                console.log(`[DOMAINS] Updated Porkbun nameservers to Cloudflare for ${domain}`)
            } catch (nsError) {
                console.warn(`[DOMAINS] Failed to update nameservers:`, nsError)
                // Continue — sometimes Porkbun auto-sets them during registration
            }

            // Step 5: Wait for zone to become active (poll up to 2 min)
            let zoneActive = false
            for (let i = 0; i < 24; i++) {
                const status = await getZoneStatus(zone.zoneId)
                if (status === 'active') {
                    zoneActive = true
                    break
                }
                await new Promise((r) => setTimeout(r, 5000))
            }
            if (!zoneActive) {
                console.warn(`[DOMAINS] Zone ${zone.zoneId} not active after 2min, continuing anyway`)
            }

            // Step 6: Attach to Cloudflare Worker (CF auto-creates DNS + SSL)
            await addCustomDomainToWorker(website.cfPagesProjectName, domain, zone.zoneId)
            console.log(`[DOMAINS] Attached ${domain} to Worker ${website.cfPagesProjectName}`)

            // Step 7: Update website record + status NOW. We set customDomain
            // immediately so the UI switches over even while SSL is provisioning —
            // browsers will auto-redirect to HTTPS once the cert is issued.
            await ctx.runMutation(internal.domains.setCustomDomainOnWebsite, {
                submissionId: args.submissionId,
                customDomain: domain,
            })
            await ctx.runMutation(internal.domains.setDomainStatus, {
                submissionId: args.submissionId,
                status: 'provisioning_ssl',
            })

            // Step 8: Schedule SSL polling in a follow-up action. Convex actions
            // cap at 10 minutes; SSL issuance can sometimes exceed that, so we chain
            // self-rescheduling invocations via pollDomainSsl.
            await ctx.scheduler.runAfter(30_000, internal.domains.pollDomainSsl, {
                submissionId: args.submissionId,
                projectName: website.cfPagesProjectName,
                domain,
                attempt: 0,
                orderId: reg.orderId,
                zoneId: zone.zoneId,
            })

            // Step 8b: Send the "your domain is being set up, SSL is provisioning"
            // email to the business owner so they know what to expect.
            await ctx.scheduler.runAfter(0, internal.domains.sendDomainSetupInProgressEmailAction, {
                submissionId: args.submissionId,
            })

            console.log(`[DOMAINS] ✓ Setup handoff complete for ${domain} — SSL poll scheduled`)
        } catch (error: any) {
            console.error(`[DOMAINS] Setup failed for ${domain}:`, error)
            await ctx.runMutation(internal.domains.setDomainFailed, {
                submissionId: args.submissionId,
                reason: error.message || String(error),
            })
            // Log for admin visibility
            await ctx.runMutation(internal.auditLogs.log, {
                adminId: 'system:domain-setup',
                action: 'manual_override',
                targetType: 'submission',
                targetId: args.submissionId,
                metadata: {
                    action: 'custom_domain_failed',
                    domain,
                    reason: error.message || String(error),
                },
            })
        }
    },
})

// ==================== ADMIN: PAYMENT METHOD STATUS ====================

/**
 * Get the saved Hostinger payment method status (for the admin UI widget).
 */
export const getHostingerPaymentMethodStatus = action({
    args: {},
    handler: async (ctx) => {
        return await registrarGetPaymentMethodStatus()
    },
})

/**
 * Admin-only diagnostic. Verifies that the Hostinger account is actually ready to
 * register domains: payment method ID points at a real saved method, and a WHOIS
 * profile exists for the requested TLD. Run this whenever a domain purchase fails.
 */
/**
 * Recovery action: resume the domain setup pipeline for a submission whose domain
 * is ALREADY registered at Hostinger, skipping the registration step. Use this when
 * a manual curl/direct registration succeeded but Convex never wrote the metadata.
 *
 * Args: submissionId, orderId (Hostinger), subscriptionId (Hostinger).
 * Runs: setRegistrarMetadata → (assumes auto-renewal already disabled) → Cloudflare
 * zone → nameservers → wait for active → Pages attach → SSL → mark live → notify.
 */
export const resumeAfterRegistration = internalAction({
    args: {
        submissionId: v.id('submissions'),
        orderId: v.string(),
        subscriptionId: v.string(),
    },
    handler: async (ctx, args) => {
        const submission = await ctx.runQuery(internal.submissions.getByIdInternal, {
            id: args.submissionId,
        })
        if (!submission) throw new Error(`Submission ${args.submissionId} not found`)
        const domain = (submission as any).requestedDomain
        if (!domain) throw new Error('Submission has no requestedDomain')

        const website = await ctx.runQuery(internal.generatedWebsites.getBySubmissionInternal, {
            submissionId: args.submissionId,
        })
        if (!website?.cfPagesProjectName) throw new Error('No Cloudflare Pages project for submission')

        console.log(`[DOMAINS] Resuming post-registration setup for ${domain}`)

        const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000
        await ctx.runMutation(internal.domains.setRegistrarMetadata, {
            submissionId: args.submissionId,
            orderId: args.orderId,
            expiresAt,
        })

        await ctx.runMutation(internal.domains.setDomainStatus, {
            submissionId: args.submissionId,
            status: 'configuring_dns',
        })
        const zone = await createZone(domain)
        await ctx.runMutation(internal.domains.setCloudflareZone, {
            submissionId: args.submissionId,
            zoneId: zone.zoneId,
        })
        console.log(`[DOMAINS] Created Cloudflare zone ${zone.zoneId} for ${domain}`)

        try {
            await updateNameservers(domain, zone.nameservers)
            console.log(`[DOMAINS] Updated nameservers for ${domain}`)
        } catch (nsError) {
            console.warn(`[DOMAINS] Failed to update nameservers:`, nsError)
        }

        let zoneActive = false
        for (let i = 0; i < 24; i++) {
            const status = await getZoneStatus(zone.zoneId)
            if (status === 'active') { zoneActive = true; break }
            await new Promise((r) => setTimeout(r, 5000))
        }
        if (!zoneActive) console.warn(`[DOMAINS] Zone ${zone.zoneId} not active after 2min, continuing`)

        await addCustomDomainToWorker(website.cfPagesProjectName, domain, zone.zoneId)
        console.log(`[DOMAINS] Attached ${domain} to Worker ${website.cfPagesProjectName}`)

        // Set customDomain immediately so the submission UI reflects the new URL,
        // then hand off SSL polling to a self-rescheduling follow-up action.
        await ctx.runMutation(internal.domains.setCustomDomainOnWebsite, {
            submissionId: args.submissionId,
            customDomain: domain,
        })
        await ctx.runMutation(internal.domains.setDomainStatus, {
            submissionId: args.submissionId,
            status: 'provisioning_ssl',
        })

        await ctx.scheduler.runAfter(30_000, internal.domains.pollDomainSsl, {
            submissionId: args.submissionId,
            projectName: website.cfPagesProjectName,
            domain,
            attempt: 0,
            orderId: args.orderId,
            zoneId: zone.zoneId,
        })

        // Send the setup-in-progress email so the owner knows what's happening.
        await ctx.scheduler.runAfter(0, internal.domains.sendDomainSetupInProgressEmailAction, {
            submissionId: args.submissionId,
        })

        console.log(`[DOMAINS] ✓ Resume handoff complete for ${domain} — SSL poll scheduled`)
        return { ok: true, zoneId: zone.zoneId }
    },
})

/**
 * Self-rescheduling SSL status poll. Runs short invocations well under the 10-minute
 * Convex action limit, then either marks the domain live or reschedules itself.
 *
 * One invocation = up to 5 checks × 10s = 50s of work max.
 * Total window = MAX_ATTEMPTS × invocation delay ≈ 20 × 30s = 10 min of real time,
 * plus a grace period on the final attempt — after which we mark live anyway
 * (the customer can hit HTTP while HTTPS finishes in the background).
 */
export const pollDomainSsl = internalAction({
    args: {
        submissionId: v.id('submissions'),
        projectName: v.string(),
        domain: v.string(),
        attempt: v.number(),
        orderId: v.string(),
        zoneId: v.string(),
    },
    handler: async (ctx, args) => {
        const MAX_ATTEMPTS = 20
        const POLLS_PER_INVOCATION = 5
        const POLL_INTERVAL_MS = 10_000
        const RESCHEDULE_DELAY_MS = 30_000

        let sslReady = false
        for (let i = 0; i < POLLS_PER_INVOCATION; i++) {
            try {
                const status = await getWorkerCustomDomainStatus(args.domain)
                if (status.status === 'active') {
                    sslReady = true
                    break
                }
            } catch {
                // Transient Cloudflare error — keep polling
            }
            if (i < POLLS_PER_INVOCATION - 1) {
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
            }
        }

        if (!sslReady && args.attempt + 1 < MAX_ATTEMPTS) {
            console.log(
                `[DOMAINS] SSL not ready for ${args.domain} (attempt ${args.attempt + 1}/${MAX_ATTEMPTS}), rescheduling`
            )
            await ctx.scheduler.runAfter(RESCHEDULE_DELAY_MS, internal.domains.pollDomainSsl, {
                ...args,
                attempt: args.attempt + 1,
            })
            return { sslReady: false, rescheduled: true }
        }

        // Either SSL is ready, or we exhausted retries — mark live either way.
        // If SSL still pending at this point, the site will auto-upgrade to HTTPS
        // once Cloudflare finishes issuing the cert in the background.
        const submission = await ctx.runQuery(internal.submissions.getByIdInternal, {
            id: args.submissionId,
        })
        if (!submission) {
            console.error(`[DOMAINS] Submission ${args.submissionId} vanished during SSL poll`)
            return { sslReady, rescheduled: false }
        }

        await ctx.runMutation(internal.domains.setDomainStatus, {
            submissionId: args.submissionId,
            status: 'live',
        })

        await ctx.runMutation(internal.notifications.createAndSend, {
            creatorId: submission.creatorId,
            type: 'website_live',
            title: 'Your website is now live!',
            body: `${args.domain} is up and running.${sslReady ? '' : ' (SSL still provisioning — HTTPS will activate shortly)'}`,
            data: { submissionId: args.submissionId, url: `https://${args.domain}` },
        })

        await ctx.scheduler.runAfter(0, internal.domains.sendDomainLiveEmailAction, {
            submissionId: args.submissionId,
        })

        await ctx.runMutation(internal.auditLogs.log, {
            adminId: 'system:domain-setup',
            action: 'website_deployed',
            targetType: 'submission',
            targetId: args.submissionId,
            metadata: {
                action: 'custom_domain_live',
                domain: args.domain,
                orderId: args.orderId,
                zoneId: args.zoneId,
                sslReady,
                totalAttempts: args.attempt + 1,
            },
        })

        console.log(
            `[DOMAINS] ✓ ${args.domain} marked live (sslReady: ${sslReady}, attempts: ${args.attempt + 1})`
        )
        return { sslReady, rescheduled: false }
    },
})

/**
 * Migrate a custom domain from a legacy Pages project attachment onto the
 * current Worker deployment. Does NOT touch any generated website content —
 * only reassigns the hostname.
 *
 * Steps:
 *   1. Detach the hostname from the old Pages project (if still attached)
 *   2. Delete the apex + www CNAME records that pointed at {project}.pages.dev
 *   3. Attach the hostname to the Worker (CF auto-creates correct DNS + SSL)
 *
 * Idempotent: each step swallows "not found" errors so re-running is safe.
 */
export const migrateDomainToWorker = internalAction({
    args: {
        domain: v.string(),
        zoneId: v.string(),
        workerName: v.string(),
        oldPagesProjectName: v.optional(v.string()),
    },
    handler: async (_ctx, args) => {
        const { domain, zoneId, workerName, oldPagesProjectName } = args
        const report: any = { domain, steps: {} }

        // Step 1: detach from old Pages project (if any)
        if (oldPagesProjectName) {
            try {
                await removeCustomDomainFromPages(oldPagesProjectName, domain)
                report.steps.detachedFromPages = true
                console.log(`[DOMAINS] Detached ${domain} from Pages project ${oldPagesProjectName}`)
            } catch (e: any) {
                report.steps.detachedFromPages = `skipped: ${e.message || e}`
                console.log(`[DOMAINS] Pages detach skipped (likely already detached): ${e.message}`)
            }
        }

        // Step 2: delete the apex + www CNAMEs we previously created
        try {
            const records = await listDnsRecords(zoneId)
            const toDelete = records.filter(
                (r: any) =>
                    r.type === 'CNAME' &&
                    (r.name === domain || r.name === `www.${domain}`)
            )
            for (const r of toDelete) {
                await deleteDnsRecord(zoneId, r.id)
                console.log(`[DOMAINS] Deleted stale CNAME ${r.name} (id ${r.id})`)
            }
            report.steps.deletedCnames = toDelete.length
        } catch (e: any) {
            report.steps.deletedCnames = `error: ${e.message || e}`
        }

        // Step 3: attach to the Worker (CF auto-handles DNS + SSL)
        try {
            const result = await addCustomDomainToWorker(workerName, domain, zoneId)
            report.steps.attachedToWorker = { id: result.id, service: result.service }
            console.log(`[DOMAINS] Attached ${domain} to Worker ${workerName} (id ${result.id})`)
        } catch (e: any) {
            report.steps.attachedToWorker = `error: ${e.message || e}`
            throw new Error(`Worker attach failed: ${e.message || e}`)
        }

        console.log('[DOMAINS] migrateDomainToWorker report:', JSON.stringify(report, null, 2))
        return report
    },
})

export const diagnoseHostingerSetup = internalAction({
    args: { tld: v.optional(v.string()) },
    handler: async (_ctx, args) => {
        const tld = (args.tld || 'com').replace(/^\./, '').toLowerCase()
        const report: any = { tld, checks: {} }

        try {
            const methods = await registrarListPaymentMethods()
            const envId = process.env.HOSTINGER_PAYMENT_METHOD_ID || ''
            const match = methods.find(
                (m: any) => String(m.id ?? m.payment_method_id ?? '') === envId
            )
            report.checks.paymentMethods = {
                count: methods.length,
                envId: envId || '(not set)',
                envIdMatchesSavedMethod: !!match,
                savedMethods: methods.map((m: any) => ({
                    id: m.id ?? m.payment_method_id,
                    brand: m.brand ?? m.card_brand ?? m.type ?? 'UNKNOWN',
                    last4: m.last_four ?? m.last4 ?? m.card_last_four ?? '????',
                    isDefault: m.is_default ?? m.default ?? false,
                })),
            }
        } catch (e: any) {
            report.checks.paymentMethods = { error: e.message || String(e) }
        }

        try {
            const profiles = await registrarListWhoisProfiles(tld)
            report.checks.whoisProfiles = {
                tld,
                count: profiles.length,
                profiles: profiles.map((p: any) => ({
                    id: p.id ?? p.whois_id,
                    tld: p.tld,
                    entityType: p.entity_type,
                    country: p.country,
                })),
                ready: profiles.length > 0,
            }
        } catch (e: any) {
            report.checks.whoisProfiles = { tld, error: e.message || String(e) }
        }

        report.ready =
            report.checks.paymentMethods?.envIdMatchesSavedMethod === true &&
            report.checks.whoisProfiles?.ready === true

        console.log('[DOMAINS] diagnoseHostingerSetup report:', JSON.stringify(report, null, 2))
        return report
    },
})

// ==================== EMAIL: DOMAIN LIVE NOTIFICATION ====================

/**
 * Internal helper: POST to the unified send endpoint with an optional type.
 * Used by all three domain-related email actions below.
 */
async function postSendEmail(submissionId: string, type?: string): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL
    const internalSecret = process.env.INTERNAL_API_SECRET || ''
    if (!baseUrl) {
        console.error(`[DOMAINS] NEXT_PUBLIC_APP_URL / SITE_URL not set — cannot send ${type || 'completed'} email`)
        return
    }
    try {
        const response = await fetch(`${baseUrl}/api/send-completed-website-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Secret': internalSecret,
            },
            body: JSON.stringify({ submissionId, ...(type ? { type } : {}) }),
        })
        if (!response.ok) {
            const text = await response.text()
            console.error(`[DOMAINS] Failed to send ${type || 'completed'} email: ${response.status} ${text.slice(0, 200)}`)
        } else {
            console.log(`[DOMAINS] Sent ${type || 'completed'} email for submission ${submissionId}`)
        }
    } catch (error) {
        console.error(`[DOMAINS] Error sending ${type || 'completed'} email:`, error)
    }
}

/**
 * Sends the "your website is complete" email to the business owner. The endpoint
 * branches on whether the submission has a custom domain, so this single call
 * works for both flows.
 */
export const sendDomainLiveEmailAction = internalAction({
    args: { submissionId: v.id('submissions') },
    handler: async (_ctx, args) => {
        await postSendEmail(args.submissionId)
    },
})

/**
 * Sends the "we're setting up your domain, SSL is provisioning" email.
 * Triggered when the SSL polling phase begins.
 */
export const sendDomainSetupInProgressEmailAction = internalAction({
    args: { submissionId: v.id('submissions') },
    handler: async (_ctx, args) => {
        await postSendEmail(args.submissionId, 'domain_setup_progress')
    },
})

/**
 * Sends the 30-day-before-expiry domain renewal reminder. Scheduled via runAt
 * immediately after a successful registration (see setupForSubmission step 4b).
 */
export const sendDomainRenewalReminderEmailAction = internalAction({
    args: { submissionId: v.id('submissions') },
    handler: async (_ctx, args) => {
        await postSendEmail(args.submissionId, 'domain_renewal_reminder')
    },
})
