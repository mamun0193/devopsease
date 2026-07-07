import mongoose from 'mongoose';

const copilotMessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CopilotConversation',
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    // ponytail: Structured explainability attached directly to the message.
    explainability: {
        confidence: { type: Number, min: 0, max: 100 },
        knowledgeObjectsUsed: { type: [String], default: [] },
        affectedResources: { type: mongoose.Schema.Types.Mixed, default: [] },
        skillInvoked: { type: String },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false,
});

copilotMessageSchema.index({ conversationId: 1, createdAt: 1 });

const CopilotMessage = mongoose.model('CopilotMessage', copilotMessageSchema);
export default CopilotMessage;
