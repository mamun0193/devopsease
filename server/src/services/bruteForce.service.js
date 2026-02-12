import LoginAttempt from "../models/LoginAttempt.js";
import logger from "../utils/logger.js";

// Progressive delay thresholds
const THRESHOLDS = [
    { attempts: 20, lockMinutes: 15 },
    { attempts: 10, delaySeconds: 10 },
    { attempts: 5, delaySeconds: 2 },
];

export async function checkBruteForce(email) {
    try {
        const record = await LoginAttempt.findOne({ email: email.toLowerCase() });

        if (!record) {
            return { allowed: true, retryAfter: 0, locked: false };
        }

        // Check if currently locked
        if (record.lockUntil && new Date() < record.lockUntil) {
            const retryAfter = Math.ceil((record.lockUntil - Date.now()) / 1000);
            return { allowed: false, retryAfter, locked: true };
        }

        // Check progressive delays
        for (const threshold of THRESHOLDS) {
            if (record.attemptCount >= threshold.attempts) {
                if (threshold.lockMinutes) {
                    // Already past lock threshold but lock expired — allow
                    return { allowed: true, retryAfter: 0, locked: false };
                }

                if (threshold.delaySeconds) {
                    const elapsed = (Date.now() - record.lastAttemptAt) / 1000;
                    if (elapsed < threshold.delaySeconds) {
                        const retryAfter = Math.ceil(threshold.delaySeconds - elapsed);
                        return { allowed: false, retryAfter, locked: false };
                    }
                }
                break;
            }
        }

        return { allowed: true, retryAfter: 0, locked: false };
    } catch (error) {
        logger.error("Brute force check error", { error: error.message });
        // Fail open — don't block legitimate users due to DB errors
        return { allowed: true, retryAfter: 0, locked: false };
    }
}

export async function recordFailedAttempt(email) {
    try {
        const record = await LoginAttempt.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                $inc: { attemptCount: 1 },
                $set: { lastAttemptAt: new Date() },
            },
            { upsert: true, new: true }
        );

        // Apply lock if threshold reached
        if (record.attemptCount >= 20 && !record.lockUntil) {
            record.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
            await record.save();
            logger.warn("Account temporarily locked due to excessive failed attempts", {
                email: email.toLowerCase(),
                attemptCount: record.attemptCount,
            });
        }

        return record;
    } catch (error) {
        logger.error("Failed to record login attempt", { error: error.message });
    }
}

export async function resetAttempts(email) {
    try {
        await LoginAttempt.deleteOne({ email: email.toLowerCase() });
    } catch (error) {
        logger.error("Failed to reset login attempts", { error: error.message });
    }
}
