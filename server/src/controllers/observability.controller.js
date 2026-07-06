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

// ─── Platform Health ──────────────────────────────────────────────────────────

export async function getHealth(req, res) {
    try {
        // Use cached health if available and fresh (< 30s old), else evaluate live
        const cached = getCachedPlatformHealth();
        const isFresh = cached?.evaluatedAt && (Date.now() - new Date(cached.evaluatedAt).getTime()) < 30_000;

        const health = isFresh ? cached : await evaluatePlatformHealth();
        res.json({ success: true, data: health });
    } catch (err) {
        logger.error('[Observability] Health evaluation failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Health evaluation failed' });
    }
}

export async function getApplicationHealth(req, res) {
    try {
        const health = await evaluateApplicationHealth(req.params.id);
        if (!health) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        res.json({ success: true, data: health });
    } catch (err) {
        logger.error('[Observability] Application health failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Application health evaluation failed' });
    }
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(req, res) {
    try {
        const {
            domain,
            severity,
            applicationId,
            limit = 50,
            page = 1,
            since,
            until,
        } = req.query;

        const filter = {};
        if (domain) filter.domain = domain;
        if (severity) filter.severity = severity;
        if (applicationId) filter.applicationId = applicationId;
        if (since || until) {
            filter.timestamp = {};
            if (since) filter.timestamp.$gte = new Date(since);
            if (until) filter.timestamp.$lte = new Date(until);
        }

        const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

        const [events, total] = await Promise.all([
            PlatformEvent.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(Math.min(Number(limit), 200))
                .lean(),
            PlatformEvent.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: { events, total, page: Number(page), limit: Number(limit) },
        });
    } catch (err) {
        logger.error('[Observability] Events query failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Events query failed' });
    }
}

export function getRecentEvents(req, res) {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = platformEventBus.getRecentEvents(limit);
    res.json({ success: true, data: events });
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlertSummary(req, res) {
    try {
        // Admin sees all, regular user sees their own
        const userId = req.user?.role === 'admin' ? null : req.user?._id;
        const summary = await alertService.getAlertSummary(userId);
        res.json({ success: true, data: summary });
    } catch (err) {
        logger.error('[Observability] Alert summary failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Alert summary failed' });
    }
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export function getGatewayMetrics(req, res) {
    const gateway = evaluateGatewayHealth();
    res.json({ success: true, data: gateway });
}

export function getSchedulerMetrics(req, res) {
    const scheduler = evaluateSchedulerHealth();
    res.json({ success: true, data: scheduler });
}

export function getPlatformMetrics(req, res) {
    const snapshot = metricsRegistry.getSnapshot();
    res.json({
        success: true,
        data: {
            ...snapshot,
            uptimeSeconds: metricsRegistry.getUptimeSeconds(),
            timestamp: new Date().toISOString(),
        },
    });
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export async function getTimeline(req, res) {
    try {
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

        res.json({ success: true, data: timeline });
    } catch (err) {
        logger.error('[Observability] Timeline failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Timeline query failed' });
    }
}

// ─── Explain ──────────────────────────────────────────────────────────────────

export async function explainEvent(req, res) {
    try {
        const event = await PlatformEvent.findById(req.params.eventId).lean();
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Find correlated events by correlationId
        const correlated = await PlatformEvent.find({
            correlationId: event.correlationId,
            _id: { $ne: event._id },
        }).sort({ timestamp: -1 }).limit(20).lean();

        res.json({
            success: true,
            data: {
                event,
                explanation: event.explanation,
                correlatedEvents: correlated,
            },
        });
    } catch (err) {
        logger.error('[Observability] Explain failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Explain query failed' });
    }
}
