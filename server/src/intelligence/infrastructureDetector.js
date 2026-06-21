// Detects existing infrastructure files for a service.
 
export function detectInfrastructure(servicePath, files, directories) {
  const prefix = servicePath === '.' ? '' : `${servicePath}/`;
  
  const infra = {
    dockerfile: null,
    compose: null,
    devopsease: null,
    helm: null,
    k8s: []
  };

  if (files.includes(`${prefix}Dockerfile`)) infra.dockerfile = `${prefix}Dockerfile`;
  if (files.includes(`${prefix}docker-compose.yml`)) infra.compose = `${prefix}docker-compose.yml`;
  if (files.includes(`${prefix}compose.yaml`)) infra.compose = `${prefix}compose.yaml`;
  if (files.includes(`${prefix}devopsease.yml`)) infra.devopsease = `${prefix}devopsease.yml`;

  if (directories.includes(`${prefix}helm`)) infra.helm = `${prefix}helm`;
  else if (directories.includes(`${prefix}charts`)) infra.helm = `${prefix}charts`;

  const k8sDir = `${prefix}k8s`;
  if (directories.includes(k8sDir)) {
    infra.k8s = files.filter(f => f.startsWith(`${k8sDir}/`) && (f.endsWith('.yaml') || f.endsWith('.yml')));
  }

  return infra;
}
