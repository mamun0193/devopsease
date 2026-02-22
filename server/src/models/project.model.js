import mongoose from 'mongoose';

const PROJECT_STATUSES = ['CREATED', 'RUNNING', 'STOPPED', 'FAILED'];

const projectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 64
    },
    namespace: {
        type: String,
        required: true,
        trim: true
    },
    composeYaml: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: PROJECT_STATUSES,
        default: 'CREATED',
        index: true
    },
    services: [{
        name: { type: String, required: true },
        containerId: { type: String, required: true },
        image: { type: String, required: true }
    }],
    networks: {
        type: [String],
        default: []
    },
    volumes: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

projectSchema.index({ userId: 1, name: 1 }, { unique: true });

export { PROJECT_STATUSES };
export default mongoose.model('Project', projectSchema);
