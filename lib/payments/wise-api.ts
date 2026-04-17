/**
 * Wise API Service - Direct payout transfers to users
 * Handles automatic withdrawal processing via Wise API
 */

interface WiseTransferResponse {
    id: string;
    status: string;
    reference: string;
    createdAt: string;
}

interface WisePayoutRequest {
    targetAccount: string; // User's Wise email
    amount: number;
    currency: string;
    reference: string;
}

/**
 * Send payout to user's Wise account
 * Returns transaction ID from Wise API
 */
export async function sendWiseTransfer(params: WisePayoutRequest): Promise<WiseTransferResponse> {
    const apiToken = process.env.WISE_API_TOKEN;
    const accountId = process.env.WISE_ACCOUNT_ID;

    if (!apiToken || !accountId) {
        throw new Error('Wise API credentials not configured - WISE_API_TOKEN and WISE_ACCOUNT_ID required');
    }

    try {
        // Step 1: Create quote for the transfer
        const quoteResponse = await fetch('https://api.wise.com/v1/quotes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sourceCurrency: params.currency,
                targetCurrency: params.currency,
                sourceAmount: params.amount,
                profile: accountId,
                rateType: 'FIXED',
            }),
        });

        if (!quoteResponse.ok) {
            const errorData = await quoteResponse.json();
            throw new Error(`Wise quote failed: ${errorData.message || quoteResponse.statusText}`);
        }

        const quote = await quoteResponse.json();

        // Step 2: Create recipient account (if needed)
        const recipientResponse = await fetch('https://api.wise.com/v1/accounts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profile: accountId,
                accountHolderName: params.targetAccount,
                currency: params.currency,
                type: 'email',
                details: {
                    email: params.targetAccount,
                },
            }),
        });

        if (!recipientResponse.ok) {
            const errorData = await recipientResponse.json();
            throw new Error(`Wise recipient creation failed: ${errorData.message || recipientResponse.statusText}`);
        }

        const recipient = await recipientResponse.json();

        // Step 3: Create transfer
        const transferResponse = await fetch('https://api.wise.com/v1/transfers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                targetAccount: recipient.id,
                quoteUuid: quote.id,
                customerTransactionId: params.reference,
                details: {
                    reference: params.reference,
                },
            }),
        });

        if (!transferResponse.ok) {
            const errorData = await transferResponse.json();
            throw new Error(`Wise transfer creation failed: ${errorData.message || transferResponse.statusText}`);
        }

        const transfer = await transferResponse.json();

        // Step 4: Fund the transfer from the Creator Payout jar when configured,
        // otherwise fall back to the main PHP balance. Using a dedicated jar keeps
        // creator withdrawals isolated from operating funds.
        const creatorPayoutBalanceId = process.env.WISE_CREATOR_PAYOUT_BALANCE_ID;
        const fundBody: Record<string, unknown> = { type: 'BALANCE' };
        if (creatorPayoutBalanceId) {
            fundBody.sourceBalanceId = creatorPayoutBalanceId;
        }
        const fundResponse = await fetch(`https://api.wise.com/v3/profiles/${accountId}/transfers/${transfer.id}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fundBody),
        });

        if (!fundResponse.ok) {
            const errorData = await fundResponse.json();
            throw new Error(`Wise transfer funding failed: ${errorData.message || fundResponse.statusText}`);
        }

        return {
            id: transfer.id,
            status: transfer.status || 'PROCESSING',
            reference: params.reference,
            createdAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Wise API Error:', error);
        throw error;
    }
}

/**
 * Check transfer status
 */
export async function checkTransferStatus(transferId: string): Promise<string> {
    const apiToken = process.env.WISE_API_TOKEN;

    if (!apiToken) {
        throw new Error('Wise API token not configured');
    }

    try {
        const response = await fetch(`https://api.wise.com/v1/transfers/${transferId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to check transfer status: ${response.statusText}`);
        }

        const transfer = await response.json();
        return transfer.status;
    } catch (error) {
        console.error('Wise Status Check Error:', error);
        throw error;
    }
}
