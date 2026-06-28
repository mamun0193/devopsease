import { getSnapshotByDeployment, compareSnapshots } from '../services/configSnapshot.service.js';

// ConfigSnapshot Controller — Deployment configuration snapshots.
 

export const getSnapshot = async (req, res, next) => {
    try {
        const { deploymentId } = req.params;

        const snapshot = await getSnapshotByDeployment(deploymentId);
        if (!snapshot) {
            return res.status(404).json({ message: 'No config snapshot found for this deployment' });
        }

        res.json({ snapshot });
    } catch (error) {
        next(error);
    }
};

export const compareDeploymentSnapshots = async (req, res, next) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({
                message: 'from and to deployment IDs are required as query parameters',
            });
        }

        const diff = await compareSnapshots(from, to);

        res.json({ diff });
    } catch (error) {
        next(error);
    }
};
