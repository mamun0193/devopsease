import ScalingPolicy from '../models/scalingPolicy.model.js';
import TrafficPolicy from '../models/trafficPolicy.model.js';
import Deployment from '../models/deployment.model.js';
import * as platformHealthService from '../observability/platformHealth.service.js';
import metricsRegistry from '../observability/metricsRegistry.js';
import platformEventBus from '../events/platformEventBus.js';
import scalingEngine from './scalingEngine.js';
import trafficEngine from './trafficEngine.js';
import healingEngine from './healingEngine.js';
import executionLayer from './executionLayer.js';
import logger from '../utils/logger.js';

//Autopilot Orchestrator

class AutopilotService {
    async evaluate() {
        const now = Date.now();
        
        // 1. Evaluate Scaling Policies
        const dueScalingPolicies = await ScalingPolicy.find({ 
            enabled: true, 
            nextEvaluationAt: { $lte: now } 
        });

        for (const policy of dueScalingPolicies) {
            await this._evaluateScalingPolicy(policy, now);
        }

        // 2. Evaluate Traffic Policies (Canary progression)
        const dueTrafficPolicies = await TrafficPolicy.find({
            'autonomousConfig.enabled': true,
            'autonomousConfig.nextEvaluationAt': { $lte: now }
        });

        for (const policy of dueTrafficPolicies) {
            await this._evaluateTrafficPolicy(policy, now);
        }
    }

    async _evaluateScalingPolicy(policy, now) {
        try {
            // Find current replicas and basic metrics
            const deployments = await Deployment.find({ applicationId: policy.applicationId, status: 'running' }).sort({ createdAt: -1 }).limit(1);
            if (deployments.length === 0) return; // Nothing to scale

            const currentReplicas = deployments[0].desiredReplicas || 1;
            
            // For a production system, we'd fetch actual aggregated container metrics across replicas.
            // Using a simplified mock fetch here for demonstration.
            const cpuPercent = this._getMockMetricForApp(policy.applicationId, 'cpu');
            const memoryPercent = this._getMockMetricForApp(policy.applicationId, 'memory');

            const currentMetrics = { currentReplicas, cpuPercent, memoryPercent };

            const decision = scalingEngine.evaluate(policy, currentMetrics);

            if (decision) {
                // Execute
                await executionLayer.executeDecision(decision);

                // Update policy metadata
                policy.lastScaledAt = now;
                
                // Explainability Log
                policy.explainabilityLog = policy.explainabilityLog || [];
                policy.explainabilityLog.push({
                    decision: decision.action,
                    trigger: 'AUTOPILOT_ENGINE',
                    actor: 'System',
                    reason: decision.reason,
                    confidence: decision.confidence,
                    relatedResource: { type: 'Deployment', id: deployments[0]._id.toString() }
                });

                // Emit Domain Event for Platform Observability
                platformEventBus.emitEvent({
                    domain: 'SCHEDULER',
                    eventType: 'AUTONOMOUS_SCALING',
                    severity: 'INFO',
                    applicationId: policy.applicationId,
                    summary: `Autopilot scaled app to ${decision.desiredReplicas} replicas`,
                    resourceType: 'Deployment',
                    resourceId: deployments[0]._id.toString(),
                    explanation: {
                        reason: decision.reason,
                        rootCauses: [`CPU load triggered scale ${decision.action}`],
                        confidence: decision.confidence,
                        recommendations: []
                    }
                });
            }

            // Schedule next evaluation
            policy.nextEvaluationAt = new Date(now + 15000); // evaluate every 15s
            await policy.save();

        } catch (error) {
            logger.error(`[Autopilot] Error evaluating scaling policy ${policy._id}`, error);
        }
    }

    async _evaluateTrafficPolicy(policy, now) {
        try {
            const health = await platformHealthService.getApplicationHealth(policy.applicationId);
            const decision = trafficEngine.evaluate(policy, health);

            if (decision && decision.action !== 'SKIP') {
                await executionLayer.executeDecision(decision);

                policy.explainabilityLog = policy.explainabilityLog || [];
                policy.explainabilityLog.push({
                    decision: decision.action,
                    trigger: 'AUTOPILOT_ENGINE',
                    actor: 'System',
                    reason: decision.reason,
                    confidence: decision.confidence,
                    relatedResource: { type: 'Application', id: String(policy.applicationId) }
                });

                platformEventBus.emitEvent({
                    domain: 'SCHEDULER',
                    eventType: 'AUTONOMOUS_TRAFFIC_SHIFT',
                    severity: decision.action === 'ROLLBACK' ? 'WARNING' : 'INFO',
                    applicationId: policy.applicationId,
                    summary: `Autopilot ${decision.action} traffic weight`,
                    resourceType: 'TrafficPolicy',
                    resourceId: policy._id.toString(),
                    explanation: {
                        reason: decision.reason,
                        rootCauses: [`Health score ${health.score}`],
                        confidence: decision.confidence,
                        recommendations: []
                    }
                });
            }

            // Schedule next evaluation
            policy.autonomousConfig.nextEvaluationAt = new Date(now + 15000);
            await policy.save();

            // Check Self Healing
            const healDecision = healingEngine.evaluate(policy.applicationId, health);
            if (healDecision && healDecision.action !== 'ALERT_ONLY') {
                await executionLayer.executeDecision(healDecision);
                // Also emit event
                platformEventBus.emitEvent({
                    domain: 'SCHEDULER',
                    eventType: 'AUTONOMOUS_HEALING',
                    severity: 'ERROR',
                    applicationId: policy.applicationId,
                    summary: `Autopilot triggered self-healing: ${healDecision.action}`,
                    resourceType: 'Application',
                    resourceId: policy.applicationId.toString(),
                    explanation: {
                        reason: healDecision.reason,
                        rootCauses: [],
                        confidence: healDecision.confidence,
                        recommendations: []
                    }
                });
            }

        } catch (error) {
            logger.error(`[Autopilot] Error evaluating traffic policy ${policy._id}`, error);
        }
    }

    // Helper for demo purposes
    _getMockMetricForApp(appId, type) {
        // In reality, this reads from GlobalMetricsCollector or prometheus query
        // We return a jittered baseline to simulate load.
        return Math.floor(Math.random() * 40) + 40; // 40-80%
    }
}

export default new AutopilotService();
