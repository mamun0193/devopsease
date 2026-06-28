// EncryptionProvider — Abstract base class for encryption providers.

export class EncryptionProvider {
    // Human-readable provider name for logging and diagnostics.
    get providerName() {
        throw new Error('EncryptionProvider.providerName must be implemented');
    }

    // Encrypt plaintext into a provider-specific ciphertext string.
    //The returned string must be safe to store in MongoDB (no binary).

    encrypt(plaintext) {
        throw new Error('EncryptionProvider.encrypt() must be implemented');
    }

    // Decrypt a ciphertext string produced by this provider.
    // NEVER log the return value.
    decrypt(ciphertext) {
        throw new Error('EncryptionProvider.decrypt() must be implemented');
    }
}

export default EncryptionProvider;
