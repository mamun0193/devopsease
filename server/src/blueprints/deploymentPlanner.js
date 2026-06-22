export function planDeployment(analysis, blueprint) {
  // Recommend Single Container, Docker Compose, or Kubernetes
  
  const hasExistingDocker = blueprint.services.some(s => s.infrastructureStatus.dockerfileExists);
  const hasExistingCompose = blueprint.services.some(s => s.infrastructureStatus.composeExists);
  const hasExistingK8s = blueprint.services.some(s => s.infrastructureStatus.kubernetesExists || s.infrastructureStatus.helmExists);

  if (hasExistingK8s) {
    blueprint.services.forEach(s => s.deploymentStrategy = { mode: 'kubernetes', confidence: 1.0 });
    return;
  }
  
  if (hasExistingCompose) {
    blueprint.services.forEach(s => s.deploymentStrategy = { mode: 'docker-compose', confidence: 1.0 });
    return;
  }

  const numServices = blueprint.services.length;
  const hasDatabases = blueprint.services.some(s => analysis.services.find(rs => rs.name === s.name)?.databases?.length > 0);

  let mode = 'single-container';
  let confidence = 0.8;

  if (numServices > 3 || hasDatabases) {
    mode = 'docker-compose';
    confidence = 0.95;
  } else if (numServices === 1 && !hasDatabases) {
    mode = 'single-container';
    confidence = 0.96;
  } else {
    mode = 'docker-compose';
    confidence = 0.85;
  }

  // Assign to each service
  for (const service of blueprint.services) {
    service.deploymentStrategy = { mode, confidence };
  }
}
