import { createSecret, updateSecret, getDecryptedSecretsMap, deleteSecret } from './secret.service.js';
import Secret from '../models/secret.model.js';
import logger from '../utils/logger.js';

const REGISTRY_ENV = 'registry';
const USERNAME_KEY = 'DOCKER_HUB_USERNAME';
const TOKEN_KEY = 'DOCKER_HUB_TOKEN';

export async function saveDockerHubCredentials(userId, username, token) {
    await saveOrUpdateSecret(userId, USERNAME_KEY, username);
    await saveOrUpdateSecret(userId, TOKEN_KEY, token);
    logger.info('Docker Hub credentials updated', { userId: userId.toString() });
}

async function saveOrUpdateSecret(userId, name, value) {
    const existing = await Secret.findOne({ userId, environment: REGISTRY_ENV, name }).lean();
    if (existing) {
        await updateSecret(userId, existing._id, { value });
    } else {
        await createSecret({ userId, name, value, environment: REGISTRY_ENV });
    }
}

export async function getDockerHubCredentials(userId) {
    try {
        const secrets = await getDecryptedSecretsMap(userId, REGISTRY_ENV);
        const username = secrets[USERNAME_KEY];
        const token = secrets[TOKEN_KEY];
        
        if (!username || !token) {
            return null;
        }

        return { username, token };
    } catch (err) {
        logger.warn('Could not retrieve Docker Hub credentials', { userId: userId.toString(), error: err.message });
        return null;
    }
}

export async function deleteDockerHubCredentials(userId) {
    const secrets = await Secret.find({ userId, environment: REGISTRY_ENV, name: { $in: [USERNAME_KEY, TOKEN_KEY] } });
    for (const secret of secrets) {
        await deleteSecret(userId, secret._id);
    }
    logger.info('Docker Hub credentials deleted', { userId: userId.toString() });
}

export default {
    saveDockerHubCredentials,
    getDockerHubCredentials,
    deleteDockerHubCredentials
};
