/**
 * AES-GCM encryption for values kept in cookies (the Google refresh token), keyed from the
 * `AUTH_SESSION_SECRET` environment variable. Output is base64url `iv.ciphertext`.
 */

type AesKey = Awaited<ReturnType<typeof crypto.subtle.importKey>>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Encode bytes as base64url. */
function toBase64Url(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64url');
}

/** Decode base64url into bytes. */
function fromBase64Url(value: string): Uint8Array {
    return new Uint8Array(Buffer.from(value, 'base64url'));
}

/** Derive an AES-256-GCM key from the session secret. */
async function keyFrom(secret: string): Promise<AesKey> {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
    return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Encrypt a string with the session secret. */
export async function encrypt(plainText: string, secret: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        await keyFrom(secret),
        encoder.encode(plainText),
    );
    return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`;
}

/** Decrypt a value produced by `encrypt`; returns null if it is malformed or was tampered with. */
export async function decrypt(value: string, secret: string): Promise<string | null> {
    const [iv, cipher] = value.split('.');
    if (!iv || !cipher) {
        return null;
    }
    try {
        const plain = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: fromBase64Url(iv) },
            await keyFrom(secret),
            fromBase64Url(cipher),
        );
        return decoder.decode(plain);
    } catch {
        return null;
    }
}

/** Random URL-safe token. */
export function randomToken(bytes = 32): string {
    return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}
