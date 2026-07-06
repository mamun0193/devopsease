/**
 * Autopilot Traffic Engine
 * 
 * Determines WHAT should happen regarding traffic shifting (progressive delivery).
 * Pure decision engine: does NOT modify state or call routing APIs.
 */

export class TrafficEngine {
    // Evaluates metrics against traffic policy and returns a shift decision.
    evaluate(policy, health) {
        if (!policy || !policy.autonomousConfig || !policy.autonomousConfig.enabled) return null;
        if (policy.mode !== 'Canary' && policy.mode !== 'BlueGreen') return null;
        
        // Find the "canary" or secondary target. Assume first target is primary, second is canary.
        // In a real robust system, targets would have explicit roles.
        if (!policy.targets || policy.targets.length < 2) return null;
        
        const config = policy.autonomousConfig;
        const now = Date.now();
        
        // 1. Safety Cooldown
        if (config.lastShiftAt && (now - config.lastShiftAt.getTime() < config.cooldownMs)) {
            return null; // Still in observation window
        }

        const primaryTarget = policy.targets[0];
        const canaryTarget = policy.targets[1];
        
        // If Canary is already at 100%, we are done.
        if (canaryTarget.weight >= 100) {
            return null;
        }

        // 2. Data volume check (don't promote if no one is using it)
        const requestVolume = health.metrics?.totalRequests || 0;
        if (requestVolume < config.minRequestVolume) {
            return {
                type: 'TRAFFIC',
                action: 'SKIP',
                reason: `Request volume (${requestVolume}) is below minimum required (${config.minRequestVolume}) for evaluation.`,
                confidence: 0.9,
                timestamp: new Date()
            };
        }

        // 3. Health evaluation
        const currentHealthScore = health.score || 0;
        
        if (currentHealthScore >= config.healthThreshold) {
            // Stable, advance canary
            let newWeight = canaryTarget.weight + config.autoAdvanceStep;
            if (newWeight > 100) newWeight = 100;
            
            return {
                type: 'TRAFFIC',
                action: 'SHIFT_TRAFFIC',
                applicationId: policy.applicationId,
                policyId: policy._id,
                targetIndex: 1, // the canary
                currentWeight: canaryTarget.weight,
                desiredWeight: newWeight,
                reason: `Health score (${currentHealthScore}) is above threshold (${config.healthThreshold}). Advancing canary weight.`,
                confidence: 0.95,
                triggeringMetrics: { healthScore: currentHealthScore, requestVolume },
                timestamp: new Date()
            };
        } else if (currentHealthScore < 50) {
            // Severely degraded, rollback canary
            if (canaryTarget.weight > 0) {
                return {
                    type: 'TRAFFIC',
                    action: 'ROLLBACK',
                    applicationId: policy.applicationId,
                    policyId: policy._id,
                    targetIndex: 1,
                    currentWeight: canaryTarget.weight,
                    desiredWeight: 0,
                    reason: `Health score (${currentHealthScore}) is critically low. Rolling back canary traffic to 0% to protect users.`,
                    confidence: 0.99,
                    triggeringMetrics: { healthScore: currentHealthScore, errorRate: health.metrics?.errorRate },
                    timestamp: new Date()
                };
            }
        }

        return null;
    }
}

export default new TrafficEngine();
