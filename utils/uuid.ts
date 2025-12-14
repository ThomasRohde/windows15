/**
 * Cryptographically secure UUID generation utilities
 * @module utils/uuid
 */

/**
 * Converts a Uint8Array to a UUID v4 formatted string
 * @param bytes - 16-byte array
 * @returns UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
function bytesToUuid(bytes: Uint8Array): string {
    // Set version (4) and variant bits according to RFC 4122
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

    // Format as UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generates a cryptographically secure UUID v4
 *
 * Uses crypto.randomUUID() if available, otherwise falls back to
 * crypto.getRandomValues() with proper RFC 4122 UUID v4 formatting.
 *
 * This ensures:
 * - Cryptographic randomness for security
 * - RFC 4122 compliance for proper UUID format
 * - Extremely low collision probability for Dexie Cloud sync
 *
 * @returns A UUID v4 string guaranteed to be cryptographically secure
 * @throws {Error} If crypto API is not available (non-secure context)
 *
 * @example
 * const id = generateUuid();
 * // Returns: "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUuid(): string {
    // Prefer native crypto.randomUUID (fastest, most reliable)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback to crypto.getRandomValues with manual UUID formatting
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return bytesToUuid(bytes);
    }

    // No secure crypto available - fail explicitly
    throw new Error(
        'Secure UUID generation not available. ' +
            'This application requires HTTPS or localhost to access crypto APIs. ' +
            'Please ensure you are running in a secure context.'
    );
}

/**
 * Legacy ID generator for backwards compatibility
 * @deprecated Use generateUuid() instead
 */
export const createId = generateUuid;
