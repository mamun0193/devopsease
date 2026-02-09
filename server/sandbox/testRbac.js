import { execSync } from "child_process";

const API_URL = "http://localhost:4000";
const TEST_CONTAINER_NAME = "rbac-sandbox-test";

async function runTests() {
    console.log("🧪 Starting RBAC Verification Tests...");

    // 1. Setup: Create a test container
    console.log(`\n🐳 Creating test container: ${TEST_CONTAINER_NAME}...`);
    try {
        execSync(`docker run -d --rm --name ${TEST_CONTAINER_NAME} alpine sleep 300`, { stdio: 'ignore' });
        console.log("✅ Container started.");
    } catch (error) {
        console.error("❌ Failed to start test container. Is Docker running?");
        process.exit(1);
    }

    // Get Container ID (optional, but good for logs)
    const containerId = execSync(`docker ps -aqf "name=${TEST_CONTAINER_NAME}"`).toString().trim();
    console.log(`ℹ️  Container ID: ${containerId}`);

    // 2. Test Viewer Role (Should Fail)
    console.log("\n🔍 Testing Role: VIEWER (Expect 403)...");
    try {
        const response = await fetch(`${API_URL}/containers/${containerId}/stop`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-user-role": "viewer"
            }
        });

        if (response.status === 403) {
            console.log("✅ SUCCESS: Viewer blocked (403 Forbidden)");
        } else {
            console.error(`❌ FAILURE: Viewer NOT blocked. Status: ${response.status}`);
            const data = await response.json();
            console.log("Response:", data);
        }
    } catch (error) {
        console.error("❌ Request Failed:", error.message);
    }

    // 3. Test Operator Role (Should Succeed)
    console.log("\n🔍 Testing Role: OPERATOR (Expect 200)...");
    try {
        const response = await fetch(`${API_URL}/containers/${containerId}/stop`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-user-role": "operator"
            }
        });

        if (response.status === 200) {
            console.log("✅ SUCCESS: Operator allowed (200 OK)");
        } else {
            console.error(`❌ FAILURE: Operator action failed. Status: ${response.status}`);
            const data = await response.json();
            console.log("Response:", data);
        }
    } catch (error) {
        console.error("❌ Request Failed:", error.message);
    }

    // 4. Cleanup
    console.log("\n🧹 Cleaning up...");
    try {
        execSync(`docker rm -f ${TEST_CONTAINER_NAME}`, { stdio: 'ignore' });
        console.log("✅ Test container removed.");
    } catch (e) {
        // Ignore if already removed or failed
    }

    console.log("\n✨ Verification Complete.");
}

runTests();
