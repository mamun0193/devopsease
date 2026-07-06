import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import * as autopilotController from '../controllers/autopilot.controller.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requirePermission('MANAGE_APPLICATIONS'));

router.get('/policies', autopilotController.getPolicies);
router.post('/scaling', autopilotController.createScalingPolicy);
router.get('/scaling/:applicationId', autopilotController.getScalingPolicy);

export default router;
