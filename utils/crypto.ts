/**
 * Crypto utilities for client-side encryption (F200)
 * Uses Web Crypto API (crypto.subtle)
 */

const ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12; // Recommended for AES-GCM

/**
 * Derives an AES-GCM key from a passphrase and salt using PBKDF2
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<any> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);

    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts text using a passphrase
 * Returns base64 encoded string containing salt, iv, and ciphertext
 */
export async function encrypt(
    text: string,
    passphrase: string
): Promise<{ cipherText: string; nonce: string; salt: string }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));

    const key = await deriveKey(passphrase, salt);

    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

    return {
        cipherText: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        nonce: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt)),
    };
}

/**
 * Decrypts text using a passphrase and metadata
 */
export async function decrypt(cipherText: string, nonce: string, salt: string, passphrase: string): Promise<string> {
    const decoder = new TextDecoder();

    const encryptedData = new Uint8Array(
        atob(cipherText)
            .split('')
            .map(c => c.charCodeAt(0))
    );
    const iv = new Uint8Array(
        atob(nonce)
            .split('')
            .map(c => c.charCodeAt(0))
    );
    const saltData = new Uint8Array(
        atob(salt)
            .split('')
            .map(c => c.charCodeAt(0))
    );

    const key = await deriveKey(passphrase, saltData);

    try {
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedData);
        return decoder.decode(decrypted);
    } catch {
        throw new Error('Decryption failed. Incorrect passphrase?');
    }
}
