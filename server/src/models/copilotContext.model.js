import mongoose from 'mongoose';

// ponytail: Lightweight references to active context items.
// Prevents heavy duplication of snapshot data. The Knowledge Engine resolves these at runtime.

const copilotContextSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CopilotConversation',
        required: true,
        index: true,
    },
    knowledgeType: {
        type: String,
        enum: ['Application', 'Repository', 'Release', 'Cluster', 'PlatformHealth', 'Deployment'],
        required: true,
    },
    resourceId: {
        type: String, // Can be null if knowledgeType is a global singleton like PlatformHealth
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false,
});

copilotContextSchema.index({ conversationId: 1, knowledgeType: 1, resourceId: 1 }, { unique: true });

const CopilotContext = mongoose.model('CopilotContext', copilotContextSchema);
export default CopilotContext;
