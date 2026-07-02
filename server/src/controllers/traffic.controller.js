import TrafficPolicy from '../models/trafficPolicy.model.js';
import TrafficRule from '../models/trafficRule.model.js';
import RoutingTable from '../models/routingTable.model.js';
import trafficService from '../services/traffic.service.js';

export const getTrafficPolicies = async (req, res, next) => {
    try {
        const query = {};
        if (req.query.applicationId) {
            query.applicationId = req.query.applicationId;
        }
        const policies = await TrafficPolicy.find(query).sort({ createdAt: -1 });
        res.json(policies);
    } catch (error) {
        next(error);
    }
};

export const applyTrafficPolicy = async (req, res, next) => {
    try {
        const { applicationId, mode, targets, reason } = req.body;
        const policy = await trafficService.applyTrafficPolicy(applicationId, req.user._id, mode, targets, reason);
        res.json(policy);
    } catch (error) {
        next(error);
    }
};

export const getRoutingTable = async (req, res, next) => {
    try {
        const routingTable = await RoutingTable.findOne({ slug: req.params.slug }).sort({ version: -1 });
        if (!routingTable) return res.status(404).json({ error: 'Routing table not found' });
        res.json(routingTable);
    } catch (error) {
        next(error);
    }
};
