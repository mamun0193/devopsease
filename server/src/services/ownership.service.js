import ContainerOwnership from '../models/ContainerOwnership.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

class OwnershipService {
    // Atomically register a container to a user.
    // Prevents race conditions via unique index on containerId.
    async registerContainer(ownerId, containerId) {
        if (!ownerId || !containerId) {
            throw new AppError("OwnerId and ContainerId are required", 400);
        }

        try {
            const ownership = await ContainerOwnership.create({
                ownerId,
                containerId,
                status: 'active'
            });
            logger.info(`Container ${containerId} registered to user ${ownerId}`);
            return ownership;
        } catch (error) {
            // Duplicate key error (11000) means container is already actively owned
            if (error.code === 11000) {
                logger.warn(`Ownership conflict: Container ${containerId} is already owned.`);
                throw new AppError("Container is already owned by a user", 409);
            }
            throw error;
        }
    }

    // explicit check for active ownership.
    // Throws 403 if ownership is invalid.
    async verifyOwnership(ownerId, containerId) {
        if (!ownerId || !containerId) {
            throw new AppError("OwnerId and ContainerId are required", 400);
        }

        const ownership = await ContainerOwnership.findOne({
            containerId,
            ownerId,
            status: 'active'
        });

        if (!ownership) {
            logger.warn(`Security Alert: User ${ownerId} attempted to access unowned/other's container ${containerId}`);
            throw new AppError("Access Denied: You do not own this container", 403);
        }

        return ownership;
    }

    // List all ACTIVE containers owned by a user.
    async listOwnedContainers(ownerId) {
        if (!ownerId) {
            throw new AppError("ownerId is required", 400);
        }

        // Only return active containers. Released/deleted ones are history.
        const ownerships = await ContainerOwnership.find({
            ownerId,
            status: 'active'
        }).lean();

        return ownerships.map(o => o.containerId);
    }

    // Mark a container as released (soft delete).
    // This preserves the audit trail.
    async releaseOwnership(ownerId, containerId) {
        // First verify ownership to ensure one user can't release another's container
        await this.verifyOwnership(ownerId, containerId);

        const result = await ContainerOwnership.findOneAndUpdate(
            { containerId, ownerId, status: 'active' },
            {
                status: 'released',
                lastActionAt: new Date()
            },
            { new: true }
        );

        logger.info(`Container ${containerId} released by user ${ownerId}`);
        return result;
    }
}

export default new OwnershipService();
