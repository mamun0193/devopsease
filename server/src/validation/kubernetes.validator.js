export function validateKubernetes(artifacts) {
    const warnings = [];
    let score = 100;

    if (!artifacts || !artifacts.kubernetes || Object.keys(artifacts.kubernetes).length === 0) {
        // Not all apps require K8s, so we don't heavily penalize, but score might reflect 0 if absent
        return { score: 100, warnings, isValid: true };
    }

    // Basic checking of typical k8s files (deployment.yaml, service.yaml)
    const k8sContent = Object.values(artifacts.kubernetes).join('\n');
    
    if (!k8sContent.includes('apiVersion:') || !k8sContent.includes('kind:')) {
        warnings.push("Kubernetes manifests missing apiVersion or kind.");
        score -= 50;
    }

    const isValid = score >= 50;
    return { score: Math.max(0, score), warnings, isValid };
}
