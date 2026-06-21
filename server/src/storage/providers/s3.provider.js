import logger from '../../utils/logger.js';

export class S3StorageProvider {
    constructor() {
        this.driverName = 's3';
        this.bucket = process.env.AWS_BUCKET;
        this.region = process.env.AWS_REGION;
    }

    async init() {
        throw new Error('[Storage:s3] Storage provider not configured. AWS integration is pending implementation.');
    }

    async write(key, content) {
        throw new Error('Not implemented');
    }

    async append(key, line) {
        throw new Error('Not implemented');
    }

    async closeAppendStream(key) {
        throw new Error('Not implemented');
    }

    async read(key) {
        throw new Error('Not implemented');
    }

    createReadStream(key, options = {}) {
        throw new Error('Not implemented');
    }

    async exists(key) {
        throw new Error('Not implemented');
    }

    async delete(key) {
        throw new Error('Not implemented');
    }

    async metadata(key) {
        throw new Error('Not implemented');
    }
}
