// Detects independent services within a repository file tree.
 
export function detectServices(scannedData) {
  const { files, directories } = scannedData;
  const services = [];

  // Check for common workspace directories (monorepos)
  const isWorkspace = files.includes('pnpm-workspace.yaml') || files.includes('turbo.json') || files.includes('nx.json');

  if (isWorkspace) {
    const appsDirs = directories.filter(d => d.startsWith('apps/') && d.split('/').length === 2);
    const packagesDirs = directories.filter(d => d.startsWith('packages/') && d.split('/').length === 2);
    
    for (const dir of [...appsDirs, ...packagesDirs]) {
      const name = dir.split('/')[1];
      services.push({
        name,
        path: dir
      });
    }
  } else {
    // Check for Frontend + Backend split
    const hasClientServer = directories.includes('client') && directories.includes('server');
    const hasFrontendBackend = directories.includes('frontend') && directories.includes('backend');

    if (hasClientServer) {
      services.push({ name: 'frontend', path: 'client' });
      services.push({ name: 'backend', path: 'server' });
    } else if (hasFrontendBackend) {
      services.push({ name: 'frontend', path: 'frontend' });
      services.push({ name: 'backend', path: 'backend' });
    }
  }

  // If no split services were detected, assume a single root service
  if (services.length === 0) {
    services.push({
      name: 'root',
      path: '.'
    });
  }

  return services;
}
