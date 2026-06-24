import yaml from 'yaml';

export function generateKubernetes(spec, warnings) {
    // Priority 2: Infrastructure Preservation
    const existingK8s = spec.services.some(s => s.infrastructureStatus?.kubernetesExists);
    if (existingK8s) {
        return {
            mode: 'existing',
            reason: 'Existing Kubernetes manifests detected in repository.',
            recommendations: ['Consider updating image tags in deployments.', 'Review Secret configurations.']
        };
    }

    const manifests = [];
    const internalSpecs = {};
    const REGISTRY = 'registry.devopsease.local/library'; // Standardized registry target

    for (const service of spec.services) {
        // Priority 1: Extract secrets
        const safeEnv = [];
        const secretEnv = [];
        const SENSITIVE_REGEX = /(PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL)/i;

        if (service.envVars) {
            for (const env of service.envVars) {
                const [key, value] = env.split('=');
                if (SENSITIVE_REGEX.test(key)) {
                    secretEnv.push(env);
                } else {
                    safeEnv.push(env);
                }
            }
        }

        const deployment = generateDeployment(service, safeEnv.length > 0, secretEnv.length > 0, REGISTRY);
        const svc = generateService(service);
        
        internalSpecs[service.name] = { deployment, service: svc };
        
        manifests.push({
            serviceName: service.name,
            type: 'deployment',
            path: `k8s/${service.name}-deployment.yaml`,
            content: yaml.stringify(deployment)
        });

        manifests.push({
            serviceName: service.name,
            type: 'service',
            path: `k8s/${service.name}-service.yaml`,
            content: yaml.stringify(svc)
        });

        if (safeEnv.length > 0) {
            const configMap = generateConfigMap(service, safeEnv);
            internalSpecs[service.name].configMap = configMap;
            manifests.push({
                serviceName: service.name,
                type: 'configmap',
                path: `k8s/${service.name}-configmap.yaml`,
                content: yaml.stringify(configMap)
            });
        }

        if (secretEnv.length > 0) {
            const secret = generateSecret(service, secretEnv);
            internalSpecs[service.name].secret = secret;
            manifests.push({
                serviceName: service.name,
                type: 'secret',
                path: `k8s/${service.name}-secret.yaml`,
                content: yaml.stringify(secret)
            });
        }
    }

    const webServices = spec.services.filter(s => s.type !== 'worker' && !s.name.includes('worker'));
    if (webServices.length > 0) {
        const ingress = generateIngress(webServices);
        internalSpecs.ingress = ingress;
        manifests.push({
            serviceName: 'global',
            type: 'ingress',
            path: `k8s/ingress.yaml`,
            content: yaml.stringify(ingress)
        });
    }

    return {
        spec: internalSpecs,
        manifests
    };
}

function generateDeployment(service, hasConfigMap, hasSecret, registryUrl) {
    const envFrom = [];
    if (hasConfigMap) {
        envFrom.push({ configMapRef: { name: `${service.name}-config` } });
    }
    if (hasSecret) {
        envFrom.push({ secretRef: { name: `${service.name}-secret` } });
    }

    // Priority 5: Readiness & Resources
    // Fallback parsing for CPU / memory string -> numbers, simplified here
    const limits = {
        cpu: service.resources?.cpu || '500m',
        memory: service.resources?.memory || '512Mi'
    };

    return {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
            name: `${service.name}-deployment`,
            labels: { app: service.name }
        },
        spec: {
            replicas: 1,
            selector: {
                matchLabels: { app: service.name }
            },
            template: {
                metadata: { labels: { app: service.name } },
                spec: {
                    containers: [{
                        name: service.name,
                        image: `${registryUrl}/${service.name}:latest`,
                        ports: [{ containerPort: service.port }],
                        envFrom: envFrom.length > 0 ? envFrom : undefined,
                        resources: {
                            requests: { cpu: '100m', memory: '128Mi' },
                            limits
                        },
                        livenessProbe: {
                            httpGet: { path: '/health', port: service.port },
                            initialDelaySeconds: 30,
                            periodSeconds: 10
                        },
                        readinessProbe: {
                            httpGet: { path: '/health', port: service.port },
                            initialDelaySeconds: 5,
                            periodSeconds: 10
                        }
                    }]
                }
            }
        }
    };
}

function generateService(service) {
    return {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: `${service.name}-service` },
        spec: {
            selector: { app: service.name },
            ports: [{ protocol: 'TCP', port: 80, targetPort: service.port }],
            type: 'ClusterIP'
        }
    };
}

function generateConfigMap(service, envVars) {
    const data = {};
    for (const env of envVars) {
        const [key, ...vals] = env.split('=');
        data[key] = vals.join('=') || '';
    }
    return {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: `${service.name}-config` },
        data
    };
}

function generateSecret(service, envVars) {
    const stringData = {};
    for (const env of envVars) {
        const [key, ...vals] = env.split('=');
        stringData[key] = vals.join('=') || 'TODO_REPLACE_WITH_ACTUAL_SECRET';
    }
    return {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: { name: `${service.name}-secret` },
        type: 'Opaque',
        stringData
    };
}

function generateIngress(services) {
    const rules = services.map(svc => ({
        host: `${svc.name}.example.com`,
        http: {
            paths: [{
                path: '/',
                pathType: 'Prefix',
                backend: {
                    service: {
                        name: `${svc.name}-service`,
                        port: { number: 80 }
                    }
                }
            }]
        }
    }));

    return {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
            name: 'main-ingress',
            annotations: {
                'nginx.ingress.kubernetes.io/rewrite-target': '/'
            }
        },
        spec: { rules }
    };
}
