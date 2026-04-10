import yaml from 'js-yaml';
import Pipeline, { ALLOWED_STEPS } from '../models/pipeline.model.js';
import Repository from '../models/repository.model.js';
import logger from '../utils/logger.js';

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
                status: 'active'
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
            version
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

export default {
    parsePipelineYaml,
    validatePipelineConfig,
    createPipeline,
    getUserPipelines,
    getPipelineById,
    deletePipeline
};
