import {
    createSecret,
    getSecrets,
    updateSecret,
    deleteSecret,
} from '../services/secret.service.js';

export const createSecretAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { name, value, environment } = req.body ?? {};

        if (!name || value == null || !environment) {
            const error = new Error('name, value, and environment are required');
            error.statusCode = 400;
            error.errorCode = 'VALIDATION_ERROR';
            throw error;
        }

        const secret = await createSecret({ userId, name, value, environment });
        res.status(201).json({ secret });
    } catch (error) {
        next(error);
    }
};

export const getSecretsAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { environment } = req.query;

        const secrets = await getSecrets(userId, environment);
        res.json({ secrets });
    } catch (error) {
        next(error);
    }
};

export const updateSecretAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const secretId = req.params.id;
        const { name, value, environment } = req.body ?? {};

        const secret = await updateSecret(userId, secretId, { name, value, environment });
        res.json({ secret });
    } catch (error) {
        next(error);
    }
};

export const deleteSecretAction = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const secretId = req.params.id;

        await deleteSecret(userId, secretId);
        res.json({ message: 'Secret deleted successfully' });
    } catch (error) {
        next(error);
    }
};
