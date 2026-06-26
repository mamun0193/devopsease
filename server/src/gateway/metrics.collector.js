import logger from '../utils/logger.js';

// Gateway Metrics Collector — In-memory, provider-independent metrics.

// Tracks per-application and global gateway metrics including:


const LATENCY_BUFFER_SIZE = 10_000;
const RECENT_REQUESTS_SIZE = 200;
const RPS_WINDOW_SECONDS = 60;

class GatewayMetricsCollector {
    constructor() {
        this._startedAt = Date.now();
        this._appMetrics = new Map();    // Map<applicationId, AppMetrics>
        this._globalRequests = 0;
        this._globalErrors = 0;
        this._globalLatencySum = 0;
        this._globalBytesIn = 0;
        this._globalBytesOut = 0;
        this._activeConnections = 0;
        this._latencies = [];            // Sorted insertion array for percentiles
        this._recentRequests = [];       // Ring buffer
        this._statusCodes = new Map();   // Map<code, count>
        this._rpsWindow = new Array(RPS_WINDOW_SECONDS).fill(0);
        this._rpsCurrentSecond = Math.floor(Date.now() / 1000);
        this._topUrls = new Map();       // Map<url, count>
        this._topErrors = new Map();     // Map<error, count>
        // WebSocket tracking
        this._activeWsConnections = 0;
        this._totalWsConnections = 0;
        this._wsBytesIn = 0;
        this._wsBytesOut = 0;
        // Top applications by request count
        this._topApps = new Map();       // Map<slug, count>
    }

    _getAppMetrics(appId) {
        const key = String(appId);
        if (!this._appMetrics.has(key)) {
            this._appMetrics.set(key, {
                requests: 0,
                errors: 0,
                activeConnections: 0,
                totalLatencyMs: 0,
                bytesIn: 0,
                bytesOut: 0,
                statusCodes: new Map(),
                latencies: [],
            });
        }
        return this._appMetrics.get(key);
    }

    record(appId, { status, latencyMs, bytesIn = 0, bytesOut = 0, url = '/', error = null }) {
        // Global
        this._globalRequests++;
        this._globalLatencySum += latencyMs;
        this._globalBytesIn += bytesIn;
        this._globalBytesOut += bytesOut;

        if (status >= 400) this._globalErrors++;

        this._statusCodes.set(status, (this._statusCodes.get(status) || 0) + 1);

        // Insert latency into sorted buffer (capped)
        this._insertLatency(this._latencies, latencyMs);

        // RPS window
        const currentSecond = Math.floor(Date.now() / 1000);
        this._advanceRpsWindow(currentSecond);
        this._rpsWindow[0]++;

        // Top URLs (capped at 100 entries)
        if (this._topUrls.size < 100) {
            this._topUrls.set(url, (this._topUrls.get(url) || 0) + 1);
        }

        // Top errors
        if (error && this._topErrors.size < 50) {
            this._topErrors.set(error, (this._topErrors.get(error) || 0) + 1);
        }

        // Recent requests ring buffer
        this._recentRequests.unshift({
            slug: appId,
            status,
            latencyMs,
            timestamp: new Date().toISOString(),
        });
        if (this._recentRequests.length > RECENT_REQUESTS_SIZE) {
            this._recentRequests.length = RECENT_REQUESTS_SIZE;
        }

        // Per-app
        if (appId) {
            const app = this._getAppMetrics(appId);
            app.requests++;
            app.totalLatencyMs += latencyMs;
            app.bytesIn += bytesIn;
            app.bytesOut += bytesOut;
            if (status >= 400) app.errors++;
            app.statusCodes.set(status, (app.statusCodes.get(status) || 0) + 1);
            this._insertLatency(app.latencies, latencyMs);
            // Track top applications
            this._topApps.set(appId, (this._topApps.get(appId) || 0) + 1);
        }
    }

    incrementConnections(appId) {
        this._activeConnections++;
        if (appId) this._getAppMetrics(appId).activeConnections++;
    }

    decrementConnections(appId) {
        this._activeConnections = Math.max(0, this._activeConnections - 1);
        if (appId) {
            const app = this._getAppMetrics(appId);
            app.activeConnections = Math.max(0, app.activeConnections - 1);
        }
    }

    incrementWsConnections() {
        this._activeWsConnections++;
        this._totalWsConnections++;
    }

    decrementWsConnections() {
        this._activeWsConnections = Math.max(0, this._activeWsConnections - 1);
    }

    recordWsBytes(bytesIn = 0, bytesOut = 0) {
        this._wsBytesIn += bytesIn;
        this._wsBytesOut += bytesOut;
    }

    // Get global gateway metrics.
     
    getGlobalMetrics() {
        const currentSecond = Math.floor(Date.now() / 1000);
        this._advanceRpsWindow(currentSecond);

        return {
            totalRequests: this._globalRequests,
            totalErrors: this._globalErrors,
            avgLatencyMs: this._globalRequests > 0 ? Math.round(this._globalLatencySum / this._globalRequests) : 0,
            p95LatencyMs: this._percentile(this._latencies, 0.95),
            p99LatencyMs: this._percentile(this._latencies, 0.99),
            requestsPerSecond: this._calculateRps(),
            activeConnections: this._activeConnections,
            connectedApps: this._appMetrics.size,
            healthyApps: 0, // Populated by gateway service from resolver
            bytesTransferred: this._globalBytesIn + this._globalBytesOut,
            gatewayUptime: Date.now() - this._startedAt,
            // WebSocket metrics
            activeWsConnections: this._activeWsConnections,
            totalWsConnections: this._totalWsConnections,
            wsBytesTransferred: this._wsBytesIn + this._wsBytesOut,
            // Top lists
            recentRequests: this._recentRequests.slice(0, 50),
            topResponseCodes: this._mapToSortedArray(this._statusCodes, 'code', 'count', 10),
            topRequestedUrls: this._mapToSortedArray(this._topUrls, 'url', 'count', 10),
            topApplications: this._mapToSortedArray(this._topApps, 'slug', 'count', 10),
            topErrors: this._mapToSortedArray(this._topErrors, 'error', 'count', 10),
        };
    }

    // Get per-application metrics.
     
    getApplicationMetrics(appId) {
        const app = this._appMetrics.get(String(appId));
        if (!app) {
            return {
                requests: 0, errors: 0, activeConnections: 0,
                avgLatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0,
                bytesTransferred: 0, statusCodes: {},
            };
        }

        return {
            requests: app.requests,
            errors: app.errors,
            activeConnections: app.activeConnections,
            avgLatencyMs: app.requests > 0 ? Math.round(app.totalLatencyMs / app.requests) : 0,
            p95LatencyMs: this._percentile(app.latencies, 0.95),
            p99LatencyMs: this._percentile(app.latencies, 0.99),
            bytesTransferred: app.bytesIn + app.bytesOut,
            statusCodes: Object.fromEntries(app.statusCodes),
        };
    }

    // Internal helpers 

    _insertLatency(arr, value) {
        // Binary insertion into sorted array (ascending)
        let lo = 0, hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (arr[mid] < value) lo = mid + 1;
            else hi = mid;
        }
        arr.splice(lo, 0, value);
        // Cap buffer size (FIFO eviction from the beginning)
        if (arr.length > LATENCY_BUFFER_SIZE) {
            arr.shift();
        }
    }

    _percentile(sortedArr, p) {
        if (sortedArr.length === 0) return 0;
        const index = Math.ceil(p * sortedArr.length) - 1;
        return sortedArr[Math.max(0, index)] || 0;
    }

    _advanceRpsWindow(currentSecond) {
        const elapsed = currentSecond - this._rpsCurrentSecond;
        if (elapsed > 0) {
            // Shift window forward
            const shifts = Math.min(elapsed, RPS_WINDOW_SECONDS);
            for (let i = 0; i < shifts; i++) {
                this._rpsWindow.pop();
                this._rpsWindow.unshift(0);
            }
            this._rpsCurrentSecond = currentSecond;
        }
    }

    _calculateRps() {
        const sum = this._rpsWindow.reduce((a, b) => a + b, 0);
        return Math.round((sum / RPS_WINDOW_SECONDS) * 100) / 100;
    }

    _mapToSortedArray(map, keyName, valueName, limit) {
        return [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([k, v]) => ({ [keyName]: k, [valueName]: v }));
    }
}

const metricsCollector = new GatewayMetricsCollector();
export default metricsCollector;
