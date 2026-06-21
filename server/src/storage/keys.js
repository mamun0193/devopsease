export const storageKeys = {
    buildLog: (buildId) => `logs/builds/${buildId}.log`,
    pipelineLog: (runId) => `logs/pipelines/${runId}.log`,
    deploymentLog: (deploymentId) => `logs/deployments/${deploymentId}.log`,
    artifact: (id) => `artifacts/${id}`,
    workspace: (repoId) => `workspaces/${repoId}`,
    upload: (id) => `uploads/${id}`,
    cache: (id) => `cache/${id}`
};
