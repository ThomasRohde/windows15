import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../utils/crypto';

describe('crypto utils', () => {
    it('should encrypt and decrypt text correctly', async () => {
        const text = 'Hello, World!';
        const passphrase = 'secret-password';

        const encrypted = await encrypt(text, passphrase);
        expect(encrypted.cipherText).toBeDefined();
        expect(encrypted.nonce).toBeDefined();
        expect(encrypted.salt).toBeDefined();
        expect(encrypted.cipherText).not.toBe(text);

        const decrypted = await decrypt(encrypted.cipherText, encrypted.nonce, encrypted.salt, passphrase);
        expect(decrypted).toBe(text);
    });

    it('should fail to decrypt with incorrect passphrase', async () => {
        const text = 'Sensitive data';
        const passphrase = 'correct-password';
        const wrongPassphrase = 'wrong-password';

        const encrypted = await encrypt(text, passphrase);

        await expect(decrypt(encrypted.cipherText, encrypted.nonce, encrypted.salt, wrongPassphrase)).rejects.toThrow(
            'Decryption failed. Incorrect passphrase?'
        );
    });

    it('should produce different ciphertexts for same text and passphrase (due to random salt/iv)', async () => {
        const text = 'Same text';
        const passphrase = 'same-password';

        const encrypted1 = await encrypt(text, passphrase);
        const encrypted2 = await encrypt(text, passphrase);

        expect(encrypted1.cipherText).not.toBe(encrypted2.cipherText);
        expect(encrypted1.nonce).not.toBe(encrypted2.nonce);
        expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });
});
