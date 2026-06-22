export function planRecommendations(analysis, blueprint) {
  const recommendations = [];

  const totalServices = blueprint.services.length;
  if (totalServices > 0) {
    recommendations.push({
      type: 'Architecture',
      value: `${totalServices} Service(s) Detected`,
      reason: 'Repository analysis identified distinct deployable units.'
    });
  }

  const mode = blueprint.services[0]?.deploymentStrategy?.mode;
  if (mode === 'docker-compose') {
    recommendations.push({
      type: 'DeploymentMode',
      value: 'Docker Compose',
      reason: 'Multiple interdependent services detected without existing Kubernetes manifests.',
      confidence: blueprint.services[0]?.deploymentStrategy?.confidence || 0.90
    });
  } else if (mode === 'single-container') {
    recommendations.push({
      type: 'DeploymentMode',
      value: 'Single Container',
      reason: 'A single, independent service was detected.',
      confidence: blueprint.services[0]?.deploymentStrategy?.confidence || 0.96
    });
  } else if (mode === 'kubernetes') {
    recommendations.push({
      type: 'DeploymentMode',
      value: 'Kubernetes',
      reason: 'Existing Kubernetes manifests or Helm charts detected.',
      confidence: 1.0
    });
  }

  blueprint.recommendations = recommendations;
}
