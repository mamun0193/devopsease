import mongoose from 'mongoose';
import explainabilityRecordSchema from './schemas/explainabilityRecord.schema.js';

const ruleSchema = new mongoose.Schema({
    releaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Release',
        required: true,
      index: true,
    },
    weight: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    }
}, { _id: false });

const trafficRuleSchema = new mongoose.Schema({
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
    policyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrafficPolicy',
        required: true,
      index: true,
    },
    rules: {
        type: [ruleSchema],
        default: []
    },
    explainabilityLog: {
        type: [explainabilityRecordSchema],
        default: []
    }
}, {
    timestamps: true
});

trafficRuleSchema.index({ applicationId: 1, createdAt: -1 });

export default mongoose.model('TrafficRule', trafficRuleSchema);
