import mongoose from 'mongoose';

const domainEventSchema = new mongoose.Schema({
    domainId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Domain',
        required: true,
        index: true
    },
    certificateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate',
        default: null,
      index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      index: true,
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

domainEventSchema.index({ domainId: 1, createdAt: -1 });

export default mongoose.model('DomainEvent', domainEventSchema);
