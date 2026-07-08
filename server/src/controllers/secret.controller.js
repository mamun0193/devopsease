import {
    createSecret,
    getSecrets,
    updateSecret,
    deleteSecret,
} from '../services/secret.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { ValidationError } from '../utils/AppError.js';

export const createSecretAction = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const { name, value, environment } = req.body ?? {};

        if (!name || value == null || !environment) {
            throw new ValidationError('name, value, and environment are required');
        }

        const secret = await createSecret({ userId, name, value, environment });
        res.status(201).json(standardResponse({ secret }));
});

export const getSecretsAction = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const { environment } = req.query;

        const secrets = await getSecrets(userId, environment);
        res.json(standardResponse({ secrets }));
});

export const updateSecretAction = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const secretId = req.params.id;
        const { name, value, environment } = req.body ?? {};

        const secret = await updateSecret(userId, secretId, { name, value, environment });
        res.json(standardResponse({ secret }));
});

export const deleteSecretAction = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const secretId = req.params.id;

        await deleteSecret(userId, secretId);
        res.json(standardResponse(null, 'Secret deleted successfully'));
});
