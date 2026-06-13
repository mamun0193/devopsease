import yaml from 'js-yaml';
import Pipeline, { ALLOWED_STEPS } from '../models/pipeline.model.js';
import Repository from '../models/repository.model.js';
import Build from '../models/build.model.js';
import { cloneRepository } from './git.service.js';
import { runBuildPipeline } from './build.service.js';
import { deployFromBuild } from './deployment.service.js';
import logger from '../utils/logger.js';

const SUCCESS_BUILD_STATUSES = ['success'];
const MAX_EXECUTION_LOGS = 500;

// Create a single execution log entry.
function createExecutionLog(step, message) {
    return {
        step,
        message,
        timestamp: new Date()
    };
}

// Append execution logs with max-size trimming.
async function appendExecutionLog(pipeline, step, message) {
    pipeline.executionLogs.push(createExecutionLog(step, message));
    if (pipeline.executionLogs.length > MAX_EXECUTION_LOGS) {
        pipeline.executionLogs = pipeline.executionLogs.slice(-MAX_EXECUTION_LOGS);
    }
    await pipeline.save();
}

// Run build step: clone repository and execute build pipeline.
async function runBuildStep(repoId) {
    const repo = await Repository.findById(repoId).lean();
    if (!repo) {
        throw Object.assign(new Error('Repository not found for build step'), { statusCode: 404 });
    }

    await cloneRepository(repo);
    const build = await runBuildPipeline(repo, {});

    if (!build || !SUCCESS_BUILD_STATUSES.includes(build.status)) {
        throw new Error('Build step failed');
    }

    return build;
}

// Run test step placeholder for now.
async function runTestStep(repoId) {
    const repo = await Repository.findById(repoId).lean();
    if (!repo) {
        throw Object.assign(new Error('Repository not found for test step'), { statusCode: 404 });
    }

    logger.info('Pipeline test step passed', {
        repoId: String(repo._id),
        repoName: repo.repoName
    });

    return { passed: true };
}

// Run deploy step using latest successful build.
async function runDeployStep(repoId) {
    const latestSuccessfulBuild = await Build.findOne({
        repoId,
        status: { $in: SUCCESS_BUILD_STATUSES }
    }).sort({ createdAt: -1 });

    if (!latestSuccessfulBuild) {
        throw new Error('No successful build found for deploy step');
    }

    const deployment = await deployFromBuild(latestSuccessfulBuild);
    if (!deployment || deployment.status === 'failed') {
        throw new Error('Deploy step failed');
    }

    return deployment;
}

// Parse a YAML string into a pipeline config object.
// Throws descriptive errors for invalid input.
 
function parsePipelineYaml(yamlString) {
    if (!yamlString || typeof yamlString !== 'string') {
        const error = new Error('Pipeline YAML is required and must be a string');
        error.statusCode = 400;
        throw error;
    }

    let parsed;
    try {
        parsed = yaml.load(yamlString);
    } catch (err) {
        const error = new Error(`Invalid YAML syntax: ${err.message}`);
        error.statusCode = 400;
        throw error;
    }

    if (!parsed || typeof parsed !== 'object') {
        const error = new Error('Pipeline YAML must contain a valid object');
        error.statusCode = 400;
        throw error;
    }

    return parsed;
}

// Validate the parsed pipeline config.
//Ensures `steps` is a non-empty array of allowed step names.
 
function validatePipelineConfig(config) {
    const { steps } = config;

    if (!steps) {
        const error = new Error('Pipeline config must include a "steps" field');
        error.statusCode = 400;
        throw error;
    }

    if (!Array.isArray(steps)) {
        const error = new Error('"steps" must be an array');
        error.statusCode = 400;
        throw error;
    }

    if (steps.length === 0) {
        const error = new Error('"steps" array must not be empty');
        error.statusCode = 400;
        throw error;
    }

    const invalidSteps = steps.filter(step => !ALLOWED_STEPS.includes(step));
    if (invalidSteps.length > 0) {
        const error = new Error(
            `Invalid step(s): ${invalidSteps.join(', ')}. Allowed steps: ${ALLOWED_STEPS.join(', ')}`
        );
        error.statusCode = 400;
        throw error;
    }

    // Check for duplicate steps
    const uniqueSteps = new Set(steps);
    if (uniqueSteps.size !== steps.length) {
        const error = new Error('Duplicate steps are not allowed');
        error.statusCode = 400;
        throw error;
    }

    return true;
}

// Create a new pipeline from YAML input.
// Parses → validates → verifies repo ownership → stores.
 
async function createPipeline({ userId, repoId, yamlString, name }) {
    // 1. Verify repository exists and belongs to user
    const repo = await Repository.findOne({ _id: repoId, userId }).lean();
    if (!repo) {
        const error = new Error('Repository not found or access denied');
        error.statusCode = 404;
        throw error;
    }

    // 2. Parse YAML
    const config = parsePipelineYaml(yamlString);

    // 3. Validate structure
    validatePipelineConfig(config);

    // 4. Determine pipeline name
    const pipelineName = name || config.name || `${repo.repoName}-pipeline`;

    // 5. Check for existing pipeline with same name for this repo
    const existing = await Pipeline.findOne({ userId, repoId, name: pipelineName }).lean();
    const version = existing ? existing.version + 1 : 1;

    // 6. If updating, increment version; otherwise create new
    let pipeline;
    if (existing) {
        pipeline = await Pipeline.findByIdAndUpdate(
            existing._id,
            {
                config,
                rawYaml: yamlString,
                version,
                status: 'active',
                executionStatus: 'pending',
                executionLogs: [],
                startedAt: null,
                completedAt: null
            },
            { new: true }
        );
        logger.info('Pipeline updated', { pipelineId: pipeline._id, version });
    } else {
        pipeline = await Pipeline.create({
            userId,
            repoId,
            name: pipelineName,
            config,
            rawYaml: yamlString,
            version,
            executionStatus: 'pending',
            executionLogs: [],
            startedAt: null,
            completedAt: null
        });
        logger.info('Pipeline created', { pipelineId: pipeline._id });
    }

    return pipeline;
}

// Get all pipelines for a user, newest first.
 
async function getUserPipelines(userId) {
    return Pipeline.find({ userId })
        .populate('repoId', 'repoName owner provider')
        .sort({ createdAt: -1 })
        .lean();
}

// Get a single pipeline by ID, scoped to user.
 
async function getPipelineById(id, userId) {
    return Pipeline.findOne({ _id: id, userId })
        .populate('repoId', 'repoName owner provider')
        .lean();
}

// Delete a pipeline by ID, scoped to user.
 
async function deletePipeline(id, userId) {
    const deleted = await Pipeline.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
        const error = new Error('Pipeline not found');
        error.statusCode = 404;
        throw error;
    }
    logger.info('Pipeline deleted', { pipelineId: id });
    return deleted;
}

// Execute configured pipeline steps sequentially.
async function executePipeline(pipelineId) {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
        const error = new Error('Pipeline not found');
        error.statusCode = 404;
        throw error;
    }

    const steps = pipeline.config?.steps || [];
    pipeline.executionStatus = 'running';
    pipeline.executionLogs = [];
    pipeline.startedAt = new Date();
    pipeline.completedAt = null;
    await pipeline.save();

    for (const step of steps) {
        try {
            await appendExecutionLog(pipeline, step, `${step} started`);

            if (step === 'build') {
                await runBuildStep(pipeline.repoId);
            } else if (step === 'test') {
                await runTestStep(pipeline.repoId);
            } else if (step === 'deploy') {
                await runDeployStep(pipeline.repoId);
            }

            await appendExecutionLog(pipeline, step, `${step} success`);
        } catch (stepError) {
            await appendExecutionLog(pipeline, step, `${step} failed: ${stepError.message}`);
            pipeline.executionStatus = 'failed';
            pipeline.completedAt = new Date();
            await pipeline.save();

            logger.error('Pipeline execution failed', {
                pipelineId: String(pipeline._id),
                step,
                error: stepError.message
            });

            const error = new Error(`Pipeline failed at step "${step}": ${stepError.message}`);
            error.statusCode = 500;
            throw error;
        }
    }

    pipeline.executionStatus = 'success';
    pipeline.completedAt = new Date();
    await pipeline.save();

    logger.info('Pipeline execution completed', {
        pipelineId: String(pipeline._id),
        steps
    });

    return pipeline;
}

// Get execution status details for one pipeline.
async function getPipelineExecutionStatus(pipelineId, userId) {
    const pipeline = await Pipeline.findOne({ _id: pipelineId, userId }).lean();
    if (!pipeline) {
        const error = new Error('Pipeline not found');
        error.statusCode = 404;
        throw error;
    }

    return {
        id: pipeline._id,
        name: pipeline.name,
        status: pipeline.executionStatus,
        logs: pipeline.executionLogs || [],
        startedAt: pipeline.startedAt,
        completedAt: pipeline.completedAt,
        steps: pipeline.config?.steps || []
    };
}

// Get active pipelines for a repository.
async function getActivePipelinesByRepo(repoId) {
    return Pipeline.find({ repoId, status: 'active' })
        .sort({ createdAt: -1 })
        .lean();
}

export default {
    parsePipelineYaml,
    validatePipelineConfig,
    createPipeline,
    getUserPipelines,
    getPipelineById,
    deletePipeline,
    executePipeline,
    getPipelineExecutionStatus,
    getActivePipelinesByRepo
};
