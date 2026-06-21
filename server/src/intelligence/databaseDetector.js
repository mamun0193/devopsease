import { readFile } from 'fs/promises';
import { join } from 'path';

// Detects databases and ORMs for a service.
export async function detectDatabase(rootPath, servicePath, language) {
  const fullServicePath = join(rootPath, servicePath);
  const databases = [];

  if (language?.name === 'Node.js') {
    try {
      const pkgPath = join(fullServicePath, 'package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      if (deps['mongoose'] || deps['mongodb']) databases.push({ type: 'MongoDB', orm: deps['mongoose'] ? 'Mongoose' : null, confidence: 0.95 });
      if (deps['pg']) databases.push({ type: 'PostgreSQL', orm: deps['prisma'] ? 'Prisma' : (deps['typeorm'] ? 'TypeORM' : null), confidence: 0.95 });
      if (deps['mysql'] || deps['mysql2']) databases.push({ type: 'MySQL', orm: null, confidence: 0.95 });
      if (deps['sqlite3']) databases.push({ type: 'SQLite', orm: null, confidence: 0.95 });
      if (deps['redis'] || deps['ioredis']) databases.push({ type: 'Redis', orm: null, confidence: 0.95 });
    } catch (err) {}
  }

  // TODO: Add Python, Java, etc.

  return databases;
}

// Detects other external dependencies (messaging, queues, etc.)
export async function detectDependencies(rootPath, servicePath, language) {
  const fullServicePath = join(rootPath, servicePath);
  const externalDeps = [];

  if (language?.name === 'Node.js') {
    try {
      const pkgPath = join(fullServicePath, 'package.json');
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
      const deps = { ...(pkg.dependencies || {}) };

      if (deps['amqplib']) externalDeps.push('RabbitMQ');
      if (deps['kafkajs']) externalDeps.push('Kafka');
      if (deps['socket.io']) externalDeps.push('Socket.IO');
      if (deps['graphql']) externalDeps.push('GraphQL');
      if (deps['bullmq'] || deps['bull']) externalDeps.push('BullMQ');
    } catch (err) {}
  }

  return externalDeps;
}
