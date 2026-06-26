// Gateway 
import { randomUUID } from 'crypto';

export class GatewayRequestContext {
    constructor(req) {
        // Request identity 
        this.requestId = req.headers['x-request-id'] || randomUUID();
        this.correlationId = req.headers['x-correlation-id'] || randomUUID();
        this.timestamp = Date.now();
        this.isoTimestamp = new Date(this.timestamp).toISOString();

        // Request metadata 
        this.method = req.method;
        this.originalUrl = req.originalUrl || req.url;
        this.ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        this.userAgent = req.headers['user-agent'] || null;

        // Auth 
        this.userId = null;
        this.isAuthenticated = false;

        // Application 
        this.slug = null;
        this.subPath = null;
        this.applicationId = null;
        this.applicationName = null;
        this.visibility = null;

        //  Deployment 
        this.deploymentId = null;
        this.provider = null;

        //  Runtime 
        this.runtime = null;
        // {
        //   endpoint:     string,      // 'http://127.0.0.1:4012'
        //   provider:     string,      // 'docker'
        //   protocol:     string,      // 'http' | 'https' | 'ws' | 'grpc' | 'h2'
        //   healthy:      boolean,
        //   version:      string|null, // deployment version tag
        //   deploymentId: string,
        //   applicationId: string,
        //   capabilities: string[],    // ['http', 'ws'] — what the endpoint supports
        //   metadata:     object,      // provider-specific metadata (containerId, etc.)
        // }

        //  Timing 
        this.resolvedAt = null;   // timestamp when resolution completed
        this.proxiedAt = null;    // timestamp when proxy started
        this.completedAt = null;  // timestamp when response finished
    }

    // Setters 

    setAuth(user) {
        if (user) {
            this.userId = String(user._id || user.userId);
            this.isAuthenticated = true;
        }
    }

    setSlug(slug, subPath) {
        this.slug = slug;
        this.subPath = subPath || '/';
    }

    setApplication(application) {
        if (application) {
            this.applicationId = String(application._id);
            this.applicationName = application.name;
            this.visibility = application.visibility;
            this.provider = application.provider;
        }
    }

    setDeployment(deployment) {
        if (deployment) {
            this.deploymentId = String(deployment._id);
        }
    }

    setRuntime(runtimeMeta) {
        this.runtime = runtimeMeta;
        this.resolvedAt = Date.now();
    }

    markProxied() {
        this.proxiedAt = Date.now();
    }

    markCompleted() {
        this.completedAt = Date.now();
    }

    // Computed 

    get resolutionLatencyMs() {
        return this.resolvedAt ? this.resolvedAt - this.timestamp : null;
    }

    get proxyLatencyMs() {
        return (this.completedAt && this.proxiedAt) ? this.completedAt - this.proxiedAt : null;
    }

    get totalLatencyMs() {
        return this.completedAt ? this.completedAt - this.timestamp : Date.now() - this.timestamp;
    }

    // Serializable snapshot for logging / metrics / tracing.
    toLogContext() {
        return {
            requestId: this.requestId,
            correlationId: this.correlationId,
            method: this.method,
            slug: this.slug,
            subPath: this.subPath,
            userId: this.userId,
            applicationId: this.applicationId,
            deploymentId: this.deploymentId,
            provider: this.provider,
            totalLatencyMs: this.totalLatencyMs,
        };
    }

    // Headers to inject into proxied requests.
    toProxyHeaders() {
        const headers = {
            'X-Request-Id': this.requestId,
            'X-Correlation-Id': this.correlationId,
            'X-Gateway-Timestamp': this.isoTimestamp,
        };
        if (this.userId) headers['X-User-Id'] = this.userId;
        if (this.applicationId) headers['X-Application-Id'] = this.applicationId;
        if (this.deploymentId) headers['X-Deployment-Id'] = this.deploymentId;
        if (this.provider) headers['X-Provider'] = this.provider;
        return headers;
    }
}

// Create a GatewayRequestContext from an incoming request.
export function createGatewayContext(req) {
    return new GatewayRequestContext(req);
}
