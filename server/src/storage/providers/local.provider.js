import { createWriteStream, createReadStream, existsSync } from 'fs';
import { mkdir, stat, readFile, rm, writeFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import logger from '../../utils/logger.js';

export class LocalStorageProvider {
    constructor() {
        this.driverName = 'local';
        this.appendStreams = new Map();
        // Default to a folder named DEVOPSEASE_STORAGE in the user's home dir if not provided
        this.storageRoot = process.env.STORAGE_ROOT || path.join(process.cwd(), 'DEVOPSEASE_STORAGE');
    }

    async init() {
        try {
            await mkdir(this.storageRoot, { recursive: true });
            await access(this.storageRoot, constants.R_OK | constants.W_OK);
            logger.info(`[Storage:local] Initialized at ${this.storageRoot}`);
        } catch (error) {
            throw new Error(`[Storage:local] Initialization failed: Missing read/write permissions or invalid STORAGE_ROOT (${this.storageRoot}): ${error.message}`);
        }
    }

    _resolvePath(key) {
        if (!key || typeof key !== 'string') throw new Error('Invalid storage key');
        
        // Normalize the key to prevent directory traversal attacks
        const normalizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
        const absolutePath = path.resolve(this.storageRoot, normalizedKey);

        if (!absolutePath.startsWith(path.resolve(this.storageRoot))) {
            throw new Error(`Path traversal attempt blocked for key: ${key}`);
        }

        return absolutePath;
    }

    async _ensureDir(filePath) {
        await mkdir(path.dirname(filePath), { recursive: true });
    }

    async write(key, content) {
        const filePath = this._resolvePath(key);
        await this._ensureDir(filePath);
        await writeFile(filePath, content, 'utf8');
    }

    async append(key, line) {
        const filePath = this._resolvePath(key);
        try {
            let stream = this.appendStreams.get(filePath);
            if (!stream) {
                await this._ensureDir(filePath);
                stream = createWriteStream(filePath, { flags: 'a', encoding: 'utf8' });
                
                stream.on('error', (err) => {
                    logger.error('Storage append stream error', { key, error: err.message });
                    this.appendStreams.delete(filePath);
                });
                
                this.appendStreams.set(filePath, stream);
            }
            stream.write(line + '\n');
        } catch (err) {
            logger.error('Failed to append to storage', { key, error: err.message });
        }
    }

    async closeAppendStream(key) {
        const filePath = this._resolvePath(key);
        const stream = this.appendStreams.get(filePath);
        if (stream) {
            stream.end();
            this.appendStreams.delete(filePath);
        }
    }

    async read(key) {
        const filePath = this._resolvePath(key);
        if (!existsSync(filePath)) return null;
        return await readFile(filePath, 'utf8');
    }

    createReadStream(key, options = {}) {
        const filePath = this._resolvePath(key);
        if (!existsSync(filePath)) return null;
        return createReadStream(filePath, { encoding: 'utf8', ...options });
    }

    async exists(key) {
        const filePath = this._resolvePath(key);
        return existsSync(filePath);
    }

    async delete(key) {
        const filePath = this._resolvePath(key);
        if (existsSync(filePath)) {
            await rm(filePath, { recursive: true, force: true });
            return true;
        }
        return false;
    }

    async metadata(key) {
        const filePath = this._resolvePath(key);
        if (!existsSync(filePath)) return null;
        const s = await stat(filePath);
        return { size: s.size, createdAt: s.birthtime, modifiedAt: s.mtime };
    }

    // specific method to get the absolute path for local tools (e.g. workspace creation)
    getAbsolutePath(key) {
        return this._resolvePath(key);
    }
}
