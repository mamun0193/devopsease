import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    containerId: {
        type: String,
        required: true,
    },
    action: {
        type: String,
        required: true,
    },
    result: {
        type: String,
        enum: ['denied', 'allowed', 'bypassed'],
        default: 'denied',
        required: true,
    },
    metadata: {
        type: Object,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    expires: '30d' // Auto-delete logs after 30 days
});

// Index for auditing queries
securityLogSchema.index({ userId: 1, timestamp: -1 });
securityLogSchema.index({ containerId: 1, timestamp: -1 });

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);

export default SecurityLog;
