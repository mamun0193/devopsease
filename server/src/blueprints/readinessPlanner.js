export function planReadiness(analysis, blueprint) {
  const readiness = {
    docker: { score: 0, explanation: '' },
    ci: { score: 0, explanation: '' },
    production: { score: 0, explanation: '' },
    testing: { score: 0, explanation: '' },
    configuration: { score: 0, explanation: '' },
  };

  const hasDockerfile = blueprint.services.some(s => s.infrastructureStatus.dockerfileExists);
  if (hasDockerfile) {
    readiness.docker.score = 100;
    readiness.docker.explanation = 'Dockerfiles are explicitly defined.';
  } else {
    readiness.docker.score = 80;
    readiness.docker.explanation = 'Dockerfiles can be automatically generated from analysis.';
  }

  const hasCI = blueprint.services.some(s => s.infrastructureStatus.ciExists);
  if (hasCI) {
    readiness.ci.score = 100;
    readiness.ci.explanation = 'Existing CI/CD configuration detected.';
  } else {
    readiness.ci.score = 50;
    readiness.ci.explanation = 'No CI/CD configuration found. Will generate a basic pipeline.';
  }

  const hasHealth = blueprint.services.every(s => s.ports.length > 0);
  if (hasHealth) {
    readiness.production.score = 90;
    readiness.production.explanation = 'Ports are exposed, allowing for health checks.';
  } else {
    readiness.production.score = 40;
    readiness.production.explanation = 'No clear healthcheck ports detected. Production stability might be reduced.';
  }

  // Placeholder for testing, as Intelligence engine doesn't deeply scan for tests yet.
  readiness.testing.score = 0;
  readiness.testing.explanation = 'No tests detected during static analysis.';

  // Configuration readiness — based on env variable detection
  const envVars = analysis.environmentVariables;
  if (envVars && envVars.variables && envVars.variables.length > 0) {
    const hasEnvTemplate = analysis.services.some(s =>
      s.envFiles && s.envFiles.length > 0,
    );
    const detectedCount = envVars.variables.length;
    const secretCount = envVars.variables.filter(v => v.isSecret).length;

    if (hasEnvTemplate && secretCount === 0) {
      readiness.configuration.score = 100;
      readiness.configuration.explanation = `${detectedCount} env variable(s) detected with template files. No secrets required.`;
    } else if (hasEnvTemplate) {
      readiness.configuration.score = 85;
      readiness.configuration.explanation = `${detectedCount} env variable(s) detected including ${secretCount} secret(s). Template files present.`;
    } else if (secretCount > 0) {
      readiness.configuration.score = 60;
      readiness.configuration.explanation = `${detectedCount} env variable(s) detected including ${secretCount} secret(s). No .env.example template found.`;
    } else {
      readiness.configuration.score = 80;
      readiness.configuration.explanation = `${detectedCount} env variable(s) detected from source code. Consider adding a .env.example file.`;
    }
  } else {
    readiness.configuration.score = 50;
    readiness.configuration.explanation = 'No environment variables detected during analysis. This may indicate an incomplete scan or no env var usage.';
  }

  blueprint.readiness = readiness;
}
