import mongoose from 'mongoose';

const USAGE_STATUSES = ['ACTIVE', 'UNUSED', 'PENDING_DELETE'];

const volumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 128
    },
    dockerVolumeName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 256
    },
    driver: {
        type: String,
        default: 'local',
        enum: ['local']
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    sizeMB: {
        type: Number,
        default: 0
    },
    attachedContainerIds: {
        type: [String],
        default: []
    },
    usageStatus: {
        type: String,
        enum: USAGE_STATUSES,
        default: 'UNUSED',
        index: true
    },
    lastUsedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

volumeSchema.index({ userId: 1, dockerVolumeName: 1 }, { unique: true });

export { USAGE_STATUSES };
export default mongoose.model('Volume', volumeSchema);
