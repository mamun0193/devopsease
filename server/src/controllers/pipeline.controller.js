import pipelineService from '../services/pipeline.service.js';
import PipelineRun from '../models/pipelineRun.model.js';
import { createLogReadStream } from '../services/pipelineLog.service.js';
import logger from '../utils/logger.js';

export const createPipeline = async (req, res, next) => {
    try {
        const { repoId, yaml: yamlString, name } = req.body;
        const userId = req.user._id;

        if (!repoId || !yamlString) {
            return res.status(400).json({ message: 'repoId and yaml are required' });
        }

        if (typeof yamlString !== 'string') {
            return res.status(400).json({ message: 'yaml must be a string' });
        }

        const pipeline = await pipelineService.createPipeline({
            userId,
            repoId,
            yamlString,
            name
        });

        res.status(201).json({
            id: pipeline._id,
            name: pipeline.name,
            steps: pipeline.config.steps,
            version: pipeline.version,
            status: pipeline.status,
            createdAt: pipeline.createdAt
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const listPipelines = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const pipelines = await pipelineService.getUserPipelines(userId);

        res.json({
            pipelines: pipelines.map(p => ({
                id: p._id,
                name: p.name,
                steps: p.config.steps,
                version: p.version,
                status: p.status,
                repo: p.repoId,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            }))
        });
    } catch (error) {
        next(error);
    }
};

export const getPipeline = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const pipeline = await pipelineService.getPipelineById(id, userId);
        if (!pipeline) {
            return res.status(404).json({ message: 'Pipeline not found' });
        }

        res.json({
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
        });
    } catch (error) {
        next(error);
    }
};

export const deletePipeline = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        await pipelineService.deletePipeline(id, userId);
        res.json({ message: 'Pipeline deleted successfully' });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const togglePipelineStatus = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ message: 'status must be "active" or "inactive"' });
        }

        const pipeline = await pipelineService.getPipelineById(id, userId);
        if (!pipeline) {
            return res.status(404).json({ message: 'Pipeline not found' });
        }

        pipeline.status = status;
        await pipeline.save();

        res.json({
            id: pipeline._id,
            name: pipeline.name,
            status: pipeline.status,
            message: `Pipeline ${status === 'active' ? 'resumed' : 'paused'} successfully`
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const runPipeline = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { triggerSource, commitHash, branch } = req.body;

        const pipeline = await pipelineService.getPipelineById(id, userId);
        if (!pipeline) {
            return res.status(404).json({ message: 'Pipeline not found' });
        }

        const executed = await pipelineService.executePipeline(id, {
            triggerSource: triggerSource || 'manual',
            commitHash,
            branch
        });

        // executed contains { pipeline, run } from updated service
        const run = executed.run || executed;

        res.json({
            id: pipeline._id,
            runId: run._id,
            name: pipeline.name,
            status: run.status,
            startedAt: run.startedAt,
            completedAt: run.completedAt
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const getPipelineStatus = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const status = await pipelineService.getPipelineExecutionStatus(id, userId);
        res.json(status);
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const listPipelineRuns = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const runs = await pipelineService.getPipelineRuns(id, userId, {
            limit: parseInt(limit, 10),
            skip: parseInt(skip, 10)
        });

        res.json({ runs });
    } catch (error) {
        next(error);
    }
};

export const getPipelineRun = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params; // this is the run ID

        const run = await pipelineService.getPipelineRunById(id, userId);
        if (!run) {
            return res.status(404).json({ message: 'Pipeline run not found' });
        }

        res.json({ run });
    } catch (error) {
        next(error);
    }
};

export const streamPipelineLogs = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params; // this is the run ID

        const run = await PipelineRun.findOne({ _id: id, userId })
            .select('logPath logSummary')
            .lean();

        if (!run) {
            return res.status(404).json({ message: 'Pipeline run not found' });
        }

        if (run.logPath) {
            const stream = createLogReadStream(run.logPath);
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
    } catch (error) {
        next(error);
    }
};

export const getPipelineMetrics = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const metrics = await pipelineService.getPipelineMetrics(id, userId);
        res.json({ metrics });
    } catch (error) {
        next(error);
    }
};
