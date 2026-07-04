import domainService from '../services/domain.service.js';
import certificateService from '../services/certificate.service.js';
import domainHealthService from '../services/domainHealth.service.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import DomainEvent from '../models/domainEvent.model.js';

class DomainController {

    async addDomain(req, res, next) {
        try {
            const { applicationId, hostname, type = 'custom', options = {} } = req.body;
            const userId = req.user.userId || req.user._id;

            if (!applicationId || !hostname) {
                throw new AppError('applicationId and hostname are required', 400);
            }

            const domain = await domainService.addDomain(userId, applicationId, hostname, type, options);
            res.status(201).json({
                success: true,
                message: 'Domain added successfully',
                data: domain
            });
        } catch (error) {
            next(error);
        }
    }

    async verifyDomain(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId || req.user._id;

            const result = await domainService.verifyDomain(id, userId);
            res.status(200).json({
                success: result.success,
                message: result.message,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async retryVerification(req, res, next) {
        try {
            const { id } = req.params;
            const { method } = req.body;
            const userId = req.user.userId || req.user._id;

            const domain = await domainService.retryVerification(id, userId, method);
            res.status(200).json({
                success: true,
                message: 'Verification challenge regenerated',
                data: domain
            });
        } catch (error) {
            next(error);
        }
    }

    async connectDomain(req, res, next) {
        try {
            const { id } = req.params;
            const domain = await domainService.connectDomain(id);
            res.status(200).json({
                success: true,
                message: 'Domain connected to application',
                data: domain
            });
        } catch (error) {
            next(error);
        }
    }

    async disconnectDomain(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const domain = await domainService.disconnectDomain(id, reason);
            res.status(200).json({
                success: true,
                message: 'Domain disconnected from application',
                data: domain
            });
        } catch (error) {
            next(error);
        }
    }

    async archiveDomain(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user.userId || req.user._id;
            
            const domain = await domainService.archiveDomain(id, userId, reason);
            res.status(200).json({
                success: true,
                message: 'Domain archived successfully',
                data: domain
            });
        } catch (error) {
            next(error);
        }
    }

    async listDomains(req, res, next) {
        try {
            const userId = req.user.userId || req.user._id;
            const { status, type, applicationId, page, limit } = req.query;

            const filters = {};
            if (status) filters.status = status;
            if (type) filters.type = type;
            if (applicationId) filters.applicationId = applicationId;

            const result = await domainService.listDomains(userId, filters, { page, limit });
            res.status(200).json({
                success: true,
                data: result.domains,
                pagination: result.pagination
            });
        } catch (error) {
            next(error);
        }
    }

    async getDomain(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId || req.user._id;
            
            const domain = await domainService.getDomain(id, userId);
            res.status(200).json({
                success: true,
                data: domain
            });
        } catch (error) {
            next(error);
        }
    }

    async evaluateHealth(req, res, next) {
        try {
            const { id } = req.params;
            // Check ownership
            const userId = req.user.userId || req.user._id;
            const domain = await domainService.getDomain(id, userId); // Throws 404 if not found/owned
            
            res.status(200).json({
                success: true,
                data: {
                    healthStatus: domain.healthStatus,
                    lastHealthCheck: domain.lastHealthCheck
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async requestCertificate(req, res, next) {
        try {
            const { id } = req.params;
            // Ensure ownership
            const userId = req.user.userId || req.user._id;
            await domainService.getDomain(id, userId);
            
            const certificate = await certificateService.requestCertificate(id);
            res.status(201).json({
                success: true,
                message: 'Certificate requested successfully',
                data: certificate
            });
        } catch (error) {
            next(error);
        }
    }

    async renewCertificate(req, res, next) {
        try {
            const { id, certificateId } = req.params;
            const userId = req.user.userId || req.user._id;
            await domainService.getDomain(id, userId);
            
            const result = await certificateService.renewCertificate(certificateId);
            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }

    async revokeCertificate(req, res, next) {
        try {
            const { id, certificateId } = req.params;
            const { reason } = req.body;
            const userId = req.user.userId || req.user._id;
            await domainService.getDomain(id, userId);
            
            const result = await certificateService.revokeCertificate(certificateId, reason);
            res.status(200).json({
                success: true,
                message: 'Certificate revoked successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getCertificateHistory(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId || req.user._id;
            await domainService.getDomain(id, userId);
            
            const history = await certificateService.getCertificateHistory(id);
            res.status(200).json({
                success: true,
                data: history
            });
        } catch (error) {
            next(error);
        }
    }
    
    async getDomainEvents(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId || req.user._id;
            
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;

            const events = await DomainEvent.find({ domainId: id, userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await DomainEvent.countDocuments({ domainId: id, userId });

            res.status(200).json({
                success: true,
                data: events,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new DomainController();
