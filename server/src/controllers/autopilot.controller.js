import ScalingPolicy from '../models/scalingPolicy.model.js';
import TrafficPolicy from '../models/trafficPolicy.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { NotFoundError } from '../utils/AppError.js';

export const getPolicies = asyncHandler(async (req, res) => {
    const scalingPolicies = await ScalingPolicy.find().populate('applicationId', 'name slug').sort({ createdAt: -1 });
    const trafficPolicies = await TrafficPolicy.find({ 'autonomousConfig.enabled': true }).populate('applicationId', 'name slug').sort({ createdAt: -1 });

    res.json(standardResponse({
        scalingPolicies,
        trafficPolicies
    }));
});

export const createScalingPolicy = asyncHandler(async (req, res) => {
    const policy = new ScalingPolicy({
        ...req.body,
        userId: req.user._id
    });
    await policy.save();
    res.status(201).json(standardResponse(policy));
});

export const getScalingPolicy = asyncHandler(async (req, res) => {
    const policy = await ScalingPolicy.findOne({ applicationId: req.params.applicationId });
    if (!policy) {
        throw new NotFoundError('Policy not found');
    }
    res.json(standardResponse(policy));
});
