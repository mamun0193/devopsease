// Registry Configuration Abstraction
// In the future, this could be loaded from the database via a RegistryCredential model.

export const getRegistryConfig = async (repoId) => {
    // Default fallback to local or dockerhub if no specific DB configuration exists yet
    return {
        provider: process.env.REGISTRY_PROVIDER || 'local', // dockerhub | ghcr | ecr | gcr | acr | local
        registry: process.env.REGISTRY_URL || '',
        namespace: process.env.REGISTRY_NAMESPACE || 'devopsease',
        repository: `repo-${repoId}`,
        credentialsRef: process.env.REGISTRY_CREDENTIALS_REF || null
    };
};
