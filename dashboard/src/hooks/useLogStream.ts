import { useState, useEffect, useRef, useCallback } from 'react';

const WS_BASE = 'ws://localhost:3497';

export interface LogStreamReturn {
    /** Accumulated log lines (most recent at end) */
    lines: string[];
    /** Whether the WebSocket is currently connected and streaming */
    isStreaming: boolean;
    /** Whether the stream has ended (container stopped or log finished) */
    hasEnded: boolean;
    /** Any error message from the stream */
    error: string | null;
    /** Clear accumulated lines */
    clearLines: () => void;
}

/**
 * Hook that streams container logs via WebSocket (/ws/logs/:containerId).
 * Replaces the previous polling-based useContainerLogs hook for live log viewing.
 *
 * Falls back gracefully: if the WebSocket fails to connect, `isStreaming` stays false.
 *
 * @param containerId - The container to stream logs from (null to disable)
 * @param options.tail - Number of initial lines to fetch (default: 200)
 * @param options.since - Unix timestamp to start from
 */
export function useLogStream(
    containerId: string | null,
    options?: { tail?: number; since?: number }
): LogStreamReturn {
    const [lines, setLines] = useState<string[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasEnded, setHasEnded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const connectRef = useRef<() => void>(() => {});

    const clearLines = useCallback(() => {
        setLines([]);
    }, []);

    // Store the latest connect function in a ref so onclose can call it
    // without creating a circular dependency in useCallback deps.
    const connect = useCallback(() => {
        if (!containerId) return;

        // Build WebSocket URL with query params
        const params = new URLSearchParams();
        if (options?.tail !== undefined) params.set('tail', String(options.tail));
        if (options?.since !== undefined) params.set('since', String(options.since));
        const qs = params.toString();
        const url = `${WS_BASE}/ws/logs/${containerId}${qs ? `?${qs}` : ''}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsStreaming(true);
            setHasEnded(false);
            setError(null);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.type === 'log_line' && typeof msg.data === 'string') {
                    setLines((prev) => {
                        const next = [...prev, msg.data];
                        // Keep a reasonable buffer (5000 lines max)
                        return next.length > 5000 ? next.slice(-5000) : next;
                    });
                } else if (msg.type === 'log_end') {
                    setHasEnded(true);
                } else if (msg.type === 'log_error') {
                    setError(msg.message || 'Unknown log stream error');
                }
            } catch {
                // ignore parse errors
            }
        };

        ws.onclose = () => {
            setIsStreaming(false);
            wsRef.current = null;

            // Auto-reconnect after 3 seconds if we didn't get a clean end
            if (containerId) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectRef.current();
                }, 3000);
            }
        };

        ws.onerror = () => {
            // onclose fires after onerror
        };
    }, [containerId, options?.tail, options?.since]);

    // Keep ref in sync with the latest connect callback
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        setLines([]);
        setHasEnded(false);
        setError(null);

        // Start connection on next tick to avoid cascading render
        const timer = setTimeout(() => connect(), 0);

        return () => {
            clearTimeout(timer);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setIsStreaming(false);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId, options?.tail, options?.since]);

    return { lines, isStreaming, hasEnded, error, clearLines };
}
