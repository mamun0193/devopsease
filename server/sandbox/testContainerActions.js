import {
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  getContainerState,
} from "../src/docker/containerActions.js";

/**
 * Test Container Actions
 * 
 * Usage:
 * 1. Make sure you have a Docker container running
 * 2. Replace 'TEST_CONTAINER_ID' with your actual container ID or name
 * 3. Run: node sandbox/testContainerActions.js
 */

const TEST_CONTAINER_ID = process.argv[2] || "TEST_CONTAINER_ID";

async function testContainerActions() {
  console.log("🧪 Testing Container Actions");
  console.log("=" .repeat(50));
  console.log(`Target Container: ${TEST_CONTAINER_ID}\n`);

  try {
    // Test 1: Get Container State
    console.log("📊 Test 1: Get Container State");
    console.log("-".repeat(50));
    const state = await getContainerState(TEST_CONTAINER_ID);
    if (!state) {
      console.log("❌ Container not found!");
      console.log("\n💡 Usage: node sandbox/testContainerActions.js <container-id>");
      console.log("   Example: node sandbox/testContainerActions.js my-nginx\n");
      return;
    }
    console.log("✅ Container State:");
    console.log(JSON.stringify(state, null, 2));
    console.log("");

    // Store initial state
    const initialState = state.state;

    // Test 2: Stop Container (if running)
    if (state.running) {
      console.log("🛑 Test 2: Stop Container");
      console.log("-".repeat(50));
      const stopResult = await stopContainer(TEST_CONTAINER_ID);
      console.log(`Status: ${stopResult.statusCode} ${stopResult.success ? "✅" : "❌"}`);
      console.log(`Message: ${stopResult.message}`);
      console.log("Data:", JSON.stringify(stopResult.data, null, 2));
      console.log("");

      // Wait a moment for state to settle
      await sleep(2000);
    } else {
      console.log("⏭️  Test 2: Skipped (container not running)");
      console.log("");
    }

    // Test 3: Try to stop again (should fail - already stopped)
    console.log("🛑 Test 3: Stop Already-Stopped Container (Should Fail)");
    console.log("-".repeat(50));
    const stopAgainResult = await stopContainer(TEST_CONTAINER_ID);
    console.log(`Status: ${stopAgainResult.statusCode} ${stopAgainResult.success ? "✅" : "❌"}`);
    console.log(`Message: ${stopAgainResult.message}`);
    console.log("Data:", JSON.stringify(stopAgainResult.data, null, 2));
    console.log("");

    // Test 4: Start Container
    console.log("▶️  Test 4: Start Container");
    console.log("-".repeat(50));
    const startResult = await startContainer(TEST_CONTAINER_ID);
    console.log(`Status: ${startResult.statusCode} ${startResult.success ? "✅" : "❌"}`);
    console.log(`Message: ${startResult.message}`);
    console.log("Data:", JSON.stringify(startResult.data, null, 2));
    console.log("");

    // Wait for container to start
    await sleep(2000);

    // Test 5: Try to start again (should fail - already running)
    console.log("▶️  Test 5: Start Already-Running Container (Should Fail)");
    console.log("-".repeat(50));
    const startAgainResult = await startContainer(TEST_CONTAINER_ID);
    console.log(`Status: ${startAgainResult.statusCode} ${startAgainResult.success ? "✅" : "❌"}`);
    console.log(`Message: ${startAgainResult.message}`);
    console.log("Data:", JSON.stringify(startAgainResult.data, null, 2));
    console.log("");

    // Test 6: Restart Container
    console.log("🔄 Test 6: Restart Container");
    console.log("-".repeat(50));
    const restartResult = await restartContainer(TEST_CONTAINER_ID);
    console.log(`Status: ${restartResult.statusCode} ${restartResult.success ? "✅" : "❌"}`);
    console.log(`Message: ${restartResult.message}`);
    console.log("Data:", JSON.stringify(restartResult.data, null, 2));
    console.log("");

    // Wait for restart to complete
    await sleep(2000);

    // Test 7: Try to remove running container (should fail without force)
    console.log("🗑️  Test 7: Remove Running Container Without Force (Should Fail)");
    console.log("-".repeat(50));
    const removeNoForceResult = await removeContainer(TEST_CONTAINER_ID, false);
    console.log(`Status: ${removeNoForceResult.statusCode} ${removeNoForceResult.success ? "✅" : "❌"}`);
    console.log(`Message: ${removeNoForceResult.message}`);
    console.log("Data:", JSON.stringify(removeNoForceResult.data, null, 2));
    console.log("");

    // Test 8: Test non-existent container
    console.log("❓ Test 8: Test Non-Existent Container");
    console.log("-".repeat(50));
    const fakeResult = await startContainer("non-existent-container-12345");
    console.log(`Status: ${fakeResult.statusCode} ${fakeResult.success ? "✅" : "❌"}`);
    console.log(`Message: ${fakeResult.message}`);
    console.log("");

    // Final state check
    console.log("📊 Final: Check Container State");
    console.log("-".repeat(50));
    const finalState = await getContainerState(TEST_CONTAINER_ID);
    console.log("✅ Final Container State:");
    console.log(JSON.stringify(finalState, null, 2));
    console.log("");

    // Summary
    console.log("=" .repeat(50));
    console.log("✅ All Tests Completed!");
    console.log(`Initial State: ${initialState}`);
    console.log(`Final State: ${finalState.state}`);
    console.log("");
    console.log("💡 Note: Container was NOT removed during testing");
    console.log("   To test removal, manually run:");
    console.log(`   - Stop: await stopContainer("${TEST_CONTAINER_ID}")`);
    console.log(`   - Remove: await removeContainer("${TEST_CONTAINER_ID}", false)`);
    
  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error("\nStack Trace:");
    console.error(error.stack);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run tests
testContainerActions();
