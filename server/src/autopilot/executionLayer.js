import * as deploymentService from '../services/deployment.service.js';
import trafficService from '../services/traffic.service.js';
import Deployment from '../models/deployment.model.js';
import TrafficPolicy from '../models/trafficPolicy.model.js';
import logger from '../utils/logger.js';

// Autopilot Execution Layer

class ExecutionLayer {
    async executeDecision(decision) {
        if (!decision) return;

        try {
            logger.info(`[Autopilot] Executing decision`, { type: decision.type, action: decision.action });

            switch (decision.type) {
                case 'SCALING':
                    await this._executeScaling(decision);
                    break;
                case 'TRAFFIC':
                    await this._executeTrafficShift(decision);
                    break;
                case 'HEALING':
                    await this._executeHealing(decision);
                    break;
                default:
                    logger.warn(`[Autopilot] Unknown decision type: ${decision.type}`);
            }
        } catch (error) {
            logger.error(`[Autopilot] Failed to execute decision`, {
                decision,
                error: error.message
            });
            throw error; // Re-throw for orchestrator to handle
        }
    }

    async _executeScaling(decision) {
        // Find the active deployment for this application to scale
        const deployments = await Deployment.find({ applicationId: decision.applicationId, status: 'running' }).sort({ createdAt: -1 }).limit(1);
        if (deployments.length === 0) {
            logger.warn(`[Autopilot] No active deployment found for app ${decision.applicationId} to scale`);
            return;
        }
        
        const targetDeployment = deployments[0];
        
        // Use the existing scale API
        await deploymentService.scaleDeployment(targetDeployment._id, decision.desiredReplicas);
        logger.info(`[Autopilot] Scaled deployment ${targetDeployment._id} to ${decision.desiredReplicas}`);
    }

    async _executeTrafficShift(decision) {
        const policy = await TrafficPolicy.findById(decision.policyId);
        if (!policy) return;

        if (decision.action === 'SHIFT_TRAFFIC' || decision.action === 'ROLLBACK') {
            // Update the canary weight, and adjust primary weight accordingly (assuming 2 targets)
            const canary = policy.targets[decision.targetIndex];
            const primary = policy.targets[0];

            canary.weight = decision.desiredWeight;
            primary.weight = 100 - decision.desiredWeight;

            // Apply via the traffic service which also rebuilds routing table
            await trafficService.applyTrafficPolicy(
                policy.applicationId, 
                policy.userId, // keep original user as actor, or platform
                policy.mode, 
                policy.targets, 
                `Autonomous Action: ${decision.reason}`
            );

            // Update autonomous config last shift time
            policy.autonomousConfig.lastShiftAt = new Date();
            await policy.save();
        }
    }

    async _executeHealing(decision) {
        if (decision.action === 'RESTART_REPLICAS') {
            const deployments = await Deployment.find({ applicationId: decision.applicationId, status: 'running' }).sort({ createdAt: -1 }).limit(1);
            if (deployments.length === 0) return;
            
            // Re-trigger the deployment to restart containers
            // This is a simplistic implementation of self-healing for demonstration.
            await deploymentService.triggerDeploymentReconciliation(deployments[0]._id);
            logger.info(`[Autopilot] Triggered reconciliation for self-healing on app ${decision.applicationId}`);
        }
    }
}

export default new ExecutionLayer();
