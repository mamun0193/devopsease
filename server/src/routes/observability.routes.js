import express from 'express';
import authenticate from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.js';
import { ROLES } from '../config/permissions.js';
import {
    getHealth,
    getApplicationHealth,
    getEvents,
    getRecentEvents,
    getAlertSummary,
    getGatewayMetrics,
    getSchedulerMetrics,
    getPlatformMetrics,
    getTimeline,
    explainEvent,
} from '../controllers/observability.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Platform health — admin sees full tree
router.get('/health', requireRole(ROLES.ADMIN), getHealth);

// Application health — any authenticated user (controller scopes to owner)
router.get('/health/applications/:id', getApplicationHealth);

// Events — admin only (contains cross-tenant data)
router.get('/events', requireRole(ROLES.ADMIN), getEvents);
router.get('/events/recent', requireRole(ROLES.ADMIN), getRecentEvents);
router.get('/events/:eventId/explain', requireRole(ROLES.ADMIN), explainEvent);

// Alert summary — admin sees all, user sees own
router.get('/alerts/summary', getAlertSummary);

// Metrics — admin only
router.get('/metrics/gateway', requireRole(ROLES.ADMIN), getGatewayMetrics);
router.get('/metrics/scheduler', requireRole(ROLES.ADMIN), getSchedulerMetrics);
router.get('/metrics/platform', requireRole(ROLES.ADMIN), getPlatformMetrics);

// Unified timeline
router.get('/timeline', requireRole(ROLES.ADMIN), getTimeline);

export default router;
