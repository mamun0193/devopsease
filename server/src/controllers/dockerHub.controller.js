import dockerHubService from '../services/dockerHub.service.js';

export const connectDockerHub = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { username, password } = req.body;
        const result = await dockerHubService.connectDockerHub(userId, username, password);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const disconnectDockerHub = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await dockerHubService.disconnectDockerHub(userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getDockerHubStatus = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await dockerHubService.getDockerHubStatus(userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const pullImage = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { imageName } = req.body;
        const result = await dockerHubService.pullImage(userId, imageName);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const pushImage = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { imageId, repositoryTag } = req.body;
        const result = await dockerHubService.pushImage(userId, imageId, repositoryTag);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const searchImages = async (req, res, next) => {
    try {
        const { q, page, pageSize } = req.query;
        const result = await dockerHubService.searchImages(
            q,
            page ? parseInt(page, 10) : 1,
            pageSize ? parseInt(pageSize, 10) : 25
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
};
