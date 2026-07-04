import Certificate from '../models/certificate.model.js';
import Domain from '../models/domain.model.js';
import DomainEvent from '../models/domainEvent.model.js';
import { canTransition, transition } from '../system/certificateLifecycle.js';
import releaseEvents from '../events/release.events.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import domainService from './domain.service.js'; // To use _recordEvent

import PlatformCertificateProvider from './providers/certificate/platformCertificate.provider.js';

// Setup provider registry
const certificateProviders = new Map();
const platformProvider = new PlatformCertificateProvider();
certificateProviders.set(platformProvider.name, platformProvider);

class CertificateService {

    /**
     * Request a new certificate for a domain.
     */
    async requestCertificate(domainId) {
        const domain = await Domain.findById(domainId);
        if (!domain) throw new AppError('Domain not found', 404);
        if (!['verified', 'connected', 'healthy', 'unhealthy'].includes(domain.status)) {
            throw new AppError(`Cannot request certificate for domain in status ${domain.status}`, 400);
        }

        const provider = certificateProviders.get(domain.certificateProvider || 'platform');
        if (!provider) throw new AppError(`Unsupported certificate provider: ${domain.certificateProvider}`, 500);

        // Cancel any currently active certificate
        if (domain.activeCertificate && domain.activeCertificate.certificateId) {
             const activeCert = await Certificate.findById(domain.activeCertificate.certificateId);
             if (activeCert && activeCert.status !== 'revoked' && activeCert.status !== 'expired') {
                 // Transition old cert to replaced
                 await transition(activeCert._id, 'replaced');
             }
        }

        // Create certificate record
        const certificate = await Certificate.create({
            domainId: domain._id,
            userId: domain.userId,
            hostname: domain.hostname,
            coveredHostnames: [domain.hostname],
            status: 'requested',
            provider: provider.name
        });

        await this._recordEvent(domain._id, certificate._id, domain.userId, 'CERTIFICATE_REQUESTED', 'SYSTEM', 'Platform', `Certificate requested via ${provider.name}`);

        // Trigger request to provider
        await this._processCertificateRequest(certificate, domain, provider);

        return certificate;
    }

    /**
     * Internal: Process request with provider
     */
    async _processCertificateRequest(certificate, domain, provider) {
        try {
            await transition(certificate._id, 'validating');
            
            const result = await provider.requestCertificate(certificate, domain);
            
            if (result.status === 'issued') {
                certificate.serialNumber = result.serialNumber;
                certificate.fingerprint = result.fingerprint;
                certificate.issuer = result.issuer;
                certificate.issuedAt = result.issuedAt;
                certificate.expiresAt = result.expiresAt;
                // Calculate renewAt (30 days before expiry)
                if (result.expiresAt) {
                    certificate.renewAt = new Date(result.expiresAt.getTime() - (30 * 24 * 60 * 60 * 1000));
                }
                
                await certificate.save();
                await transition(certificate._id, 'issued');
                await this._recordEvent(domain._id, certificate._id, domain.userId, 'CERTIFICATE_ISSUED', 'SYSTEM', 'Platform CA', 'Certificate successfully issued');
                
                // Automatically install the issued certificate
                await this.installCertificate(certificate._id);
            }
        } catch (error) {
            logger.error(`Certificate issuance failed for ${domain.hostname}:`, error);
            await transition(certificate._id, 'failed');
            await this._recordEvent(domain._id, certificate._id, domain.userId, 'CERTIFICATE_ISSUANCE_FAILED', 'SYSTEM', 'Platform CA', error.message);
        }
    }

    /**
     * Install an issued certificate onto the domain.
     */
    async installCertificate(certificateId) {
        const certificate = await Certificate.findById(certificateId);
        if (!certificate) throw new AppError('Certificate not found', 404);
        if (certificate.status !== 'issued') throw new AppError('Certificate must be issued to be installed', 400);

        const domain = await Domain.findById(certificate.domainId);
        if (!domain) throw new AppError('Domain not found', 404);

        await transition(certificate._id, 'installed');
        
        // Update domain's active certificate binding
        domain.activeCertificate = {
            certificateId: certificate._id,
            hostname: certificate.hostname,
            expiresAt: certificate.expiresAt,
            status: 'installed',
            boundAt: new Date()
        };
        await domain.save();

        await this._recordEvent(domain._id, certificate._id, domain.userId, 'CERTIFICATE_INSTALLED', 'SYSTEM', 'Platform', 'Certificate installed and bound to domain');
        
        // Notify Gateway to reload certs
        releaseEvents.emitDomainEvent('CERTIFICATE_INSTALLED', { domainId: domain._id, hostname: domain.hostname }, 'Certificate', certificate._id);
        
        // If domain is verified, automatically connect it to routing
        if (domain.status === 'verified') {
            await domainService.connectDomain(domain._id);
        }

        return certificate;
    }

    /**
     * Renew a certificate.
     */
    async renewCertificate(certificateId) {
        const certificate = await Certificate.findById(certificateId);
        if (!certificate) throw new AppError('Certificate not found', 404);
        if (certificate.status !== 'installed') throw new AppError('Can only renew installed certificates', 400);

        const domain = await Domain.findById(certificate.domainId);
        
        try {
            await transition(certificate._id, 'renewing');
            certificate.renewalAttempts += 1;
            certificate.lastRenewalAt = new Date();
            await certificate.save();
            
            await this._recordEvent(domain._id, certificate._id, domain.userId, 'CERTIFICATE_RENEWAL_STARTED', 'SCHEDULER', 'Platform', 'Starting certificate renewal process');
            
            // To properly rotate, we request a NEW certificate for the domain.
            // The requestCertificate flow will automatically handle replacing this old certificate
            // once the new one is issued and installed.
            
            await this.requestCertificate(domain._id);
            
            // Note: The current certificate remains 'renewing' until the new one replaces it.
            // When requestCertificate creates the new cert, it will mark this one as 'replaced'.
            
            return { success: true, message: 'Renewal requested successfully' };
        } catch (error) {
            certificate.lastRenewalError = error.message;
            await certificate.save();
            // Revert back to installed, but keep error tracked
            await transition(certificate._id, 'renewal_failed');
            await this._recordEvent(domain._id, certificate._id, domain.userId, 'CERTIFICATE_RENEWAL_FAILED', 'SYSTEM', 'Platform CA', error.message);
            throw new AppError(`Certificate renewal failed: ${error.message}`, 500);
        }
    }

    /**
     * Revoke a certificate.
     */
    async revokeCertificate(certificateId, reason) {
        const certificate = await Certificate.findById(certificateId);
        if (!certificate) throw new AppError('Certificate not found', 404);

        const provider = certificateProviders.get(certificate.provider);
        if (provider) {
             try {
                 await provider.revokeCertificate(certificate, reason);
             } catch (err) {
                 logger.warn(`Provider failed to revoke cert ${certificateId}: ${err.message}`);
             }
        }

        await transition(certificate._id, 'revoked');
        
        const domain = await Domain.findById(certificate.domainId);
        if (domain && domain.activeCertificate && domain.activeCertificate.certificateId.equals(certificate._id)) {
             domain.activeCertificate.status = 'revoked';
             await domain.save();
             await this._recordEvent(domain._id, certificate._id, domain.userId, 'CERTIFICATE_REVOKED', 'USER_COMMAND', 'User', reason || 'Certificate revoked manually');
             
             // Notify gateway to drop the cert
             releaseEvents.emitDomainEvent('CERTIFICATE_REVOKED', { domainId: domain._id, hostname: domain.hostname }, 'Certificate', certificate._id);
        }

        return certificate;
    }

    /**
     * Get certificate history for a domain.
     */
    async getCertificateHistory(domainId) {
        return Certificate.find({ domainId }).sort({ createdAt: -1 }).lean();
    }

    /**
     * Scheduler Job: Renew certificates nearing expiration.
     */
    async runRenewalJob() {
        logger.info('[CertificateService] Running renewal job');
        const now = new Date();
        let processed = 0;
        
        while (true) {
            // Find installed certs where renewAt is in the past
            const dueCerts = await Certificate.find({
                status: 'installed',
                renewAt: { $lte: now }
            }).limit(50);
            
            if (dueCerts.length === 0) break;
            
            for (const cert of dueCerts) {
                try {
                    // Apply exponential backoff based on renewalAttempts
                    // Base: 5 mins (300,000 ms), Max: 24h
                    if (cert.renewalAttempts > 0) {
                         const backoffMs = Math.min(300_000 * Math.pow(2, cert.renewalAttempts), 24 * 60 * 60 * 1000);
                         const nextRetry = new Date(cert.lastRenewalAt.getTime() + backoffMs);
                         if (now < nextRetry) {
                              logger.debug(`[CertificateService] Skipping renewal for ${cert._id}, backoff until ${nextRetry}`);
                              // Must remove from the processing queue or we infinite loop.
                              // Since we skip, it stays 'installed'.
                              // We must transition it to 'renewal_failed' to drop it out of the query.
                              await transition(cert._id, 'renewal_failed');
                              continue;
                         }
                    }
                    
                    await this.renewCertificate(cert._id);
                    processed++;
                } catch (err) {
                     // Errors logged in renewCertificate
                }
            }
        }
        logger.info(`[CertificateService] Renewal job completed. Processed ${processed} certificates.`);
    }

    /**
     * Scheduler Job: Mark expired certificates.
     */
    async runExpiryJob() {
        logger.info('[CertificateService] Running expiry job');
        const now = new Date();
        let processed = 0;
        
        while (true) {
            const expiredCerts = await Certificate.find({
                status: { $in: ['installed', 'renewing'] },
                expiresAt: { $lte: now }
            }).limit(100);
            
            if (expiredCerts.length === 0) break;
            
            for (const cert of expiredCerts) {
                try {
                    await transition(cert._id, 'expired');
                    const domain = await Domain.findById(cert.domainId);
                    if (domain) {
                         if (domain.activeCertificate && domain.activeCertificate.certificateId.equals(cert._id)) {
                              domain.activeCertificate.status = 'expired';
                              await domain.save();
                              
                              // Mark domain unhealthy if its active cert expired
                              if (domain.status === 'healthy') {
                                   await domainService.transition(domain._id, 'unhealthy');
                              }
                         }
                         await this._recordEvent(domain._id, cert._id, domain.userId, 'CERTIFICATE_EXPIRED', 'SCHEDULER', 'Platform', 'Certificate expired');
                    }
                    processed++;
                } catch (err) {
                     logger.error(`[CertificateService] Failed to process expiry for ${cert._id}: ${err.message}`);
                }
            }
        }
        logger.info(`[CertificateService] Expiry job completed. Processed ${processed} certificates.`);
    }

    /**
     * Record an event.
     */
    async _recordEvent(domainId, certificateId, userId, decision, trigger, actor, reason) {
        // 1. Create standalone audit event
        await DomainEvent.create({
            domainId,
            certificateId,
            userId,
            decision,
            trigger,
            actor: String(actor),
            reason,
            relatedResource: { type: 'Certificate', id: certificateId }
        });

        // 2. Push to domain explainability log
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
                            relatedResource: { type: 'Certificate', id: certificateId }
                        }],
                        $slice: -20
                    }
                }
            }
        );
        
        // 3. Push to certificate explainability log
        await Certificate.updateOne(
            { _id: certificateId },
            { 
                $push: { 
                    explainabilityLog: {
                        $each: [{
                            timestamp: new Date(),
                            decision,
                            trigger,
                            actor: String(actor),
                            reason,
                            relatedResource: { type: 'Domain', id: domainId }
                        }],
                        $slice: -20
                    }
                }
            }
        );
    }
}

export default new CertificateService();
