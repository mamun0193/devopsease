// Builds a dependency graph connecting services, databases, and external dependencies.
 
export function buildDependencyGraph(services) {
  const edges = [];

  // 1. Service to Database / External Deps edges
  for (const service of services) {
    for (const db of (service.databases || [])) {
      edges.push({ from: service.name, to: db.type });
    }
    
    for (const dep of (service.externalDependencies || [])) {
      edges.push({ from: service.name, to: dep });
    }
  }

  // 2. Service to Service edges (Heuristic: Frontend depends on Backend)
  const frontends = services.filter(s => ['React', 'Vue', 'Next.js', 'Nuxt', 'Angular', 'Svelte'].includes(s.framework?.name));
  const backends = services.filter(s => ['Express', 'NestJS', 'Django', 'FastAPI', 'Spring Boot'].includes(s.framework?.name));

  for (const fe of frontends) {
    for (const be of backends) {
      edges.push({ from: fe.name, to: be.name });
    }
  }

  return { edges };
}
