import mongoose from 'mongoose';

const previewEventSchema = new mongoose.Schema({
    previewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Preview',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    decision: {
        type: String,
        required: true
    },
    trigger: {
        type: String,
        required: true
    },
    actor: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    relatedResource: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    eventVersion: {
        type: String,
        default: '1.0',
        immutable: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false
});

previewEventSchema.index({ previewId: 1, decision: 1 });

export default mongoose.model('PreviewEvent', previewEventSchema);
