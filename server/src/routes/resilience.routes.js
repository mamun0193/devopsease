import express from 'express';
import resilienceController from '../controllers/resilience.controller.js';
import { requireRole, ROLES } from '../middlewares/rbac.js';

const router = express.Router();

const requireAdmin = requireRole(ROLES.ADMIN);

// Security Center (Audit Logs)
router.get('/security/events', requireAdmin, resilienceController.getSecurityEvents);

// Backups
router.get('/backups', requireAdmin, resilienceController.getBackups);
router.post('/backups', requireAdmin, resilienceController.createBackup);
router.delete('/backups/:id', requireAdmin, resilienceController.deleteBackup);

// Restores
router.get('/restores', requireAdmin, resilienceController.getRestores);
router.post('/restores/plan', requireAdmin, resilienceController.planRestore);
router.post('/restores/:id/execute', requireAdmin, resilienceController.executeRestore);

export default router;
