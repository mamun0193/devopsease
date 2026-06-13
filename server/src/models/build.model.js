import mongoose from 'mongoose';

const BUILD_STATUSES = ['pending', 'running', 'success', 'failed', 'cancelled', 'timeout'];

const buildSchema = new mongoose.Schema({
    repoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        default: null,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tag: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: BUILD_STATUSES,
        default: 'pending',
        index: true
    },
    logs: {
        type: [String],
        default: []
    },
    logPath: {
        type: String,
        default: null
    },
    logSize: {
        type: Number,
        default: 0
    },
    lastLogAt: {
        type: Date,
        default: null
    },
    imageTag: {
        type: String,
        default: null,
        trim: true
    },
    commitHash: {
        type: String,
        default: null,
        trim: true
    },
    dockerfileContent: {
        type: String,
        required: true
    },
    logSummary: {
        type: String,
        default: ''
    },
    dockerImageId: {
        type: String,
        default: null
    },
    imageSizeBytes: {
        type: Number,
        default: 0
    },
    layerCount: {
        type: Number,
        default: 0
    },
    error: {
        type: String,
        default: null
    },
    failureAnalysis: {
        type: { type: String, default: null },
        confidence: { type: Number, default: null },
        explanation: { type: String, default: null },
        evidence: { type: [String], default: [] },
        failingStage: { type: String, default: null }
    },
    startedAt: {
        type: Date,
        default: null
    },
    finishedAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

buildSchema.index({ userId: 1, createdAt: -1 });
buildSchema.index({ userId: 1, status: 1 });
buildSchema.index({ repoId: 1, createdAt: -1 });

export { BUILD_STATUSES };
export default mongoose.model('Build', buildSchema);
