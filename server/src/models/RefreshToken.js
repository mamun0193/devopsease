import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
        },
        deviceId: {
            type: String,
            required: true,
        },
        familyId: {
            type: String,
            required: true,
            index: true,
        },
        userAgent: {
            type: String,
        },
        ipAddress: {
            type: String,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        revoked: {
            type: Boolean,
            default: false,
        },
        revokedAt: {
            type: Date,
        },
        replacedByTokenHash: {
            type: String,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { versionKey: false }
);

// TTL index for auto-cleanup. 
// expireAfterSeconds: 0 means the document expires at the time specified in expiresAt.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RefreshToken", refreshTokenSchema);
