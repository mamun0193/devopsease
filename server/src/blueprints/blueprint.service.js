import { v4 as uuidv4 } from 'uuid';
import { analyzeRepository } from '../intelligence/intelligence.service.js';
import { planServices } from './servicePlanner.js';
import { planDocker } from './dockerPlanner.js';
import { planCompose } from './composePlanner.js';
import { planKubernetes } from './kubernetesPlanner.js';
import { planPipeline } from './pipelinePlanner.js';
import { planDependency } from './dependencyPlanner.js';
import { planRecommendations } from './recommendationPlanner.js';
import { planReadiness } from './readinessPlanner.js';
import { planDeployment } from './deploymentPlanner.js';
import { planResources } from './resourcePlanner.js';

export async function generateBlueprint(repoId) {
  // 1. Get Intelligence Analysis
  const analysis = await analyzeRepository(repoId);
  
  // 2. Initialize Blueprint
  const blueprint = {
    metadata: {
      blueprintId: uuidv4(),
      version: 1,
      generatedAt: new Date().toISOString(),
      generator: "Build Blueprint Engine",
      analysisVersion: analysis.metadata?.analysisVersion || 1
    },
    readiness: {},
    warnings: [],
    services: [],
    docker: {},
    compose: {},
    kubernetes: {},
    pipeline: {},
    dependencies: {},
    resources: {},
    recommendations: []
  };
  
  // 3. Run Planners sequentially
  blueprint.services = planServices(analysis, blueprint.warnings);
  
  planDocker(analysis, blueprint);
  planDeployment(analysis, blueprint);
  planDependency(analysis, blueprint);
  planPipeline(analysis, blueprint);
  planCompose(analysis, blueprint);
  planKubernetes(analysis, blueprint);
  planRecommendations(analysis, blueprint);
  planReadiness(analysis, blueprint);
  planResources(analysis, blueprint);
  
  return blueprint;
}
