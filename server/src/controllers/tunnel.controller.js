import tunnelService from '../services/tunnel.service.js';

// Create a temporary public tunnel for a container port.
export const createTunnel = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { containerId, port, durationMinutes } = req.body;

        if (!containerId || !port || !durationMinutes) {
            return res.status(400).json({
                message: 'containerId, port, and durationMinutes are required'
            });
        }

        const result = await tunnelService.createTunnel(
            userId,
            containerId,
            Number(port),
            Number(durationMinutes)
        );

        res.status(201).json({
            message: 'Tunnel created',
            tunnel: result
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

// List all tunnels for the authenticated user.
export const listTunnels = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const tunnels = await tunnelService.getUserTunnels(userId);

        res.json({ tunnels });
    } catch (error) {
        next(error);
    }
};


// Revoke an active tunnel.
export const revokeTunnel = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const result = await tunnelService.revokeTunnel(id, userId);

        res.json({
            message: 'Tunnel revoked',
            ...result
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};
