import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    oauthProvider: {
        type: String,
        required: true,
        enum: ['github', 'google', 'local'],
    },
    oauthId: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ['viewer', 'operator', 'admin'],
        default: 'viewer',
    },
    plan: {
        type: String,
        enum: ['free', 'paid'],
        default: 'free',
    },
    lastLoginAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true, // adds createdAt and updatedAt
});

// Compound index to ensure unique users per provider
userSchema.index({ oauthProvider: 1, oauthId: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

export default User;
