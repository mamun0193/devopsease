export function planServices(analysis, warnings) {
  const services = [];

  for (const raw of (analysis.services || [])) {
    const frameworkConf = raw.framework ? 0.90 : 0.0;
    const runtimeConf = raw.runtime?.name ? 0.85 : 0.0;

    const inf = raw.infrastructure || {};
    const infrastructureStatus = {
      dockerfileExists: !!inf.dockerfile,
      composeExists: !!inf.dockerCompose,
      helmExists: !!inf.helm,
      kubernetesExists: !!inf.kubernetes,
      ciExists: !!inf.ci,
    };

    const ports = [];
    if (raw.runtime?.port) {
      ports.push(raw.runtime.port);
    } else {
      warnings.push(`Port inferred from defaults for service: ${raw.name}`);
    }

    if (!infrastructureStatus.dockerfileExists) {
      warnings.push(`Dockerfile missing for service: ${raw.name}`);
    }

    services.push({
      name: raw.name,
      path: raw.path,
      language: raw.language,
      framework: {
        name: raw.framework || null,
        confidence: frameworkConf,
      },
      runtime: {
        name: raw.runtime?.name || null,
        confidence: runtimeConf,
      },
      packageManager: raw.packageManager,
      ports,
      buildStrategy: {},
      deploymentStrategy: {},
      dependencies: [],
      infrastructureStatus,
    });
  }

  return services;
}
