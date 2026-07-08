/**
 * Standardizes pagination extraction from requests.
 */
export const getPagination = (req) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

/**
 * Standardizes the paginated response format.
 */
export const paginatedResponse = (data, totalCount, page, limit) => {
    return {
        data,
        meta: {
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    };
};

/**
 * Standardizes a single entity response format (no meta).
 */
export const standardResponse = (data) => {
    return { data };
};
