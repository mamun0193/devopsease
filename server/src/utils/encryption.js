import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Startup guard — fail fast if ENCRYPTION_KEY is invalid
const rawKey = process.env.ENCRYPTION_KEY;
if (!rawKey || rawKey.length !== 64) {
    throw new Error('Invalid ENCRYPTION_KEY. Must be 32-byte hex string (64 hex chars).');
}
const KEY = Buffer.from(rawKey, 'hex');

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a string in the format: iv:authTag:ciphertext (all hex-encoded).
 * @param {string} text - The plaintext to encrypt
 * @returns {string} Encrypted string
 */
export function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Input format: iv:authTag:ciphertext (all hex-encoded).
 * NEVER log the return value.
 * @param {string} encryptedText - The encrypted string to decrypt
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedText) {
    const [ivHex, authTagHex, ciphertext] = encryptedText.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
