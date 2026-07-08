import mongoose from 'mongoose';

const PROVIDERS = ['github', 'gitlab', 'bitbucket'];
const REPO_STATUSES = ['active', 'disconnected'];

const repositorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    provider: {
        type: String,
        enum: PROVIDERS,
        default: 'github'
    },
    repoName: {
        type: String,
        required: true,
        trim: true
    },
    owner: {
        type: String,
        required: true,
        trim: true
    },
    cloneUrl: {
        type: String,
        required: true,
        trim: true
    },
    defaultBranch: {
        type: String,
        default: 'main',
        trim: true
    },
    status: {
        type: String,
        enum: REPO_STATUSES,
        default: 'active'
    },
    lastBuildId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Build',
        default: null,
      index: true,
    }
}, {
    timestamps: true
});

repositorySchema.index({ userId: 1, createdAt: -1 });

export { PROVIDERS, REPO_STATUSES };
export default mongoose.model('Repository', repositorySchema);
