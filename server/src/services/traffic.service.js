import TrafficPolicy from '../models/trafficPolicy.model.js';
import TrafficRule from '../models/trafficRule.model.js';
import RoutingTable from '../models/routingTable.model.js';
import Release from '../models/release.model.js';
import Application from '../models/application.model.js';
import releaseEvents from '../events/release.events.js';
import logger from '../utils/logger.js';

class TrafficService {
    /**
     * Create or update a traffic policy and automatically compute rules & routing table.
     */
    async applyTrafficPolicy(applicationId, userId, mode, targets, reason = 'User initiated policy update') {
        let policy = await TrafficPolicy.findOne({ applicationId });
        
        if (!policy) {
            policy = new TrafficPolicy({ applicationId, userId });
        }
        
        policy.mode = mode;
        policy.targets = targets;
        policy.explainabilityLog.push({
            decision: 'POLICY_UPDATED',
            trigger: 'USER_COMMAND',
            actor: String(userId),
            reason: `Policy updated to ${mode} mode. Reason: ${reason}`
        });
        
        await policy.save();

        // Immediately compute the rules
        await this._computeRulesFromPolicy(policy);
        
        return policy;
    }

    /**
     * Internal: Generate TrafficRules based on the TrafficPolicy
     */
    async _computeRulesFromPolicy(policy) {
        // Simple logic for now: pass through the targets as rules
        // In a real Canary system, this might involve complex calculations.
        const rules = policy.targets.map(t => ({
            releaseId: t.releaseId,
            weight: t.weight
        }));

        let trafficRule = await TrafficRule.findOne({ policyId: policy._id });
        if (!trafficRule) {
            trafficRule = new TrafficRule({
                applicationId: policy.applicationId,
                policyId: policy._id
            });
        }

        trafficRule.rules = rules;
        trafficRule.explainabilityLog.push({
            decision: 'RULES_COMPUTED',
            trigger: 'POLICY_UPDATED',
            actor: 'Platform',
            reason: `Rules recalculated due to policy update.`
        });

        await trafficRule.save();

        // Link the rule to the application (optional but helpful for fast lookups)
        await Application.findByIdAndUpdate(policy.applicationId, {
            trafficPolicyId: policy._id
        });

        // Now compute the Routing Table
        await this._buildRoutingTable(policy.applicationId, trafficRule);
    }

    /**
     * Generate the highly optimized RoutingTable for the Gateway
     */
    async _buildRoutingTable(applicationId, trafficRule) {
        const app = await Application.findById(applicationId);
        if (!app) return;

        const routes = [];

        // For each rule, fetch the release and its deployments
        for (const rule of trafficRule.rules) {
            if (rule.weight <= 0) continue;

            const release = await Release.findById(rule.releaseId).populate('targets');
            if (release && release.status === 'Active' || release.status === 'Promoting') {
                // Find primary deployment or all deployments based on strategy
                // For simplicity, we just route to the first active deployment target
                const activeTarget = release.targets.find(t => t.deploymentId != null);
                if (activeTarget) {
                    routes.push({
                        deploymentId: activeTarget.deploymentId,
                        releaseId: release._id,
                        weight: rule.weight
                    });
                }
            }
        }

        const lastTable = await RoutingTable.findOne({ slug: app.slug }).sort({ version: -1 });
        const newVersion = lastTable ? lastTable.version + 1 : 1;

        const routingTable = await RoutingTable.create({
            slug: app.slug,
            applicationId,
            routes,
            version: newVersion,
            generatedAt: Date.now()
        });

        logger.info(`Routing Table generated`, { slug: app.slug, version: newVersion, routes: routes.length });
        
        // Let the gateway know to invalidate its cache
        releaseEvents.emitDomainEvent('ROUTING_TABLE_UPDATED', { slug: app.slug, version: newVersion }, 'Application', applicationId);
        releaseEvents.emitDomainEvent('TRAFFIC_SWITCH_COMPLETED', { slug: app.slug }, 'Application', applicationId);
    }
}

export default new TrafficService();
