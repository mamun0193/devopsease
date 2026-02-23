import mongoose from 'mongoose';

const USAGE_STATUSES = ['ACTIVE', 'UNUSED'];

const networkSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // System-generated namespaced name: net_<userId>_<projectSlug>
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 128
    },
    // The raw Docker network ID returned by Dockerode
    dockerNetworkId: {
        type: String,
        required: true
    },
    // Always 'bridge' — enforced at service layer, stored for auditability
    driver: {
        type: String,
        default: 'bridge',
        enum: ['bridge']
    },
    // Reference to the owning project (optional — set after project is created)
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    usageStatus: {
        type: String,
        enum: USAGE_STATUSES,
        default: 'UNUSED',
        index: true
    }
}, {
    timestamps: true
});

// Uniqueness guard: a user cannot have two networks with the same namespaced name
networkSchema.index({ userId: 1, name: 1 }, { unique: true });

export { USAGE_STATUSES };
export default mongoose.model('Network', networkSchema);
