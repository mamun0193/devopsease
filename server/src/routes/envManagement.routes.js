import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
    createConfigEntry,
    listConfigEntries,
    updateConfigEntry,
    deleteConfigEntry,
    getVersionHistory,
    rollbackConfigEntry,
    bulkUpsertEntries,
    importConfigEntries,
    exportConfigEntries,
} from '../controllers/configEntry.controller.js';
import { scanApplication, getScanResults } from '../controllers/envScanner.controller.js';
import { getReadiness } from '../controllers/configReadiness.controller.js';
import { getSnapshot, compareDeploymentSnapshots } from '../controllers/configSnapshot.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ConfigEntry CRUD 
router.post('/entries', createConfigEntry);
router.get('/entries', listConfigEntries);
router.put('/entries/:id', updateConfigEntry);
router.delete('/entries/:id', deleteConfigEntry);

// Versioning 
router.get('/entries/:id/versions', getVersionHistory);
router.post('/entries/:id/rollback', rollbackConfigEntry);

// Bulk Operations 
router.post('/entries/bulk', bulkUpsertEntries);

//  Import / Export 
router.post('/import', importConfigEntries);
router.get('/export/:format', exportConfigEntries);

// Environment Scanner 
router.post('/scan/:repositoryId', scanApplication);
router.get('/scan/:repositoryId', getScanResults);

// Readiness 
router.get('/readiness/:repositoryId/:environmentId', getReadiness);

// Snapshots 
router.get('/snapshots/compare', compareDeploymentSnapshots);
router.get('/snapshots/:deploymentId', getSnapshot);

export default router;
