import Domain from '../models/domain.model.js';
import DomainEvent from '../models/domainEvent.model.js';
import Application from '../models/application.model.js';
import RoutingTable from '../models/routingTable.model.js';
import { canTransition, transition, VALID_TRANSITIONS } from '../system/domainLifecycle.js';
import releaseEvents from '../events/release.events.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

import DnsTxtVerificationProvider from './providers/verification/dnsVerification.provider.js';
import HttpVerificationProvider from './providers/verification/httpVerification.provider.js';

// Setup provider registry
const verificationProviders = new Map();
const dnsProvider = new DnsTxtVerificationProvider();
const httpProvider = new HttpVerificationProvider();
verificationProviders.set(dnsProvider.method, dnsProvider);
verificationProviders.set(httpProvider.method, httpProvider);

class DomainService {

    /**
     * Add a new domain to an application.
     */
    async addDomain(userId, applicationId, hostname, type, options = {}) {
        const { autoManaged = false, verificationMethod = 'dns_txt' } = options;

        const application = await Application.findOne({ _id: applicationId, userId });
        if (!application) throw new AppError('Application not found or access denied', 404);

        const existing = await Domain.findOne({ hostname });
        if (existing) throw new AppError(`Domain ${hostname} is already registered`, 400);

        const provider = verificationProviders.get(verificationMethod);
        if (!provider) throw new AppError(`Unsupported verification method: ${verificationMethod}`, 400);

        // Create domain record
        const domain = await Domain.create({
            userId,
            applicationId,
            hostname,
            type,
            autoManaged,
            status: 'added'
        });

        await this._recordEvent(domain._id, userId, 'DOMAIN_CREATED', 'USER_COMMAND', userId, 'Domain added');

        // Automatically trigger verification challenge generation
        await this._generateVerificationChallenge(domain, provider, userId);

        return domain;
    }

    /**
     * Internal: Generate challenge and transition to pending_verification
     */
    async _generateVerificationChallenge(domain, provider, actor) {
        try {
            const challenge = await provider.generateChallenge(domain);
            
            domain.verification = {
                method: provider.method,
                token: challenge.token,
                instructions: challenge.instructions,
                challengedAt: new Date(),
                expiresAt: challenge.expiresAt,
                attempts: 0,
                lastError: null
            };
            
            await domain.save();
            await transition(domain._id, 'pending_verification');
            await this._recordEvent(domain._id, domain.userId, 'CHALLENGE_GENERATED', 'SYSTEM', actor, `Verification challenge generated using ${provider.method}`);
        } catch (error) {
            logger.error(`Failed to generate verification challenge for ${domain.hostname}:`, error);
            throw new AppError('Failed to generate verification challenge', 500);
        }
    }

    /**
     * Verify a domain using the stored challenge.
     */
    async verifyDomain(domainId, userId) {
        const domain = await Domain.findOne({ _id: domainId, userId });
        if (!domain) throw new AppError('Domain not found', 404);
        if (domain.status !== 'pending_verification' && domain.status !== 'verification_failed') {
            throw new AppError(`Cannot verify domain in status ${domain.status}`, 400);
        }

        const provider = verificationProviders.get(domain.verification.method);
        if (!provider) throw new AppError('Verification provider not found', 500);

        domain.verification.attempts += 1;
        
        try {
            const result = await provider.verify(domain, domain.verification);
            
            if (result.verified) {
                domain.verification.verifiedAt = new Date();
                domain.verification.lastError = null;
                await domain.save();
                
                await transition(domain._id, 'verified');
                await this._recordEvent(domain._id, userId, 'DOMAIN_VERIFIED', 'USER_COMMAND', userId, result.reason);
                
                // Emitting event so CertificateService can listen and request a cert
                releaseEvents.emitDomainEvent('DOMAIN_VERIFIED', { domainId: domain._id, hostname: domain.hostname }, 'Domain', domain._id);
                
                return { success: true, message: result.reason };
            } else {
                domain.verification.lastError = result.reason;
                await domain.save();
                
                await transition(domain._id, 'verification_failed');
                await this._recordEvent(domain._id, userId, 'DOMAIN_VERIFICATION_FAILED', 'USER_COMMAND', userId, result.reason);
                
                return { success: false, message: result.reason };
            }
        } catch (error) {
            domain.verification.lastError = error.message;
            await domain.save();
            await transition(domain._id, 'verification_failed');
            throw new AppError(`Verification check failed: ${error.message}`, 500);
        }
    }

    /**
     * Retry verification challenge generation.
     */
    async retryVerification(domainId, userId, verificationMethod = null) {
        const domain = await Domain.findOne({ _id: domainId, userId });
        if (!domain) throw new AppError('Domain not found', 404);
        
        const method = verificationMethod || (domain.verification ? domain.verification.method : 'dns_txt');
        const provider = verificationProviders.get(method);
        
        if (!provider) throw new AppError(`Unsupported verification method: ${method}`, 400);
        
        await this._generateVerificationChallenge(domain, provider, userId);
        return domain;
    }

    /**
     * Connect a verified domain to its application.
     */
    async connectDomain(domainId) {
        const domain = await Domain.findById(domainId);
        if (!domain) throw new AppError('Domain not found', 404);
        if (domain.status !== 'verified') throw new AppError('Domain must be verified before connection', 400);

        await transition(domain._id, 'connected');
        await this._recordEvent(domain._id, domain.userId, 'DOMAIN_CONNECTED', 'SYSTEM', 'Platform', 'Domain connected to routing');

        // Add to RoutingTable hostnames index
        await this._updateRoutingTable(domain.applicationId, domain.hostname, true);

        // Notify Gateway
        releaseEvents.emitDomainEvent('DOMAIN_CONNECTED', { domainId: domain._id, hostname: domain.hostname, applicationId: domain.applicationId }, 'Domain', domain._id);

        return domain;
    }

    /**
     * Disconnect a domain from its application.
     */
    async disconnectDomain(domainId, reason) {
        const domain = await Domain.findById(domainId);
        if (!domain) throw new AppError('Domain not found', 404);
        
        if (domain.status !== 'connected' && domain.status !== 'healthy' && domain.status !== 'unhealthy') {
             throw new AppError('Domain is not connected', 400);
        }

        await transition(domain._id, 'disconnected');
        await this._recordEvent(domain._id, domain.userId, 'DOMAIN_DISCONNECTED', 'USER_COMMAND', 'User', reason || 'Domain disconnected manually');

        // Remove from RoutingTable hostnames index
        await this._updateRoutingTable(domain.applicationId, domain.hostname, false);

        // Notify Gateway
        releaseEvents.emitDomainEvent('DOMAIN_DISCONNECTED', { domainId: domain._id, hostname: domain.hostname, applicationId: domain.applicationId }, 'Domain', domain._id);

        return domain;
    }

    /**
     * Internal: Update RoutingTable hostnames array
     */
    async _updateRoutingTable(applicationId, hostname, isAdd) {
        const routingTable = await RoutingTable.findOne({ applicationId }).sort({ version: -1 });
        if (!routingTable) {
             logger.warn(`No RoutingTable found for application ${applicationId} while updating hostname ${hostname}`);
             return;
        }

        let updated = false;
        if (isAdd && !routingTable.hostnames.includes(hostname)) {
            routingTable.hostnames.push(hostname);
            updated = true;
        } else if (!isAdd && routingTable.hostnames.includes(hostname)) {
            routingTable.hostnames = routingTable.hostnames.filter(h => h !== hostname);
            updated = true;
        }

        if (updated) {
            await routingTable.save();
        }
    }

    /**
     * Archive a domain (soft delete).
     */
    async archiveDomain(domainId, userId, reason) {
        const domain = await Domain.findOne({ _id: domainId, userId });
        if (!domain) throw new AppError('Domain not found', 404);

        if (['connected', 'healthy', 'unhealthy'].includes(domain.status)) {
            await this.disconnectDomain(domainId, 'Archiving domain');
        }

        await transition(domain._id, 'archived');
        await this._recordEvent(domain._id, userId, 'DOMAIN_ARCHIVED', 'USER_COMMAND', userId, reason || 'Domain archived');
        
        releaseEvents.emitDomainEvent('DOMAIN_ARCHIVED', { domainId: domain._id, hostname: domain.hostname }, 'Domain', domain._id);
        
        return domain;
    }

    /**
     * List domains for a user.
     */
    async listDomains(userId, filters = {}, options = {}) {
        const query = { userId, ...filters };
        // Don't show archived by default unless specifically requested
        if (!filters.status) {
             query.status = { $ne: 'archived' };
        }

        const page = parseInt(options.page, 10) || 1;
        const limit = parseInt(options.limit, 10) || 20;
        const skip = (page - 1) * limit;

        const domains = await Domain.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Domain.countDocuments(query);

        return {
            domains,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Get a specific domain with its details.
     */
    async getDomain(domainId, userId) {
        const domain = await Domain.findOne({ _id: domainId, userId }).populate('applicationId', 'name slug').lean();
        if (!domain) throw new AppError('Domain not found', 404);
        return domain;
    }

    /**
     * Scheduler Job: Re-check pending verifications.
     */
    async runVerificationJob() {
        logger.info('[DomainService] Running verification check job');
        let processed = 0;
        
        while (true) {
            const pendingDomains = await Domain.find({ status: 'pending_verification' }).limit(50);
            
            if (pendingDomains.length === 0) break;
            
            for (const domain of pendingDomains) {
                try {
                    // We pass 'SYSTEM' as user ID just to avoid failing, though we could pass domain.userId
                    await this.verifyDomain(domain._id, domain.userId);
                    processed++;
                } catch (err) {
                     // Ignore errors during automated retry, they are logged in verifyDomain
                     // The domain is transitioned to verification_failed by verifyDomain so it drops out of the queue
                }
            }
        }
        logger.info(`[DomainService] Verification check job completed. Processed ${processed} domains.`);
    }

    /**
     * Record an event to DomainEvent collection and Domain.explainabilityLog.
     */
    async _recordEvent(domainId, userId, decision, trigger, actor, reason, relatedResource = null) {
        // 1. Create standalone audit event
        await DomainEvent.create({
            domainId,
            userId,
            decision,
            trigger,
            actor: String(actor),
            reason,
            relatedResource
        });

        // 2. Push to domain explainability log for fast dashboard rendering
        await Domain.updateOne(
            { _id: domainId },
            { 
                $push: { 
                    explainabilityLog: {
                        $each: [{
                            timestamp: new Date(),
                            decision,
                            trigger,
                            actor: String(actor),
                            reason,
                            relatedResource
                        }],
                        $slice: -20 // keep last 20 events
                    }
                }
            }
        );
    }
}

export default new DomainService();
