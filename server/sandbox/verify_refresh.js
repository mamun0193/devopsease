
import mongoose from "mongoose";
import { generateRefreshToken, rotateRefreshToken, verifyRefreshToken, revokeSessionFamily } from "../src/utils/jwt.js";
import User from "../src/models/User.js";
import RefreshToken from "../src/models/RefreshToken.js";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = "mongodb://127.0.0.1:27017/devopsease";

async function verifyRefreshLogic() {
    console.log("🧪 Starting Refresh Logic Verification...");

    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        // cleanup
        await User.deleteMany({ primaryEmail: "test_refresh@example.com" });
        await RefreshToken.deleteMany({}); // Dangerous in prod, safe in sandbox

        // 1. Create User
        const user = await User.create({
            primaryEmail: "test_refresh@example.com",
            role: "viewer",
            plan: "free"
        });
        console.log("✅ Created Test User:", user._id);

        // 2. Generate Refresh Token
        console.log("\n--- Testing Generation ---");
        const token1 = await generateRefreshToken(user, "127.0.0.1", "test-agent");
        console.log("✅ Generated Token 1");

        // Verify it exists in DB
        const doc1 = await verifyRefreshToken(token1);
        if (!doc1) throw new Error("Token 1 not found in DB");
        console.log("✅ Verified Token 1 in DB. Expires:", doc1.expiresAt);

        // 3. Rotate Token
        console.log("\n--- Testing Rotation ---");
        const token2 = await rotateRefreshToken(doc1, "127.0.0.1", "test-agent");
        console.log("✅ Rotated to Token 2");

        // Verify Token 1 is revoked
        const doc1Revoked = await RefreshToken.findById(doc1._id);
        if (!doc1Revoked.revoked) throw new Error("Token 1 should be revoked");
        if (doc1Revoked.replacedByTokenHash) console.log("✅ Token 1 replaced by new hash");

        // Verify Token 2 exists and has SAME expiry
        const doc2 = await verifyRefreshToken(token2);
        if (doc2.expiresAt.getTime() !== doc1.expiresAt.getTime()) {
            throw new Error("Token 2 expiry should match Token 1 (Absolute Lifetime)");
        }
        console.log("✅ Token 2 inherits absolute expiry");

        // 4. Reuse Detection
        console.log("\n--- Testing Reuse Detection ---");
        // Try to rotate Token 1 again (Replay attack)
        console.log("⚠️ Simulating Attack: Reusing Token 1...");

        // In real controller, we check doc.revoked.
        if (doc1Revoked.revoked) {
            console.log("✅ Detected Token 1 is revoked. Triggering Family Revocation...");
            await revokeSessionFamily(doc1Revoked.familyId);
        }

        // Verify Token 2 is NOW revoked
        const doc2Revoked = await RefreshToken.findById(doc2._id);
        if (!doc2Revoked.revoked) throw new Error("Token 2 should be revoked due to family revocation!");
        console.log("✅ Security Success: Entire family revoked upon reuse detection.");

        console.log("\n🎉 ALL TESTS PASSED");

    } catch (err) {
        console.error("❌ Verification Failed:", err);
        process.exit(1);
    } finally {
        // cleanup
        if (mongoose.connection.readyState !== 0) {
            await User.deleteMany({ primaryEmail: "test_refresh@example.com" });
            await RefreshToken.deleteMany({});
            await mongoose.disconnect();
        }
    }
}

verifyRefreshLogic();
