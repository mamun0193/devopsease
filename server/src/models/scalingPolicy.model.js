import mongoose from 'mongoose';
import explainabilityRecordSchema from './schemas/explainabilityRecord.schema.js';

const scalingPolicySchema = new mongoose.Schema({
    schemaVersion: {
        type: String,
        default: '1.0.0',
        immutable: true
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    strategyType: {
        type: String,
        enum: ['TargetTracking', 'StepScaling'],
        default: 'TargetTracking'
    },
    // Bounds
    minReplicas: {
        type: Number,
        default: 1,
        min: 1
    },
    maxReplicas: {
        type: Number,
        default: 5,
        min: 1
    },
    // Metrics
    cpuTargetPercent: {
        type: Number,
        default: 70,
        min: 10,
        max: 95
    },
    memoryTargetPercent: {
        type: Number,
        default: 80,
        min: 10,
        max: 95
    },
    // Safety
    cooldownMs: {
        type: Number,
        default: 60000 // 60s
    },
    lastScaledAt: {
        type: Date,
        default: null
    },
    nextEvaluationAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

scalingPolicySchema.index({ applicationId: 1 }, { unique: true });

export default mongoose.model('ScalingPolicy', scalingPolicySchema);
