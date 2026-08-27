import {
    verifyWiseWebhook,
    normalizeSpkiBase64,
    WISE_SIGNATURE_HEADER,
} from '../../convex/lib/wiseWebhookVerify';

const subtle = (globalThis as any).crypto.subtle;

const ALGO = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;

async function makeKeypair() {
    const pair = await subtle.generateKey(
        { ...ALGO, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
        true,
        ['sign', 'verify']
    );
    const spki = new Uint8Array(await subtle.exportKey('spki', pair.publicKey));
    let bin = '';
    spki.forEach((b: number) => (bin += String.fromCharCode(b)));
    return { pair, publicKeyB64: btoa(bin) };
}

async function sign(privateKey: any, body: string) {
    const sig = new Uint8Array(
        await subtle.sign(ALGO.name, privateKey, new TextEncoder().encode(body))
    );
    let bin = '';
    sig.forEach((b: number) => (bin += String.fromCharCode(b)));
    return btoa(bin);
}

/**
 * /wise-webhook drives withdrawals into terminal states that move money. Before
 * this module it accepted anything posted to it. These tests pin the two
 * properties that make it trustworthy: a genuine signature passes, and anything
 * else — tampered body, wrong key, no signature — does not.
 */
describe('verifyWiseWebhook', () => {
    // Deliberately NOT canonical JSON — real senders include whitespace, and the
    // byte-exactness test below is meaningless if JSON.stringify round-trips it
    // unchanged.
    const body = '{"data": {"resource": {"id": "2320468106"}, "current_state": "outgoing_payment_sent"}}';

    it('accepts a genuine signature', async () => {
        const { pair, publicKeyB64 } = await makeKeypair();
        const signatureBase64 = await sign(pair.privateKey, body);
        expect(await verifyWiseWebhook({ rawBody: body, signatureBase64, publicKey: publicKeyB64 }))
            .toBe('valid');
    });

    it('rejects a tampered body', async () => {
        const { pair, publicKeyB64 } = await makeKeypair();
        const signatureBase64 = await sign(pair.privateKey, body);
        const tampered = body.replace('outgoing_payment_sent', 'cancelled');
        expect(await verifyWiseWebhook({ rawBody: tampered, signatureBase64, publicKey: publicKeyB64 }))
            .toBe('invalid');
    });

    it('rejects a signature made with a different key', async () => {
        const a = await makeKeypair();
        const b = await makeKeypair();
        const signatureBase64 = await sign(a.pair.privateKey, body);
        expect(await verifyWiseWebhook({ rawBody: body, signatureBase64, publicKey: b.publicKeyB64 }))
            .toBe('invalid');
    });

    it('reports a missing signature header distinctly', async () => {
        const { publicKeyB64 } = await makeKeypair();
        for (const missing of [null, undefined, '']) {
            expect(await verifyWiseWebhook({ rawBody: body, signatureBase64: missing, publicKey: publicKeyB64 }))
                .toBe('missing-signature');
        }
    });

    it('reports an unusable key distinctly, including a PEM truncated to its header', async () => {
        const { pair } = await makeKeypair();
        const signatureBase64 = await sign(pair.privateKey, body);
        // This exact value was in prod: `convex env set` keeps only the first
        // line, so a pasted PEM becomes its own header.
        for (const bad of [null, undefined, '', '-----BEGIN PUBLIC KEY-----']) {
            expect(await verifyWiseWebhook({ rawBody: body, signatureBase64, publicKey: bad }))
                .toBe('no-key');
        }
    });

    it('is byte-exact: re-serialising the JSON breaks the signature', async () => {
        // Why the route must use request.text() and never request.json().
        const { pair, publicKeyB64 } = await makeKeypair();
        const signatureBase64 = await sign(pair.privateKey, body);
        const reserialised = JSON.stringify(JSON.parse(body));
        expect(reserialised).not.toBe(body);
        expect(await verifyWiseWebhook({ rawBody: reserialised, signatureBase64, publicKey: publicKeyB64 }))
            .toBe('invalid');
    });

    it('accepts the key as PEM or as bare base64', async () => {
        const { pair, publicKeyB64 } = await makeKeypair();
        const signatureBase64 = await sign(pair.privateKey, body);
        const pem = `-----BEGIN PUBLIC KEY-----\n${publicKeyB64.match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`;
        expect(await verifyWiseWebhook({ rawBody: body, signatureBase64, publicKey: pem })).toBe('valid');
        expect(normalizeSpkiBase64(pem)).toBe(publicKeyB64);
    });

    it('exports the header name Wise actually sends', () => {
        expect(WISE_SIGNATURE_HEADER).toBe('X-Signature-SHA256');
    });
});
