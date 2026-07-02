import mongoose from 'mongoose';

// ReleasePolicy defines the rules and gates for promoting a Release through its lifecycle.
// It is completely decoupled from TrafficPolicy.

const releasePolicySchema = new mongoose.Schema({
    schemaVersion: {
        type: String,
        default: '1.0.0',
        immutable: true
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true,
        index: true
    },
    // E.g., 'require_manual_approval', 'auto_promote_on_health_pass'
    promotionStrategy: {
        type: String,
        default: 'auto_promote_on_health_pass'
    },
    healthCheckDurationMs: {
        type: Number,
        default: 300000 // 5 minutes of stability required
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

releasePolicySchema.index({ applicationId: 1 }, { unique: true });

export default mongoose.model('ReleasePolicy', releasePolicySchema);
