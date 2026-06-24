export function buildArtifactSpecification(blueprint, warnings) {
    const spec = {
        services: [],
        pipelineExists: !!(blueprint.pipeline && blueprint.pipeline.exists) || false
    };

    if (!blueprint.services || blueprint.services.length === 0) {
        warnings.push("No services found in blueprint. Artifact generation may be empty.");
        return spec;
    }

    // Process each service
    for (const service of blueprint.services) {
        const serviceSpec = {
            id: service.id,
            name: service.name,
            type: service.type,
            language: service.language,
            framework: service.framework,
            packageManager: service.packageManager,
            port: service.port || 3000,
            hasDockerfile: service.docker?.hasDockerfile || false,
            dockerfilePath: service.docker?.dockerfilePath || null,
            envVars: service.envVars || [],
            dependencies: service.dependencies || [],
            databaseConfig: service.databaseConfig || null,
            redisConfig: service.redisConfig || null,
            resources: blueprint.resources?.[service.name] || { cpu: "0.5", memory: "512Mi" },
            infrastructureStatus: service.infrastructureStatus || {
                dockerfileExists: false,
                composeExists: false,
                kubernetesExists: false
            }
        };

        // If port was inferred, log a warning
        if (service.portInferred) {
            warnings.push(`Assumed port ${serviceSpec.port} for service ${service.name}.`);
        }

        spec.services.push(serviceSpec);
    }

    return spec;
}
