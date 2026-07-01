import mongoose from 'mongoose';

const imageHistorySchema = new mongoose.Schema({
    imageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    event: {
        type: String,
        required: true,
        enum: [
            'Image Built',
            'Metadata Extracted',
            'Tagged',
            'Deployed',
            'Pushed to Docker Hub',
            'Pulled',
            'Rollback Used',
            'Archived',
            'Deleted',
            'Pruned'
        ]
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

export default mongoose.model('ImageHistory', imageHistorySchema);
