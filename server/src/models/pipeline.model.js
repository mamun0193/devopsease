import mongoose from 'mongoose';

const PIPELINE_STATUSES = ['active', 'inactive', 'error'];
const ALLOWED_STEPS = ['build', 'test', 'deploy'];
const PIPELINE_EXECUTION_STATUSES = ['pending', 'running', 'success', 'failed'];

const pipelineSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    repoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 128
    },
    config: {
        type: Object,
        required: true
    },
    rawYaml: {
        type: String,
        required: true,
        maxlength: 10000
    },
    status: {
        type: String,
        enum: PIPELINE_STATUSES,
        default: 'active'
    },
    executionStatus: {
        type: String,
        enum: PIPELINE_EXECUTION_STATUSES,
        default: 'pending',
        index: true
    },
    executionLogs: {
        type: [{
            step: {
                type: String,
                enum: ALLOWED_STEPS,
                required: true
            },
            message: {
                type: String,
                required: true,
                trim: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }],
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
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

pipelineSchema.index({ userId: 1, createdAt: -1 });
pipelineSchema.index({ repoId: 1, createdAt: -1 });
pipelineSchema.index({ userId: 1, repoId: 1 });

export { PIPELINE_STATUSES, ALLOWED_STEPS, PIPELINE_EXECUTION_STATUSES };
export default mongoose.model('Pipeline', pipelineSchema);
