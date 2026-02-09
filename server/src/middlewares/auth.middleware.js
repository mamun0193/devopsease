import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// Auth Middleware (Dev/Simulated)
// In a real scenario, this would verify JWT/Session.
// For Day 31 context, it trusts 'x-simulated-user-id' BUT enforces that the user logic exists in DB.
export const authMiddleware = async (req, res, next) => {
    try {
        // 1. Get User Identity
        // In dev, we accept a header. Falls back to a default "DevOps Admin" if configured, 
        // but for correct ownership, the client MUST start sending identity.

        let userId = req.headers['x-simulated-user-id'];

        // TODO: Remove this fallback when frontend supports auth
        // For now, if no header, we block. Or if you want to support existing flows, 
        // we might auto-fetch a default admin user. 
        // Strict Mode: Block if no identity.
        if (!userId) {
            // For Day 31 transition, we might be lenient OR strict. 
            // "Hardening security assumptions" suggests STRICT.
            // But to make it "Review Day 31" safe, if we block requests without update FE, app breaks.
            // Let's assume we need to fail if not provided, OR allow a fallback for "existing" behavior 
            // IF we create a default user seed.
            // Let's return 401 to enforce adding the header or seed.
            return next(new AppError("Authentication required: Missing x-simulated-user-id", 401));
        }

        // 2. Validate against DB (No Ghost Users)
        const user = await User.findById(userId);

        if (!user) {
            logger.warn(`Auth Failed: User ID ${userId} claimed but not found in DB`);
            return next(new AppError("Authentication failed: User not found", 401));
        }

        // 3. Attach Context
        req.user = user;

        // 4. Role Sync (Optional: Sync RBAC header if we want to trust DB role over header)
        // req.headers['x-user-role'] = user.role; 

        next();
    } catch (error) {
        // Handle malformed ObjectIDs specifically
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return next(new AppError("Authentication failed: Invalid User ID format", 400));
        }
        next(error);
    }
};
