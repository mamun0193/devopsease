import mongoose from 'mongoose';

const imageScanSchema = new mongoose.Schema({
    imageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
        required: true,
        index: true
    },
    scanner: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'SCANNED', 'FAILED', 'UNSUPPORTED'],
        default: 'PENDING',
        index: true
    },
    lastScannedAt: {
        type: Date,
        default: null
    },
    summary: {
        critical: { type: Number, default: 0 },
        high: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        low: { type: Number, default: 0 },
        unknown: { type: Number, default: 0 }
    },
    sbomReference: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

export default mongoose.model('ImageScan', imageScanSchema);
