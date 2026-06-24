export function generateDockerIgnores(spec) {
    const ignores = [];

    const baseIgnore = [
        '.git',
        '.gitignore',
        '.dockerignore',
        'Dockerfile*',
        'docker-compose*',
        'node_modules',
        'npm-debug.log',
        'yarn-error.log',
        '.env',
        '.env.local',
        '.env.development',
        '.env.production',
        'coverage',
        'build',
        'dist',
        '.next',
        '.nuxt',
        '.output',
        'tmp',
        'temp',
        'logs'
    ].join('\n');

    for (const service of spec.services) {
        let content = baseIgnore;

        if (service.language === 'python') {
            content += '\n__pycache__\n*.pyc\n*.pyo\n*.pyd\n.Python\nenv/\nvenv/\n.venv/\n*.egg-info/';
        } else if (service.language === 'java') {
            content += '\ntarget/\nbuild/\n.gradle/\n*.jar\n*.war';
        } else if (service.language === 'go') {
            content += '\nbin/\n*.exe\n*.exe~\n*.dll\n*.so\n*.dylib';
        }

        ignores.push({
            serviceName: service.name,
            path: `.dockerignore.${service.name}`,
            content
        });
    }

    return ignores;
}
