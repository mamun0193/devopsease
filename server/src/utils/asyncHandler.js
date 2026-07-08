/**
 * Wraps async express routes to automatically pass exceptions to next()
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
