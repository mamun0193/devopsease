/**
 * Maps an internal database Repository model to a public Platform API DTO.
 */
export const toRepositoryDto = (repository) => {
  if (!repository) return null;
  
  return {
    id: repository._id.toString(),
    name: repository.name,
    cloneUrl: repository.url,
    defaultBranch: repository.defaultBranch || "main",
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
    // Note: internal fields like __v, credentials, or internal paths are omitted.
  };
};

/**
 * Maps an internal database Deployment model to a public Platform API DTO.
 */
export const toDeploymentDto = (deployment) => {
  if (!deployment) return null;
  
  return {
    id: deployment._id.toString(),
    repositoryId: deployment.repository?.toString(),
    status: deployment.status,
    commitSha: deployment.commitSha,
    createdAt: deployment.createdAt,
    finishedAt: deployment.finishedAt,
  };
};
