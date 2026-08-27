/**
 * ════════════════════════════════════════════════════════════════════════════
 *  WISE WEBHOOK SIGNATURE VERIFICATION
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Wise signs every outgoing webhook: RSA-SHA256 over the raw request body,
 * Base64-encoded, sent in the `X-Signature-SHA256` header, verified against
 * Wise's published public key.
 *
 * docs/wise/WISE-PAYMENT-FLOW-MOBILE.md has referenced this file since v1.4 and
 * described its behaviour in detail. It never existed — /wise-webhook accepted
 * anything posted to it, so any caller who knew the deployment URL could drive
 * a withdrawal into a terminal state. This is that file, finally.
 *
 * TWO THINGS THAT MUST NOT DRIFT:
 *
 *   1. Verify over the RAW body text, never a re-serialised object.
 *      JSON.parse + JSON.stringify reorders keys and drops whitespace, and the
 *      signature is over the exact bytes Wise sent. The caller must read
 *      request.text() and hand that string here.
 *
 *   2. Web Crypto only. httpAction runs in Convex's default runtime, not Node,
 *      so `node:crypto` is unavailable. Everything below is globalThis.crypto.
 */

export type VerifyOutcome =
    | 'valid'            // signature checks out against the configured key
    | 'invalid'          // signature present but does not verify — forged or wrong key
    | 'missing-signature' // no X-Signature-SHA256 header at all
    | 'no-key'           // WISE_WEBHOOK_PUBLIC_KEY unset or unusable
    | 'unsupported';     // runtime has no Web Crypto (should not happen on Convex)

export const WISE_SIGNATURE_HEADER = 'X-Signature-SHA256';

/**
 * Accept the key as either a PEM block or a bare Base64 DER body.
 *
 * Both exist in the wild for a reason: Wise publishes a PEM, but `convex env
 * set` stores a single line — a pasted PEM is silently truncated at its first
 * newline, which is exactly how this variable came to hold only
 * "-----BEGIN PUBLIC KEY-----". Stripping armour and whitespace here means
 * either form works and neither fails quietly.
 */
export function normalizeSpkiBase64(raw: string): string {
    return raw
        .replace(/-----BEGIN [A-Z ]+-----/g, '')
        .replace(/-----END [A-Z ]+-----/g, '')
        .replace(/\s+/g, '')
        .trim();
}

function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

/**
 * Verify one webhook delivery.
 *
 * Never throws: a verification routine that can throw becomes a denial-of-
 * service on the payout pipeline the first time Wise sends something
 * unexpected. Every failure path returns an outcome the caller can log and
 * decide about.
 */
export async function verifyWiseWebhook(params: {
    rawBody: string;
    signatureBase64: string | null | undefined;
    publicKey: string | null | undefined;
}): Promise<VerifyOutcome> {
    const { rawBody, signatureBase64, publicKey } = params;

    if (!signatureBase64) return 'missing-signature';

    const keyB64 = publicKey ? normalizeSpkiBase64(publicKey) : '';
    // A PEM truncated to its header normalises to '' and must not read as a key.
    if (!keyB64) return 'no-key';

    const subtle = (globalThis as any)?.crypto?.subtle;
    if (!subtle) return 'unsupported';

    try {
        const key = await subtle.importKey(
            'spki',
            base64ToBytes(keyB64),
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const ok = await subtle.verify(
            'RSASSA-PKCS1-v1_5',
            key,
            base64ToBytes(signatureBase64),
            new TextEncoder().encode(rawBody)
        );

        return ok ? 'valid' : 'invalid';
    } catch {
        // Malformed key or malformed signature. Both are "we could not establish
        // that Wise sent this", which is 'invalid' for the caller's purposes —
        // but a broken key is an operator error, so separate it out.
        return keyB64.length < 100 ? 'no-key' : 'invalid';
    }
}
