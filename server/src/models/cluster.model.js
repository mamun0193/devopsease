import mongoose from 'mongoose';

const CLUSTER_STATUSES = ['connected', 'failed'];

const clusterSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 128,
    },
    kubeconfig: {
        type: String,
        required: true,
        // Stored as AES-256-GCM encrypted string — NEVER log this field
    },
    status: {
        type: String,
        enum: CLUSTER_STATUSES,
        default: 'connected',
    },
    lastError: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1024,
    },
}, {
    timestamps: true,
});

// Compound index: unique cluster name per user
clusterSchema.index({ userId: 1, name: 1 }, { unique: true });
clusterSchema.index({ userId: 1, createdAt: -1 });

// Security: strip kubeconfig from JSON serialisation by default.
// Services that need the raw kubeconfig must explicitly select it.
clusterSchema.methods.toSafeJSON = function () {
    const obj = this.toObject();
    delete obj.kubeconfig;
    return obj;
};

const Cluster = mongoose.model('Cluster', clusterSchema);

export { CLUSTER_STATUSES };
export default Cluster;
