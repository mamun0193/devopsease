import mongoose from 'mongoose';

const restoreSchema = new mongoose.Schema({
    backupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BackupManifest',
        required: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'ROLLED_BACK'],
        default: 'PENDING',
    },
    stage: {
        type: String,
        enum: ['PLANNING', 'PREVIEW', 'PRE_BACKUP', 'EXECUTION', 'VERIFICATION', 'COMMIT', 'ROLLBACK'],
        default: 'PLANNING',
    },
    explainability: {
        inserted: { type: Number, default: 0 },
        updated: { type: Number, default: 0 },
        deleted: { type: Number, default: 0 },
        warnings: { type: [String], default: [] },
        verificationResults: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    error: {
        type: String,
        default: null,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
        default: null,
    }
}, {
    timestamps: false,
});

const Restore = mongoose.model('Restore', restoreSchema);
export default Restore;
