import mongoose from "mongoose";

const loginAttemptSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            unique: true,
            index: true,
        },
        attemptCount: {
            type: Number,
            default: 0,
        },
        lastAttemptAt: {
            type: Date,
            default: Date.now,
        },
        lockUntil: {
            type: Date,
            default: null,
        },
    },
    { versionKey: false }
);

// Auto-cleanup: remove documents 24h after lockUntil expires
loginAttemptSchema.index(
    { lastAttemptAt: 1 },
    { expireAfterSeconds: 86400 }
);

export default mongoose.model("LoginAttempt", loginAttemptSchema);
