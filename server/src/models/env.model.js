import mongoose from 'mongoose';

const ENVIRONMENT_NAME_REGEX = /^[a-z][a-z0-9_-]{1,31}$/;

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const envSchema = new mongoose.Schema({
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
        lowercase: true,
        validate: {
            validator: (value) => ENVIRONMENT_NAME_REGEX.test(value),
            message: 'Environment name must be 2-32 chars, start with a letter, and use letters, numbers, _ or -'
        }
    },
    variables: {
        type: Object,
        default: {},
        validate: {
            validator: (value) => isPlainObject(value),
            message: 'Environment variables must be a key-value object'
        }
    }
}, {
    timestamps: true
});

envSchema.index({ repoId: 1, name: 1 }, { unique: true });

export { ENVIRONMENT_NAME_REGEX };
export default mongoose.model('Environment', envSchema);
