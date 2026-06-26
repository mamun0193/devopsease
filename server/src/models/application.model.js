import mongoose from 'mongoose';

const APPLICATION_STATUSES = ['running', 'starting', 'stopping', 'unhealthy', 'stopped'];
const APPLICATION_PROVIDERS = ['docker', 'kubernetes', 'ecs', 'ssh'];
const APPLICATION_VISIBILITY = ['public', 'private'];
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

const applicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    repositoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
    },

    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: (value) => SLUG_REGEX.test(value),
            message: 'Slug must be 2-64 lowercase alphanumeric characters or hyphens, starting and ending with alphanumeric.',
        },
    },
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500,
    },

    status: {
        type: String,
        enum: APPLICATION_STATUSES,
        default: 'stopped',
    },
    provider: {
        type: String,
        enum: APPLICATION_PROVIDERS,
        default: 'docker',
    },

    // Current deployment pointer — named "current" (not "active") to support
    // future multi-environment routing (production, staging, preview, canary)
    // without schema migration.
    currentDeploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deployment',
        default: null,
    },

    // Future: per-environment deployment pointers for traffic splitting
    // environments: [{
    //     name:          String,    // 'production', 'staging', 'preview', 'canary'
    //     deploymentId:  ObjectId,
    //     trafficWeight: Number,    // 0-100 for weighted/canary routing
    // }],

    defaultDomain: {
        type: String,
        default: null,
        trim: true,
    },
    customDomains: [{
        type: String,
        trim: true,
        lowercase: true,
    }],

    visibility: {
        type: String,
        enum: APPLICATION_VISIBILITY,
        default: 'private',
    },

    // Health is always delegated from the runtime provider, never determined by gateway
    health: {
        type: String,
        enum: APPLICATION_STATUSES,
        default: 'stopped',
    },
}, {
    timestamps: true,
});

// Indexes
applicationSchema.index({ slug: 1 });
applicationSchema.index({ userId: 1, slug: 1 }, { unique: true });
applicationSchema.index({ repositoryId: 1 });
applicationSchema.index({ userId: 1, status: 1 });

const Application = mongoose.model('Application', applicationSchema);

export { APPLICATION_STATUSES, APPLICATION_PROVIDERS, APPLICATION_VISIBILITY };
export default Application;
