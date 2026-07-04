import CertificateProvider from './certificateProvider.interface.js';
import crypto from 'crypto';

export default class PlatformCertificateProvider extends CertificateProvider {
    get name() {
        return 'platform';
    }

    async requestCertificate(certificate, domain) {
        // Simulate immediate issuance for the educational platform
        // Realistic CA would transition to 'validating' and require ACME challenges
        
        return {
            status: 'issued',
            serialNumber: crypto.randomBytes(16).toString('hex').toUpperCase(),
            fingerprint: crypto.createHash('sha256').update(certificate._id.toString() + Date.now()).digest('hex'),
            issuer: 'DevOpsEase Platform CA',
            issuedAt: new Date(),
            // 90 day validity matching Let's Encrypt behavior
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        };
    }

    async checkStatus(certificate) {
        // Since requestCertificate is synchronous, this is a no-op fallback
        if (certificate.status === 'issued') {
            return {
                status: 'issued',
                serialNumber: certificate.serialNumber,
                fingerprint: certificate.fingerprint,
                issuer: certificate.issuer,
                issuedAt: certificate.issuedAt,
                expiresAt: certificate.expiresAt
            };
        }
        
        return { status: 'failed', error: 'Unexpected state for synchronous platform provider' };
    }

    async revokeCertificate(certificate, reason) {
        // Simulate revocation success
        return;
    }
}
