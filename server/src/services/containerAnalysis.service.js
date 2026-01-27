import docker from "../docker/client.js";
import { collectSignals } from "../intelligence/signals/index.js";
import { classifyFailure } from "../intelligence/classifier.js";
import { explainFailure } from "../intelligence/explainer.js";
import {
  recordFailure,
  getFailureHistory,
} from "../intelligence/history/failureHistory.store.js";

import {
  boostConfidence,
  generateStabilityInsight,
} from "../intelligence/history/confidenceBoost.js";

/**
 * Analyze a container and return failure intelligence
 */

export async function analyzeContainer(containerId) {
  if (!containerId) {
    throw new Error("containerId is required for analysis");
  }

  const container = docker.getContainer(containerId);

  // Inspect container
  const inspectData = await container.inspect();
  const state = inspectData.State;

  // Fetch recent logs (last 200 lines)
  let logs = "";
  try {
    logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 200,
    });
    logs = logs.toString();
  } catch (err) {
    // Logs may not always be available
    logs = "";
  }

  // Collect failure signals
  const signals = collectSignals({
    state,
    exitCode: state?.ExitCode,
    restartCount: state?.RestartCount,
    logs,
  });

  // Classify failure
  const failure = classifyFailure(signals);
  const containerKey = inspectData.Id || inspectData.Name;

  // Record meaningful failures only
  if (failure.category !== "unknown") {
    recordFailure(containerKey, failure);
  }

  // Get failure history(recent 10)
  const history = getFailureHistory(containerKey);

  // Boost confidence based on history
  failure.confidence = boostConfidence(failure.confidence, history);

  // Attach history data to failure metadata
  
   failure.metadata = {
    ...failure.metadata,
    historyInsight: generateStabilityInsight(history),
    recentFailures: history
  };

  // Generate human explanation
  const explanation = explainFailure(failure);

  // Final analysis result
  return {
    containerId,
    containerName: inspectData.Name,
    state: state?.Status,
    failure,
    explanation,
  };
}
