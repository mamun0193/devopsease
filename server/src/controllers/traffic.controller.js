import TrafficPolicy from '../models/trafficPolicy.model.js';
import TrafficRule from '../models/trafficRule.model.js';
import RoutingTable from '../models/routingTable.model.js';
import trafficService from '../services/traffic.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { NotFoundError } from '../utils/AppError.js';

export const getTrafficPolicies = asyncHandler(async (req, res) => {
        const query = {};
        if (req.query.applicationId) {
            query.applicationId = req.query.applicationId;
        }
        const policies = await TrafficPolicy.find(query).sort({ createdAt: -1 });
        res.json(standardResponse(policies));
});

export const applyTrafficPolicy = asyncHandler(async (req, res) => {
        const { applicationId, mode, targets, reason } = req.body;
        const policy = await trafficService.applyTrafficPolicy(applicationId, req.user._id, mode, targets, reason);
        res.json(standardResponse(policy));
});

export const getRoutingTable = asyncHandler(async (req, res) => {
        const routingTable = await RoutingTable.findOne({ slug: req.params.slug }).sort({ version: -1 });
        if (!routingTable) {
            throw new NotFoundError('Routing table not found');
        }
        res.json(standardResponse(routingTable));
});
