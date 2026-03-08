import docker from "../docker/client.js";
import logger from "../utils/logger.js";
import { classifyFailure, FAILURE_TYPES } from "../intelligence/classifier.js";
import { analyzeInstability } from "../intelligence/instabilityAnalyzer.js";
import { collectSignals } from "../intelligence/signals/index.js";
import ContainerHealth from "../models/containerHealth.model.js";
import ContainerOwnership from "../models/ContainerOwnership.js";
import alertService from "./alert.service.js";
import { ALERT_TYPES, ALERT_SEVERITIES } from "../models/alert.model.js";

// ─── Health Status Mapping ────────────────────────────────────────────────────

export const HEALTH_STATUS = Object.freeze({
    HEALTHY: "HEALTHY",
    DEGRADED: "DEGRADED",
    UNHEALTHY: "UNHEALTHY",
});

const UNHEALTHY_TYPES = new Set([
    FAILURE_TYPES.CRASH_LOOP,
    FAILURE_TYPES.RESOURCE_EXHAUSTION,
]);

function mapToHealthStatus(classification, instability, dockerHealthStatus) {
    // Docker HEALTHCHECK takes precedence if defined
    if (dockerHealthStatus === "unhealthy") return HEALTH_STATUS.UNHEALTHY;
    if (dockerHealthStatus === "starting") return HEALTH_STATUS.DEGRADED;

    if (classification.type === FAILURE_TYPES.HEALTHY) return HEALTH_STATUS.HEALTHY;
    if (classification.type === FAILURE_TYPES.GRACEFUL_STOP) return HEALTH_STATUS.HEALTHY;
    if (classification.type === FAILURE_TYPES.PAUSED) return HEALTH_STATUS.HEALTHY;

    if (UNHEALTHY_TYPES.has(classification.type)) return HEALTH_STATUS.UNHEALTHY;

    // DEGRADED: instability score above threshold
    if (instability.instabilityScore > 0.4) return HEALTH_STATUS.DEGRADED;

    return HEALTH_STATUS.HEALTHY;
}

// ─── Restart Limit Enforcement ────────────────────────────────────────────────

/**
 * Read the effective restart limit from Docker labels or native MaximumRetryCount.
 * Returns 0 if unlimited / not set.
 */
function getRestartLimit(inspectData) {
    const labelLimit = parseInt(inspectData?.Config?.Labels?.['devopsease.restartLimit'], 10);
    const nativeLimit = inspectData?.HostConfig?.RestartPolicy?.MaximumRetryCount || 0;
    if (labelLimit > 0) return labelLimit;
    if (nativeLimit > 0) return nativeLimit;
    return 0;
}

/**
 * Enforce the restart limit for ALL restart policies.
 * When the restart count reaches the configured limit:
 *   1. Update the restart policy to 'no' so Docker stops auto-restarting
 *   2. Stop the container as a guarantee (prevents one more crash cycle)
 */
async function enforceRestartLimit(containerId, inspectData) {
    const restartPolicy = inspectData?.HostConfig?.RestartPolicy?.Name;
    if (!restartPolicy || restartPolicy === 'no' || restartPolicy === '') return false;

    const limit = getRestartLimit(inspectData);
    if (limit <= 0) return false; // no limit configured

    const restartCount = inspectData.RestartCount || 0;
    if (restartCount < limit) return false;

    // Limit exceeded — change policy to 'no' AND stop the container
    try {
        const container = docker.getContainer(containerId);

        // 1. Change restart policy to 'no' so Docker stops auto-restarting
        await container.update({ RestartPolicy: { Name: 'no', MaximumRetryCount: 0 } });

        // 2. Stop the container to prevent one more crash cycle
        try {
            await container.stop({ t: 2 });
        } catch (stopErr) {
            // Container may already be stopped — that's fine
            if (stopErr.statusCode !== 304 && stopErr.statusCode !== 404) {
                logger.warn("Restart limit enforcement: stop failed (non-critical)", {
                    containerId, error: stopErr.message,
                });
            }
        }

        logger.warn("Restart limit exceeded — container stopped, policy changed to 'no'", {
            containerId, restartPolicy, restartCount, limit,
        });
        return true; // enforcement was applied
    } catch (err) {
        // Fallback: if update fails, try to just stop the container
        logger.error("Failed to update restart policy, attempting stop as fallback", {
            containerId, error: err.message,
        });
        try {
            const container = docker.getContainer(containerId);
            await container.stop({ t: 2 });
        } catch (_) {
            // best effort
        }
        return false;
    }
}

// NOTE: Auto-recovery is intentionally disabled.
// Docker's restart policy already handles restarts natively.
// Our job is ONLY to enforce the restart limit (enforceRestartLimit).
// Previous auto-recovery via container.restart() was resetting Docker's internal
// failure counter, causing on-failure MaximumRetryCount to never be reached.

// ─── Core Health State Upsert ─────────────────────────────────────────────────

export async function upsertHealthState(containerId) {
    if (!containerId) return null;

    try {
        // 1. Inspect container (Docker accepts both full and short IDs)
        const container = docker.getContainer(containerId);
        let inspectData;
        try {
            inspectData = await container.inspect();
        } catch (err) {
            if (err.statusCode === 404) {
                logger.debug("Health upsert skipped: container not found", { containerId });
                return null;
            }
            throw err;
        }

        // Normalize to 12-char short ID (ownership DB stores short IDs)
        const shortId = inspectData.Id.substring(0, 12);

        // 2. Enforce restart limit (stop Docker's own restart if limit exceeded)
        const wasEnforced = await enforceRestartLimit(shortId, inspectData);

        // If enforcement just stopped the container, re-inspect for accurate state
        if (wasEnforced) {
            try {
                inspectData = await container.inspect();
            } catch (_) {
                // Use stale data if re-inspect fails
            }
        }

        const state = inspectData.State;
        const restartCount = inspectData.RestartCount || 0;
        const exitCode = state?.ExitCode;
        const dockerHealthStatus = state?.Health?.Status || null; // healthy | starting | unhealthy | null

        // 3. Fetch recent logs (best-effort)
        let logs = "";
        try {
            const logBuffer = await container.logs({ stdout: true, stderr: true, tail: 100 });
            logs = logBuffer.toString();
        } catch (_) {
            // Non-critical — proceed without logs
        }

        // 4. Run classifier
        const signals = collectSignals({ state, exitCode, restartCount, logs });
        const classification = classifyFailure(signals, { state, exitCode, restartCount, logs });

        // 5. Run instability analyzer (pass container creation time for accurate MTBF)
        const stateWithCreated = { ...state, CreatedAt: inspectData.Created };
        const instability = analyzeInstability(stateWithCreated, restartCount, classification);

        // 6. Map to platform health status
        const healthStatus = mapToHealthStatus(classification, instability, dockerHealthStatus);

        // 7. Find user ownership (use short ID to match DB records)
        const ownershipDoc = await ContainerOwnership.findOne({ containerId: shortId, status: "active" }).lean();
        const userId = ownershipDoc?.ownerId;
        if (!userId) {
            logger.debug("Health upsert skipped: no owner for container", { containerId: shortId });
            return null;
        }

        // 8. Load existing doc to compute history diff
        const existing = await ContainerHealth.findOne({ containerId: shortId, userId });
        const historyEntry = {
            healthStatus,
            failureType: classification.type !== FAILURE_TYPES.HEALTHY ? classification.type : null,
            instabilityScore: instability.instabilityScore,
            changedAt: new Date(),
        };

        const history = existing?.history || [];
        const lastEntry = history[history.length - 1];

        // Only append to history if the health status actually changed
        let updatedHistory = history;
        if (!lastEntry || lastEntry.healthStatus !== healthStatus) {
            updatedHistory = [...history, historyEntry].slice(-20); // keep last 20 entries
        }

        // 9. Check if restart limit was exhausted
        const restartLimit = getRestartLimit(inspectData);
        const restartLimitExhausted = restartLimit > 0 && restartCount >= restartLimit;

        // 10. Persist to MongoDB
        const healthDoc = await ContainerHealth.findOneAndUpdate(
            { containerId: shortId, userId },
            {
                $set: {
                    healthStatus,
                    lastFailureType: classification.type !== FAILURE_TYPES.HEALTHY ? classification.type : null,
                    restartCount,
                    lastExitCode: exitCode ?? null,
                    lastDockerHealthStatus: dockerHealthStatus,
                    instabilityScore: instability.instabilityScore,
                    history: updatedHistory,
                    lastUpdatedAt: new Date(),
                    restartLimitExhausted: restartLimitExhausted || false,
                    restartLimit: restartLimit || 0,
                },
            },
            { upsert: true, new: true }
        );

        logger.debug("Container health state updated", {
            containerId: shortId,
            healthStatus,
            type: classification.type,
            instabilityScore: instability.instabilityScore,
            restartCount,
            restartLimit,
        });

        // 11. Generate alerts on health transitions
        const previousStatus = existing?.healthStatus || "HEALTHY";
        if (previousStatus !== healthStatus && healthStatus !== "HEALTHY") {
            let alertType;
            let alertMessage;

            if (restartLimitExhausted) {
                alertType = ALERT_TYPES.CRASH_LOOP;
                alertMessage = `Container ${shortId} restart limit exhausted (${restartCount}/${restartLimit}) — container stopped`;
            } else if (healthStatus === "UNHEALTHY") {
                alertType = classification.type === FAILURE_TYPES.CRASH_LOOP ? ALERT_TYPES.CRASH_LOOP
                    : classification.type === FAILURE_TYPES.RESOURCE_EXHAUSTION ? ALERT_TYPES.OOM
                    : ALERT_TYPES.HEALTH_UNHEALTHY;
                alertMessage = `Container ${shortId} is unhealthy — ${classification.type || "unknown failure"}`;
            } else {
                alertType = ALERT_TYPES.HEALTH_DEGRADED;
                alertMessage = `Container ${shortId} health degraded — instability score ${instability.instabilityScore.toFixed(2)}`;
            }

            const alertSeverity = healthStatus === "UNHEALTHY"
                ? ALERT_SEVERITIES.CRITICAL
                : ALERT_SEVERITIES.WARNING;

            alertService.createAlert({
                userId,
                containerId: shortId,
                type: alertType,
                severity: alertSeverity,
                message: alertMessage,
                metadata: {
                    previousStatus,
                    newStatus: healthStatus,
                    failureType: classification.type,
                    instabilityScore: instability.instabilityScore,
                    restartCount,
                    restartLimit,
                    restartLimitExhausted,
                    exitCode,
                },
            }).catch(err => logger.warn("Alert creation failed (health)", { error: err.message }));
        }

        // 12. Docker's restart policy handles restarts natively.
        // Our enforceRestartLimit (step 2) handles stopping when limit is reached.
        // No manual auto-recovery needed — it was causing Docker's failure counter to reset.

        return healthDoc;
    } catch (err) {
        logger.error("Failed to upsert container health state", { containerId, error: err.message });
        return null;
    }
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

export async function getHealthState(containerId) {
    return ContainerHealth.findOne({ containerId }).lean();
}

export async function getHealthStatesBatch(containerIds) {
    if (!containerIds || containerIds.length === 0) return [];
    const docs = await ContainerHealth.find({ containerId: { $in: containerIds } }).lean();
    return docs;
}

export default {
    upsertHealthState,
    getHealthState,
    getHealthStatesBatch,
    HEALTH_STATUS,
};
