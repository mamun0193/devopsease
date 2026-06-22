export function planDocker(analysis, blueprint) {
  for (const service of blueprint.services) {
    if (service.infrastructureStatus.dockerfileExists) {
      service.buildStrategy = { mode: 'existing' };
      continue;
    }

    const { language, framework, runtime, packageManager } = service;

    let baseImage = 'alpine:latest';
    let runtimeImage = 'alpine:latest';
    let multiStage = false;
    let buildCommand = null;
    let runCommand = null;
    let healthcheck = true;
    let nonRoot = true;

    if (language === 'javascript' || language === 'typescript') {
      baseImage = 'node:20-alpine';
      runtimeImage = 'node:20-alpine';
      
      if (framework?.name === 'react' || framework?.name === 'vue' || framework?.name === 'vite') {
        multiStage = true;
        runtimeImage = 'nginx:alpine';
        buildCommand = `${packageManager || 'npm'} run build`;
        runCommand = 'nginx -g "daemon off;"';
      } else {
        buildCommand = `${packageManager || 'npm'} install --production`;
        runCommand = `${packageManager || 'npm'} start`;
      }
    } else if (language === 'python') {
      baseImage = 'python:3.11-slim';
      runtimeImage = 'python:3.11-slim';
      buildCommand = 'pip install -r requirements.txt';
      runCommand = framework?.name === 'django' ? 'python manage.py runserver 0.0.0.0:8000' : 'uvicorn main:app --host 0.0.0.0';
    } else if (language === 'go') {
      baseImage = 'golang:1.21-alpine';
      runtimeImage = 'alpine:latest';
      multiStage = true;
      buildCommand = 'go build -o main .';
      runCommand = './main';
    } else if (language === 'java') {
      baseImage = 'maven:3.9-eclipse-temurin-21-alpine';
      runtimeImage = 'eclipse-temurin:21-jre-alpine';
      multiStage = true;
      buildCommand = 'mvn clean package -DskipTests';
      runCommand = 'java -jar app.jar';
    }

    service.buildStrategy = {
      mode: 'generated',
      baseImage,
      runtimeImage,
      multiStage,
      healthcheck,
      nonRoot,
      context: service.path,
      dockerfile: `${service.path === '.' ? '' : service.path + '/'}Dockerfile`,
      command: buildCommand,
      runCommand: runCommand,
      confidence: 0.85
    };
    
    // Warn if health endpoint is not explicitly known
    if (healthcheck && !service.ports.length) {
      blueprint.warnings.push(`Healthcheck requested but no port detected for service: ${service.name}`);
    }
  }
}
