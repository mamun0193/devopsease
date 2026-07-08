import mongoose from 'mongoose';

const previewTargetSchema = new mongoose.Schema({
    name: {
        type: String,
        default: 'primary'
    },
    deploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deployment',
        default: null,
      index: true,
    },
    region: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'deploying', 'ready', 'failed', 'destroyed'],
        default: 'pending'
    },
    url: {
        type: String,
        default: null
    },
    port: {
        type: Number,
        default: null
    },
    containerId: {
        type: String,
        default: null
    }
}, { _id: false });

const previewSchema = new mongoose.Schema({
    schemaVersion: {
        type: String,
        default: '1.0.0'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    repositoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true
    },
    manifest: {
        branch: { type: String, required: true },
        commitSha: { type: String, required: true },
        prNumber: { type: Number, default: null },
        prTitle: { type: String, default: null },
        trigger: { type: String, default: 'API' },
        buildId: { type: mongoose.Schema.Types.ObjectId, ref: 'Build', required: true },
        imageId: { type: String, default: null },
        configSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConfigSnapshot', default: null },
        policySnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'PreviewPolicy', default: null },
        resourceLimits: {
            cpuLimit: { type: String },
            memoryLimit: { type: String }
        }
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        immutable: true
    },
    status: {
        type: String,
        enum: [
            'creating',
            'preparing',
            'deploying',
            'ready',
            'failed',
            'expired',
            'destroying',
            'destroyed',
            'archived'
        ],
        default: 'creating'
    },
    targets: {
        type: [previewTargetSchema],
        default: []
    },
    readyAt: {
        type: Date,
        default: null
    },
    expiredAt: {
        type: Date,
        default: null
    },
    destroyedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        required: true
    },
    extensionCount: {
        type: Number,
        default: 0
    },
    lastActivityAt: {
        type: Date,
        default: null
    },
    destroyReason: {
        type: String,
        default: null
    },
    destroyedBy: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

previewSchema.index({ userId: 1, status: 1 });
previewSchema.index({ repositoryId: 1, status: 1 });
previewSchema.index({ expiresAt: 1, status: 1 });
previewSchema.index({ applicationId: 1 });

export default mongoose.model('Preview', previewSchema);
