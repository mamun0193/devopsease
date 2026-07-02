import mongoose from 'mongoose';

// A structured, AI-ready schema for documenting platform decisions.
// Designed to answer the "Why" behind automated operations.

const explainabilityRecordSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        immutable: true
    },
    decision: {
        type: String, // e.g., 'TRAFFIC_SWITCH', 'RELEASE_PROMOTED', 'RELEASE_ROLLED_BACK'
        required: true,
        immutable: true
    },
    trigger: {
        type: String, // e.g., 'USER_COMMAND', 'HEALTH_CHECK_FAILURE', 'AI_RECOMMENDATION'
        required: true,
        immutable: true
    },
    actor: {
        type: String, // e.g., 'UserId', 'PlatformAI', 'System'
        required: true,
        immutable: true
    },
    reason: {
        type: String, // Human-readable explanation
        required: true,
        immutable: true
    },
    relatedResource: {
        type: mongoose.Schema.Types.Mixed, // { type: 'Deployment', id: '...' }
        default: null,
        immutable: true
    }
}, { _id: false });

export default explainabilityRecordSchema;
