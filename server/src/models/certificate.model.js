import mongoose from 'mongoose';
import explainabilityRecordSchema from './schemas/explainabilityRecord.schema.js';

const CERTIFICATE_STATUSES = [
    'requested',
    'validating',
    'issued',
    'installed',
    'renewing',
    'expired',
    'revoked',
    'replaced',
    'failed'
];

const CERTIFICATE_PROVIDERS = [
    'platform',
    'letsencrypt',
    'zerossl',
    'custom'
];

const certificateSchema = new mongoose.Schema({
    schemaVersion: { type: String, default: '1.0.0', immutable: true },
    domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    hostname: { type: String, required: true, index: true },
    coveredHostnames: { type: [String], default: [] },
    
    status: { type: String, enum: CERTIFICATE_STATUSES, default: 'requested' },
    provider: { type: String, enum: CERTIFICATE_PROVIDERS, default: 'platform' },

    serialNumber: { type: String, default: null },
    fingerprint: { type: String, default: null },
    issuer: { type: String, default: null },

    issuedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    renewAt: { type: Date, default: null },
    installedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },

    renewalAttempts: { type: Number, default: 0 },
    lastRenewalError: { type: String, default: null },
    lastRenewalAt: { type: Date, default: null },

    explainabilityLog: {
        type: [explainabilityRecordSchema],
        default: []
    }
}, {
    timestamps: true
});

certificateSchema.index({ domainId: 1, createdAt: -1 });
certificateSchema.index({ expiresAt: 1, status: 1 }); // Scheduler index

export { CERTIFICATE_STATUSES, CERTIFICATE_PROVIDERS };
export default mongoose.model('Certificate', certificateSchema);
