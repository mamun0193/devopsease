import { createStorageProvider } from './storage.factory.js';
import { storageKeys } from './keys.js';
import logger from '../utils/logger.js';

class StorageService {
    constructor() {
        this.keys = storageKeys;
        this.driverName = process.env.STORAGE_DRIVER || 'local';
        this.provider = createStorageProvider(this.driverName);
    }

    async init() {
        logger.info(`Initializing Storage Service (Driver: ${this.driverName})`);
        await this.provider.init();
    }

    getDriverName() {
        return this.driverName;
    }

    // Helper to wrap a key into the schema metadata format
     
    createPointer(key) {
        return {
            driver: this.driverName,
            key: key
        };
    }

    async write(key, content) {
        return this.provider.write(key, content);
    }

    async append(key, line) {
        return this.provider.append(key, line);
    }

    async closeAppendStream(key) {
        return this.provider.closeAppendStream(key);
    }

    async read(key) {
        return this.provider.read(key);
    }

    createReadStream(key, options = {}) {
        return this.provider.createReadStream(key, options);
    }

    async exists(key) {
        return this.provider.exists(key);
    }

    async delete(key) {
        return this.provider.delete(key);
    }

    async metadata(key) {
        return this.provider.metadata(key);
    }

    // LocalStorage specific method to get absolute path.
    // Throws an error if used with non-local providers.
    
    getAbsolutePath(key) {
        if (typeof this.provider.getAbsolutePath === 'function') {
            return this.provider.getAbsolutePath(key);
        }
        throw new Error(`getAbsolutePath is not supported by driver: ${this.driverName}`);
    }
}

export const storageService = new StorageService();
