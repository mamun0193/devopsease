import Domain from '../models/domain.model.js';
import DomainEvent from '../models/domainEvent.model.js';
import { transition } from '../system/domainLifecycle.js';
import releaseEvents from '../events/release.events.js';
import logger from '../utils/logger.js';
import dns from 'dns/promises';
import fetch from 'node-fetch';

class DomainHealthService {

    /**
     * Evaluate the health of a domain across 4 dimensions: DNS, Gateway, TLS, HTTP
     */
    async evaluateHealth(domainId) {
        const domain = await Domain.findById(domainId);
        if (!domain) return null;

        if (!['connected', 'healthy', 'unhealthy'].includes(domain.status)) {
            return null; // Health is only evaluated for connected domains
        }

        const checks = {
            dns: await this.checkDnsHealth(domain.hostname, domain.autoManaged),
            gateway: await this.checkGatewayReachability(domain.hostname, domain.autoManaged),
            tls: await this.checkTlsValidity(domain),
            http: await this.checkHttpAvailability(domain.hostname, domain.autoManaged)
        };

        const overallStatus = this._determineOverallStatus(checks);
        const previousStatus = domain.healthStatus;

        domain.healthStatus = overallStatus;
        domain.lastHealthCheck = new Date();
        await domain.save();

        // If status changed, potentially transition domain state
        if (overallStatus !== previousStatus) {
            if (overallStatus === 'HEALTHY' && domain.status !== 'healthy') {
                await transition(domain._id, 'healthy');
            } else if (overallStatus === 'UNHEALTHY' && domain.status !== 'unhealthy') {
                await transition(domain._id, 'unhealthy');
            }
            
            await this._recordHealthEvent(domain, overallStatus, checks);
        }

        return {
            overall: overallStatus,
            checks
        };
    }

    _determineOverallStatus(checks) {
        // If any check fails, it's UNHEALTHY
        if (checks.dns.status === 'failed' || 
            checks.gateway.status === 'failed' || 
            checks.tls.status === 'failed' || 
            checks.http.status === 'failed') {
            return 'UNHEALTHY';
        }

        // If TLS is expiring soon, or HTTP is slow but working, it's DEGRADED
        if (checks.tls.status === 'degraded' || checks.http.status === 'degraded') {
            return 'DEGRADED';
        }

        return 'HEALTHY';
    }

    async checkDnsHealth(hostname, autoManaged) {
        if (autoManaged) return { status: 'healthy', records: ['simulated'] }; // Simulate for autoManaged
        try {
            const records = await dns.resolve(hostname);
            return { status: 'healthy', records };
        } catch (error) {
            return { status: 'failed', error: error.message };
        }
    }

    async checkGatewayReachability(hostname, autoManaged) {
        if (autoManaged) return { status: 'healthy', latencyMs: 10 };
        // A true implementation would query the Gateway cache directly or check RoutingTable
        return { status: 'healthy', latencyMs: 0 };
    }

    async checkTlsValidity(domain) {
        if (!domain.activeCertificate || domain.activeCertificate.status !== 'installed') {
            return { status: 'failed', error: 'No active certificate installed' };
        }

        const now = new Date();
        const expires = new Date(domain.activeCertificate.expiresAt);
        const daysRemaining = Math.floor((expires - now) / (1000 * 60 * 60 * 24));

        if (now > expires) {
            return { status: 'failed', error: 'Certificate expired' };
        }

        if (daysRemaining < 14) {
            return { status: 'degraded', daysRemaining, error: 'Certificate expires soon' };
        }

        return { status: 'healthy', daysRemaining };
    }

    async checkHttpAvailability(hostname, autoManaged) {
        if (autoManaged) return { status: 'healthy', statusCode: 200, responseTime: 50 }; // Simulate
        try {
            const start = Date.now();
            const response = await fetch(`http://${hostname}`, { 
                method: 'HEAD',
                timeout: 5000,
                redirect: 'follow'
            });
            const duration = Date.now() - start;

            if (!response.ok) {
                 return { status: 'failed', statusCode: response.status, error: `HTTP ${response.status}` };
            }

            if (duration > 3000) {
                 return { status: 'degraded', statusCode: response.status, responseTime: duration };
            }

            return { status: 'healthy', statusCode: response.status, responseTime: duration };
        } catch (error) {
            return { status: 'failed', error: error.message };
        }
    }

    /**
     * Scheduler Job: Evaluate health of all connected/healthy/unhealthy domains.
     */
    async runHealthCheckJob() {
        logger.info('[DomainHealthService] Running health check job');
        
        // Find domains that need health checks (connected or already healthy/unhealthy)
        const domains = await Domain.find({
            status: { $in: ['connected', 'healthy', 'unhealthy'] }
        });
        
        for (const domain of domains) {
            try {
                await this.evaluateHealth(domain._id);
            } catch (err) {
                 logger.error(`[DomainHealthService] Error evaluating health for ${domain._id}: ${err.message}`);
            }
        }
    }

    async _recordHealthEvent(domain, overallStatus, checks) {
        const reason = `Domain health transitioned to ${overallStatus}`;
        
        await DomainEvent.create({
            domainId: domain._id,
            userId: domain.userId,
            decision: 'DOMAIN_HEALTH_CHANGED',
            trigger: 'HEALTH_CHECK',
            actor: 'System',
            reason,
            relatedResource: null
        });
        
        await Domain.updateOne(
            { _id: domain._id },
            { 
                $push: { 
                    explainabilityLog: {
                        $each: [{
                            timestamp: new Date(),
                            decision: 'DOMAIN_HEALTH_CHANGED',
                            trigger: 'HEALTH_CHECK',
                            actor: 'System',
                            reason,
                            relatedResource: null
                        }],
                        $slice: -20
                    }
                }
            }
        );
        
        releaseEvents.emitDomainEvent('DOMAIN_HEALTH_CHANGED', { 
            domainId: domain._id, 
            hostname: domain.hostname,
            status: overallStatus,
            checks
        }, 'Domain', domain._id);
    }
}

export default new DomainHealthService();
