import Application from '../models/application.model.js';
import Repository from '../models/repository.model.js';
import { scanEnvironmentVariables } from '../intelligence/envScanner.js';
import { getWorkspacePath, validateSafePath, isClonedRepo } from '../utils/workspace.js';
import { detectServices } from '../intelligence/projectStructureDetector.js';
import { scanRepository } from '../intelligence/repositoryScanner.js';

// EnvScanner Controller — Trigger and retrieve env variable scans.
 

export const scanApplication = async (req, res, next) => {
    try {
        const { repositoryId } = req.params;

        const repo = await Repository.findById(repositoryId).lean();
        if (!repo) {
            return res.status(404).json({ message: 'Repository not found' });
        }

        const workspacePath = getWorkspacePath(repo.userId, repo._id);
        validateSafePath(workspacePath);

        if (!isClonedRepo(workspacePath)) {
            return res.status(422).json({
                message: 'Repository has not been cloned yet. Run an analysis or deployment first.',
            });
        }

        // Run scan with service detection
        const scanData = await scanRepository(workspacePath);
        const services = detectServices(scanData);
        const result = await scanEnvironmentVariables(workspacePath, services);

        res.json({
            repositoryId: String(repositoryId),
            scan: result,
        });
    } catch (error) {
        next(error);
    }
};

export const getScanResults = async (req, res, next) => {
    try {
        const { repositoryId } = req.params;

        const repo = await Repository.findById(repositoryId).lean();
        if (!repo) {
            return res.status(404).json({ message: 'Repository not found' });
        }

        const workspacePath = getWorkspacePath(repo.userId, repo._id);

        if (!isClonedRepo(workspacePath)) {
            return res.json({
                repositoryId,
                scan: { variables: [], metadata: { scannedAt: null } },
            });
        }

        // Re-scan (could cache later with commitHash key)
        const result = await scanEnvironmentVariables(workspacePath);

        res.json({
            repositoryId: String(repositoryId),
            scan: result,
        });
    } catch (error) {
        next(error);
    }
};
