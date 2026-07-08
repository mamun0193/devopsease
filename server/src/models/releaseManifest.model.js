import mongoose from 'mongoose';

const releaseManifestSchema = new mongoose.Schema({
    schemaVersion: {
        type: String,
        default: '1.0.0',
        immutable: true
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true,
        index: true,
        immutable: true
    },
    repositoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        immutable: true,
      index: true,
    },
    configSnapshotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConfigSnapshot',
        required: true,
        immutable: true,
      index: true,
    },
    buildManifestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BuildManifest',
        default: null,
        immutable: true,
      index: true,
    },
    imageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
        default: null,
        immutable: true,
      index: true,
    },
    environmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Environment',
        default: null,
        immutable: true,
      index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true,
      index: true,
    },
    // Any extra metadata needed to deterministically reproduce the release
    strategyParameters: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        immutable: true
    }
}, {
    timestamps: true
});

// History queries - list manifests for an application
releaseManifestSchema.index({ applicationId: 1, createdAt: -1 });

export default mongoose.model('ReleaseManifest', releaseManifestSchema);
