import { LocalStorageProvider } from './providers/local.provider.js';
import { S3StorageProvider } from './providers/s3.provider.js';

export function createStorageProvider(driver) {
    switch (driver?.toLowerCase()) {
        case 's3':
            return new S3StorageProvider();
        case 'local':
        default:
            return new LocalStorageProvider();
    }
}
