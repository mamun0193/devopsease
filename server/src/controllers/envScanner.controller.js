import Application from '../models/application.model.js';
import Repository from '../models/repository.model.js';
import { scanEnvironmentVariables } from '../intelligence/envScanner.js';
import { getWorkspacePath, validateSafePath, isClonedRepo } from '../utils/workspace.js';
import { detectServices } from '../intelligence/projectStructureDetector.js';
import { scanRepository } from '../intelligence/repositoryScanner.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

// EnvScanner Controller — Trigger and retrieve env variable scans.

export const scanApplication = asyncHandler(async (req, res) => {
        const { repositoryId } = req.params;

        const repo = await Repository.findById(repositoryId).lean();
        if (!repo) {
            throw new NotFoundError('Repository not found');
        }

        const workspacePath = getWorkspacePath(repo.userId, repo._id);
        validateSafePath(workspacePath);

        if (!isClonedRepo(workspacePath)) {
            // Reusing ValidationError for unprocessable entity here, or we could use AppError directly
            const error = new Error('Repository has not been cloned yet. Run an analysis or deployment first.');
            error.statusCode = 422;
            throw error;
        }

        // Run scan with service detection
        const scanData = await scanRepository(workspacePath);
        const services = detectServices(scanData);
        const result = await scanEnvironmentVariables(workspacePath, services);

        res.json(standardResponse({
            repositoryId: String(repositoryId),
            scan: result,
        }));
});

export const getScanResults = asyncHandler(async (req, res) => {
        const { repositoryId } = req.params;

        const repo = await Repository.findById(repositoryId).lean();
        if (!repo) {
            throw new NotFoundError('Repository not found');
        }

        const workspacePath = getWorkspacePath(repo.userId, repo._id);

        if (!isClonedRepo(workspacePath)) {
            return res.json(standardResponse({
                repositoryId,
                scan: { variables: [], metadata: { scannedAt: null } },
            }));
        }

        // Re-scan (could cache later with commitHash key)
        const result = await scanEnvironmentVariables(workspacePath);

        res.json(standardResponse({
            repositoryId: String(repositoryId),
            scan: result,
        }));
});
