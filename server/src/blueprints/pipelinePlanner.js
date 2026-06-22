export function planPipeline(analysis, blueprint) {
  const hasExistingCI = blueprint.services.some(s => s.infrastructureStatus.ciExists) || 
                        (analysis.infrastructure && analysis.infrastructure.ci);

  if (hasExistingCI) {
    blueprint.pipeline = { mode: 'existing' };
    return;
  }

  const stages = [];
  const allServices = blueprint.services.map(s => s.name);

  // Example dynamic stage generation based on dependencies
  stages.push({ name: 'Checkout', services: [] });
  stages.push({ name: 'Install Dependencies', services: allServices });
  stages.push({ name: 'Lint & Test', services: allServices });
  
  // Group builds
  stages.push({ name: 'Build Images', services: allServices });
  
  // Group push
  stages.push({ name: 'Push Images', services: allServices });
  
  // Group deploy based on order
  const deploymentOrder = blueprint.dependencies?.deploymentOrder || allServices;
  const deployServices = deploymentOrder.filter(s => allServices.includes(s));
  stages.push({ name: 'Deploy', services: deployServices });

  blueprint.pipeline = {
    mode: 'generated',
    stages
  };
}
