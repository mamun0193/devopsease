import mongoose from 'mongoose';
import explainabilityRecordSchema from './schemas/explainabilityRecord.schema.js';

const RELEASE_STATUSES = [
    'Draft',
    'Prepared',
    'Deploying',
    'Validating',
    'Promoting',
    'Active',
    'Archived',
    'RolledBack'
];

const releaseTargetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        default: 'primary' // e.g., 'primary', 'canary', 'aws-eu-central-1'
    },
    deploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deployment',
        default: null,
      index: true,
    },
    status: {
        type: String,
        default: 'pending' // pending, deployed, failed
    }
}, { _id: false });

const releaseSchema = new mongoose.Schema({
    schemaVersion: {
        type: String,
        default: '1.0.0',
        immutable: true
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true,
        index: true
    },
    manifestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReleaseManifest',
        required: true,
        immutable: true,
      index: true,
    },
    version: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: RELEASE_STATUSES,
        default: 'Draft'
    },
    targets: {
        type: [releaseTargetSchema],
        default: []
    },
    explainabilityLog: {
        type: [explainabilityRecordSchema],
        default: []
    }
}, {
    timestamps: true
});

// Queries for releases of an app, usually sorted by creation or version
releaseSchema.index({ applicationId: 1, createdAt: -1 });
releaseSchema.index({ applicationId: 1, status: 1 });

export { RELEASE_STATUSES };
export default mongoose.model('Release', releaseSchema);
