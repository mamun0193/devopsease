import mongoose from 'mongoose';
import crypto from 'crypto';

// ConfigSnapshot — Immutable point-in-time configuration capture per deployment.

// Created automatically when a deployment succeeds. Stores the exact version
// of every ConfigEntry used, plus a SHA-256 hash for integrity verification.


const snapshotEntrySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['variable', 'secret'],
    },
    version: {
        type: Number,
        required: true,
    },
    valueHash: {
        type: String,
        required: true,
    },
    encrypted: {
        type: Boolean,
        required: true,
    },
    source: {
        type: String,
        required: true,
    },
}, { _id: false });

const configSnapshotSchema = new mongoose.Schema({
    deploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deployment',
        required: true,
    },
    repositoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        index: true,
    },
    environmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Environment',
        required: true,
        index: true,
    },
    entries: {
        type: [snapshotEntrySchema],
        default: [],
    },
    generatedAt: {
        type: Date,
        default: Date.now,
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      index: true,
    },
}, {
    timestamps: false,
});

// One snapshot per deployment
configSnapshotSchema.index({ deploymentId: 1 }, { unique: true });

// History queries — list snapshots for a repo+env, newest first
configSnapshotSchema.index({ repositoryId: 1, environmentId: 1, generatedAt: -1 });

/**
 * Utility: compute SHA-256 hash of a value for snapshot integrity.
 * @param {string} value
 * @returns {string} hex-encoded hash
 */
export function hashValue(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export default mongoose.model('ConfigSnapshot', configSnapshotSchema);
