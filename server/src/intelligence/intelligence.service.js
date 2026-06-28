import { getWorkspacePath, validateSafePath } from '../utils/workspace.js';
import { getLatestCommit } from '../services/git.service.js';
import Repository from '../models/repository.model.js';
import { scanRepository } from './repositoryScanner.js';
import { detectServices } from './projectStructureDetector.js';
import { detectLanguage } from './languageDetector.js';
import { detectPackageManager } from './packageManagerDetector.js';
import { detectFramework } from './frameworkDetector.js';
import { detectInfrastructure } from './infrastructureDetector.js';
import { detectBuildContext } from './buildContextDetector.js';
import { detectRuntime, detectPort } from './runtimeDetector.js';
import { detectDatabase, detectDependencies } from './databaseDetector.js';
import { buildDependencyGraph } from './dependencyGraph.js';
import { scanEnvironmentVariables } from './envScanner.js';
import logger from '../utils/logger.js';

const analysisCache = new Map();

// Placeholder hook for future AI-based overrides.
async function postProcessAnalysis(analysis) {
  return analysis;
}

export async function analyzeRepository(repoId) {
  const startTime = Date.now();
  
  const repo = await Repository.findById(repoId).lean();
  if (!repo) throw new Error('Repository not found');

  // Ensure code is available locally
  // Assuming git.service.js or build.service.js pulled it recently.
  // We'll use the workspace path.
  const workspacePath = getWorkspacePath(repo.userId, repo._id);
  validateSafePath(workspacePath);

  // Get current commit hash for caching
  const commitInfo = await getLatestCommit(repo).catch(() => null);
  const commitHash = commitInfo?.commitHash || 'unknown';

  // Check cache
  const cacheKey = `${repoId}:${commitHash}`;
  if (analysisCache.has(cacheKey)) {
    logger.info(`Returning cached analysis for ${repoId} at ${commitHash}`);
    return analysisCache.get(cacheKey);
  }

  logger.info(`Starting Intelligence Engine analysis for ${repoId}`);

  // 1. Scan Repository
  const scanData = await scanRepository(workspacePath);
  
  // 2. Identify Services
  const detectedServices = detectServices(scanData);

  const services = [];

  // 3. Run Detectors per Service
  for (const srv of detectedServices) {
    const language = detectLanguage(srv.path, scanData.files);
    const packageManager = detectPackageManager(srv.path, language, scanData.files);
    const framework = await detectFramework(workspacePath, srv.path, language);
    const infrastructure = detectInfrastructure(srv.path, scanData.files, scanData.directories);
    const build = detectBuildContext(srv.path, language, framework, scanData.files);
    const runtime = await detectRuntime(workspacePath, srv.path, language, framework);
    const port = detectPort(framework);
    const databases = await detectDatabase(workspacePath, srv.path, language);
    const externalDeps = await detectDependencies(workspacePath, srv.path, language);

    // Identify env files belonging to this service
    const prefix = srv.path === '.' ? '' : `${srv.path}/`;
    const envFiles = scanData.envFiles.filter(f => prefix === '' ? !f.includes('/') : f.startsWith(prefix));

    services.push({
      name: srv.name,
      path: srv.path,
      language,
      framework,
      packageManager,
      build,
      runtime: {
        ...runtime,
        port
      },
      infrastructure,
      envFiles,
      databases,
      externalDependencies: externalDeps
    });
  }

  // 4. Build Dependency Graph
  const dependencyGraph = buildDependencyGraph(services);

  // 5. Environment Variable Detection
  let environmentVariables = { variables: [], metadata: {} };
  try {
    environmentVariables = await scanEnvironmentVariables(workspacePath, detectedServices);
  } catch (envScanErr) {
    logger.warn('Env scanner failed during analysis — skipping', {
      repoId: String(repoId),
      error: envScanErr.message,
    });
  }

  const durationMs = Date.now() - startTime;

  // 6. Construct Normalized Object
  let analysis = {
    metadata: {
      analysisVersion: 1,
      durationMs,
      analyzedAt: new Date().toISOString(),
      commitHash,
      warnings: []
    },
    services,
    dependencyGraph,
    environmentVariables,
  };

  // 6. AI Post-Processing Hook
  analysis = await postProcessAnalysis(analysis);

  // Cache and return
  if (commitHash !== 'unknown') {
    analysisCache.set(cacheKey, analysis);
  }

  return analysis;
}
