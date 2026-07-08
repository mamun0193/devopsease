import mongoose from 'mongoose';

const previewPolicySchema = new mongoose.Schema({
    schemaVersion: {
        type: String,
        default: '1.0.0',
        immutable: true
    },
    repositoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        unique: true,
        immutable: true,
      index: true,
    },
    
    // Automation
    autoCreateOnPush: {
        type: Boolean,
        default: false
    },
    autoDestroyOnMerge: {
        type: Boolean,
        default: true
    },
    allowedBranches: {
        type: [String],
        default: []
    },

    // Lifecycle limits
    ttlMinutes: {
        type: Number,
        default: 240
    },
    maxLifetimeMinutes: {
        type: Number,
        default: 1440
    },
    maxExtensions: {
        type: Number,
        default: 3
    },
    idleTimeoutMinutes: {
        type: Number,
        default: 60
    },

    // Resource limits
    maxPreviews: {
        type: Number,
        default: 3
    },
    cpuLimit: {
        type: String,
        default: '0.5'
    },
    memoryLimit: {
        type: String,
        default: '256m'
    },

    // Visibility
    visibility: {
        type: String,
        enum: ['private', 'team'],
        default: 'private'
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      index: true,
    }
}, {
    timestamps: true
});

export default mongoose.model('PreviewPolicy', previewPolicySchema);
