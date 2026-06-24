import yaml from 'yaml';

export function generatePipeline(spec) {
    if (spec.pipelineExists) {
        return {
            mode: 'existing',
            reason: 'Existing CI/CD pipeline configuration detected.',
            recommendations: ['Consider reviewing pipeline steps for deployment compatibility.']
        };
    }

    const pipelineSpec = {
        name: 'Deployment Pipeline',
        on: {
            push: { branches: ['main', 'master'] }
        },
        jobs: {}
    };

    const buildJobs = [];

    for (const service of spec.services) {
        const jobId = `build-${service.name}`;
        buildJobs.push(jobId);

        pipelineSpec.jobs[jobId] = {
            runs_on: 'ubuntu-latest',
            steps: [
                { name: 'Checkout', uses: 'actions/checkout@v3' },
                { name: 'Setup environment', run: `echo Setting up ${service.language}` },
                { name: 'Install dependencies', run: getInstallCommand(service) },
                { name: 'Run tests', run: getTestCommand(service) },
                { name: 'Build Docker image', run: `docker build -t myregistry.com/${service.name}:${'${{ github.sha }}'} -f Dockerfile.${service.name} .` },
                { name: 'Push Docker image', run: `docker push myregistry.com/${service.name}:${'${{ github.sha }}'}` }
            ]
        };
    }

    pipelineSpec.jobs.deploy = {
        runs_on: 'ubuntu-latest',
        needs: buildJobs,
        steps: [
            { name: 'Deploy to Production', run: 'echo "Triggering deployment"' }
        ]
    };

    return {
        spec: pipelineSpec,
        rendered: yaml.stringify(pipelineSpec)
    };
}

function getInstallCommand(service) {
    const { language, packageManager } = service;
    if (language === 'javascript' || language === 'typescript') {
        return packageManager === 'yarn' ? 'yarn install' : packageManager === 'pnpm' ? 'pnpm install' : 'npm install';
    } else if (language === 'python') {
        return 'pip install -r requirements.txt';
    } else if (language === 'go') {
        return 'go mod download';
    } else if (language === 'java') {
        return './mvnw dependency:go-offline || ./gradlew dependencies';
    }
    return 'echo "No install command"';
}

function getTestCommand(service) {
    const { language, packageManager } = service;
    if (language === 'javascript' || language === 'typescript') {
        return packageManager === 'yarn' ? 'yarn test' : packageManager === 'pnpm' ? 'pnpm test' : 'npm test';
    } else if (language === 'python') {
        return 'pytest';
    } else if (language === 'go') {
        return 'go test ./...';
    } else if (language === 'java') {
        return './mvnw test || ./gradlew test';
    }
    return 'echo "No test command"';
}
