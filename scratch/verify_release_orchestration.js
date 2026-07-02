import mongoose from 'mongoose';
import ReleaseManifest from '../server/src/models/releaseManifest.model.js';
import Release from '../server/src/models/release.model.js';
import TrafficPolicy from '../server/src/models/trafficPolicy.model.js';
import TrafficRule from '../server/src/models/trafficRule.model.js';
import RoutingTable from '../server/src/models/routingTable.model.js';
import Application from '../server/src/models/application.model.js';

async function testModels() {
    try {
        console.log("Compiling models...");
        // Ensure no syntax errors by initializing them
        if (ReleaseManifest && Release && TrafficPolicy && TrafficRule && RoutingTable && Application) {
            console.log("All Release Orchestration models compiled successfully!");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testModels();
