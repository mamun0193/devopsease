import mongoose from 'mongoose';

// RoutingTable is an optimized, flattened structure for the Gateway to consume.
// It directly maps an application slug to physical endpoints.

const routeEntrySchema = new mongoose.Schema({
    deploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deployment',
        required: true,
      index: true,
    },
    releaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Release',
        required: true,
      index: true,
    },
    weight: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    }
    // We could embed provider and endpoint directly here, but the Gateway currently
    // uses EndpointResolver to resolve deployment -> runtime. So keeping deploymentId
    // is currently necessary, but the lookup stops there.
}, { _id: false });

const routingTableSchema = new mongoose.Schema({
    schemaVersion: {
        type: String,
        default: '1.0.0',
        immutable: true
    },
    version: {
        type: Number,
        default: 1,
        immutable: true
    },
    slug: {
        type: String,
        required: true,
        index: true
        // unique: true is removed because we are keeping historical versions
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true,
      index: true,
    },
    routes: {
        type: [routeEntrySchema],
        default: []
    },
    hostnames: {
        type: [String],
        default: []
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index to fetch the latest routing table for a slug quickly
routingTableSchema.index({ slug: 1, version: -1 }, { unique: true });

// Sparse index for hostname lookups
routingTableSchema.index({ hostnames: 1 }, { sparse: true });

export default mongoose.model('RoutingTable', routingTableSchema);
