import mongoose from 'mongoose';

const DEPLOYMENT_ENVIRONMENTS = ['development', 'staging', 'production'];
const DEPLOYMENT_STATUSES = ['pending', 'deploying', 'running', 'failed', 'stopped', 'removed'];

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
    environment: {
        type: String,
        enum: DEPLOYMENT_ENVIRONMENTS,
        default: 'development'
    },
    status: {
        type: String,
        enum: DEPLOYMENT_STATUSES,
        default: 'pending'
    },
    errorLog: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

deploymentSchema.index({ repoId: 1, createdAt: -1 });
deploymentSchema.index({ buildId: 1 });
deploymentSchema.index({ containerName: 1 }, { unique: true, sparse: true });
deploymentSchema.index({ port: 1 });

const Deployment = mongoose.model('Deployment', deploymentSchema);

export { DEPLOYMENT_ENVIRONMENTS, DEPLOYMENT_STATUSES };
export default Deployment;