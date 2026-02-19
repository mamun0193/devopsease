import Resource from '../models/resource.model.js';
import logger from '../utils/logger.js';
import { RESOURCE_TYPES } from './resourceTypes.js';

class ResourceService {
    // register resource
    async registerResource(data) {
        try {
            if (!Object.values(RESOURCE_TYPES).includes(data.type)) {
                throw new Error(`Invalid resource type: ${data.type}`);
            }

            const existing = await Resource.findOne({ resourceId: data.resourceId, type: data.type });
            if (existing) {
                // If it exists but was marked deleted, reactivate it
                if (existing.status === 'deleted') {
                    existing.status = 'active';
                    existing.metadata = { ...existing.metadata, ...data.metadata };
                    existing.updatedAt = new Date();
                    await existing.save();
                    logger.info(`Reactivated resource ${data.resourceId} (${data.type})`);
                    return existing;
                }
                logger.warn(`Resource ${data.resourceId} (${data.type}) already exists`);
                return existing;
            }

            const resource = new Resource({
                ...data,
                status: 'active'
            });
            await resource.save();
            logger.info(`Registered new resource ${data.resourceId} (${data.type})`);
            return resource;
        } catch (error) {
            logger.error(`Failed to register resource ${data.resourceId}`, { error: error.message });
            // Don't crash the flow, just log error as this is auxiliary data
            return null;
        }
    }
    // update resource status

    async updateResourceStatus(resourceId, type, status) {
        try {
            const result = await Resource.findOneAndUpdate(
                { resourceId, type },
                { status },
                { new: true }
            );
            if (result) {
                logger.info(`Updated resource ${resourceId} status to ${status}`);
            } else {
                logger.warn(`Resource ${resourceId} not found for status update`);
            }
            return result;
        } catch (error) {
            logger.error(`Failed to update resource status ${resourceId}`, { error: error.message });
            return null;
        }
    }
    async getResource(resourceId, type) {
        return await Resource.findOne({ resourceId, type });
    }
    async listResources(ownerId, type = null) {
        const query = { ownerId, status: { $ne: 'deleted' } };
        if (type) {
            query.type = type;
        }
        return await Resource.find(query);
    }

    // Sync resources (Lazy Registration)
    // iterates through list of active items (e.g. from Docker) and ensures they exist in DB

    async syncResources(ownerId, currentItems, type) {
        const promises = currentItems.map(async (item) => {
            // Try to find existing
            const exists = await Resource.exists({ resourceId: item.id, type });
            if (!exists) {
                // Auto-register
                await this.registerResource({
                    resourceId: item.id,
                    type,
                    ownerId,
                    metadata: {
                        name: item.name,
                        image: item.image,
                        createdVia: 'lazy-sync'
                    }
                });
            }
        });

        await Promise.allSettled(promises);
    }
}

export default new ResourceService();
