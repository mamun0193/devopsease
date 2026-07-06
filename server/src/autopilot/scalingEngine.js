/**
 * Autopilot Scaling Engine
 * 
 * Determines WHAT should happen regarding application scale.
 * Pure decision engine: does NOT modify state or call deployment APIs.
 */

export class ScalingEngine {
    // Evaluates metrics against policy and returns a scaling decision.

    evaluate(policy, currentMetrics) {
        if (!policy || !policy.enabled) return null;
        if (!currentMetrics || currentMetrics.currentReplicas == null) return null;

        const { currentReplicas, cpuPercent } = currentMetrics;
        const now = Date.now();

        // 1. Safety Cooldown
        if (policy.lastScaledAt && (now - policy.lastScaledAt.getTime() < policy.cooldownMs)) {
            return null; // Still in cooldown
        }

        let desiredReplicas = currentReplicas;
        let reason = '';
        let confidence = 0.0;

        // 2. Extensible Strategy Routing
        switch (policy.strategyType) {
            case 'TargetTracking':
                const result = this._evaluateTargetTracking(policy, currentReplicas, cpuPercent);
                desiredReplicas = result.desiredReplicas;
                reason = result.reason;
                confidence = result.confidence;
                break;
            case 'StepScaling':
                // For future implementation
                break;
            default:
                break;
        }

        // 3. Bounds enforcement
        desiredReplicas = Math.max(policy.minReplicas, Math.min(policy.maxReplicas, desiredReplicas));

        // 4. Decision Generation
        if (desiredReplicas !== currentReplicas) {
            return {
                type: 'SCALING',
                action: desiredReplicas > currentReplicas ? 'SCALE_UP' : 'SCALE_DOWN',
                applicationId: policy.applicationId,
                policyId: policy._id,
                currentReplicas,
                desiredReplicas,
                reason,
                confidence,
                triggeringMetrics: { cpuPercent, memoryPercent: currentMetrics.memoryPercent },
                timestamp: new Date()
            };
        }

        return null;
    }

    _evaluateTargetTracking(policy, currentReplicas, currentCpu) {
        let desired = currentReplicas;
        let reason = '';
        let confidence = 0.0;
        
        const targetCpu = policy.cpuTargetPercent || 70;
        const tolerance = 5; // Don't flap if within 5% of target

        if (currentCpu > (targetCpu + tolerance)) {
            // Need to scale up
            const ratio = currentCpu / targetCpu;
            desired = Math.ceil(currentReplicas * ratio);
            // Hysteresis: cap step size to prevent runaway
            const maxStep = Math.max(1, Math.floor(currentReplicas * 0.5)); // max 50% increase at a time
            if (desired - currentReplicas > maxStep) {
                desired = currentReplicas + maxStep;
            }
            reason = `CPU at ${currentCpu}% exceeds target of ${targetCpu}%. Scaling up to handle load.`;
            confidence = 0.85;
        } else if (currentCpu < (targetCpu - tolerance) && currentReplicas > policy.minReplicas) {
            // Need to scale down
            const ratio = currentCpu / targetCpu;
            desired = Math.max(policy.minReplicas, Math.floor(currentReplicas * ratio));
            // Hysteresis: only scale down by 1 at a time for safety
            if (currentReplicas - desired > 1) {
                desired = currentReplicas - 1;
            }
            reason = `CPU at ${currentCpu}% is below target of ${targetCpu}%. Scaling down to save resources.`;
            confidence = 0.70; // lower confidence for scale down, safety first
        }

        return { desiredReplicas: desired, reason, confidence };
    }
}

export default new ScalingEngine();
