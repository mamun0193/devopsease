import yaml from 'js-yaml';

export function generateDeploymentPreview(artifactRevision) {
    const source = artifactRevision.editedArtifacts 
        && Object.keys(artifactRevision.editedArtifacts).length > 0
        ? { ...artifactRevision._doc, ...artifactRevision.editedArtifacts }
        : artifactRevision;

    const preview = {
        services: [],
        imagesToBuild: [],
        networks: [],
        volumes: [],
        portMappings: [],
        envVarsCount: 0,
        resourceEstimates: { memory: '0MB', cpu: '0 cores' },
        costEstimation: source.costEstimate || { totalMonthly: 0, currency: 'USD' },
        deploymentOrder: [],
        warnings: source.warnings || []
    };

    if (source.compose && source.compose.content) {
        try {
            const parsed = yaml.load(source.compose.content);
            if (parsed.services) {
                preview.deploymentOrder = Object.keys(parsed.services);
                for (const [svcName, svcDef] of Object.entries(parsed.services)) {
                    preview.services.push(svcName);
                    if (svcDef.build) {
                        preview.imagesToBuild.push(svcDef.image || `${svcName}_image`);
                    }
                    if (svcDef.ports) {
                        preview.portMappings.push(...svcDef.ports);
                    }
                    if (svcDef.environment) {
                        preview.envVarsCount += Object.keys(svcDef.environment).length;
                    }
                }
            }
            if (parsed.networks) {
                preview.networks = Object.keys(parsed.networks);
            }
            if (parsed.volumes) {
                preview.volumes = Object.keys(parsed.volumes);
            }
        } catch (e) {
            preview.warnings.push(`Failed to parse docker-compose.yml for preview: ${e.message}`);
        }
    }

    // Default estimates if not provided
    preview.resourceEstimates.memory = `${preview.services.length * 256}MB`;
    preview.resourceEstimates.cpu = `${preview.services.length * 0.5} cores`;

    return preview;
}
