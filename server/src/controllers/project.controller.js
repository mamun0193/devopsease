import projectService from '../services/project.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';
import { standardResponse } from '../utils/apiResponse.js';

export const createProject = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { name, composeYaml } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError('Project name is required');
    }

    if (name.length > 64) {
        throw new ValidationError('Project name must be under 64 characters');
    }

    if (!composeYaml || typeof composeYaml !== 'string') {
        throw new ValidationError('composeYaml is required');
    }

    const project = await projectService.createProject(userId, name.trim(), composeYaml);
    res.status(201).json(standardResponse(project));
});

export const listProjects = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const projects = await projectService.getProjects(userId);
    res.json(standardResponse(projects));
});

export const getProject = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const project = await projectService.getProjectById(userId, id);
    res.json(standardResponse(project));
});

export const startProject = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const project = await projectService.startProject(userId, id);
    res.json(standardResponse(project));
});

export const stopProject = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const project = await projectService.stopProject(userId, id);
    res.json(standardResponse(project));
});

export const deleteProject = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    await projectService.deleteProject(userId, id);
    res.json(standardResponse({ deleted: true }));
});
