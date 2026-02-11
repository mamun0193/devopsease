import mongoose from 'mongoose';
import { canPerform, ROLES, ACTIONS } from '../src/config/permissions.js';
import ownershipService from '../src/services/ownership.service.js';
import ContainerOwnership from '../src/models/ContainerOwnership.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load Env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI

async function verifyRBAC() {
    console.log("🔒 Starting Day 35 RBAC Verification...");

    try {
        await mongoose.connect(MONGO_URI);
        console.log("   ✅ Connected to MongoDB");

        // --- TEST 1: Pure Function Logic (Unit Test) ---
        console.log("\n🧪 Test 1: Permission Matrix Logic (Unit)");

        const scenarios = [
            // Viewer
            { role: ROLES.VIEWER, owns: true, action: ACTIONS.READ, expected: true },
            { role: ROLES.VIEWER, owns: false, action: ACTIONS.READ, expected: false },
            { role: ROLES.VIEWER, owns: true, action: ACTIONS.OPERATE, expected: false },
            { role: ROLES.VIEWER, owns: true, action: ACTIONS.DESTRUCTIVE, expected: false },

            // Operator
            { role: ROLES.OPERATOR, owns: true, action: ACTIONS.READ, expected: true },
            { role: ROLES.OPERATOR, owns: true, action: ACTIONS.OPERATE, expected: true },
            { role: ROLES.OPERATOR, owns: false, action: ACTIONS.OPERATE, expected: false },
            { role: ROLES.OPERATOR, owns: true, action: ACTIONS.DESTRUCTIVE, expected: false },

            // Admin
            { role: ROLES.ADMIN, owns: false, action: ACTIONS.READ, expected: true },
            { role: ROLES.ADMIN, owns: false, action: ACTIONS.OPERATE, expected: true },
            { role: ROLES.ADMIN, owns: false, action: ACTIONS.DESTRUCTIVE, expected: true },
        ];

        let failed = false;
        scenarios.forEach((s, i) => {
            const result = canPerform({ role: s.role, ownsResource: s.owns, actionType: s.action });
            if (result !== s.expected) {
                console.error(`   ❌ Scenario ${i} Failed: Role=${s.role} Owns=${s.owns} Action=${s.action} Expected=${s.expected} Got=${result}`);
                failed = true;
            }
        });

        if (!failed) console.log("   ✅ All Matrix Logic Scenarios Passed");

        // --- TEST 2: Integration Mock (Simulating Middleware) ---
        console.log("\n🧪 Test 2: Integration Logic (Mocking Middleware)");

        // Setup IDs with Randomness to avoid collisions
        const rand = Math.floor(Math.random() * 1000000);
        const viewerId = new mongoose.Types.ObjectId();
        const operatorId = new mongoose.Types.ObjectId();
        const adminId = new mongoose.Types.ObjectId();

        const viewerContainer = `c-viewer-${Date.now()}-${rand}`;
        const operatorContainer = `c-operator-${Date.now()}-${rand}`;

        console.log(`   ... Creating ownerships for Viewer=${viewerId}, Operator=${operatorId}`);
        await ContainerOwnership.create([
            { ownerId: viewerId, containerId: viewerContainer, status: 'active' },
            { ownerId: operatorId, containerId: operatorContainer, status: 'active' }
        ]);
        console.log("   ... Ownerships created successfully");

        // Helper to simulate request flow
        const simulateRequest = async (user, action, targetContainerId, expectedStatus) => {
            let status = 200;
            let ownsResource = false;
            let guardPassed = false;

            // 1. Ownership Guard Logic
            if (user.role === 'admin') {
                guardPassed = true;
                ownsResource = false;
            } else {
                try {
                    const hasAccess = await ownershipService.hasOwnership(user._id, targetContainerId);
                    if (hasAccess) {
                        guardPassed = true;
                        ownsResource = true;
                    } else {
                        status = 403; // Ownership Block
                    }
                } catch (err) {
                    console.error("   ❌ Ownership Check Error:", err.message);
                    status = 500;
                }
            }

            // 2. RBAC Logic (if guard passed)
            if (guardPassed) {
                const allowed = canPerform({ role: user.role, ownsResource, actionType: action });
                if (!allowed) status = 403; // RBAC Block
            }

            const targetName = (targetContainerId === user.owned) ? 'OWNED' : 'FOREIGN';
            if (status === expectedStatus) {
                console.log(`   ✅ ${user.role.toUpperCase()} ${action} on ${targetName} -> ${status} (Expected)`);
            } else {
                console.error(`   ❌ ${user.role.toUpperCase()} ${action} on ${targetName} -> Got ${status}, Expected ${expectedStatus}`);
            }
        };

        // Users
        const viewer = { _id: viewerId, role: ROLES.VIEWER, owned: viewerContainer };
        const operator = { _id: operatorId, role: ROLES.OPERATOR, owned: operatorContainer };
        const admin = { _id: adminId, role: ROLES.ADMIN, owned: null };

        // Run Simulations
        console.log("   ... Simulating Viewer Requests");
        await simulateRequest(viewer, ACTIONS.READ, viewerContainer, 200);
        await simulateRequest(viewer, ACTIONS.OPERATE, viewerContainer, 403); // RBAC Deny
        await simulateRequest(viewer, ACTIONS.DESTRUCTIVE, viewerContainer, 403); // RBAC Deny
        await simulateRequest(viewer, ACTIONS.READ, operatorContainer, 403); // Ownership Deny

        console.log("   ... Simulating Operator Requests");
        await simulateRequest(operator, ACTIONS.READ, operatorContainer, 200);
        await simulateRequest(operator, ACTIONS.OPERATE, operatorContainer, 200);
        await simulateRequest(operator, ACTIONS.DESTRUCTIVE, operatorContainer, 403); // RBAC Deny
        await simulateRequest(operator, ACTIONS.OPERATE, viewerContainer, 403); // Ownership Deny (CRITICAL DAY 35 REQ)

        console.log("   ... Simulating Admin Requests");
        await simulateRequest(admin, ACTIONS.READ, viewerContainer, 200);
        await simulateRequest(admin, ACTIONS.OPERATE, viewerContainer, 200);
        await simulateRequest(admin, ACTIONS.DESTRUCTIVE, viewerContainer, 200);

        // Cleanup
        console.log("   ... Cleaning up");
        await ContainerOwnership.deleteMany({ ownerId: { $in: [viewerId, operatorId] } });
        console.log("   ✅ Cleanup Done");

    } catch (error) {
        console.error("❌ Verification Failed:", error);
    } finally {
        await mongoose.connection.close();
        console.log("🔒 Verification Complete");
    }
}

verifyRBAC();
