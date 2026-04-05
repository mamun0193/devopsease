import { generateDeploymentYaml } from '../services/k8sDeployment.service.js';
import { generateServiceYaml } from '../services/k8sService.service.js';
import { generateIngressYaml } from '../services/k8sIngress.service.js';

export const generateDeploymentYamlAction = async (req, res, next) => {
    try {
        const yaml = generateDeploymentYaml(req.body ?? {});
        res.json({ yaml });
    } catch (error) {
        next(error);
    }
};

export const generateServiceYamlAction = async (req, res, next) => {
    try {
        const yaml = generateServiceYaml(req.body ?? {});
        res.json({ yaml });
    } catch (error) {
        next(error);
    }
};

export const generateIngressYamlAction = async (req, res, next) => {
    try {
        const yaml = generateIngressYaml(req.body ?? {});
        res.json({ yaml });
    } catch (error) {
        next(error);
    }
};
