import mongoose from 'mongoose';

const DEPLOYMENT_ENVIRONMENTS = ['development', 'staging', 'production'];
const DEPLOYMENT_STATUSES = ['pending', 'deploying', 'running', 'failed', 'stopped', 'removed'];
const DEPLOYMENT_ENVIRONMENT_REGEX = /^[a-z][a-z0-9_-]{1,31}$/;

const deploymentSchema = new mongoose.Schema({
    repoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true
    },
    buildId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Build',
        required: true
    },
    imageTag: {
        type: String,
        required: true,
        trim: true
    },
    containerId: {
        type: String,
        default: null
    },
    containerName: {
        type: String,
        default: null,
        trim: true
    },
    port: {
        type: Number,
        default: null
    },
    desiredReplicas: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
    },
    containerIds: {
        type: [String],
        default: []
    },
    environment: {
        type: String,
        trim: true,
        lowercase: true,
        default: 'development',
        validate: {
            validator: (value) => DEPLOYMENT_ENVIRONMENT_REGEX.test(value),
            message: 'Invalid deployment environment name'
        }
    },
    status: {
        type: String,
        enum: DEPLOYMENT_STATUSES,
        default: 'pending'
    },
    errorLog: {
        type: String,
        default: null
    },
    isRollback: {
        type: Boolean,
        default: false
    },
    rolledBackFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deployment',
        default: null
    },
    rollbackReason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null
    }
}, {
    timestamps: true
});

deploymentSchema.index({ repoId: 1, createdAt: -1 });
deploymentSchema.index({ buildId: 1 });
deploymentSchema.index({ containerName: 1 }, { unique: true, sparse: true });
deploymentSchema.index({ port: 1 });
deploymentSchema.index({ repoId: 1, status: 1, createdAt: -1 });
deploymentSchema.index({ rolledBackFrom: 1 });

const Deployment = mongoose.model('Deployment', deploymentSchema);

export { DEPLOYMENT_ENVIRONMENTS, DEPLOYMENT_STATUSES };
export default Deployment;