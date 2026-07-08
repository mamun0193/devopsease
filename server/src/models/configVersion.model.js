import mongoose from 'mongoose';

/**
 * ConfigVersion — Immutable audit log for configuration changes.
 *
 * Every create, update, rotation, or rollback on a ConfigEntry produces
 * a new ConfigVersion record. This enables full version history,
 * audit trails, and point-in-time rollback.
 *
 * Values are stored encrypted (for secrets) or plaintext (for variables)
 * matching the parent ConfigEntry's encryption state.
 */

const CHANGE_TYPES = ['created', 'updated', 'rotated', 'rolled_back', 'imported'];

const configVersionSchema = new mongoose.Schema({
    configEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConfigEntry',
        required: true,
        index: true,
    },
    version: {
        type: Number,
        required: true,
        min: 1,
    },
    encryptedValue: {
        type: String,
        required: true,
        select: false,
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      index: true,
    },
    changeType: {
        type: String,
        required: true,
        enum: CHANGE_TYPES,
    },
    reason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 500,
    },
    deploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deployment',
        default: null,
      index: true,
    },
    rollbackFromVersion: {
        type: Number,
        default: null,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});

// Version history lookup — always query by entry ID, sort by version desc
configVersionSchema.index(
    { configEntryId: 1, version: -1 },
    { unique: true },
);

export { CHANGE_TYPES };
export default mongoose.model('ConfigVersion', configVersionSchema);
