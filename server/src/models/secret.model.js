import mongoose from 'mongoose';

// @deprecated — legacy hardcoded list kept for backward-compatible validation in secret.service.js.
// New code should use ENVIRONMENT_NAME_REGEX instead.
const SECRET_ENVIRONMENTS = ['development', 'staging', 'production'];
const SECRET_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENVIRONMENT_NAME_REGEX = /^[a-z][a-z0-9_-]{1,31}$/;

const secretSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [256, 'Secret name must be at most 256 characters'],
        validate: {
            validator: (value) => SECRET_NAME_REGEX.test(value),
            message: 'Secret name must be a valid environment variable key',
        },
    },
    value: {
        type: String,
        required: true,
        select: false,
        maxlength: [10000, 'Encrypted secret value exceeds storage limit'],
    },
    environment: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: (value) => ENVIRONMENT_NAME_REGEX.test(value),
            message: 'Environment name must be 2-32 chars, start with a letter, use [a-z0-9_-]',
        },
    },
}, {
    timestamps: true,
});

secretSchema.index({ userId: 1, environment: 1, name: 1 }, { unique: true });

export { SECRET_ENVIRONMENTS, SECRET_NAME_REGEX, ENVIRONMENT_NAME_REGEX };
export default mongoose.model('Secret', secretSchema);
