import Network from '../models/network.model.js';
import networkService from '../services/network.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { standardResponse } from '../utils/apiResponse.js';
import { NotFoundError } from '../utils/AppError.js';

// List all the containers owned by an authenticated user
export const listNetworks = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const rawNetworks = await Network.find({ userId })
            .select('-__v')
            .populate('projectId', 'name')   // join project name
            .sort({ createdAt: -1 })
            .lean();

        const networks = rawNetworks.map(n => ({
            id: n._id,
            name: n.name,
            projectId: n.projectId?._id ?? n.projectId ?? null,
            projectName: n.projectId?.name ?? null,   // human-readable project name
            status: n.usageStatus,   // frontend expects "status", DB stores "usageStatus"
            createdAt: n.createdAt,
        }));

        res.json(standardResponse({ networks }));
});

// Get a single network by ID — scoped to the authenticated user.
export const getNetwork = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const network = await Network.findOne({ _id: id, userId }).select('-__v').lean();
    if (!network) {
        throw new NotFoundError('Network not found');
    }

    res.json(standardResponse({ network }));
});

// Delete a network if no containers are currently attached.
export const deleteNetwork = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    // Ownership check only — no usageStatus pre-flight (service does live Docker inspect)
    const network = await Network.findOne({ _id: id, userId }).lean();
    if (!network) {
        throw new NotFoundError('Network not found');
    }

    const result = await networkService.deleteNetwork({ networkId: id, userId });
    res.json(standardResponse(result, 'Network deleted'));
});

// Reconcile DB network records against live Docker state.
// Updates usageStatus (ACTIVE/UNUSED) for all user-owned networks.

export const reconcileNetworks = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await networkService.reconcileNetworks(userId);
    res.json(standardResponse(result, 'Reconciliation complete'));
});
