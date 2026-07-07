import mongoose from 'mongoose';

const copilotRecommendationSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['SECURITY', 'PERFORMANCE', 'RELIABILITY', 'COST', 'ARCHITECTURE', 'DEPLOYMENT'],
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    why: {
        type: String,
        required: true,
    },
    evidence: {
        type: String,
        required: true,
    },
    expectedBenefit: {
        type: String,
        required: true,
    },
    affectedResources: [{
        resourceType: { type: String, required: true },
        resourceId: { type: String, required: true },
    }],
    confidence: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'DISMISSED', 'RESOLVED'],
        default: 'ACTIVE',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

copilotRecommendationSchema.index({ category: 1, status: 1 });

const CopilotRecommendation = mongoose.model('CopilotRecommendation', copilotRecommendationSchema);
export default CopilotRecommendation;
