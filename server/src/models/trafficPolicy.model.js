import mongoose from 'mongoose';
import explainabilityRecordSchema from './schemas/explainabilityRecord.schema.js';

const targetRuleSchema = new mongoose.Schema({
    releaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Release',
        required: true
    },
    weight: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    targetName: {
        type: String,
        default: 'primary'
    }
}, { _id: false });

const trafficPolicySchema = new mongoose.Schema({
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
    mode: {
        type: String,
        enum: ['AllAtOnce', 'Canary', 'BlueGreen'],
        default: 'AllAtOnce'
    },
    targets: {
        type: [targetRuleSchema],
        default: []
    },
    explainabilityLog: {
        type: [explainabilityRecordSchema],
        default: []
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

trafficPolicySchema.index({ applicationId: 1, createdAt: -1 });

export default mongoose.model('TrafficPolicy', trafficPolicySchema);
