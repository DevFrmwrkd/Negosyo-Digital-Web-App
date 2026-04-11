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
    updateNameservers,
    getPaymentMethodStatus as registrarGetPaymentMethodStatus,
    type RegistrantContact,
} from './lib/hostinger'
import {
    createZone,
    getZoneStatus,
    isDomainOwnedByUs,
    addCustomDomainToPages,
    getCustomDomainStatus,
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
    if (!submission.province) missing.push('province')
    if (!submission.postalCode) missing.push('postalCode')
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
        state: submission.province,
        postalCode: submission.postalCode,
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
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.submissionId, {
            registrarOrderId: args.orderId,
            domainExpiresAt: args.expiresAt,
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

            // Step 1: Re-verify availability + get the catalog item_id (required for purchase)
            await ctx.runMutation(internal.domains.setDomainStatus, {
                submissionId: args.submissionId,
                status: 'registering',
            })
            const availCheck = await registrarCheckAvailability(domain)
            if (!availCheck.available) {
                throw new Error(`Domain ${domain} is no longer available`)
            }
            if (!availCheck.itemId) {
                throw new Error(`No Hostinger catalog item_id returned for ${domain} — cannot purchase`)
            }

            // Step 2: Build registrant contact from business owner info + register with item_id
            const contact = buildContactFromSubmission(submission)
            const reg = await registrarRegister(domain, availCheck.itemId, contact)
            await ctx.runMutation(internal.domains.setRegistrarMetadata, {
                submissionId: args.submissionId,
                orderId: reg.orderId,
                expiresAt: reg.expiresAt,
            })
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

            // Step 6: Attach to Cloudflare Pages
            await addCustomDomainToPages(website.cfPagesProjectName, domain)
            console.log(`[DOMAINS] Attached ${domain} to Pages project ${website.cfPagesProjectName}`)

            // Step 7: Wait for SSL (poll up to 10 min)
            await ctx.runMutation(internal.domains.setDomainStatus, {
                submissionId: args.submissionId,
                status: 'provisioning_ssl',
            })
            let sslReady = false
            for (let i = 0; i < 60; i++) {
                try {
                    const status = await getCustomDomainStatus(website.cfPagesProjectName, domain)
                    if (status.status === 'active') {
                        sslReady = true
                        break
                    }
                } catch {
                    // Continue polling
                }
                await new Promise((r) => setTimeout(r, 10000))
            }

            // Step 8: Update website record + mark live
            await ctx.runMutation(internal.domains.setCustomDomainOnWebsite, {
                submissionId: args.submissionId,
                customDomain: domain,
            })
            await ctx.runMutation(internal.domains.setDomainStatus, {
                submissionId: args.submissionId,
                status: 'live',
            })

            // Notify creator (push)
            await ctx.runMutation(internal.notifications.createAndSend, {
                creatorId: submission.creatorId,
                type: 'website_live',
                title: 'Your website is now live!',
                body: `${domain} is up and running.${sslReady ? '' : ' (SSL still provisioning)'}`,
                data: { submissionId: args.submissionId, url: `https://${domain}` },
            })

            // Send domain-live email to business owner with renewal disclaimer
            await ctx.scheduler.runAfter(0, internal.domains.sendDomainLiveEmailAction, {
                submissionId: args.submissionId,
            })

            // Audit log
            await ctx.runMutation(internal.auditLogs.log, {
                adminId: 'system:domain-setup',
                action: 'website_deployed',
                targetType: 'submission',
                targetId: args.submissionId,
                metadata: {
                    action: 'custom_domain_live',
                    domain,
                    orderId: reg.orderId,
                    zoneId: zone.zoneId,
                },
            })

            console.log(`[DOMAINS] ✓ Setup complete for ${domain}`)
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

// ==================== EMAIL: DOMAIN LIVE NOTIFICATION ====================

/**
 * Internal action that calls the Next.js endpoint to send the domain-live email
 * (with renewal disclaimer) to the business owner.
 */
export const sendDomainLiveEmailAction = internalAction({
    args: { submissionId: v.id('submissions') },
    handler: async (ctx, args) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || 'https://negosyo-digital.vercel.app'
        const internalSecret = process.env.INTERNAL_API_SECRET || ''

        try {
            const response = await fetch(`${baseUrl}/api/internal/send-domain-live-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Secret': internalSecret,
                },
                body: JSON.stringify({ submissionId: args.submissionId }),
            })
            if (!response.ok) {
                const text = await response.text()
                console.error(`[DOMAINS] Failed to send domain-live email: ${response.status} ${text}`)
            }
        } catch (error) {
            console.error('[DOMAINS] Error sending domain-live email:', error)
        }
    },
})
