import crypto from 'crypto';
import { EncryptionProvider } from './encryptionProvider.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

//LocalEncryptionProvider — AES-256-GCM encryption using a local key.

export class LocalEncryptionProvider extends EncryptionProvider {
    #key;

    constructor() {
        super();
        const rawKey = process.env.ENCRYPTION_KEY;
        if (!rawKey || rawKey.length !== 64) {
            throw new Error('Invalid ENCRYPTION_KEY. Must be 32-byte hex string (64 hex chars).');
        }
        this.#key = Buffer.from(rawKey, 'hex');
    }

    get providerName() {
        return 'local-aes-256-gcm';
    }
// Encrypt plaintext
    encrypt(plaintext) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.#key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }
// Decrypt plaintext

    decrypt(ciphertext) {
        const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, this.#key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

export default LocalEncryptionProvider;
