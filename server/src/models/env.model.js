import mongoose from 'mongoose';

const ENVIRONMENT_SLUG_REGEX = /^[a-z][a-z0-9_-]{1,31}$/;
const PROVIDERS = ['auto', 'docker', 'kubernetes', 'ecs', 'compose'];

// Environment — First-class entity for multi-environment support.


const envSchema = new mongoose.Schema({
    repositoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 64
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: (value) => ENVIRONMENT_SLUG_REGEX.test(value),
            message: 'Environment slug must be 2-32 chars, start with a letter, and use letters, numbers, _ or -'
        }
    },
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500
    },
    provider: {
        type: String,
        enum: PROVIDERS,
        default: 'auto'
    },
    inheritsFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Environment',
        default: null
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// A repository cannot have two environments with the same slug
envSchema.index({ repositoryId: 1, slug: 1 }, { unique: true });

// Prevent circular inheritance by validating on save
envSchema.pre('save', async function (next) {
    if (!this.inheritsFrom) return next();
    
    // Simple direct circular check
    if (this.inheritsFrom.equals(this._id)) {
        return next(new Error('An environment cannot inherit from itself.'));
    }

    // Deeper check would traverse up the tree, but for MVP direct check is essential
    const parent = await mongoose.model('Environment').findById(this.inheritsFrom).select('inheritsFrom');
    if (parent && parent.inheritsFrom && parent.inheritsFrom.equals(this._id)) {
        return next(new Error('Circular inheritance detected between environments.'));
    }

    next();
});

export { ENVIRONMENT_SLUG_REGEX, PROVIDERS };
export default mongoose.model('Environment', envSchema);
