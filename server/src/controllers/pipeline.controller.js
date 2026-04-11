import pipelineService from '../services/pipeline.service.js';

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

export const runPipeline = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const pipeline = await pipelineService.getPipelineById(id, userId);
        if (!pipeline) {
            return res.status(404).json({ message: 'Pipeline not found' });
        }

        const executed = await pipelineService.executePipeline(id);

        res.json({
            id: executed._id,
            name: executed.name,
            status: executed.executionStatus,
            startedAt: executed.startedAt,
            completedAt: executed.completedAt,
            logs: executed.executionLogs
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
