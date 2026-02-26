import mongoose from 'mongoose';

const dockerHubSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    encryptedPassword: {
        type: String,
        required: true,
        select: false // Never returned in accidental .find() results
    }
}, {
    timestamps: true
});

// One credential per user
dockerHubSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('DockerHubCredential', dockerHubSchema);
