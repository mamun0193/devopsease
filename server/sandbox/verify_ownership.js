import mongoose from 'mongoose';
import { ownershipGuard } from '../src/middlewares/ownershipGuard.js';
import ownershipService from '../src/services/ownership.service.js';
import SecurityLog from '../src/models/SecurityLog.js';
import ContainerOwnership from '../src/models/ContainerOwnership.js';
import logger from '../src/utils/logger.js';
import dotenv from 'dotenv';

dotenv.config(); // Load env vars

// Mock dependencies
const mockReq = (userId, role, params = {}) => ({
    user: { _id: userId, role },
    params,
    ip: '127.0.0.1',
    get: () => 'MockAgent'
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

const mockNext = (err) => {
    if (err) throw err;
};

async function runVerification() {
    console.log("🔒 Starting Day 33 Verification...");

    try {
        // Connect to Test DB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Setup Test Data
        const userA = new mongoose.Types.ObjectId();
        const userB = new mongoose.Types.ObjectId();
        const containerA = 'test-container-A-' + Date.now();
        const containerB = 'test-container-B-' + Date.now();

        // Register ownership
        await ContainerOwnership.create([
            { ownerId: userA, containerId: containerA, status: 'active' },
            { ownerId: userB, containerId: containerB, status: 'active' }
        ]);
        console.log("✅ Test data created");

        // Test Case 1: User A accesses owned Container A
        console.log("Testing: User A accesses Container A (Expected: Success)");
        const req1 = mockReq(userA, 'viewer', { id: containerA });
        const res1 = mockRes();
        let passed1 = false;
        await ownershipGuard('test_action')(req1, res1, () => { passed1 = true; });

        if (passed1) console.log("✅ PASS: User A accessed owned container");
        else console.error("❌ FAIL: User A blocked from owned container");

        // Test Case 2: User A accesses Foreign Container B
        console.log("Testing: User A accesses Container B (Expected: 403 Forbidden)");
        const req2 = mockReq(userA, 'viewer', { id: containerB });
        const res2 = mockRes();
        try {
            await ownershipGuard('test_action')(req2, res2, (err) => {
                if (err) throw err; // Should throw AppError
            });
            console.error("❌ FAIL: User A allowed to access foreign container");
        } catch (err) {
            if (err.statusCode === 403) console.log("✅ PASS: User A correctly blocked (403)");
            else console.error(`❌ FAIL: Unexpected error code ${err.statusCode}`);
        }

        // Test Case 3: Verify Security Log
        const log = await SecurityLog.findOne({
            userId: userA,
            containerId: containerB,
            action: 'test_action',
            result: 'denied'
        });

        if (log) console.log("✅ PASS: Security log entry found");
        else console.error("❌ FAIL: Security log entry missing");

        // Test Case 4: Admin Bypass
        console.log("Testing: Admin accesses Container B (Expected: Success)");
        const req3 = mockReq(new mongoose.Types.ObjectId(), 'admin', { id: containerB });
        let passed2 = false;
        await ownershipGuard('test_action')(req3, null, () => { passed2 = true; });

        if (passed2) console.log("✅ PASS: Admin bypass successful");
        else console.error("❌ FAIL: Admin blocked");

    } catch (error) {
        console.error("❌ Verification Failed:", error);
    } finally {
        await mongoose.connection.close();
        console.log("🏁 Verification finished");
    }
}

runVerification();
