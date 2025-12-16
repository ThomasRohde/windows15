/**
 * UUID generation tests
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { generateUuid } from '../uuid';

describe('UUID Generation', () => {
    beforeAll(async () => {
        // Ensure crypto is available in test environment
        if (typeof globalThis.crypto === 'undefined') {
            const cryptoModule = await import('crypto');
            Object.defineProperty(globalThis, 'crypto', {
                value: cryptoModule.webcrypto,
                writable: true,
                configurable: true,
            });
        }
    });

    it('should generate a valid UUID v4 format', () => {
        const uuid = generateUuid();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
        const uuids = new Set();
        for (let i = 0; i < 100; i++) {
            uuids.add(generateUuid());
        }
        expect(uuids.size).toBe(100);
    });

    it('should generate UUIDs with correct version and variant bits', () => {
        const uuid = generateUuid();
        const parts = uuid.split('-');

        // Check version 4 (first char of 3rd group should be '4')
        expect(parts[2]?.[0]).toBe('4');

        // Check variant (first char of 4th group should be 8, 9, a, or b)
        expect(['8', '9', 'a', 'b']).toContain(parts[3]?.[0]?.toLowerCase());
    });

    it('should be 36 characters long (including hyphens)', () => {
        const uuid = generateUuid();
        expect(uuid.length).toBe(36);
    });
});
