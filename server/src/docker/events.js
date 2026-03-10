import docker from "./client.js";
import logger from "../utils/logger.js";
import lifecycle from "../system/lifecycle.js";
import { upsertHealthState } from "../services/containerHealth.service.js";
import alertService from "../services/alert.service.js";
import { ALERT_TYPES, ALERT_SEVERITIES } from "../models/alert.model.js";
import ContainerOwnership from "../models/ContainerOwnership.js";
import eventBroadcaster from "../websocket/eventBroadcaster.js";
import globalMetricsCollector from "../services/globalMetricsCollector.js";

let eventStream = null;
let reconnectTimeout = null;
let backoffMs = 1000;
const MAX_BACKOFF_MS = 30000;

export async function initDockerEvents() {
    if (lifecycle.isShuttingDown) {
        logger.warn("Skipping Docker events init - System is shutting down");
        return;
    }

    cleanup(); // Ensure single instance

    try {
        logger.info("Initializing Docker event listener...");

        const stream = await docker.getEvents();
        eventStream = stream;

        // Reset backoff on successful connection (after a short delay to ensure stability)
        setTimeout(() => {
            if (eventStream === stream) {
                backoffMs = 1000;
            }
        }, 5000);

        stream.on("data", (chunk) => {
            try {
                const event = JSON.parse(chunk.toString());
                // Trigger reconciliation when containers are created or destroyed outside DevOpsEase
                if (event.Type === 'container' && (event.Action === 'destroy' || event.Action === 'create')) {
                    import('../services/imageObservability.service.js').then((module) => {
                        module.default.reconcileImageUsage().catch(err => {
                            logger.warn('Event-driven image reconciliation failed', { error: err.message });
                        });
                    }).catch(err => logger.error('Failed to dynamic import imageObservabilityService', { error: err.message }));
                }

                // Auto-revoke tunnels when a container stops or dies (covers external Docker CLI stops)
                if (event.Type === 'container' && (event.Action === 'stop' || event.Action === 'die')) {
                    const stoppedContainerId = event.Actor?.ID;
                    if (stoppedContainerId) {
                        import('../services/tunnel.service.js').then((module) => {
                            module.default.revokeByContainer(stoppedContainerId).catch(err => {
                                logger.warn('Event-driven tunnel revocation failed', { error: err.message });
                            });
                        }).catch(err => logger.error('Failed to dynamic import tunnelService', { error: err.message }));
                    }
                }

                // Proactive health state update on OOM, healthcheck, restart, and die events
                const isHealthEvent = event.Type === 'container' && (
                    event.Action === 'oom' ||
                    event.Action === 'health_status' ||
                    event.Action === 'restart' ||
                    event.Action === 'die'
                );
                if (isHealthEvent) {
                    const hcContainerId = event.Actor?.ID;
                    if (hcContainerId) {
                        upsertHealthState(hcContainerId).catch(err => {
                            logger.warn('Event-driven health state update failed', { error: err.message, action: event.Action });
                        });
                    }
                }

                // Immediate OOM alert on Docker oom event
                if (event.Type === 'container' && event.Action === 'oom') {
                    const oomContainerId = event.Actor?.ID;
                    if (oomContainerId) {
                        const shortId = oomContainerId.substring(0, 12);
                        ContainerOwnership.findOne({ containerId: shortId, status: 'active' }).lean()
                            .then(ownership => {
                                if (ownership) {
                                    alertService.createAlert({
                                        userId: ownership.ownerId,
                                        containerId: shortId,
                                        type: ALERT_TYPES.OOM,
                                        severity: ALERT_SEVERITIES.CRITICAL,
                                        message: `Container ${shortId} received OOM kill — out of memory`,
                                        metadata: { event: 'oom', dockerContainerId: oomContainerId },
                                    }).catch(err => logger.warn('OOM alert creation failed', { error: err.message }));
                                }
                            })
                            .catch(err => logger.warn('OOM alert ownership lookup failed', { error: err.message }));
                    }
                }

                // ── Real-time event broadcasting to frontend via WebSocket ──

                // Container lifecycle events → container_update
                // Fires on: create, destroy, start, stop, die, pause, unpause, restart
                const isLifecycleEvent = event.Type === 'container' && [
                    'create', 'destroy', 'start', 'stop', 'die', 'pause', 'unpause', 'restart'
                ].includes(event.Action);

                if (isLifecycleEvent) {
                    const cid = event.Actor?.ID;
                    const shortId = cid ? cid.substring(0, 12) : null;
                    eventBroadcaster.broadcastToAll('container_update', {
                        containerId: shortId,
                        action: event.Action,
                        timestamp: Date.now(),
                    });
                    logger.debug('Broadcast container_update', { containerId: shortId, action: event.Action });

                    // Trigger immediate metrics poll on start/restart so charts
                    // capture the state change instantly instead of waiting 10s
                    if (cid && ['start', 'restart'].includes(event.Action)) {
                        globalMetricsCollector.triggerImmediateCollection(cid);
                    }
                }

                // Health-related events → container_health_updated
                if (isHealthEvent) {
                    const cid = event.Actor?.ID;
                    const shortId = cid ? cid.substring(0, 12) : null;
                    eventBroadcaster.broadcastToAll('container_health_updated', {
                        containerId: shortId,
                        action: event.Action,
                        timestamp: Date.now(),
                    });
                    logger.debug('Broadcast container_health_updated', { containerId: shortId, action: event.Action });
                }

                // Failure-triggering events → failure_analysis_updated
                // Fires on: restart, oom, die, health_status (healthcheck fail)
                const isFailureEvent = event.Type === 'container' && [
                    'restart', 'oom', 'die', 'health_status'
                ].includes(event.Action);

                if (isFailureEvent) {
                    const cid = event.Actor?.ID;
                    const shortId = cid ? cid.substring(0, 12) : null;
                    eventBroadcaster.broadcastToAll('failure_analysis_updated', {
                        containerId: shortId,
                        action: event.Action,
                        timestamp: Date.now(),
                    });
                    logger.debug('Broadcast failure_analysis_updated', { containerId: shortId, action: event.Action });
                }
            } catch (err) {
                logger.error("Error parsing Docker event chunk", { error: err.message });
            }
        });

        stream.on("error", (err) => {
            logger.error("Docker event stream error", { error: err.message });
            handleReconnect();
        });

        stream.on("end", () => {
            logger.warn("Docker event stream ended unexpected");
            handleReconnect();
        });

        logger.info("Docker event listener started");

    } catch (err) {
        logger.error("Failed to initialize Docker events", { error: err.message });
        handleReconnect();
    }
}

function handleReconnect() {
    if (lifecycle.isShuttingDown) return;

    cleanup();

    logger.info(`Reconnecting Docker events in ${backoffMs}ms...`);

    reconnectTimeout = setTimeout(() => {
        initDockerEvents();
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    }, backoffMs);
}

function cleanup() {
    if (eventStream) {
        try {
            eventStream.destroy();
        } catch (err) { /* ignore */ }
        eventStream = null;
    }

    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
}

export function stopDockerEvents() {
    logger.info("Stopping Docker event listener");
    cleanup();
}
