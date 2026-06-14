import yaml from 'js-yaml';
import { spawn } from 'child_process';
import path from 'path';
import Pipeline, { ALLOWED_STEPS } from '../models/pipeline.model.js';
import PipelineRun from '../models/pipelineRun.model.js';
import Repository from '../models/repository.model.js';
import Build from '../models/build.model.js';
import { cloneRepository } from './git.service.js';
import { runBuildPipeline } from './build.service.js';
import { deployFromBuild } from './deployment.service.js';
import { initLogFile, appendLogLine, closeAppendStream, getLogSize } from './pipelineLog.service.js';
import { detectProjectType, PROJECT_TYPES } from './projectDetector.service.js';
import { getWorkspacePath, validateSafePath } from '../utils/workspace.js';
import logger from '../utils/logger.js';

const SUCCESS_BUILD_STATUSES = ['success'];
const MAX_EXECUTION_LOGS = 500;
const TEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TEST_OUTPUT_BYTES = 10 * 1024 * 1024; // 10MB

// Helper to push logs to both in-memory summary and filesystem log
function pushPipelineLog(memoryBuffer, logPath, message) {
    const timestampedMsg = `[${new Date().toISOString()}] ${message}`;
    memoryBuffer.push(timestampedMsg);
    if (memoryBuffer.length > MAX_EXECUTION_LOGS) {
        memoryBuffer.shift(); // Keep size bounded
    }
    if (logPath) {
        appendLogLine(logPath, timestampedMsg);
    }
}

// Run build step: clone repository and execute build pipeline.
// skipAutoDeploy prevents the build service from auto-deploying,
// since the pipeline manages its own deploy step.
async function runBuildStep(repoId) {
    const repo = await Repository.findById(repoId).lean();
    if (!repo) {
        throw Object.assign(new Error('Repository not found for build step'), { statusCode: 404 });
    }

    await cloneRepository(repo);
    const build = await runBuildPipeline(repo, { skipAutoDeploy: true });

    if (!build || !SUCCESS_BUILD_STATUSES.includes(build.status)) {
        throw new Error(`Build step failed${build?.error ? ': ' + build.error : ''}`);
    }

    return build;
}

// Run test step with real execution
async function runTestStep(repoId, logPath, memoryBuffer) {
    const repo = await Repository.findById(repoId).lean();
    if (!repo) {
        throw Object.assign(new Error('Repository not found for test step'), { statusCode: 404 });
    }

    const workspacePath = getWorkspacePath(repo.userId, repo._id);
    validateSafePath(workspacePath);

    const detection = await detectProjectType(workspacePath);
    let command = '';
    let args = [];

    if (detection.type === PROJECT_TYPES.NODE) {
        if (!detection.node?.name) {
             pushPipelineLog(memoryBuffer, logPath, '[test] no package.json found, skipping test step');
             return { passed: true, exitCode: 0 };
        }
        command = 'npm';
        args = ['test'];
    } else if (detection.type === PROJECT_TYPES.PYTHON) {
        command = 'pytest';
        args = [];
    } else {
        pushPipelineLog(memoryBuffer, logPath, `[test] skipped — no test runner detected for type: ${detection.type}`);
        return { passed: true, exitCode: 0 };
    }

    pushPipelineLog(memoryBuffer, logPath, `[test] running ${command} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
        const testProcess = spawn(command, args, {
            cwd: workspacePath,
            shell: true,
            env: { ...process.env, CI: 'true' }
        });

        let outputSize = 0;
        let timeoutHandle;

        const cleanup = () => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
        };

        const handleData = (data) => {
            outputSize += data.length;
            if (outputSize > MAX_TEST_OUTPUT_BYTES) {
                pushPipelineLog(memoryBuffer, logPath, `[test] ERROR: Test output exceeded maximum size of 10MB`);
                testProcess.kill('SIGKILL');
                return;
            }
            
            // Split into lines to prevent massive single-line blocks
            const lines = data.toString('utf8').split('\n');
            for (const line of lines) {
                if (line.trim()) pushPipelineLog(memoryBuffer, logPath, `[test output] ${line}`);
            }
        };

        testProcess.stdout.on('data', handleData);
        testProcess.stderr.on('data', handleData);

        timeoutHandle = setTimeout(() => {
            pushPipelineLog(memoryBuffer, logPath, `[test] ERROR: Test step exceeded 5 minute timeout`);
            testProcess.kill('SIGKILL');
            reject(new Error('Test step timeout'));
        }, TEST_TIMEOUT_MS);

        testProcess.on('error', (err) => {
            cleanup();
            reject(new Error(`Failed to spawn test process: ${err.message}`));
        });

        testProcess.on('close', (code) => {
            cleanup();
            if (code === 0) {
                pushPipelineLog(memoryBuffer, logPath, `[test] completed successfully`);
                resolve({ passed: true, exitCode: code });
            } else if (code === null) {
                reject(new Error('Test process was killed'));
            } else {
                reject(new Error(`Test step failed with exit code ${code}`));
            }
        });
    });
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
    
    // Also cleanup pipeline runs
    await PipelineRun.deleteMany({ pipelineId: id });
    
    logger.info('Pipeline deleted', { pipelineId: id });
    return deleted;
}

// Execute configured pipeline steps sequentially.
async function executePipeline(pipelineId, options = {}) {
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
        const error = new Error('Pipeline not found');
        error.statusCode = 404;
        throw error;
    }

    const { triggerSource = 'manual', commitHash = null, branch = null, commitMessage = null, author = null } = options;
    const stepsConfig = pipeline.config?.steps || [];
    
    const runSteps = stepsConfig.map(name => ({
        name,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        duration: null
    }));

    // Create PipelineRun document
    const run = await PipelineRun.create({
        pipelineId: pipeline._id,
        repositoryId: pipeline.repoId,
        userId: pipeline.userId,
        commitHash,
        commitMessage,
        author,
        branch,
        triggerSource,
        status: 'running',
        startedAt: new Date(),
        steps: runSteps
    });

    const logPath = await initLogFile(run._id.toString());
    run.logPath = logPath;
    await run.save();

    pipeline.executionStatus = 'running';
    pipeline.startedAt = run.startedAt;
    pipeline.completedAt = null;
    await pipeline.save();

    // Execute the steps asynchronously in the background
    _runPipelineStepsInBackground(pipeline, run, stepsConfig, logPath).catch(err => {
        logger.error('Pipeline background execution failed', { error: err.message, pipelineId: String(pipeline._id) });
    });

    return { pipeline, run };
}

// Background task to run steps
async function _runPipelineStepsInBackground(pipeline, run, stepsConfig, logPath) {
    const memoryLogBuffer = [];

    for (let i = 0; i < stepsConfig.length; i++) {
        const stepName = stepsConfig[i];
        const stepIndex = i;
        
        run.steps[stepIndex].status = 'running';
        run.steps[stepIndex].startedAt = new Date();
        await run.save();
        
        const stepStartTime = Date.now();

        try {
            pushPipelineLog(memoryLogBuffer, logPath, `[step:${stepName}] started`);

            if (stepName === 'build') {
                const build = await runBuildStep(pipeline.repoId);
                run.buildId = build._id;
            } else if (stepName === 'test') {
                await runTestStep(pipeline.repoId, logPath, memoryLogBuffer);
            } else if (stepName === 'deploy') {
                const deploy = await runDeployStep(pipeline.repoId);
                run.deploymentId = deploy._id;
            }

            pushPipelineLog(memoryLogBuffer, logPath, `[step:${stepName}] success`);
            
            run.steps[stepIndex].status = 'success';
            run.steps[stepIndex].completedAt = new Date();
            run.steps[stepIndex].duration = Date.now() - stepStartTime;
            await run.save();
            
        } catch (stepError) {
            pushPipelineLog(memoryLogBuffer, logPath, `[step:${stepName}] failed: ${stepError.message}`);
            
            run.steps[stepIndex].status = 'failed';
            run.steps[stepIndex].completedAt = new Date();
            run.steps[stepIndex].duration = Date.now() - stepStartTime;
            
            // Mark remaining steps as skipped
            for (let j = i + 1; j < stepsConfig.length; j++) {
                run.steps[j].status = 'skipped';
            }
            
            run.status = 'failed';
            run.error = `Pipeline failed at step "${stepName}": ${stepError.message}`;
            run.completedAt = new Date();
            run.duration = Date.now() - run.startedAt.getTime();
            
            closeAppendStream(logPath);
            run.logSize = await getLogSize(logPath);
            run.logSummary = memoryLogBuffer.join('\n');
            run.lastLogAt = new Date();
            await run.save();

            pipeline.executionStatus = 'failed';
            pipeline.completedAt = run.completedAt;
            await pipeline.save();

            logger.error('Pipeline execution failed', {
                pipelineId: String(pipeline._id),
                runId: String(run._id),
                step: stepName,
                error: stepError.message
            });

            return;
        }
    }

    run.status = 'success';
    run.completedAt = new Date();
    run.duration = Date.now() - run.startedAt.getTime();
    
    closeAppendStream(logPath);
    run.logSize = await getLogSize(logPath);
    run.logSummary = memoryLogBuffer.join('\n');
    run.lastLogAt = new Date();
    await run.save();

    pipeline.executionStatus = 'success';
    pipeline.completedAt = run.completedAt;
    await pipeline.save();

    logger.info('Pipeline execution completed', {
        pipelineId: String(pipeline._id),
        runId: String(run._id)
    });
}

// Get execution status details for one pipeline (legacy fallback)
async function getPipelineExecutionStatus(pipelineId, userId) {
    const pipeline = await Pipeline.findOne({ _id: pipelineId, userId }).lean();
    if (!pipeline) {
        const error = new Error('Pipeline not found');
        error.statusCode = 404;
        throw error;
    }
    
    const latestRun = await PipelineRun.findOne({ pipelineId }).sort({ createdAt: -1 }).lean();

    return {
        id: pipeline._id,
        name: pipeline.name,
        status: pipeline.executionStatus,
        startedAt: pipeline.startedAt,
        completedAt: pipeline.completedAt,
        steps: pipeline.config?.steps || [],
        latestRunId: latestRun?._id || null
    };
}

// Get active pipelines for a repository.
async function getActivePipelinesByRepo(repoId) {
    return Pipeline.find({ repoId, status: 'active' })
        .sort({ createdAt: -1 })
        .lean();
}

async function getPipelineRuns(pipelineId, userId, { limit = 50, skip = 0 }) {
    // Verify ownership
    const pipeline = await Pipeline.findOne({ _id: pipelineId, userId }).lean();
    if (!pipeline) {
        const error = new Error('Pipeline not found');
        error.statusCode = 404;
        throw error;
    }

    return PipelineRun.find({ pipelineId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
}

async function getPipelineRunById(runId, userId) {
    return PipelineRun.findOne({ _id: runId, userId }).lean();
}

async function getPipelineMetrics(pipelineId, userId) {
    // Verify ownership
    const pipeline = await Pipeline.findOne({ _id: pipelineId, userId }).lean();
    if (!pipeline) {
        const error = new Error('Pipeline not found');
        error.statusCode = 404;
        throw error;
    }

    const metrics = await PipelineRun.aggregate([
        { $match: { pipelineId: pipeline._id } },
        { 
            $group: {
                _id: null,
                totalRuns: { $sum: 1 },
                successfulRuns: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
                failedRuns: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                avgDurationMs: { $avg: '$duration' },
                lastRunAt: { $max: '$startedAt' }
            }
        }
    ]);

    if (metrics.length === 0) {
        return {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            avgDurationMs: 0,
            lastRunAt: null,
            lastRunStatus: null
        };
    }

    const latestRun = await PipelineRun.findOne({ pipelineId: pipeline._id })
        .sort({ startedAt: -1 })
        .select('status')
        .lean();

    return {
        totalRuns: metrics[0].totalRuns,
        successfulRuns: metrics[0].successfulRuns,
        failedRuns: metrics[0].failedRuns,
        avgDurationMs: Math.round(metrics[0].avgDurationMs || 0),
        lastRunAt: metrics[0].lastRunAt,
        lastRunStatus: latestRun ? latestRun.status : null
    };
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
    getActivePipelinesByRepo,
    getPipelineRuns,
    getPipelineRunById,
    getPipelineMetrics
};
