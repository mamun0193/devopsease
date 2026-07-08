import PlatformEvent from '../models/platformEvent.model.js';
import alertService from '../services/alert.service.js';
import platformEventBus from '../events/platformEventBus.js';
import {
    evaluatePlatformHealth,
    evaluateApplicationHealth,
    getCachedPlatformHealth,
    evaluateSchedulerHealth,
    evaluateGatewayHealth,
} from '../observability/platformHealth.service.js';
import metricsRegistry from '../observability/metricsRegistry.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse, paginatedResponse, getPagination } from '../utils/apiResponse.js';
import { NotFoundError } from '../utils/AppError.js';

// ─── Platform Health ──────────────────────────────────────────────────────────

export const getHealth = asyncHandler(async (req, res) => {
    // Use cached health if available and fresh (< 30s old), else evaluate live
    const cached = getCachedPlatformHealth();
    const isFresh = cached?.evaluatedAt && (Date.now() - new Date(cached.evaluatedAt).getTime()) < 30_000;

    const health = isFresh ? cached : await evaluatePlatformHealth();
    res.json(standardResponse(health));
});

export const getApplicationHealth = asyncHandler(async (req, res) => {
    const health = await evaluateApplicationHealth(req.params.id);
    if (!health) {
        throw new NotFoundError('Application not found');
    }
    res.json(standardResponse(health));
});

// ─── Events ───────────────────────────────────────────────────────────────────

export const getEvents = asyncHandler(async (req, res) => {
    const { domain, severity, applicationId, since, until } = req.query;
    const { page, limit } = getPagination(req);
    const filter = {};

    if (domain) filter.domain = domain;
    if (severity) filter.severity = severity;
    if (applicationId) filter.applicationId = applicationId;
    if (since || until) {
        filter.timestamp = {};
        if (since) filter.timestamp.$gte = new Date(since);
        if (until) filter.timestamp.$lte = new Date(until);
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
        PlatformEvent.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Math.min(limit, 200)) // Max limit safeguard
            .lean(),
        PlatformEvent.countDocuments(filter),
    ]);

    res.json(paginatedResponse(events, page, limit, total));
});

export const getRecentEvents = asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = platformEventBus.getRecentEvents(limit);
    res.json(standardResponse(events));
});

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const getAlertSummary = asyncHandler(async (req, res) => {
    // Admin sees all, regular user sees their own
    const userId = req.user?.role === 'admin' ? null : req.user?._id;
    const summary = await alertService.getAlertSummary(userId);
    res.json(standardResponse(summary));
});

// ─── Metrics ──────────────────────────────────────────────────────────────────

export const getGatewayMetrics = asyncHandler(async (req, res) => {
    const gateway = evaluateGatewayHealth();
    res.json(standardResponse(gateway));
});

export const getSchedulerMetrics = asyncHandler(async (req, res) => {
    const scheduler = evaluateSchedulerHealth();
    res.json(standardResponse(scheduler));
});

export const getPlatformMetrics = asyncHandler(async (req, res) => {
    const snapshot = metricsRegistry.getSnapshot();
    res.json(standardResponse({
        ...snapshot,
        uptimeSeconds: metricsRegistry.getUptimeSeconds(),
        timestamp: new Date().toISOString(),
    }));
});

// ─── Timeline ─────────────────────────────────────────────────────────────────

export const getTimeline = asyncHandler(async (req, res) => {
    const { limit = 50, since, applicationId } = req.query;

    // Unified timeline: recent platform events + recent alerts
    const filter = {};
    if (since) filter.timestamp = { $gte: new Date(since) };
    if (applicationId) filter.applicationId = applicationId;

    const events = await PlatformEvent.find(filter)
        .sort({ timestamp: -1 })
        .limit(Math.min(Number(limit), 100))
        .lean();

    // Map to timeline items with a consistent shape
    const timeline = events.map(e => ({
        id: String(e._id),
        type: 'event',
        domain: e.domain,
        eventType: e.eventType,
        severity: e.severity,
        summary: e.summary,
        explanation: e.explanation,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        timestamp: e.timestamp,
        correlationId: e.correlationId,
    }));

    res.json(standardResponse(timeline));
});

// ─── Explain ──────────────────────────────────────────────────────────────────

export const explainEvent = asyncHandler(async (req, res) => {
    const event = await PlatformEvent.findById(req.params.eventId).lean();
    if (!event) {
        throw new NotFoundError('Event not found');
    }

    // Find correlated events by correlationId
    const correlated = await PlatformEvent.find({
        correlationId: event.correlationId,
        _id: { $ne: event._id },
    }).sort({ timestamp: -1 }).limit(20).lean();

    res.json(standardResponse({
        event,
        explanation: event.explanation,
        correlatedEvents: correlated,
    }));
});
