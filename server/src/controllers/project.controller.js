import projectService from '../services/project.service.js';

export const createProject = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { name, composeYaml } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ message: 'Project name is required' });
        }

        if (name.length > 64) {
            return res.status(400).json({ message: 'Project name must be under 64 characters' });
        }

        if (!composeYaml || typeof composeYaml !== 'string') {
            return res.status(400).json({ message: 'composeYaml is required' });
        }

        const project = await projectService.createProject(userId, name.trim(), composeYaml);

        res.status(201).json({ project });
    } catch (error) {
        if (error.validationErrors) {
            return res.status(error.statusCode || 400).json({
                message: error.message,
                validationErrors: error.validationErrors
            });
        }
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const listProjects = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const projects = await projectService.getProjects(userId);
        res.json({ projects });
    } catch (error) {
        next(error);
    }
};

export const getProject = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const project = await projectService.getProjectById(userId, id);
        res.json({ project });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const startProject = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const project = await projectService.startProject(userId, id);
        res.json({ project, message: 'Project started' });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const stopProject = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const project = await projectService.stopProject(userId, id);
        res.json({ project, message: 'Project stopped' });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export const deleteProject = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        await projectService.deleteProject(userId, id);
        res.json({ message: 'Project deleted' });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};
