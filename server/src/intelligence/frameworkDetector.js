import { readFile } from 'fs/promises';
import { join } from 'path';

// Parses manifests to detect frameworks and their confidence scores.
 
export async function detectFramework(rootPath, servicePath, language) {
  const fullServicePath = join(rootPath, servicePath);
  
  if (language?.name === 'Node.js') {
    try {
      const pkgPath = join(fullServicePath, 'package.json');
      const pkgRaw = await readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgRaw);
      
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      
      if (deps['next']) return { name: 'Next.js', confidence: 0.99 };
      if (deps['nuxt']) return { name: 'Nuxt', confidence: 0.99 };
      if (deps['@nestjs/core']) return { name: 'NestJS', confidence: 0.99 };
      if (deps['@remix-run/react']) return { name: 'Remix', confidence: 0.99 };
      if (deps['svelte']) return { name: 'Svelte', confidence: 0.95 };
      if (deps['@angular/core']) return { name: 'Angular', confidence: 0.95 };
      if (deps['vue']) return { name: 'Vue', confidence: 0.90 };
      if (deps['react']) return { name: 'React', confidence: 0.90 };
      if (deps['express']) return { name: 'Express', confidence: 0.90 };
      
    } catch (err) {
      // Ignore read/parse errors
    }
  }

  if (language?.name === 'Python') {
    try {
      const reqPath = join(fullServicePath, 'requirements.txt');
      const reqs = await readFile(reqPath, 'utf8');
      const lowerReqs = reqs.toLowerCase();
      
      if (lowerReqs.includes('django')) return { name: 'Django', confidence: 0.95 };
      if (lowerReqs.includes('fastapi')) return { name: 'FastAPI', confidence: 0.95 };
      if (lowerReqs.includes('flask')) return { name: 'Flask', confidence: 0.95 };
    } catch (err) {}
  }

  if (language?.name === 'Java') {
    try {
      const pomPath = join(fullServicePath, 'pom.xml');
      const pom = await readFile(pomPath, 'utf8');
      if (pom.includes('spring-boot')) return { name: 'Spring Boot', confidence: 0.95 };
    } catch (err) {}
  }

  return { name: 'None/Unknown', confidence: 0.0 };
}
