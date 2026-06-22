export function planKubernetes(analysis, blueprint) {
  const hasExistingK8s = blueprint.services.some(s => s.infrastructureStatus.kubernetesExists || s.infrastructureStatus.helmExists) || 
                         (analysis.infrastructure && analysis.infrastructure.kubernetes);

  if (hasExistingK8s) {
    blueprint.kubernetes = { mode: 'existing' };
    return;
  }

  // Generate k8s resources
  const resources = [];

  for (const service of blueprint.services) {
    const labels = { app: service.name };

    // Deployment
    const deployment = {
      kind: 'Deployment',
      name: service.name,
      replicas: 1,
      labels,
      containers: [
        {
          name: service.name,
          image: `${service.name}:latest`, // Placeholder image
          ports: service.ports.map(p => ({ containerPort: p })),
          resources: {
            requests: { memory: "256Mi", cpu: "200m" },
            limits: { memory: "512Mi", cpu: "500m" }
          }
        }
      ]
    };
    resources.push(deployment);

    // Service
    if (service.ports.length > 0) {
      const svc = {
        kind: 'Service',
        name: service.name,
        labels,
        ports: service.ports.map(p => ({ port: p, targetPort: p }))
      };
      resources.push(svc);
    }
  }

  blueprint.kubernetes = {
    mode: 'generated',
    resources
  };
}
