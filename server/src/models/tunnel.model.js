import mongoose from 'mongoose';

const TUNNEL_STATUSES = ['ACTIVE', 'EXPIRED', 'REVOKED'];

const tunnelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    containerId: {
        type: String,
        required: true,
        trim: true
    },
    internalPort: {
        type: Number,
        required: true
    },
    publicUrl: {
        type: String,
        required: true
    },
    provider: {
        type: String,
        required: true,
        trim: true
    },
    providerTunnelId: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: TUNNEL_STATUSES,
        default: 'ACTIVE',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    revokedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Query indexes
tunnelSchema.index({ userId: 1 });
tunnelSchema.index({ status: 1 });
tunnelSchema.index({ expiresAt: 1 });
tunnelSchema.index({ containerId: 1, status: 1 });

export { TUNNEL_STATUSES };
export default mongoose.model('Tunnel', tunnelSchema);
