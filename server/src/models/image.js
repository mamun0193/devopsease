import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    repoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        default: null,
        index: true
    },
    buildId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Build',
        default: null,
        index: true
    },
    tag: {
        type: String,
        required: true,
        trim: true
    },
    dockerImageId: {
        type: String,
        required: true
    },
    
    // Core Metadata
    version: { type: String, default: null }, // Optional SemVer
    digest: { type: String, default: null },
    sizeMB: { type: Number, required: true },
    architecture: { type: String, default: null },
    os: { type: String, default: null },
    
    // Extracted Config
    entrypoint: { type: [String], default: [] },
    cmd: { type: [String], default: [] },
    labels: { type: Map, of: String, default: {} },
    environment: { type: [String], default: [] },
    volumes: { type: [String], default: [] },
    exposedPorts: { type: [String], default: [] },

    // Lineage (Parent/Child)
    baseImage: { type: String, default: null },
    parentImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image', default: null },
    layerCount: { type: Number, default: 0 },
    layers: [{
        digest: String,
        size: Number
    }],

    // Intelligence
    runtime: { type: String, default: null },
    framework: { type: String, default: null },
    language: { type: String, default: null },
    buildStrategy: { type: String, default: null },

    // Fingerprints (Cache Prep)
    dockerfileHash: { type: String, default: null },
    buildContextHash: { type: String, default: null },
    dependencyHash: { type: String, default: null },
    blueprintVersion: { type: String, default: null },
    artifactRevision: { type: String, default: null },
    configSnapshotVersion: { type: String, default: null },

    // Lifecycle
    lifecycleStatus: {
        type: String,
        enum: ['BUILDING', 'READY', 'FAILED', 'PUSHING', 'PUSHED', 'DEPLOYED', 'SCANNING', 'PROMOTED', 'ARCHIVED', 'RETIRED', 'DELETED'],
        default: 'READY'
    },

    // Registry (Docker Hub MVP)
    registry: {
        provider: { type: String, enum: ['LOCAL', 'DOCKERHUB'], default: 'LOCAL' },
        url: { type: String, default: null },
        repository: { type: String, default: null }, // e.g., username/repo
        pushTimestamp: { type: Date, default: null },
        pushedDigest: { type: String, default: null }, // Digest returned by Docker Hub
        pushedTag: { type: String, default: null } // Actual tag pushed to Hub
    },

    // Legacy (Backwards compatibility)
    imageUsageStatus: {
        type: String,
        enum: ['ACTIVE', 'UNUSED', 'DANGLING', 'PENDING_DELETE'],
        default: 'UNUSED'
    },
    attachedContainerIds: { type: [String], default: [] },
    lastUsedAt: { type: Date, default: null },
    pullCount: { type: Number, default: 0 },
    pulledFrom: { type: String, enum: ['DOCKERFILE', 'REGISTRY'], default: 'DOCKERFILE' }
}, {
    timestamps: true
});

imageSchema.index({ userId: 1, tag: 1 }, { unique: true });
imageSchema.index({ userId: 1, dockerImageId: 1 }, { unique: true });
imageSchema.index({ userId: 1, lifecycleStatus: 1 });
imageSchema.index({ userId: 1, imageUsageStatus: 1 });

export default mongoose.model('Image', imageSchema);
