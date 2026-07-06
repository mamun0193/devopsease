import logger from "../utils/logger.js";

// ponytail: Typed metrics registry with Prometheus/OpenTelemetry-compatible output.
// Backward-compatible: existing increment('activeWebSockets') calls still work.
// No raw metric samples stored in MongoDB — in-process only.

const METRIC_TYPES = Object.freeze({
    COUNTER: 'counter',
    GAUGE: 'gauge',
    HISTOGRAM: 'histogram',
});

// Default histogram buckets (latency in ms)
const DEFAULT_BUCKETS = [10, 50, 100, 250, 500, 1000, 5000];

class MetricsRegistry {
    constructor() {
        this._counters = new Map();
        this._gauges = new Map();
        this._histograms = new Map();
        this.serverStartedAt = Date.now();

        // Pre-register legacy metrics as gauges (backward-compatible)
        this.registerGauge('activeWebSockets', 'Active WebSocket connections');
        this.registerGauge('activeExecSessions', 'Active exec sessions');
        this.registerCounter('tokenRefreshCount', 'Token refresh count');
        this.registerCounter('failedLogins', 'Failed login attempts');
        this.registerCounter('rateLimitHits', 'Rate limit hits');

        // Pre-register platform metrics (Prometheus naming convention)
        this.registerCounter('devopsease_build_total', 'Total builds');
        this.registerCounter('devopsease_build_failed_total', 'Total failed builds');
        this.registerCounter('devopsease_deployment_total', 'Total deployments');
        this.registerCounter('devopsease_deployment_failed_total', 'Total failed deployments');
        this.registerCounter('devopsease_gateway_requests_total', 'Total gateway requests');
        this.registerCounter('devopsease_gateway_errors_total', 'Total gateway errors');
        this.registerCounter('devopsease_alerts_created_total', 'Total alerts created');
        this.registerCounter('devopsease_alerts_resolved_total', 'Total alerts resolved');
        this.registerGauge('devopsease_containers_tracked', 'Containers currently tracked');
        this.registerHistogram('devopsease_gateway_latency_ms', 'Gateway request latency in ms', [10, 50, 100, 250, 500, 1000, 5000]);
    }

    // ─── Registration ─────────────────────────────────────────────────────

    registerCounter(name, help = '') {
        if (!this._counters.has(name)) {
            this._counters.set(name, { help, value: 0 });
        }
    }

    registerGauge(name, help = '') {
        if (!this._gauges.has(name)) {
            this._gauges.set(name, { help, value: 0 });
        }
    }

    registerHistogram(name, help = '', buckets = DEFAULT_BUCKETS) {
        if (!this._histograms.has(name)) {
            this._histograms.set(name, {
                help,
                buckets: [...buckets].sort((a, b) => a - b),
                bucketCounts: new Array(buckets.length + 1).fill(0), // +1 for +Inf
                sum: 0,
                count: 0,
            });
        }
    }

    // ─── Recording ────────────────────────────────────────────────────────

    /** Increment a counter or gauge (backward-compatible with legacy calls). */
    increment(name, value = 1) {
        if (this._counters.has(name)) {
            this._counters.get(name).value += value;
        } else if (this._gauges.has(name)) {
            this._gauges.get(name).value += value;
        } else {
            logger.debug(`[MetricsRegistry] Unknown metric: ${name}`);
        }
    }

    /** Decrement a gauge. */
    decrement(name) {
        if (this._gauges.has(name)) {
            const g = this._gauges.get(name);
            if (g.value > 0) g.value--;
        } else {
            logger.debug(`[MetricsRegistry] Unknown gauge: ${name}`);
        }
    }

    /** Set a gauge to an absolute value. */
    set(name, value) {
        if (this._gauges.has(name)) {
            this._gauges.get(name).value = value;
        } else {
            logger.debug(`[MetricsRegistry] Unknown gauge: ${name}`);
        }
    }

    /** Observe a histogram value. */
    observe(name, value) {
        const h = this._histograms.get(name);
        if (!h) return;

        h.sum += value;
        h.count++;
        for (let i = 0; i < h.buckets.length; i++) {
            if (value <= h.buckets[i]) {
                h.bucketCounts[i]++;
            }
        }
        h.bucketCounts[h.buckets.length]++; // +Inf bucket
    }

    // ─── Queries ──────────────────────────────────────────────────────────

    /** Legacy: get flat metrics object (backward-compatible). */
    getMetrics() {
        const result = {};
        for (const [name, m] of this._counters) result[name] = m.value;
        for (const [name, m] of this._gauges) result[name] = m.value;
        return result;
    }

    /** Typed snapshot for API/dashboard. */
    getSnapshot() {
        const counters = {};
        for (const [name, m] of this._counters) counters[name] = m.value;

        const gauges = {};
        for (const [name, m] of this._gauges) gauges[name] = m.value;

        const histograms = {};
        for (const [name, m] of this._histograms) {
            histograms[name] = {
                count: m.count,
                sum: m.sum,
                mean: m.count > 0 ? Math.round(m.sum / m.count) : 0,
            };
        }

        return { counters, gauges, histograms };
    }

    getUptimeSeconds() {
        return Math.floor((Date.now() - this.serverStartedAt) / 1000);
    }

    /** Legacy: health snapshot (backward-compatible). */
    getHealthSnapshot() {
        return {
            uptime: this.getUptimeSeconds(),
            activeSessions: {
                webSockets: this._gauges.get('activeWebSockets')?.value ?? 0,
                exec: this._gauges.get('activeExecSessions')?.value ?? 0,
            },
        };
    }

    // ─── Prometheus Text Format ───────────────────────────────────────────

    /** Prometheus-compatible text exposition format. */
    toPrometheusText() {
        const lines = [];

        for (const [name, m] of this._counters) {
            if (m.help) lines.push(`# HELP ${name} ${m.help}`);
            lines.push(`# TYPE ${name} counter`);
            lines.push(`${name} ${m.value}`);
        }

        for (const [name, m] of this._gauges) {
            if (m.help) lines.push(`# HELP ${name} ${m.help}`);
            lines.push(`# TYPE ${name} gauge`);
            lines.push(`${name} ${m.value}`);
        }

        for (const [name, m] of this._histograms) {
            if (m.help) lines.push(`# HELP ${name} ${m.help}`);
            lines.push(`# TYPE ${name} histogram`);
            let cumulative = 0;
            for (let i = 0; i < m.buckets.length; i++) {
                cumulative += m.bucketCounts[i];
                lines.push(`${name}_bucket{le="${m.buckets[i]}"} ${cumulative}`);
            }
            lines.push(`${name}_bucket{le="+Inf"} ${m.count}`);
            lines.push(`${name}_sum ${m.sum}`);
            lines.push(`${name}_count ${m.count}`);
        }

        return lines.join('\n') + '\n';
    }
}

// Singleton instance
const metricsRegistry = new MetricsRegistry();
export { METRIC_TYPES };
export default metricsRegistry;
