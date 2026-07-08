import mongoose from 'mongoose';
import { PIPELINE_EXECUTION_STATUSES } from './pipeline.model.js';

const stepSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'running', 'success', 'failed', 'skipped'],
        default: 'pending'
    },
    startedAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // milliseconds
        default: null
    },
    exitCode: {
        type: Number,
        default: null
    }
}, { _id: false });

const pipelineRunSchema = new mongoose.Schema({
    pipelineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pipeline',
        required: true
    },
    repositoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    commitHash: {
        type: String,
        default: null
    },
    branch: {
        type: String,
        default: null
    },
    commitMessage: {
        type: String,
        default: null
    },
    author: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: PIPELINE_EXECUTION_STATUSES,
        default: 'pending',
        index: true
    },
    triggerSource: {
        type: String,
        enum: ['webhook', 'manual'],
        default: 'manual'
    },
    buildId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Build',
        default: null,
      index: true,
    },
    deploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deployment',
        default: null,
      index: true,
    },
    steps: {
        type: [stepSchema],
        default: []
    },
    startedAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // milliseconds
        default: null
    },
    storage: {
        driver: { type: String, enum: ['local', 's3'], default: 'local' },
        key: { type: String, default: null }
    },
    logSize: {
        type: Number,
        default: 0
    },
    lastLogAt: {
        type: Date,
        default: null
    },
    logSummary: {
        type: String,
        default: ''
    },
    error: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

pipelineRunSchema.index({ pipelineId: 1, createdAt: -1 });
pipelineRunSchema.index({ userId: 1, createdAt: -1 });

// T1: Enforce at most one active (pending/running) run per pipeline.
// This unique partial index prevents TOCTOU race conditions from concurrent requests.
pipelineRunSchema.index(
    { pipelineId: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['pending', 'running'] } } }
);

export default mongoose.model('PipelineRun', pipelineRunSchema);
