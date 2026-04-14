import mongoose from 'mongoose';

const SECRET_ENVIRONMENTS = ['development', 'staging', 'production'];
const SECRET_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

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
        enum: SECRET_ENVIRONMENTS,
        trim: true,
        lowercase: true,
    },
}, {
    timestamps: true,
});

secretSchema.index({ userId: 1, environment: 1, name: 1 }, { unique: true });

export { SECRET_ENVIRONMENTS, SECRET_NAME_REGEX };
export default mongoose.model('Secret', secretSchema);
