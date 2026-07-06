import mongoose from 'mongoose';

// ponytail: Only persists WARNING+ events. INFO stays transient in the ring buffer.
// Audit events (DomainEvent, PreviewEvent, ImageHistory) stay in their existing models.

const platformEventSchema = new mongoose.Schema({
    correlationId: {
        type: String,
        required: true,
        index: true,
    },
    domain: {
        type: String,
        required: true,
    },
    eventType: {
        type: String,
        required: true,
    },
    severity: {
        type: String,
        enum: ['WARNING', 'ERROR', 'CRITICAL'],
        required: true,
    },
    resourceType: {
        type: String,
        default: null,
    },
    resourceId: {
        type: String,
        default: null,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        default: null,
    },
    // AI-ready structured summary
    summary: {
        type: String,
        default: '',
    },
    // Reuses explainabilityRecord shape with AI extensions
    explanation: {
        decision: { type: String, default: null },
        trigger: { type: String, default: null },
        actor: { type: String, default: 'System' },
        reason: { type: String, default: null },
        fromState: { type: String, default: null },
        toState: { type: String, default: null },
        relatedResource: { type: mongoose.Schema.Types.Mixed, default: null },
        // AI-ready extensions
        rootCauses: { type: [String], default: [] },
        recommendations: { type: [String], default: [] },
        confidence: { type: Number, default: null },
        affectedResources: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false,
});

// Query indexes
platformEventSchema.index({ domain: 1, timestamp: -1 });
platformEventSchema.index({ userId: 1, timestamp: -1 });
platformEventSchema.index({ applicationId: 1, timestamp: -1 });

// TTL: 30 days default
platformEventSchema.index(
    { timestamp: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

// CRITICAL events get 90-day retention via a separate TTL index
// ponytail: MongoDB only supports one TTL index per collection.
// Using partialFilterExpression on the single TTL index isn't supported for variable TTLs.
// Instead, the cleanup job in platformHealth.service.js handles CRITICAL retention manually.

const PlatformEvent = mongoose.model('PlatformEvent', platformEventSchema);
export default PlatformEvent;
