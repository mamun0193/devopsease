// Detects the package manager and its lockfile for a service.
 
export function detectPackageManager(servicePath, language, files) {
  const prefix = servicePath === '.' ? '' : `${servicePath}/`;

  if (language?.name === 'Node.js') {
    if (files.includes(`${prefix}pnpm-lock.yaml`)) return { name: 'pnpm', lockfile: 'pnpm-lock.yaml' };
    if (files.includes(`${prefix}yarn.lock`)) return { name: 'yarn', lockfile: 'yarn.lock' };
    if (files.includes(`${prefix}bun.lockb`)) return { name: 'bun', lockfile: 'bun.lockb' };
    if (files.includes(`${prefix}package-lock.json`)) return { name: 'npm', lockfile: 'package-lock.json' };
    return { name: 'npm', lockfile: null }; // Default to npm
  }

  if (language?.name === 'Python') {
    if (files.includes(`${prefix}poetry.lock`)) return { name: 'poetry', lockfile: 'poetry.lock' };
    if (files.includes(`${prefix}Pipfile.lock`)) return { name: 'pipenv', lockfile: 'Pipfile.lock' };
    if (files.includes(`${prefix}requirements.txt`)) return { name: 'pip', lockfile: null };
  }

  if (language?.name === 'Java') {
    if (files.includes(`${prefix}pom.xml`)) return { name: 'Maven', lockfile: null };
    if (files.includes(`${prefix}build.gradle`)) return { name: 'Gradle', lockfile: null };
  }

  if (language?.name === 'PHP') {
    if (files.includes(`${prefix}composer.lock`)) return { name: 'Composer', lockfile: 'composer.lock' };
    return { name: 'Composer', lockfile: null };
  }

  if (language?.name === 'Go') {
    if (files.includes(`${prefix}go.sum`)) return { name: 'Go Modules', lockfile: 'go.sum' };
    return { name: 'Go Modules', lockfile: null };
  }

  return { name: 'Unknown', lockfile: null };
}
