import pipelineService from '../services/pipeline.service.js';
import PipelineRun from '../models/pipelineRun.model.js';
import Pipeline from '../models/pipeline.model.js';
import { createLogReadStream } from '../services/pipelineLog.service.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse, paginatedResponse, getPagination } from '../utils/apiResponse.js';
import AppError, { ValidationError, NotFoundError } from '../utils/AppError.js';

export const createPipeline = asyncHandler(async (req, res) => {
    const { repoId, yaml: yamlString, name } = req.body;
    const userId = req.user._id;

    if (!repoId || !yamlString) {
        throw new ValidationError('repoId and yaml are required');
    }

    if (typeof yamlString !== 'string') {
        throw new ValidationError('yaml must be a string');
    }

    const pipeline = await pipelineService.createPipeline({
        userId,
        repoId,
        yamlString,
        name
    });

    res.status(201).json(standardResponse({
        id: pipeline._id,
        name: pipeline.name,
        steps: pipeline.config.steps,
        version: pipeline.version,
        status: pipeline.status,
        createdAt: pipeline.createdAt
    }));
});

export const listPipelines = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const pipelines = await pipelineService.getUserPipelines(userId);

    res.json(standardResponse({
        pipelines: pipelines.map(p => ({
            id: p._id,
            name: p.name,
            steps: p.config.steps,
            version: p.version,
            status: p.status,
            repo: p.repoId,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            lastRun: p.lastRun ? {
                id: p.lastRun._id,
                status: p.lastRun.status,
                startedAt: p.lastRun.startedAt,
                completedAt: p.lastRun.completedAt
            } : null
        }))
    }));
});

export const getPipeline = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const pipeline = await pipelineService.getPipelineById(id, userId);
    if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
    }

    res.json(standardResponse({
        id: pipeline._id,
        name: pipeline.name,
        steps: pipeline.config.steps,
        config: pipeline.config,
        rawYaml: pipeline.rawYaml,
        version: pipeline.version,
        status: pipeline.status,
        repo: pipeline.repoId,
        createdAt: pipeline.createdAt,
        updatedAt: pipeline.updatedAt
    }));
});

export const deletePipeline = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    await pipelineService.deletePipeline(id, userId);
    res.json(standardResponse(null, 'Pipeline deleted successfully'));
});

export const togglePipelineStatus = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
        throw new ValidationError('status must be "active" or "inactive"');
    }

    const pipeline = await Pipeline.findOneAndUpdate(
        { _id: id, userId },
        { status },
        { new: true }
    );

    if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
    }

    res.json(standardResponse({
        id: pipeline._id,
        name: pipeline.name,
        status: pipeline.status
    }, `Pipeline ${status === 'active' ? 'resumed' : 'paused'} successfully`));
});

export const runPipeline = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const { triggerSource, commitHash, branch } = req.body;

    const pipeline = await pipelineService.getPipelineById(id, userId);
    if (!pipeline) {
        throw new NotFoundError('Pipeline not found');
    }

    const executed = await pipelineService.executePipeline(id, {
        triggerSource: triggerSource || 'manual',
        commitHash,
        branch
    });

    // executed contains { pipeline, run } from updated service
    const run = executed.run || executed;

    res.json(standardResponse({
        id: pipeline._id,
        runId: run._id,
        name: pipeline.name,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt
    }));
});

export const getPipelineStatus = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const status = await pipelineService.getPipelineExecutionStatus(id, userId);
    res.json(standardResponse(status));
});

export const listPipelineRuns = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const { page, limit } = getPagination(req);
    const skip = (page - 1) * limit;

    const runs = await pipelineService.getPipelineRuns(id, userId, {
        limit,
        skip
    });

    res.json(standardResponse({ runs }));
});

export const getPipelineRun = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params; // this is the run ID

    const run = await pipelineService.getPipelineRunById(id, userId);
    if (!run) {
        throw new NotFoundError('Pipeline run not found');
    }

    res.json(standardResponse({ run }));
});

export const streamPipelineLogs = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params; // this is the run ID

    const run = await PipelineRun.findOne({ _id: id, userId })
        .select('storage logSummary')
        .lean();

    if (!run) {
        throw new NotFoundError('Pipeline run not found');
    }

    if (run.storage) {
        const stream = createLogReadStream(run.storage);
        if (stream) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            stream.pipe(res);
            stream.on('error', (err) => {
                logger.error('Error streaming pipeline logs', { runId: id, error: err.message });
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Failed to read pipeline logs' });
                }
            });
            return;
        }
    }

    // Fallback to log summary
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(run.logSummary || '');
});

export const getPipelineMetrics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const metrics = await pipelineService.getPipelineMetrics(id, userId);
    res.json(standardResponse({ metrics }));
});
