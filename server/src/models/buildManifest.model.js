import mongoose from 'mongoose';

const LayerAnalysisSchema = new mongoose.Schema({
    layerId: { type: String, required: true },
    instructionHash: { type: String, required: true },
    instruction: { type: String, required: true },
    layerType: { 
        type: String, 
        enum: ['DEPENDENCY', 'SOURCE', 'SYSTEM', 'RUNTIME', 'UNKNOWN'],
        required: true
    },
    cacheStatus: {
        type: String,
        enum: ['HIT', 'MISS', 'UNKNOWN'],
        default: 'UNKNOWN'
    },
    cacheKey: { type: String, default: null },
    cacheability: {
        type: String,
        enum: ['CACHEABLE', 'UNCACHEABLE', 'VOLATILE', 'UNKNOWN'],
        default: 'UNKNOWN'
    },
    reason: { type: String, default: null },
    sizeBytes: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 }
}, { _id: false });

const BuildComparisonSchema = new mongoose.Schema({
    previousBuildId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Build',
        default: null
    },
    dependencyChanges: { type: Boolean, default: false },
    dockerfileChanges: { type: Boolean, default: false },
    contextChanged: { type: Boolean, default: false },
    estimatedSavedTimeMs: { type: Number, default: 0 }
}, { _id: false });

const buildManifestSchema = new mongoose.Schema({
    manifestVersion: {
        type: String,
        default: 'v1.1',
        immutable: true
    },
    repoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        index: true,
        immutable: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
        immutable: true
    },
    branch: {
        type: String,
        required: true,
        trim: true,
        immutable: true
    },
    commitSha: {
        type: String,
        default: null,
        trim: true,
        immutable: true
    },
    
    // Fingerprints
    contextHash: { type: String, default: null, immutable: true },
    dependencyFingerprint: { type: String, default: null, immutable: true },
    dockerfileFingerprint: { type: String, default: null, immutable: true },
    buildFingerprint: { 
        type: String, 
        required: true,
        immutable: true
    },

    // Strategy & Analysis
    strategy: {
        type: String,
        enum: ['FULL_REUSE', 'PARTIAL_REUSE', 'FULL_REBUILD', 'UNKNOWN'],
        default: 'UNKNOWN'
    },
    invalidationReason: {
        type: String,
        default: null
    },
    estimatedSavedTimeMs: { type: Number, default: 0 },
    
    layers: [LayerAnalysisSchema],
    comparison: { type: BuildComparisonSchema, default: () => ({}) }

}, {
    timestamps: true
});

buildManifestSchema.index({ repoId: 1, branch: 1, createdAt: -1 });
buildManifestSchema.index({ buildFingerprint: 1 });

export default mongoose.model('BuildManifest', buildManifestSchema);
