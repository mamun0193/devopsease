/**
 * Safe number formatting utilities for React rendering.
 * 
 * RATIONALE: Container stats (CPU, memory, network) can be null/undefined when:
 * - Backend is initializing (503 state)
 * - Container is stopped/restarting
 * - Docker API returns incomplete data
 * - Network/Redis issues cause partial responses
 * 
 * Using (value ?? 0).toFixed() is WRONG because:
 * - It hides the "data not ready" state from users
 * - 0% CPU looks like "no load" when it actually means "unknown"
 * - Debugging becomes harder when nulls are silently converted
 * 
 * These utilities explicitly handle null/undefined as valid states.
 */

/**
 * Safely format a number with fixed decimal places.
 * Returns placeholder string if value is null/undefined/NaN.
 */
export function formatNumber(
    value: number | null | undefined,
    decimals: number = 1,
    options: {
        suffix?: string;
        placeholder?: string;
    } = {}
): string {
    const { suffix = '', placeholder = '—' } = options;

    if (value === null || value === undefined || Number.isNaN(value)) {
        return placeholder;
    }

    return `${value.toFixed(decimals)}${suffix}`;
}

/**
 * Format a percentage value (0-100).
 */
export function formatPercent(
    value: number | null | undefined,
    decimals: number = 1,
    placeholder: string = '—'
): string {
    return formatNumber(value, decimals, { suffix: '%', placeholder });
}

/**
 * Format bytes/megabytes for display.
 */
export function formatMB(
    value: number | null | undefined,
    decimals: number = 0,
    placeholder: string = '—'
): string {
    return formatNumber(value, decimals, { suffix: 'MB', placeholder });
}

/**
 * Check if a numeric value is "ready" (not null/undefined/NaN).
 */
export function isNumericReady(value: number | null | undefined): value is number {
    return value !== null && value !== undefined && !Number.isNaN(value);
}
