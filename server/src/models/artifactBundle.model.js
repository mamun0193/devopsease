import mongoose from 'mongoose';

const artifactBundleSchema = new mongoose.Schema({
    repoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        index: true
    },
    blueprintId: {
        type: String,
        required: true,
        index: true
    },
    blueprintVersion: {
        type: Number,
        required: true
    },
    dockerfiles: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    dockerignore: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    compose: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    kubernetes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    pipeline: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    environment: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    healthchecks: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    proxy: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    warnings: {
        type: [String],
        default: []
    },
    costEstimate: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: String,
        enum: ['DRAFT', 'DEPLOYED', 'SUPERSEDED'],
        default: 'DRAFT'
    },
    supersededBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ArtifactBundle',
        default: null
    },
    deploymentReady: {
        type: Boolean,
        default: false
    },
    createdFromBlueprintVersion: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

artifactBundleSchema.index({ repoId: 1, createdAt: -1 });

export default mongoose.model('ArtifactBundle', artifactBundleSchema);
