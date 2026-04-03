import { generateDeploymentYaml } from '../services/k8sDeployment.service.js';

export const generateDeploymentYamlAction = async (req, res, next) => {
    try {
        const yaml = generateDeploymentYaml(req.body ?? {});
        res.json({ yaml });
    } catch (error) {
        next(error);
    }
};
