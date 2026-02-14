import docker from "../docker/client.js";
import { collectSignals } from "../intelligence/signals/index.js";
import { classifyFailure, FAILURE_TYPES } from "../intelligence/classifier.js";
import { explainFailure } from "../intelligence/explainer.js";
import {
  recordFailure,
  getFailureHistory,
} from "../intelligence/history/failureHistory.store.js";
import {
  boostConfidence,
  generateStabilityInsight,
} from "../intelligence/history/confidenceBoost.js";
import logger from "../utils/logger.js";

const CACHE_TTL_MS = 60_000;
const analysisCache = new Map();

export function invalidateAnalysisCache(containerId) {
  analysisCache.delete(containerId);
}

function getCachedResult(containerId, currentRestartCount, currentState) {
  const cached = analysisCache.get(containerId);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    analysisCache.delete(containerId);
    return null;
  }

  if (cached.restartCount !== currentRestartCount || cached.state !== currentState) {
    analysisCache.delete(containerId);
    return null;
  }

  return cached.result;
}

function setCachedResult(containerId, result, restartCount, state) {
  analysisCache.set(containerId, {
    result,
    restartCount,
    state,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export async function analyzeContainer(containerId) {
  if (!containerId) {
    throw new Error("containerId is required for analysis");
  }

  const container = docker.getContainer(containerId);
  const inspectData = await container.inspect();
  const state = inspectData.State;
  const restartCount = inspectData.RestartCount || 0;
  const exitCode = state?.ExitCode;

  const cached = getCachedResult(containerId, restartCount, state?.Status);
  if (cached) {
    logger.debug(`Cache hit for failure analysis: ${containerId}`);
    return cached;
  }

  let logs = "";
  try {
    logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 200,
    });
    logs = logs.toString();
  } catch (err) {
    logs = "";
  }

  const signals = collectSignals({
    state,
    exitCode,
    restartCount,
    logs,
  });

  const classification = classifyFailure(signals, {
    state,
    exitCode,
    restartCount,
    logs,
  });

  const containerKey = inspectData.Id || inspectData.Name;

  if (classification.type !== FAILURE_TYPES.UNKNOWN) {
    recordFailure(containerKey, {
      category: classification.type,
      confidence: classification.confidenceScore,
    });
  }

  const history = getFailureHistory(containerKey);
  const boostedConfidence = boostConfidence(classification.confidenceScore, history);
  if (typeof boostedConfidence === "number") {
    classification.confidenceScore = boostedConfidence;
  }

  const explanation = explainFailure({
    category: classification.type,
    confidence: classification.confidenceScore,
    reasons: classification.evidence,
  });

  const result = {
    containerId,
    containerName: inspectData.Name,
    type: classification.type,
    confidenceScore: classification.confidenceScore,
    summary: classification.summary,
    evidence: classification.evidence,
    restartCount,
    exitCode,
    state: state?.Status,
    explanation,
    stabilityInsight: generateStabilityInsight(history),
    analyzedAt: new Date().toISOString(),
  };

  setCachedResult(containerId, result, restartCount, state?.Status);

  return result;
}
