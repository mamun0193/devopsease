import domainService from '../services/domain.service.js';
import certificateService from '../services/certificate.service.js';
import domainHealthService from '../services/domainHealth.service.js';
import AppError, { ValidationError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import DomainEvent from '../models/domainEvent.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse, paginatedResponse, getPagination } from '../utils/apiResponse.js';

class DomainController {

    addDomain = asyncHandler(async (req, res) => {
        const { applicationId, hostname, type = 'custom', options = {} } = req.body;
        const userId = req.user.userId || req.user._id;

        if (!applicationId || !hostname) {
            throw new ValidationError('applicationId and hostname are required');
        }

        const domain = await domainService.addDomain(userId, applicationId, hostname, type, options);
        res.status(201).json(standardResponse(domain, 'Domain added successfully'));
    });

    verifyDomain = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId || req.user._id;

        const result = await domainService.verifyDomain(id, userId);
        res.status(200).json(standardResponse(result, result.message));
    });

    retryVerification = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { method } = req.body;
        const userId = req.user.userId || req.user._id;

        const domain = await domainService.retryVerification(id, userId, method);
        res.status(200).json(standardResponse(domain, 'Verification challenge regenerated'));
    });

    connectDomain = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const domain = await domainService.connectDomain(id);
        res.status(200).json(standardResponse(domain, 'Domain connected to application'));
    });

    disconnectDomain = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;
        const domain = await domainService.disconnectDomain(id, reason);
        res.status(200).json(standardResponse(domain, 'Domain disconnected from application'));
    });

    archiveDomain = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.userId || req.user._id;
        
        const domain = await domainService.archiveDomain(id, userId, reason);
        res.status(200).json(standardResponse(domain, 'Domain archived successfully'));
    });

    listDomains = asyncHandler(async (req, res) => {
        const userId = req.user.userId || req.user._id;
        const { status, type, applicationId } = req.query;
        const { page, limit } = getPagination(req);

        const filters = {};
        if (status) filters.status = status;
        if (type) filters.type = type;
        if (applicationId) filters.applicationId = applicationId;

        const result = await domainService.listDomains(userId, filters, { page, limit });
        res.status(200).json(paginatedResponse(
            result.domains,
            result.pagination.page,
            result.pagination.limit,
            result.pagination.total
        ));
    });

    getDomain = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId || req.user._id;
        
        const domain = await domainService.getDomain(id, userId);
        res.status(200).json(standardResponse(domain));
    });

    evaluateHealth = asyncHandler(async (req, res) => {
        const { id } = req.params;
        // Check ownership
        const userId = req.user.userId || req.user._id;
        const domain = await domainService.getDomain(id, userId); // Throws 404 if not found/owned
        
        res.status(200).json(standardResponse({
            healthStatus: domain.healthStatus,
            lastHealthCheck: domain.lastHealthCheck
        }));
    });

    requestCertificate = asyncHandler(async (req, res) => {
        const { id } = req.params;
        // Ensure ownership
        const userId = req.user.userId || req.user._id;
        await domainService.getDomain(id, userId);
        
        const certificate = await certificateService.requestCertificate(id);
        res.status(201).json(standardResponse(certificate, 'Certificate requested successfully'));
    });

    renewCertificate = asyncHandler(async (req, res) => {
        const { id, certificateId } = req.params;
        const userId = req.user.userId || req.user._id;
        await domainService.getDomain(id, userId);
        
        const result = await certificateService.renewCertificate(certificateId);
        res.status(200).json(standardResponse(null, result.message));
    });

    revokeCertificate = asyncHandler(async (req, res) => {
        const { id, certificateId } = req.params;
        const { reason } = req.body;
        const userId = req.user.userId || req.user._id;
        await domainService.getDomain(id, userId);
        
        const result = await certificateService.revokeCertificate(certificateId, reason);
        res.status(200).json(standardResponse(result, 'Certificate revoked successfully'));
    });

    getCertificateHistory = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId || req.user._id;
        await domainService.getDomain(id, userId);
        
        const history = await certificateService.getCertificateHistory(id);
        res.status(200).json(standardResponse(history));
    });
    
    getDomainEvents = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId || req.user._id;
        const { page, limit } = getPagination(req);
        const skip = (page - 1) * limit;

        const events = await DomainEvent.find({ domainId: id, userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await DomainEvent.countDocuments({ domainId: id, userId });

        res.status(200).json(paginatedResponse(events, page, limit, total));
    });
}

export default new DomainController();
