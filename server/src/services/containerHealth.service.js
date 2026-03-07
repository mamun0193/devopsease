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

// ─── Auto-Recovery Guard ───────────────────────────────────────────────────────
// Prevents infinite restart loops: one auto-recovery attempt per container per 5 minutes

const recoveryAttempts = new Map(); // containerId → timestamp
const RECOVERY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function canAttemptRecovery(containerId) {
    const last = recoveryAttempts.get(containerId);
    if (!last) return true;
    return Date.now() - last > RECOVERY_COOLDOWN_MS;
}

function recordRecoveryAttempt(containerId) {
    recoveryAttempts.set(containerId, Date.now());
}

async function attemptAutoRecovery(containerId, inspectData) {
    const restartPolicy = inspectData?.HostConfig?.RestartPolicy?.Name;
    if (!restartPolicy || restartPolicy === "no" || restartPolicy === "") return;

    if (!canAttemptRecovery(containerId)) {
        logger.info("Auto-recovery skipped: cooldown active", { containerId });
        return;
    }

    try {
        recordRecoveryAttempt(containerId);
        const container = docker.getContainer(containerId);
        await container.restart({ t: 5 });
        logger.info("Auto-recovery: container restarted", { containerId, restartPolicy });
    } catch (err) {
        logger.warn("Auto-recovery: restart failed", { containerId, error: err.message });
    }
}

// ─── Core Health State Upsert ─────────────────────────────────────────────────

export async function upsertHealthState(containerId) {
    if (!containerId) return null;

    try {
        // 1. Inspect container
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

        const state = inspectData.State;
        const restartCount = inspectData.RestartCount || 0;
        const exitCode = state?.ExitCode;
        const dockerHealthStatus = state?.Health?.Status || null; // healthy | starting | unhealthy | null

        // 2. Fetch recent logs (best-effort)
        let logs = "";
        try {
            const logBuffer = await container.logs({ stdout: true, stderr: true, tail: 100 });
            logs = logBuffer.toString();
        } catch (_) {
            // Non-critical — proceed without logs
        }

        // 3. Run classifier (reusing existing logic, no modifications)
        const signals = collectSignals({ state, exitCode, restartCount, logs });
        const classification = classifyFailure(signals, { state, exitCode, restartCount, logs });

        // 4. Run instability analyzer (reusing existing logic, no modifications)
        const instability = analyzeInstability(state, restartCount, classification);

        // 5. Map to platform health status
        const healthStatus = mapToHealthStatus(classification, instability, dockerHealthStatus);

        // 6. Find user ownership
        const ownershipDoc = await ContainerOwnership.findOne({ containerId, status: "active" }).lean();
        const userId = ownershipDoc?.ownerId;
        if (!userId) {
            logger.debug("Health upsert skipped: no owner for container", { containerId });
            return null;
        }

        // 7. Load existing doc to compute history diff
        const existing = await ContainerHealth.findOne({ containerId, userId });
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

        // 8. Persist to MongoDB
        const healthDoc = await ContainerHealth.findOneAndUpdate(
            { containerId, userId },
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
                },
            },
            { upsert: true, new: true }
        );

        logger.debug("Container health state updated", {
            containerId,
            healthStatus,
            type: classification.type,
            instabilityScore: instability.instabilityScore,
        });

        // 9. Generate alerts on health transitions
        const previousStatus = existing?.healthStatus || "HEALTHY";
        if (previousStatus !== healthStatus && healthStatus !== "HEALTHY") {
            const alertType = healthStatus === "UNHEALTHY"
                ? (classification.type === FAILURE_TYPES.CRASH_LOOP ? ALERT_TYPES.CRASH_LOOP
                    : classification.type === FAILURE_TYPES.RESOURCE_EXHAUSTION ? ALERT_TYPES.OOM
                    : ALERT_TYPES.HEALTH_UNHEALTHY)
                : ALERT_TYPES.HEALTH_DEGRADED;

            const alertSeverity = healthStatus === "UNHEALTHY"
                ? ALERT_SEVERITIES.CRITICAL
                : ALERT_SEVERITIES.WARNING;

            const alertMessage = healthStatus === "UNHEALTHY"
                ? `Container ${containerId} is unhealthy — ${classification.type || "unknown failure"}`
                : `Container ${containerId} health degraded — instability score ${instability.instabilityScore.toFixed(2)}`;

            alertService.createAlert({
                userId,
                containerId,
                type: alertType,
                severity: alertSeverity,
                message: alertMessage,
                metadata: {
                    previousStatus,
                    newStatus: healthStatus,
                    failureType: classification.type,
                    instabilityScore: instability.instabilityScore,
                    restartCount,
                    exitCode,
                },
            }).catch(err => logger.warn("Alert creation failed (health)", { error: err.message }));
        }

        // 10. Auto-recovery for crash loops
        if (healthStatus === HEALTH_STATUS.UNHEALTHY && classification.type === FAILURE_TYPES.CRASH_LOOP) {
            attemptAutoRecovery(containerId, inspectData).catch((err) => {
                logger.warn("Auto-recovery error", { containerId, error: err.message });
            });
        }

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
