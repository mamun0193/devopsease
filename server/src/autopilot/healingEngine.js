/**
 * Autopilot Healing Engine
 * 
 * Determines WHAT should happen regarding application recovery.
 * Pure decision engine: does NOT modify state.
 */

export class HealingEngine {
    //Evaluates health degradation and proposes a self-healing action.
  
    evaluate(applicationId, health) {
        if (!health || health.status === 'HEALTHY') return null;

        const currentHealthScore = health.score || 0;

        // If the health is degraded but not critical, we might not take destructive action yet
        // A robust implementation would look at dimension specifics (e.g. is performance low, or availability low?)
        if (currentHealthScore < 30) {
            // Critical failure
            return {
                type: 'HEALING',
                action: 'RESTART_REPLICAS',
                applicationId,
                reason: `Health score is critically low (${currentHealthScore}). Automated restart recommended.`,
                confidence: 0.8,
                triggeringMetrics: { healthScore: currentHealthScore, dimensions: health.dimensions },
                timestamp: new Date()
            };
        } else if (currentHealthScore < 70) {
            // Degraded
            return {
                type: 'HEALING',
                action: 'ALERT_ONLY',
                applicationId,
                reason: `Health score is degraded (${currentHealthScore}). No automated action taken yet to prevent thrashing.`,
                confidence: 0.95,
                triggeringMetrics: { healthScore: currentHealthScore, dimensions: health.dimensions },
                timestamp: new Date()
            };
        }

        return null;
    }
}

export default new HealingEngine();
