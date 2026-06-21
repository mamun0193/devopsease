import { readFile } from 'fs/promises';
import { join } from 'path';

// Detects runtime commands.

export async function detectRuntime(rootPath, servicePath, language, framework) {
  const fullServicePath = join(rootPath, servicePath);
  
  const runtime = {
    buildCommand: null,
    startCommand: null,
    devCommand: null
  };

  if (language?.name === 'Node.js') {
    try {
      const pkgPath = join(fullServicePath, 'package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
      const scripts = pkg.scripts || {};

      if (scripts.build) runtime.buildCommand = 'npm run build';
      if (scripts.start) runtime.startCommand = 'npm start';
      if (scripts.dev) runtime.devCommand = 'npm run dev';
    } catch (err) {}
  } else if (language?.name === 'Python') {
    if (framework?.name === 'Django') {
      runtime.startCommand = 'gunicorn myproject.wsgi'; // Fallback guess
      runtime.devCommand = 'python manage.py runserver';
    } else if (framework?.name === 'FastAPI') {
      runtime.startCommand = 'uvicorn main:app --host 0.0.0.0';
      runtime.devCommand = 'uvicorn main:app --reload';
    }
  } else if (language?.name === 'Java') {
    if (framework?.name === 'Spring Boot') {
      runtime.buildCommand = 'mvn clean package -DskipTests';
      runtime.startCommand = 'java -jar target/*.jar';
    }
  }

  return runtime;
}

// Detects common ports based on framework.

export function detectPort(framework) {
  switch (framework?.name) {
    case 'Next.js': return 3000;
    case 'React': return 5173; // Default Vite, could be 3000 for CRA
    case 'Vue': return 5173;
    case 'Express': return 4000;
    case 'NestJS': return 3000;
    case 'Django': return 8000;
    case 'FastAPI': return 8000;
    case 'Flask': return 5000;
    case 'Spring Boot': return 8080;
    case 'Laravel': return 80;
    default: return null;
  }
}
