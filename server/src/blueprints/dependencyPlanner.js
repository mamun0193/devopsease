export function planDependency(analysis, blueprint) {
  // analysis.dependencyGraph structure: { graph: { [serviceName]: [deps...] }, ... }
  // We'll simplify the topological sort for demonstration.
  
  const graph = analysis.dependencyGraph?.graph || {};
  const allServices = blueprint.services.map(s => s.name);
  
  // Also include databases found in analysis
  const dbs = new Set();
  for (const rs of (analysis.services || [])) {
    if (rs.databases) {
      rs.databases.forEach(db => dbs.add(db));
    }
  }

  const deploymentOrder = [...dbs, ...allServices]; // extremely simplified
  const startupOrder = [...dbs, ...allServices];
  const shutdownOrder = [...startupOrder].reverse();

  // Populate service dependencies
  for (const service of blueprint.services) {
    const deps = graph[service.name] || [];
    const rs = analysis.services.find(s => s.name === service.name);
    if (rs && rs.databases) {
      deps.push(...rs.databases);
    }
    service.dependencies = [...new Set(deps)];
  }

  blueprint.dependencies = {
    deploymentOrder,
    startupOrder,
    shutdownOrder
  };
}
