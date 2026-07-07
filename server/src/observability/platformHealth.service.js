import docker from '../docker/client.js';
import logger from '../utils/logger.js';
import { isRedisConnected } from '../redis/client.js';
import globalMetricsCollector from '../services/globalMetricsCollector.js';
import platformScheduler from '../system/platformScheduler.js';
import platformEventBus, { SEVERITIES, DOMAINS } from '../events/platformEventBus.js';
import PlatformEvent from '../models/platformEvent.model.js';
import ContainerHealth from '../models/containerHealth.model.js';
import Application from '../models/application.model.js';
import Deployment from '../models/deployment.model.js';
import Domain from '../models/domain.model.js';
import gatewayMetricsCollector from '../gateway/metrics.collector.js';
import alertService from '../services/alert.service.js';
import { ALERT_TYPES, ALERT_SEVERITIES } from '../models/alert.model.js';

// ponytail: Health scoring weights for multi-dimensional composition.
const DIMENSION_WEIGHTS = Object.freeze({
    availability: 0.4,
    reliability: 0.3,
    performance: 0.2,
    security: 0.1,
});

const HEALTH_STATUS = Object.freeze({
    HEALTHY: 'HEALTHY',
    DEGRADED: 'DEGRADED',
    UNHEALTHY: 'UNHEALTHY',
});

// ─── Dimension Helpers ────────────────────────────────────────────────────────

function composeDimensionScore(dimensions) {
    return Math.round(
        (dimensions.availability * DIMENSION_WEIGHTS.availability) +
        (dimensions.reliability * DIMENSION_WEIGHTS.reliability) +
        (dimensions.performance * DIMENSION_WEIGHTS.performance) +
        (dimensions.security * DIMENSION_WEIGHTS.security)
    );
}

function scoreToStatus(score) {
    if (score >= 80) return HEALTH_STATUS.HEALTHY;
    if (score >= 50) return HEALTH_STATUS.DEGRADED;
    return HEALTH_STATUS.UNHEALTHY;
}

// ─── Infrastructure Health ────────────────────────────────────────────────────

async function evaluateInfrastructureHealth() {
    const components = [];

    // Docker
    let dockerHealthy = false;
    try {
        await Promise.race([
            docker.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        dockerHealthy = true;
    } catch { /* docker down */ }
    components.push({
        name: 'Docker',
        status: dockerHealthy ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNHEALTHY,
        score: dockerHealthy ? 100 : 0,
    });

    // Redis
    const redisHealthy = isRedisConnected();
    components.push({
        name: 'Redis',
        status: redisHealthy ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
        score: redisHealthy ? 100 : 50, // degraded, not unhealthy — platform works without Redis
    });

    // MongoDB — if we're running, Mongoose is connected
    components.push({
        name: 'MongoDB',
        status: HEALTH_STATUS.HEALTHY,
        score: 100,
    });

    const avgScore = components.length > 0
        ? Math.round(components.reduce((sum, c) => sum + c.score, 0) / components.length)
        : 100;

    return {
        name: 'Infrastructure',
        status: scoreToStatus(avgScore),
        score: avgScore,
        dimensions: {
            availability: dockerHealthy ? 100 : 0,
            reliability: 100, // infra doesn't restart
            performance: 100, // infra latency not tracked here
            security: 100,
        },
        components,
    };
}

// ─── Gateway Health ───────────────────────────────────────────────────────────

function evaluateGatewayHealth() {
    const metrics = gatewayMetricsCollector.getGlobalMetrics();
    const errorRate = metrics.totalRequests > 0
        ? (metrics.totalErrors / metrics.totalRequests) * 100
        : 0;

    const availability = errorRate < 1 ? 100 : errorRate < 5 ? 80 : errorRate < 20 ? 50 : 20;
    const performance = metrics.p95LatencyMs < 500 ? 100
        : metrics.p95LatencyMs < 1000 ? 80
        : metrics.p95LatencyMs < 3000 ? 50 : 20;

    const dimensions = {
        availability,
        reliability: errorRate < 5 ? 100 : errorRate < 10 ? 70 : 30,
        performance,
        security: 100,
    };

    const score = composeDimensionScore(dimensions);

    return {
        name: 'Gateway',
        status: scoreToStatus(score),
        score,
        dimensions,
        metrics: {
            totalRequests: metrics.totalRequests,
            totalErrors: metrics.totalErrors,
            errorRate: Math.round(errorRate * 10) / 10,
            p95LatencyMs: metrics.p95LatencyMs,
            rps: metrics.requestsPerSecond,
            activeConnections: metrics.activeConnections,
        },
    };
}

// ─── Scheduler Health ─────────────────────────────────────────────────────────

function evaluateSchedulerHealth() {
    const jobs = platformScheduler.getStatus();
    if (jobs.length === 0) {
        return {
            name: 'Scheduler',
            status: HEALTH_STATUS.HEALTHY,
            score: 100,
            dimensions: { availability: 100, reliability: 100, performance: 100, security: 100 },
            jobs: [],
        };
    }

    let failingJobs = 0;
    const jobDetails = jobs.map(job => {
        const healthy = job.consecutiveErrors < 3;
        if (!healthy) failingJobs++;
        return {
            name: job.name,
            status: healthy ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
            runCount: job.runCount,
            errorCount: job.errorCount,
            consecutiveErrors: job.consecutiveErrors,
            lastDurationMs: job.lastDurationMs,
            lastRun: job.lastRun,
        };
    });

    const reliability = jobs.length > 0
        ? Math.round(((jobs.length - failingJobs) / jobs.length) * 100)
        : 100;

    const dimensions = {
        availability: 100, // scheduler itself is always available if server is running
        reliability,
        performance: 100,
        security: 100,
    };

    const score = composeDimensionScore(dimensions);

    return {
        name: 'Scheduler',
        status: scoreToStatus(score),
        score,
        dimensions,
        jobs: jobDetails,
    };
}

// ─── Application Health ───────────────────────────────────────────────────────

async function evaluateApplicationHealth(applicationId) {
    const app = await Application.findById(applicationId).lean();
    if (!app) return null;

    // Container health for this application's deployments
    const deployments = await Deployment.find({
        applicationId,
        status: { $in: ['active', 'deploying'] },
    }).lean();

    const containerHealthDocs = deployments.length > 0
        ? await ContainerHealth.find({
            containerId: { $in: deployments.map(d => d.containerId).filter(Boolean) },
        }).lean()
        : [];

    const healthyContainers = containerHealthDocs.filter(c => c.healthStatus === 'HEALTHY').length;
    const totalContainers = containerHealthDocs.length || 1; // avoid div by 0

    // Domain health
    const domains = await Domain.find({
        applicationId,
        status: { $in: ['connected', 'healthy', 'unhealthy'] },
    }).lean();

    const healthyDomains = domains.filter(d => d.healthStatus === 'HEALTHY').length;
    const totalDomains = domains.length || 1;

    const containerAvailability = Math.round((healthyContainers / totalContainers) * 100);
    const domainAvailability = domains.length > 0
        ? Math.round((healthyDomains / totalDomains) * 100)
        : 100; // no domains configured = not a problem

    const dimensions = {
        availability: Math.round((containerAvailability + domainAvailability) / 2),
        reliability: containerAvailability, // container stability = reliability
        performance: 100, // per-app performance not tracked at this level yet
        security: domains.length > 0
            ? (domains.every(d => d.activeCertificate?.status === 'installed') ? 100 : 60)
            : 100,
    };

    const score = composeDimensionScore(dimensions);

    return {
        name: app.name || app.slug,
        applicationId: String(app._id),
        status: scoreToStatus(score),
        score,
        dimensions,
        components: {
            containers: { healthy: healthyContainers, total: containerHealthDocs.length },
            domains: { healthy: healthyDomains, total: domains.length },
            deployments: deployments.length,
        },
    };
}

// ─── Platform Health (Top-Level Composition) ──────────────────────────────────

async function evaluatePlatformHealth() {
    const infrastructure = await evaluateInfrastructureHealth();
    const gateway = evaluateGatewayHealth();
    const scheduler = evaluateSchedulerHealth();

    // Compose overall score from subsystem scores
    const subsystems = [infrastructure, gateway, scheduler];
    const avgScore = Math.round(subsystems.reduce((sum, s) => sum + s.score, 0) / subsystems.length);

    const overallStatus = infrastructure.status === HEALTH_STATUS.UNHEALTHY
        ? HEALTH_STATUS.UNHEALTHY // infra down = platform unhealthy
        : scoreToStatus(avgScore);

    const dimensions = {
        availability: Math.round(subsystems.reduce((s, c) => s + c.dimensions.availability, 0) / subsystems.length),
        reliability: Math.round(subsystems.reduce((s, c) => s + c.dimensions.reliability, 0) / subsystems.length),
        performance: Math.round(subsystems.reduce((s, c) => s + c.dimensions.performance, 0) / subsystems.length),
        security: Math.round(subsystems.reduce((s, c) => s + c.dimensions.security, 0) / subsystems.length),
    };

    const explanation = {
        decision: 'PLATFORM_HEALTH_EVALUATED',
        trigger: 'SCHEDULED_CHECK',
        actor: 'System',
        reason: overallStatus === HEALTH_STATUS.HEALTHY
            ? 'All platform subsystems are operating normally'
            : `Platform health ${overallStatus.toLowerCase()} — ${subsystems.filter(s => s.status !== HEALTH_STATUS.HEALTHY).map(s => s.name).join(', ')} affected`,
        rootCauses: subsystems
            .filter(s => s.status !== HEALTH_STATUS.HEALTHY)
            .map(s => `${s.name} is ${s.status.toLowerCase()} (score: ${s.score})`),
        recommendations: subsystems
            .filter(s => s.status !== HEALTH_STATUS.HEALTHY)
            .map(s => `Investigate ${s.name.toLowerCase()} subsystem`),
        confidence: 0.95,
        affectedResources: subsystems
            .filter(s => s.status !== HEALTH_STATUS.HEALTHY)
            .map(s => ({ type: 'Subsystem', name: s.name, status: s.status })),
    };

    return {
        status: overallStatus,
        score: composeDimensionScore(dimensions),
        dimensions,
        subsystems: {
            infrastructure,
            gateway,
            scheduler,
        },
        explanation,
        evaluatedAt: new Date(),
    };
}

// ─── Cached Health State ──────────────────────────────────────────────────────

let _cachedPlatformHealth = null;

function getCachedPlatformHealth() {
    return _cachedPlatformHealth;
}

// ─── Scheduler Jobs ───────────────────────────────────────────────────────────

/** Periodic health evaluation. Registered with PlatformScheduler. */
async function platformHealthJob() {
    try {
        const health = await evaluatePlatformHealth();
        const previousStatus = _cachedPlatformHealth?.status;
        _cachedPlatformHealth = health;

        // Emit event on status change
        if (previousStatus && previousStatus !== health.status) {
            platformEventBus.publish(DOMAINS.PLATFORM, 'PLATFORM_HEALTH_CHANGED', {
                severity: health.status === HEALTH_STATUS.UNHEALTHY ? SEVERITIES.CRITICAL
                    : health.status === HEALTH_STATUS.DEGRADED ? SEVERITIES.WARNING
                    : SEVERITIES.INFO,
                resourceType: 'Platform',
                resourceId: 'platform',
                payload: {
                    previousStatus,
                    newStatus: health.status,
                    score: health.score,
                    dimensions: health.dimensions,
                },
            });

            // Generate alert for degradation
            if (health.status !== HEALTH_STATUS.HEALTHY) {
                alertService.createAlert({
                    userId: null, // platform-wide, no specific user
                    type: ALERT_TYPES.PLATFORM_DEGRADED,
                    severity: health.status === HEALTH_STATUS.UNHEALTHY
                        ? ALERT_SEVERITIES.CRITICAL
                        : ALERT_SEVERITIES.WARNING,
                    message: health.explanation.reason,
                    metadata: {
                        score: health.score,
                        dimensions: health.dimensions,
                        affectedSubsystems: health.explanation.affectedResources,
                    },
                }).catch(err => logger.warn('Platform health alert failed', { error: err.message }));
            }
        }

        logger.debug('[PlatformHealth] Evaluation complete', {
            status: health.status,
            score: health.score,
        });
    } catch (err) {
        logger.error('[PlatformHealth] Evaluation failed', { error: err.message });
    }
}

/** Periodic cleanup of old critical events (extends TTL for CRITICAL). */
async function eventCleanupJob() {
    try {
        // The default TTL index handles 30-day cleanup.
        // For CRITICAL events, we re-touch them to extend retention to 90 days.
        // ponytail: simpler than fighting MongoDB's single-TTL-per-collection constraint.
        const criticalCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const retainUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 more days
        await PlatformEvent.updateMany(
            { severity: 'CRITICAL', timestamp: { $lt: criticalCutoff } },
            { $set: { timestamp: retainUntil } }
        );
        logger.debug('[PlatformHealth] Event cleanup complete');
    } catch (err) {
        logger.error('[PlatformHealth] Event cleanup failed', { error: err.message });
    }
}

// ─── Event Persistence Listener ───────────────────────────────────────────────

/** Wire up persistence for WARNING+ events. Called once at startup. */
function initEventPersistence() {
    platformEventBus.onAny(async (envelope) => {
        // Persist WARNING, ERROR, CRITICAL. Also persist INFO if it is a Security/Resilience/Audit event.
        const isSecurityDomain = ['AUTH', 'SECRETS', 'INFRASTRUCTURE', 'RECOVERY', 'AUDIT', 'COMPLIANCE'].includes(envelope.domain);
        if (envelope.severity === 'INFO' && !isSecurityDomain) return;

        try {
            await PlatformEvent.create({
                correlationId: envelope.correlationId,
                domain: envelope.domain,
                eventType: envelope.eventType,
                severity: envelope.severity,
                resourceType: envelope.resourceType,
                resourceId: envelope.resourceId,
                userId: envelope.userId || undefined,
                applicationId: envelope.applicationId || undefined,
                summary: `${envelope.domain}: ${envelope.eventType}`,
                explanation: {
                    decision: envelope.eventType,
                    trigger: 'PLATFORM_EVENT',
                    actor: 'System',
                    reason: envelope.payload?.reason || `${envelope.eventType} occurred`,
                },
                metadata: envelope.payload,
                timestamp: envelope.occurredAt || new Date(),
            });
        } catch (err) {
            logger.debug('[PlatformHealth] Event persistence failed', { error: err.message });
        }
    });

    logger.info('[PlatformHealth] Event persistence listener initialized');
}

// ─── Gateway Threshold Analysis ───────────────────────────────────────────────
// ponytail: runs inside health evaluation job instead of a separate service.

let _lastGatewayErrorRate = 0;

function checkGatewayThresholds() {
    const metrics = gatewayMetricsCollector.getGlobalMetrics();
    const errorRate = metrics.totalRequests > 0
        ? (metrics.totalErrors / metrics.totalRequests) * 100
        : 0;

    // Spike detection: error rate jumped significantly
    if (errorRate > 10 && errorRate > _lastGatewayErrorRate * 2 && _lastGatewayErrorRate > 0) {
        platformEventBus.publish(DOMAINS.GATEWAY, 'GATEWAY_ERROR_SPIKE', {
            severity: SEVERITIES.WARNING,
            resourceType: 'Gateway',
            resourceId: 'gateway',
            payload: { errorRate, previousErrorRate: _lastGatewayErrorRate },
        });
    }

    // Latency spike
    if (metrics.p95LatencyMs > 3000) {
        platformEventBus.publish(DOMAINS.GATEWAY, 'GATEWAY_LATENCY_HIGH', {
            severity: SEVERITIES.WARNING,
            resourceType: 'Gateway',
            resourceId: 'gateway',
            payload: { p95LatencyMs: metrics.p95LatencyMs },
        });
    }

    _lastGatewayErrorRate = errorRate;
}

export {
    evaluatePlatformHealth,
    evaluateApplicationHealth,
    evaluateInfrastructureHealth,
    evaluateGatewayHealth,
    evaluateSchedulerHealth,
    getCachedPlatformHealth,
    platformHealthJob,
    eventCleanupJob,
    initEventPersistence,
    checkGatewayThresholds,
    HEALTH_STATUS,
    DIMENSION_WEIGHTS,
};
