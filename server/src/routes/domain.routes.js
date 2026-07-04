import express from 'express';
import domainController from '../controllers/domain.controller.js';
import protect from '../middlewares/auth.middleware.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const certRateLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: 'rl:certs' }); // 10 per hour

const router = express.Router();

// Require authentication for all domain routes
router.use(protect);

// Domain CRUD
router.post('/', domainController.addDomain);
router.get('/', domainController.listDomains);
router.get('/:id', domainController.getDomain);
router.delete('/:id', domainController.archiveDomain);

// Domain Lifecycle & Operations
router.post('/:id/verify', domainController.verifyDomain);
router.post('/:id/retry-verification', domainController.retryVerification);
router.post('/:id/connect', domainController.connectDomain);
router.post('/:id/disconnect', domainController.disconnectDomain);
router.get('/:id/health', domainController.evaluateHealth);

// Certificate Operations
router.post('/:id/certificates', certRateLimiter, domainController.requestCertificate);
router.get('/:id/certificates', domainController.getCertificateHistory);
router.post('/:id/certificates/:certificateId/renew', certRateLimiter, domainController.renewCertificate);
router.post('/:id/certificates/:certificateId/revoke', domainController.revokeCertificate);

// Audit & Events
router.get('/:id/events', domainController.getDomainEvents);

export default router;
