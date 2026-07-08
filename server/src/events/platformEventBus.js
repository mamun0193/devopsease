import { EventEmitter } from 'events';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { getRedisClient, isRedisConnected } from '../redis/client.js';
import actionHistoryService from '../services/actionHistory.service.js';

// ponytail: Unified Platform Event Bus — single event infrastructure for all DevOpsEase subsystems.
// Replaces release.events.js, domainEvents.js, gateway.events.js with one bus.
// Redis Pub/Sub for multi-process, in-memory ring buffer for fast recent queries.

const REDIS_CHANNEL = 'platform:events';
const RING_BUFFER_SIZE = 500;

const SEVERITIES = Object.freeze({
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL',
});

const DOMAINS = Object.freeze({
    BUILD: 'BUILD',
    DEPLOYMENT: 'DEPLOYMENT',
    RELEASE: 'RELEASE',
    PREVIEW: 'PREVIEW',
    DOMAIN: 'DOMAIN',
    CERTIFICATE: 'CERTIFICATE',
    GATEWAY: 'GATEWAY',
    CONTAINER: 'CONTAINER',
    SCHEDULER: 'SCHEDULER',
    PLATFORM: 'PLATFORM',
    IMAGE: 'IMAGE',
    PIPELINE: 'PIPELINE',
    TRAFFIC: 'TRAFFIC',
    // Security & Resilience Domains
    AUTH: 'AUTH',
    SECRETS: 'SECRETS',
    INFRASTRUCTURE: 'INFRASTRUCTURE',
    RECOVERY: 'RECOVERY',
    AUDIT: 'AUDIT',
    COMPLIANCE: 'COMPLIANCE',
    SECURITY: 'SECURITY',
});

class PlatformEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100);
        this._recentEvents = [];
        this._subscriber = null;
        this._initialized = false;
    }

    /**
     * Initialize Redis Pub/Sub subscriber for multi-process event distribution.
     * Call once after Redis is connected. Non-blocking — falls back to local-only if Redis unavailable.
     */
    async init() {
        if (this._initialized) return;
        this._initialized = true;

        if (!isRedisConnected()) {
            logger.info('[PlatformEventBus] Redis unavailable — local-only mode');
            return;
        }

        try {
            const redisOpts = getRedisClient().options;
            const Redis = (await import('ioredis')).default;
            this._subscriber = new Redis({
                host: redisOpts.host,
                port: redisOpts.port,
                retryStrategy: (times) => Math.min(times * 500, 30000),
                maxRetriesPerRequest: 1,
                enableOfflineQueue: false,
                lazyConnect: false,
            });

            this._subscriber.on('error', (err) => {
                logger.debug('[PlatformEventBus] Subscriber error', { error: err.message });
            });

            await this._subscriber.subscribe(REDIS_CHANNEL);

            this._subscriber.on('message', (_channel, message) => {
                try {
                    const envelope = JSON.parse(message);
                    // Emit locally without re-publishing to Redis
                    this._emitLocal(envelope);
                } catch {
                    // ignore parse errors
                }
            });

            logger.info('[PlatformEventBus] Redis Pub/Sub initialized');
        } catch (err) {
            logger.warn('[PlatformEventBus] Redis Pub/Sub setup failed — local-only mode', { error: err.message });
        }
    }

    /**
     * Emit a structured platform event.
     *
     * @param {string} domain - Event domain (BUILD, DEPLOYMENT, etc.)
     * @param {string} eventType - Event type (BUILD_FAILED, DEPLOYMENT_COMPLETED, etc.)
     * @param {object} opts
     * @param {string} [opts.severity='INFO'] - INFO | WARNING | ERROR | CRITICAL
     * @param {string} [opts.resourceType] - e.g., 'Build', 'Deployment', 'Domain'
     * @param {string} [opts.resourceId] - Resource identifier
     * @param {string} [opts.userId] - User who owns/triggered the event
     * @param {string} [opts.applicationId] - Application context for correlation
     * @param {string} [opts.correlationId] - Inherited correlation ID, or auto-generated
     * @param {object} [opts.payload={}] - Domain-specific data
     */
    publish(domain, eventType, {
        severity = SEVERITIES.INFO,
        resourceType = null,
        resourceId = null,
        userId = null,
        applicationId = null,
        correlationId = null,
        payload = {},
    } = {}) {
        const envelope = {
            eventVersion: '1.0',
            correlationId: correlationId || crypto.randomUUID(),
            occurredAt: new Date(),
            domain,
            eventType,
            severity,
            resourceType,
            resourceId: resourceId ? String(resourceId) : null,
            userId: userId ? String(userId) : null,
            applicationId: applicationId ? String(applicationId) : null,
            payload,
        };

        // Publish via Redis if connected (all processes including this one receive it via subscriber)
        if (isRedisConnected() && this._subscriber) {
            try {
                const redis = getRedisClient();
                redis.publish(REDIS_CHANNEL, JSON.stringify(envelope)).catch(() => {});
                // Don't emit locally — the subscriber will receive it from Redis
                return envelope;
            } catch {
                // Fall through to local emission
            }
        }

        // No Redis — emit locally only
        this._emitLocal(envelope);
        return envelope;
    }

    /**
     * Backward-compatible shim for existing `emitDomainEvent(eventName, payload, resourceType, resourceId)` calls.
     * Used by release.events.js, domainEvents.js, gateway.events.js shims.
     */
    emitDomainEvent(eventName, payload = {}, resourceType = null, resourceId = null) {
        const domain = this._inferDomain(eventName);
        const severity = this._inferSeverity(eventName);

        return this.publish(domain, eventName, {
            severity,
            resourceType,
            resourceId,
            userId: payload.userId || null,
            applicationId: payload.applicationId || null,
            payload,
        });
    }

    /** Listen for events from a specific domain. */
    onDomain(domain, handler) {
        this.on(`domain:${domain}`, handler);
    }

    /** Listen for ALL events (used by persistence layer). */
    onAny(handler) {
        this.on('platform:event', handler);
    }

    /** Get recent events from the in-memory ring buffer. */
    getRecentEvents(limit = 50) {
        return this._recentEvents.slice(0, Math.min(limit, RING_BUFFER_SIZE));
    }

    /** Internal: emit locally and push to ring buffer. */
    _emitLocal(envelope) {
        // Ring buffer (newest first)
        this._recentEvents.unshift(envelope);
        if (this._recentEvents.length > RING_BUFFER_SIZE) {
            this._recentEvents.length = RING_BUFFER_SIZE;
        }

        // Emit on multiple channels for flexible subscription
        this.emit(envelope.eventType, envelope);
        this.emit(`domain:${envelope.domain}`, envelope);
        this.emit('platform:event', envelope);

        logger.debug(`[PlatformEvent] ${envelope.domain}:${envelope.eventType}`, {
            correlationId: envelope.correlationId,
            resourceId: envelope.resourceId,
            severity: envelope.severity,
        });

        // Ensure critical domain events are recorded in ActionHistory
        this._recordToHistoryIfCritical(envelope);
    }

    /** Record critical domain events to ActionHistory */
    _recordToHistoryIfCritical(envelope) {
        const criticalDomains = [DOMAINS.DEPLOYMENT, DOMAINS.BUILD, DOMAINS.RELEASE, DOMAINS.PIPELINE];
        const isCriticalType = envelope.eventType.includes('FINISHED') || envelope.eventType.includes('FAILED') || envelope.eventType.includes('COMPLETED') || envelope.eventType.includes('ERROR');
        
        const isCritical = criticalDomains.includes(envelope.domain) && isCriticalType;
        const isError = envelope.severity === SEVERITIES.ERROR || envelope.severity === SEVERITIES.CRITICAL;

        if (isCritical || isError) {
            actionHistoryService.recordAction({
                containerId: envelope.resourceId || envelope.domain,
                containerName: envelope.resourceType || envelope.domain,
                action: envelope.eventType.toLowerCase(),
                status: isError ? 'failed' : 'success',
                reason: envelope.payload?.error || envelope.payload?.message || envelope.payload?.reason || null,
                source: 'platform_event',
            }).catch(err => logger.debug("[PlatformEventBus] Failed to record to ActionHistory", { error: err.message }));
        }
    }

    /** Infer domain from legacy event names. */
    _inferDomain(eventName) {
        const name = eventName.toUpperCase();
        if (name.startsWith('BUILD')) return DOMAINS.BUILD;
        if (name.startsWith('DEPLOY')) return DOMAINS.DEPLOYMENT;
        if (name.startsWith('RELEASE')) return DOMAINS.RELEASE;
        if (name.startsWith('PREVIEW')) return DOMAINS.PREVIEW;
        if (name.startsWith('DOMAIN')) return DOMAINS.DOMAIN;
        if (name.startsWith('CERTIFICATE') || name.startsWith('CERT')) return DOMAINS.CERTIFICATE;
        if (name.startsWith('GATEWAY')) return DOMAINS.GATEWAY;
        if (name.startsWith('CONTAINER')) return DOMAINS.CONTAINER;
        if (name.startsWith('PIPELINE')) return DOMAINS.PIPELINE;
        if (name.startsWith('TRAFFIC') || name.startsWith('ROUTING')) return DOMAINS.TRAFFIC;
        if (name.startsWith('IMAGE')) return DOMAINS.IMAGE;
        return DOMAINS.PLATFORM;
    }

    /** Infer severity from legacy event names. */
    _inferSeverity(eventName) {
        const name = eventName.toUpperCase();
        if (name.includes('FAILED') || name.includes('ERROR') || name.includes('EXPIRED')) return SEVERITIES.ERROR;
        if (name.includes('UNHEALTHY') || name.includes('DEGRADED') || name.includes('WARNING')) return SEVERITIES.WARNING;
        return SEVERITIES.INFO;
    }

    /** Graceful shutdown. */
    stop() {
        if (this._subscriber) {
            this._subscriber.unsubscribe(REDIS_CHANNEL).catch(() => {});
            this._subscriber.quit().catch(() => {});
            this._subscriber = null;
        }
        this._recentEvents = [];
        this.removeAllListeners();
        logger.info('[PlatformEventBus] Stopped');
    }
}

const platformEventBus = new PlatformEventBus();

export { SEVERITIES, DOMAINS };
export default platformEventBus;
