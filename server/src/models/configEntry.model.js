import mongoose from 'mongoose';

// ConfigEntry — Unified configuration storage model.

// Stores both plain-text variables and encrypted secrets in a single collection.
// Scoped to Application + Environment (application-centric design).


const CONFIG_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENVIRONMENT_NAME_REGEX = /^[a-z][a-z0-9_-]{1,31}$/;
const CONFIG_TYPES = ['variable', 'secret'];
const CONFIG_SOURCES = ['manual', 'detected', 'imported', 'scanner'];

const detectionSchema = new mongoose.Schema({
    sourceFile: { type: String, default: null },
    lineNumber: { type: Number, default: null },
    language: { type: String, default: null },
    framework: { type: String, default: null },
    confidence: { type: Number, default: null, min: 0, max: 1 },
    heuristic: { type: String, default: null },
    defaultValue: { type: String, default: null },
    requiredBy: { type: [String], default: [] },
}, { _id: false });

const configEntrySchema = new mongoose.Schema({
    repositoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    environmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [256, 'Config name must be at most 256 characters'],
        validate: {
            validator: (value) => CONFIG_NAME_REGEX.test(value),
            message: 'Config name must be a valid environment variable key (letters, digits, underscores)',
        },
    },
    value: {
        type: String,
        required: true,
        select: false,
        maxlength: [10000, 'Config value exceeds storage limit'],
    },
    type: {
        type: String,
        required: true,
        enum: CONFIG_TYPES,
        default: 'variable',
    },
    encrypted: {
        type: Boolean,
        default: false,
    },
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500,
    },
    source: {
        type: String,
        enum: CONFIG_SOURCES,
        default: 'manual',
    },
    version: {
        type: Number,
        default: 1,
        min: 1,
    },
    lastRotatedAt: {
        type: Date,
        default: null,
    },
    lastRotatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      index: true,
    },
    detection: {
        type: detectionSchema,
        default: null,
    },
}, {
    timestamps: true,
});

// Primary lookup + uniqueness guard
configEntrySchema.index(
    { repositoryId: 1, environmentId: 1, name: 1 },
    { unique: true },
);

// Ownership queries
configEntrySchema.index({ userId: 1, repositoryId: 1 });

// Filter by type
configEntrySchema.index({ repositoryId: 1, type: 1 });

export { CONFIG_NAME_REGEX, ENVIRONMENT_NAME_REGEX, CONFIG_TYPES, CONFIG_SOURCES };
export default mongoose.model('ConfigEntry', configEntrySchema);
