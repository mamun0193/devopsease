import mongoose from 'mongoose';
import explainabilityRecordSchema from './schemas/explainabilityRecord.schema.js';

const DOMAIN_TYPES = ['custom', 'preview', 'platform'];
const DOMAIN_STATUSES = [
    'added',
    'pending_verification',
    'verified',
    'connected',
    'healthy',
    'unhealthy',
    'disconnected',
    'archived'
];

const VERIFICATION_METHODS = ['dns_txt', 'dns_cname', 'http', 'email'];
const HEALTH_STATUSES = ['HEALTHY', 'DEGRADED', 'UNHEALTHY'];

const verificationSchema = new mongoose.Schema({
    method: { type: String, enum: VERIFICATION_METHODS, required: true },
    token: { type: String, required: true },
    instructions: { type: String, required: true },
    challengedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null }
}, { _id: false });

const activeCertificateSchema = new mongoose.Schema({
    certificateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', required: true },
    hostname: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, required: true },
    boundAt: { type: Date, default: Date.now }
}, { _id: false });

const domainSchema = new mongoose.Schema({
    schemaVersion: { type: String, default: '1.0.0', immutable: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    
    hostname: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: (v) => v === 'localhost' || /^(?=.{1,253}$)([a-z0-9]([-a-z0-9]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(v) || /^([a-z0-9]([-a-z0-9]*[a-z0-9])?\.){0,4}[a-z0-9]([-a-z0-9]*[a-z0-9])?$/i.test(v),
            message: 'Invalid hostname format'
        }
    },
    type: { type: String, enum: DOMAIN_TYPES, required: true },
    status: { type: String, enum: DOMAIN_STATUSES, default: 'added' },
    autoManaged: { type: Boolean, default: false },

    verification: { type: verificationSchema, default: null },
    activeCertificate: { type: activeCertificateSchema, default: null },

    healthStatus: { type: String, enum: HEALTH_STATUSES, default: null },
    lastHealthCheck: { type: Date, default: null },

    dnsProvider: { type: String, default: 'platform' },
    certificateProvider: { type: String, default: 'platform' },

    explainabilityLog: {
        type: [explainabilityRecordSchema],
        default: []
    },

    connectedAt: { type: Date, default: null },
    disconnectedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null }
}, {
    timestamps: true
});

domainSchema.index({ applicationId: 1, status: 1 });
domainSchema.index({ userId: 1, status: 1 });
domainSchema.index({ 'activeCertificate.expiresAt': 1 }, { sparse: true });
domainSchema.index({ hostname: 1 }, { unique: true, partialFilterExpression: { status: { $ne: 'archived' } } });

export { DOMAIN_TYPES, DOMAIN_STATUSES };
export default mongoose.model('Domain', domainSchema);
