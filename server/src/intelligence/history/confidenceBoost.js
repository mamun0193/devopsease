export function boostConfidence(baseConfidence, history = []) {
  if (!history.length) return baseConfidence;

  const latestCategory = history[history.length - 1]?.category;
  const recentSameCategoryCount = history.filter(
    (h) => h.category === latestCategory
  ).length;

  if (typeof baseConfidence === "number") {
    if (recentSameCategoryCount >= 3) {
      return Math.min(baseConfidence + 0.1, 1.0);
    }
    if (recentSameCategoryCount === 2 && baseConfidence < 0.7) {
      return baseConfidence + 0.05;
    }
    return baseConfidence;
  }

  if (recentSameCategoryCount >= 3) {
    return "high";
  }
  if (recentSameCategoryCount === 2 && baseConfidence === "low") {
    return "medium";
  }
  return baseConfidence;
}

export function generateStabilityInsight(history = []) {
  if (history.length >= 3) {
    return "This container has failed multiple times recently, indicating a recurring issue.";
  }
  if (history.length === 2) {
    return "This container has failed more than once, suggesting a potential intermittent issue.";
  }
  if (history.length === 1) {
    return "This appears to be an isolated failure.";
  }
  return "No previous failures recorded for this container.";
}
