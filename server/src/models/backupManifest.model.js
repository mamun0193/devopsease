import mongoose from 'mongoose';

const backupManifestSchema = new mongoose.Schema({
    platformVersion: {
        type: String,
        required: true,
        default: '1.0.0',
    },
    schemaVersion: {
        type: String,
        required: true,
        default: '1.0',
    },
    checksum: {
        type: String,
        required: true, // SHA-256
    },
    storageMetadata: {
        driver: { type: String, required: true },
        key: { type: String, required: true },
        sizeBytes: { type: Number, required: true },
    },
    collectionMetadata: {
        type: Map,
        of: Number, // Stores { "Application": 5, "Domain": 10 }
        default: {},
    },
    retentionTier: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'pinned'],
        default: 'daily',
    },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED'],
        default: 'PENDING',
    },
    error: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        default: null, // If pinned or indefinite
    }
}, {
    timestamps: false,
});

backupManifestSchema.index({ retentionTier: 1, createdAt: -1 });

const BackupManifest = mongoose.model('BackupManifest', backupManifestSchema);
export default BackupManifest;
