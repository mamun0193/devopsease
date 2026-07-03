import express from 'express';
import previewController from '../controllers/preview.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

// Preview Policies
router.get('/policies/:repoId', previewController.getPolicy);
router.put('/policies/:repoId', previewController.upsertPolicy);

// Previews
router.get('/', previewController.listPreviews);
router.post('/', previewController.createPreview);
router.get('/:id', previewController.getPreview);
router.delete('/:id', previewController.destroyPreview);
router.post('/:id/extend', previewController.extendPreview);
router.get('/:id/events', previewController.getPreviewEvents);

export default router;
