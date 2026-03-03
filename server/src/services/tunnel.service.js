import Tunnel from '../models/tunnel.model.js';
import ownershipService from './ownership.service.js';
import docker from '../docker/client.js';
import { logTunnelEvent, TUNNEL_EVENTS } from './tunnel.audit.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// Provider registry — extensible without modifying service code
const providerRegistry = {};

function registerProvider(name, providerInstance) {
    providerRegistry[name] = providerInstance;
}

function getProvider() {
    const providerName = process.env.TUNNEL_PROVIDER || 'ngrok';
    const provider = providerRegistry[providerName];
    if (!provider) {
        throw new AppError(`Tunnel provider "${providerName}" is not registered`, 500);
    }
    return { provider, providerName };
}

const MAX_ACTIVE_TUNNELS_PER_USER = 3;
const ALLOWED_DURATIONS_MINUTES = [15, 30, 60, 120, 360];

class TunnelService {

    async initProviders() {
        const providerName = process.env.TUNNEL_PROVIDER || 'ngrok';
        try {
            if (providerName === 'ngrok') {
                const { default: ngrokProvider } = await import('./providers/ngrokTunnelProvider.js');
                registerProvider('ngrok', ngrokProvider);
                logger.info('Tunnel provider registered', { provider: 'ngrok' });
            }
        } catch (err) {
            logger.warn('Failed to register tunnel provider', { provider: providerName, error: err.message });
        }
    }

    async createTunnel(userId, containerId, port, durationMinutes) {
        // 1. Validate duration
        if (!ALLOWED_DURATIONS_MINUTES.includes(durationMinutes)) {
            throw new AppError(
                `Invalid duration. Allowed values: ${ALLOWED_DURATIONS_MINUTES.join(', ')} minutes`,
                400
            );
        }

        // 2. Validate container ownership
        await ownershipService.verifyOwnership(userId, containerId);

        // 3. Validate port is exposed by the container
        const mappedPort = await this._getHostPort(containerId, port);
        if (!mappedPort) {
            throw new AppError(
                `Port ${port} is not exposed on container ${containerId.substring(0, 12)}`,
                400
            );
        }

        // 4. Enforce max active tunnels per user
        const activeTunnelCount = await Tunnel.countDocuments({ userId, status: 'ACTIVE' });
        if (activeTunnelCount >= MAX_ACTIVE_TUNNELS_PER_USER) {
            throw new AppError(
                `Maximum ${MAX_ACTIVE_TUNNELS_PER_USER} active tunnels allowed. Revoke an existing tunnel first.`,
                429
            );
        }

        // 5. Compute expiration
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

        // 6. Call tunnel provider
        const { provider, providerName } = getProvider();
        const { publicUrl, providerTunnelId } = await provider.createTunnel('localhost', mappedPort);

        // 7. Save tunnel record
        const tunnel = await Tunnel.create({
            userId,
            containerId,
            internalPort: port,
            publicUrl,
            provider: providerName,
            providerTunnelId,
            status: 'ACTIVE',
            expiresAt
        });

        // 8. Emit audit event (fire-and-forget)
        logTunnelEvent({
            event: TUNNEL_EVENTS.TUNNEL_CREATED,
            userId,
            metadata: {
                tunnelId: tunnel._id.toString(),
                containerId: containerId.substring(0, 12),
                port,
                durationMinutes,
                publicUrl,
                expiresAt
            }
        });

        return {
            tunnelId: tunnel._id.toString(),
            publicUrl,
            expiresAt
        };
    }


    async revokeTunnel(tunnelId, userId) {
        const tunnel = await Tunnel.findOne({ _id: tunnelId, userId });
        if (!tunnel) {
            throw new AppError('Tunnel not found', 404);
        }

        if (tunnel.status !== 'ACTIVE') {
            throw new AppError(`Tunnel is already ${tunnel.status.toLowerCase()}`, 400);
        }

        // Close on provider
        const { provider } = getProvider();
        await provider.closeTunnel(tunnel.providerTunnelId);

        // Update record
        tunnel.status = 'REVOKED';
        tunnel.revokedAt = new Date();
        await tunnel.save();

        // Audit
        logTunnelEvent({
            event: TUNNEL_EVENTS.TUNNEL_REVOKED,
            userId,
            metadata: {
                tunnelId: tunnel._id.toString(),
                containerId: tunnel.containerId.substring(0, 12),
                port: tunnel.internalPort
            }
        });

        return { tunnelId: tunnel._id.toString(), status: 'REVOKED' };
    }


    async getUserTunnels(userId) {
        const tunnels = await Tunnel.find({ userId })
            .sort({ createdAt: -1 })
            .select('-__v')
            .lean();

        return tunnels.map(t => ({
            id: t._id,
            containerId: t.containerId.substring(0, 12),
            internalPort: t.internalPort,
            publicUrl: t.publicUrl,
            provider: t.provider,
            status: t.status,
            expiresAt: t.expiresAt,
            createdAt: t.createdAt,
            revokedAt: t.revokedAt
        }));
    }

    async expireTunnelsJob() {
        try {
            const expiredTunnels = await Tunnel.find({
                status: 'ACTIVE',
                expiresAt: { $lte: new Date() }
            });

            if (expiredTunnels.length === 0) return;

            logger.info(`Expiring ${expiredTunnels.length} tunnel(s)`);

            const { provider } = getProvider();

            for (const tunnel of expiredTunnels) {
                try {
                    await provider.closeTunnel(tunnel.providerTunnelId);
                } catch (err) {
                    logger.warn('Failed to close expired tunnel on provider', {
                        tunnelId: tunnel._id.toString(),
                        error: err.message
                    });
                }

                tunnel.status = 'EXPIRED';
                await tunnel.save();

                logTunnelEvent({
                    event: TUNNEL_EVENTS.TUNNEL_EXPIRED,
                    userId: tunnel.userId,
                    metadata: {
                        tunnelId: tunnel._id.toString(),
                        containerId: tunnel.containerId.substring(0, 12),
                        port: tunnel.internalPort
                    }
                });
            }

            logger.info(`Expired ${expiredTunnels.length} tunnel(s) successfully`);
        } catch (err) {
            logger.error('Tunnel expiry job failed', { error: err.message });
        }
    }

    async revokeByContainer(containerId) {
        try {
            const activeTunnels = await Tunnel.find({
                containerId,
                status: 'ACTIVE'
            });

            if (activeTunnels.length === 0) return;

            logger.info(`Auto-revoking ${activeTunnels.length} tunnel(s) for stopped container`, {
                containerId: containerId.substring(0, 12)
            });

            const { provider } = getProvider();

            for (const tunnel of activeTunnels) {
                try {
                    await provider.closeTunnel(tunnel.providerTunnelId);
                } catch (err) {
                    logger.warn('Failed to close tunnel on container stop', {
                        tunnelId: tunnel._id.toString(),
                        error: err.message
                    });
                }

                tunnel.status = 'REVOKED';
                tunnel.revokedAt = new Date();
                await tunnel.save();

                logTunnelEvent({
                    event: TUNNEL_EVENTS.TUNNEL_REVOKED,
                    userId: tunnel.userId,
                    metadata: {
                        tunnelId: tunnel._id.toString(),
                        containerId: containerId.substring(0, 12),
                        port: tunnel.internalPort,
                        reason: 'container_stopped'
                    }
                });
            }
        } catch (err) {
            logger.error('Failed to revoke tunnels on container stop', {
                containerId: containerId.substring(0, 12),
                error: err.message
            });
        }
    }

    async _getHostPort(containerId, internalPort) {
        try {
            const container = docker.getContainer(containerId);
            const inspectData = await container.inspect();

            const portBindings = inspectData.NetworkSettings?.Ports || {};

            // Docker stores ports as "<port>/tcp", "<port>/udp"
            const key = `${internalPort}/tcp`;
            const bindings = portBindings[key];

            if (!bindings || bindings.length === 0) {
                // Also try udp
                const udpKey = `${internalPort}/udp`;
                const udpBindings = portBindings[udpKey];
                if (!udpBindings || udpBindings.length === 0) {
                    return null;
                }
                return parseInt(udpBindings[0].HostPort, 10);
            }

            return parseInt(bindings[0].HostPort, 10);
        } catch (err) {
            logger.error('Failed to inspect container for port mapping', {
                containerId: containerId.substring(0, 12),
                port: internalPort,
                error: err.message
            });
            return null;
        }
    }
}

const tunnelService = new TunnelService();
export default tunnelService;
