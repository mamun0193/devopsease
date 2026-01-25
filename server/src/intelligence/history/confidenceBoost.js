//Adjust confidence based on historical patterns of failures

export function boostConfidence(baseConfidence, history = []) {
  if (!history.length) return baseConfidence;

  const recentSameCategoryCount = history.filter(
    (h) => h.category === history[history.length - 1].category
  ).length;

  // Simple rule-based boost
  if (recentSameCategoryCount >= 3) {
    return 'high';
  }

  if (recentSameCategoryCount === 2 && baseConfidence === 'low') {
    return 'medium';
  }

  return baseConfidence;
}


// Generate human-readable stability insight


export function generateStabilityInsight(history = []) {
  if (history.length >= 3) {
    return 'This container has failed multiple times recently, indicating a recurring issue.';
  }

  if (history.length === 2) {
    return 'This container has failed more than once, suggesting a potential intermittent issue.';
  }

  if (history.length === 1) {
    return 'This appears to be an isolated failure.';
  }

  return 'No previous failures recorded for this container.';
}
