import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tag: {
        type: String,
        required: true,
        trim: true
    },
    dockerImageId: {
        type: String,
        required: true
    },
    sizeMB: {
        type: Number,
        required: true
    },
    layerCount: {
        type: Number,
        default: 0
    },
    buildId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Build',
        required: true
    },
    imageUsageStatus: {
        type: String,
        enum: ['ACTIVE', 'UNUSED', 'DANGLING', 'PENDING_DELETE'],
        default: 'UNUSED'
    },
    attachedContainerIds: {
        type: [String],
        default: []
    },
    lastUsedAt: {
        type: Date,
        default: null
    },
    pullCount: {
        type: Number,
        default: 0
    },
    pulledFrom: {
        type: String,
        enum: ['DOCKERFILE', 'REGISTRY'],
        default: 'DOCKERFILE'
    }
}, {
    timestamps: true
});

imageSchema.index({ userId: 1, tag: 1 }, { unique: true });
imageSchema.index({ userId: 1, imageUsageStatus: 1 });
imageSchema.index({ dockerImageId: 1 });

export default mongoose.model('Image', imageSchema);
