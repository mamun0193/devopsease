import { Router } from 'express';
import { gatewayMiddleware } from '../gateway/gateway.middleware.js';
import gatewayService from '../gateway/gateway.service.js';

const router = Router();

// Catch-all: accepts every HTTP method (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
router.all('/:slug', gatewayMiddleware, (req, res) => gatewayService.handleHttpRequest(req, res));
router.all('/:slug/*', gatewayMiddleware, (req, res) => gatewayService.handleHttpRequest(req, res));

export default router;
