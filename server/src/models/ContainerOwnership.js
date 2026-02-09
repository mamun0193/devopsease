import mongoose from 'mongoose';

const containerOwnershipSchema = new mongoose.Schema({
    containerId: {
        type: String,
        required: true,
        trim: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'released'],
        default: 'active',
        required: true,
    },
    lastActionAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true, // adds createdAt and updatedAt
});

// CRITICAL: Ensure a container can only have ONE active owner at a time
containerOwnershipSchema.index(
    { containerId: 1 },
    { unique: true, partialFilterExpression: { status: 'active' } }
);

// Optimize looking up all containers for a user
containerOwnershipSchema.index({ ownerId: 1, status: 1 });

const ContainerOwnership = mongoose.model('ContainerOwnership', containerOwnershipSchema);

export default ContainerOwnership;
