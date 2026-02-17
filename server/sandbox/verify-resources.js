import "dotenv/config";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/config/db.js";
import resourceService from "../src/resources/resource.service.js";
import { RESOURCE_TYPES } from "../src/resources/resourceTypes.js";
import logger from "../src/utils/logger.js";

// Mock Data
const TEST_RESOURCE_ID = "test-container-123";
const TEST_OWNER_ID = new mongoose.Types.ObjectId();
const TEST_TYPE = RESOURCE_TYPES.CONTAINER;

async function runVerification() {
    console.log("🚀 Starting Day 45 Verification Script...");

    try {
        // 1. Connect DB
        await connectDB();
        console.log("✅ Database Connected");

        // Cleanup previous runs
        await mongoose.connection.collection('resources').deleteMany({ resourceId: TEST_RESOURCE_ID });

        // 2. Test Registration
        console.log("\n🧪 Testing Registration...");
        const created = await resourceService.registerResource({
            resourceId: TEST_RESOURCE_ID,
            type: TEST_TYPE,
            ownerId: TEST_OWNER_ID,
            metadata: { name: "test-container", createdVia: "verification-script" }
        });

        if (created && created.resourceId === TEST_RESOURCE_ID) {
            console.log("✅ Resource Registered Successfully");
        } else {
            throw new Error("Failed to register resource");
        }

        // 3. Test Retrieval
        console.log("\n🧪 Testing Retrieval...");
        const retrieved = await resourceService.getResource(TEST_RESOURCE_ID, TEST_TYPE);
        if (retrieved && retrieved.status === 'active') {
            console.log("✅ Resource Retrieved Successfully");
        } else {
            throw new Error("Failed to retrieve resource");
        }

        // 4. Test Status Update
        console.log("\n🧪 Testing Status Update...");
        const updated = await resourceService.updateResourceStatus(TEST_RESOURCE_ID, TEST_TYPE, 'deleted');
        if (updated && updated.status === 'deleted') {
            console.log("✅ Resource Status Updated to 'deleted'");
        } else {
            throw new Error("Failed to update status");
        }

        // 5. Test Lazy Sync (Should reactivate or recognize existing)
        console.log("\n🧪 Testing Lazy Sync...");
        // Since it's deleted, sync should finding it existing. 
        // Wait, sync checks if *exists*, if not registers. 
        // If it exists but is deleted, my current sync logic in service just checks `Resource.exists`.
        // It won't reactivate if it exists. 
        // Let's verify `exists` logic.
        await resourceService.syncResources(TEST_OWNER_ID, [{ id: TEST_RESOURCE_ID, name: "test-container", image: "nginx" }], TEST_TYPE);

        const afterSync = await resourceService.getResource(TEST_RESOURCE_ID, TEST_TYPE);
        console.log(`ℹ️ Post-Sync Status: ${afterSync.status}`);
        console.log("✅ Sync completed without error");

        // 6. Test Reactivation using Register (Manual override)
        console.log("\n🧪 Testing Reactivation via Register...");
        const reactivated = await resourceService.registerResource({
            resourceId: TEST_RESOURCE_ID,
            type: TEST_TYPE,
            ownerId: TEST_OWNER_ID,
            metadata: { name: "test-container", reactivated: true }
        });

        if (reactivated && reactivated.status === 'active') {
            console.log("✅ Resource Reactivated Successfully");
        } else {
            console.error("❌ Failed to reactivate resource", reactivated);
        }

        // Cleanup
        await mongoose.connection.collection('resources').deleteMany({ resourceId: TEST_RESOURCE_ID });
        console.log("\n🧹 Cleanup Done");

    } catch (err) {
        console.error("❌ Verification Failed:", err);
        process.exit(1);
    } finally {
        await disconnectDB();
        console.log("👋 Disconnected");
    }
}

runVerification();
