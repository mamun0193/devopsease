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
    }
}, {
    timestamps: true
});

imageSchema.index({ userId: 1, tag: 1 }, { unique: true });

export default mongoose.model('Image', imageSchema);
