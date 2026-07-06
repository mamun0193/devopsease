import ScalingPolicy from '../models/scalingPolicy.model.js';
import TrafficPolicy from '../models/trafficPolicy.model.js';

export const getPolicies = async (req, res) => {
    try {
        const scalingPolicies = await ScalingPolicy.find().populate('applicationId', 'name slug').sort({ createdAt: -1 });
        const trafficPolicies = await TrafficPolicy.find({ 'autonomousConfig.enabled': true }).populate('applicationId', 'name slug').sort({ createdAt: -1 });

        res.json({
            success: true,
            data: {
                scalingPolicies,
                trafficPolicies
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const createScalingPolicy = async (req, res) => {
    try {
        const policy = new ScalingPolicy({
            ...req.body,
            userId: req.user._id
        });
        await policy.save();
        res.status(201).json({ success: true, data: policy });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const getScalingPolicy = async (req, res) => {
    try {
        const policy = await ScalingPolicy.findOne({ applicationId: req.params.applicationId });
        if (!policy) return res.status(404).json({ success: false, error: 'Policy not found' });
        res.json({ success: true, data: policy });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
