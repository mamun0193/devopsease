import mongoose from 'mongoose';
import { RESOURCE_TYPES } from '../resources/resourceTypes.js';

const resourceSchema = new mongoose.Schema({
    resourceId: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: Object.values(RESOURCE_TYPES),
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'deleted', 'failed', 'pending'],
        default: 'active',
        index: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    metrics: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    quotaImpact: {
        cpu: { type: Number, default: 0 },
        memoryMB: { type: Number, default: 0 },
        storageMB: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Compound index for uniqueness of resource per type
resourceSchema.index({ resourceId: 1, type: 1 }, { unique: true });

// Optimize lookups by owner and type
resourceSchema.index({ ownerId: 1, type: 1 });

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
