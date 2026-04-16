import axios from 'axios';
import { loadConfig, clearAuth } from './config.util.js';

// Creates a pre-configured Axios instance.
// Injects both access_token and refresh_token as Cookie header
// On 401: retries once (backend may auto-refresh), then clears tokens
// Maps errors to human-readable messages
 
function createClient() {
    const config = loadConfig();

    const client = axios.create({
        baseURL: config.baseUrl,
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
    });

    // Request Interceptor: inject cookies 
    client.interceptors.request.use((req) => {
        const cfg = loadConfig();
        const cookies = [];
        if (cfg.token) cookies.push(`access_token=${cfg.token}`);
        if (cfg.refreshToken) cookies.push(`refresh_token=${cfg.refreshToken}`);
        if (cookies.length) {
            req.headers['Cookie'] = cookies.join('; ');
        }
        return req;
    });

    // Response Interceptor: 401 retry + error mapping 
    let isRetrying = false;

    client.interceptors.response.use(
        (res) => res,
        async (error) => {
            const originalRequest = error.config;

            // 401 auto-retry (once)
            if (
                error.response?.status === 401 &&
                !isRetrying &&
                !originalRequest._retried
            ) {
                isRetrying = true;
                originalRequest._retried = true;

                try {
                    const result = await client.request(originalRequest);
                    isRetrying = false;
                    return result;
                } catch (retryError) {
                    isRetrying = false;
                    clearAuth();
                    throw new Error(
                        'Session expired. Run `devopsease login` to authenticate.'
                    );
                }
            }

            // Map known status codes to human-readable messages
            if (error.response) {
                const { status, data } = error.response;
                const apiMsg = data?.message || '';

                const messages = {
                    400: apiMsg || 'Bad request. Check your input.',
                    401: 'Session expired. Run `devopsease login` to authenticate.',
                    403: 'Access denied. You do not have permission for this action.',
                    404: apiMsg || 'Resource not found.',
                    409: apiMsg || 'Conflict. Resource may already exist.',
                    429: 'Too many requests. Please wait and try again.',
                    500: apiMsg || 'Server error. Please try again later.',
                };

                throw new Error(
                    messages[status] ||
                        apiMsg ||
                        `Request failed (${status}). Try again or check with 'devopsease doctor'.`
                );
            }

            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                throw new Error(
                    'Cannot reach the DevOpsEase server. Is it running? Check with `devopsease config show`.'
                );
            }

            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timed out. The server may be overloaded.');
            }

            throw new Error(
                error.message || 'An unexpected error occurred. Run `devopsease doctor` to diagnose.'
            );
        }
    );

    return client;
}

// Returns a fresh Axios client (re-reads config each call).
 
export function getClient() {
    return createClient();
}

// Convenience: performs a GET request.
 
export async function apiGet(url, params = {}) {
    const client = getClient();
    const res = await client.get(url, { params });
    return res.data;
}

// Convenience: performs a POST request.
 
export async function apiPost(url, data = {}) {
    const client = getClient();
    const res = await client.post(url, data);
    return res.data;
}

// Convenience: performs a DELETE request.
 
export async function apiDelete(url) {
    const client = getClient();
    const res = await client.delete(url);
    return res.data;
}

// Convenience: performs a PUT request.
 
export async function apiPut(url, data = {}) {
    const client = getClient();
    const res = await client.put(url, data);
    return res.data;
}

// Raw Axios client for special cases (e.g., login where we need full response).
 
export function getRawClient() {
    const config = loadConfig();
    return axios.create({
        baseURL: config.baseUrl,
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
    });
}
