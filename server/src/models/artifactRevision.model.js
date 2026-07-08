import mongoose from 'mongoose';

const artifactRevisionSchema = new mongoose.Schema({
    artifactBundleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ArtifactBundle',
        required: true,
        index: true
    },
    revision: {
        type: Number,
        required: true,
        default: 1
    },
    editedArtifacts: {
        type: mongoose.Schema.Types.Mixed,
        default: {} // Stores edited fields like compose, kubernetes, etc. overriding ArtifactBundle
    },
    validationResult: {
        type: mongoose.Schema.Types.Mixed,
        default: {} // Stores modular scores (Docker, Compose, K8s, Pipeline, Security, Environment)
    },
    readinessScore: {
        type: Number,
        default: 0
    },
    warnings: {
        type: [String],
        default: []
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      index: true,
    },
    approvalStatus: {
        type: String,
        enum: ['GENERATED', 'REVIEWING', 'APPROVED', 'DEPLOYED', 'SUPERSEDED'],
        default: 'GENERATED'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      index: true,
    },
    approvedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

artifactRevisionSchema.index({ artifactBundleId: 1, revision: -1 }, { unique: true });

export default mongoose.model('ArtifactRevision', artifactRevisionSchema);
