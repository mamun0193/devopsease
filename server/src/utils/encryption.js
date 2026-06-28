//Encryption Facade
// Thin wrapper that delegates to the active EncryptionProvider.

import { LocalEncryptionProvider } from '../services/providers/localEncryption.provider.js';

// Singleton — instantiated once at startup, reused for all encrypt/decrypt calls.
const provider = new LocalEncryptionProvider();

//Encrypt plaintext using AES-256-GCM.

export function encrypt(text) {
    return provider.encrypt(text);
}

//Decrypt an AES-256-GCM encrypted string.

export function decrypt(encryptedText) {
    return provider.decrypt(encryptedText);
}

//Returns the active provider name for diagnostics.
 * @returns {string}
 */
export function getProviderName() {
    return provider.providerName;
}
