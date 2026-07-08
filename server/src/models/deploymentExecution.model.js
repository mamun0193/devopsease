import mongoose from 'mongoose';

const deploymentExecutionSchema = new mongoose.Schema({
    deploymentId: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    artifactBundleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ArtifactBundle',
        required: true,
      index: true,
    },
    artifactRevisionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ArtifactRevision',
        required: true,
      index: true,
    },
    provider: {
        type: String,
        required: true, // e.g. docker, kubernetes, ecs, ssh
        index: true
    },
    executor: {
        type: String, // name of the executor engine class/module
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'VALIDATING', 'PREPARING', 'EXECUTING', 'HEALTH_CHECKING', 'SUCCESS', 'FAILED', 'ROLLING_BACK', 'ROLLED_BACK'],
        default: 'PENDING'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // duration in ms
        default: 0
    },
    rollbackInformation: {
        type: mongoose.Schema.Types.Mixed,
        default: {} // Provider-specific rollback state
    },
    // Log metadata for the execution
    logPath: {
        type: String,
        default: null
    },
    logSummary: {
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
    }
}, {
    timestamps: true
});

deploymentExecutionSchema.index({ provider: 1, status: 1 });

export default mongoose.model('DeploymentExecution', deploymentExecutionSchema);
