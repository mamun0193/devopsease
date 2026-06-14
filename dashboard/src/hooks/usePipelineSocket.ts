import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UsePipelineSocketOptions {
    runId: string;
    enabled: boolean;
}

interface UsePipelineSocketReturn {
    logs: string[];
    isConnected: boolean;
    isReconnecting: boolean;
    wsUnavailable: boolean;
    finalStatus: string | null;
}

// WebSocket hook for live pipeline run updates.
 
export function usePipelineSocket({ runId, enabled }: UsePipelineSocketOptions): UsePipelineSocketReturn {
    const [logs, setLogs] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [wsUnavailable, setWsUnavailable] = useState(false);
    const [finalStatus, setFinalStatus] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);
    const failCountRef = useRef(0);
    const queryClient = useQueryClient();

    const connect = useCallback(() => {
        if (!runId || !enabled || finalStatus || wsUnavailable) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = 'localhost:3497';
        const url = `${protocol}//${host}/ws/pipeline/${runId}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!mountedRef.current) return;
            setIsConnected(true);
            setIsReconnecting(false);
            failCountRef.current = 0;
        };

        ws.onmessage = (event) => {
            if (!mountedRef.current) return;
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'pipeline_log') {
                    setLogs((prev) => [...prev, data.data]);
                } else if (data.type === 'step_update') {
                    // Invalidate run detail to refresh step statuses
                    queryClient.invalidateQueries({ queryKey: ['pipeline-run', runId] });
                } else if (data.type === 'pipeline_complete') {
                    setFinalStatus(data.status);
                    queryClient.invalidateQueries({ queryKey: ['pipeline-run', runId] });
                    queryClient.invalidateQueries({ queryKey: ['pipelines'] });
                }
            } catch {
                // Ignore malformed messages
            }
        };

        ws.onclose = () => {
            if (!mountedRef.current) return;
            setIsConnected(false);

            // Only reconnect if run is still active and no final status
            if (enabled && !finalStatus) {
                failCountRef.current += 1;

                // After 3 consecutive failures, declare WS unavailable and fall back to polling
                if (failCountRef.current >= 3) {
                    setWsUnavailable(true);
                    setIsReconnecting(false);
                    return;
                }

                setIsReconnecting(true);
                reconnectTimerRef.current = setTimeout(() => {
                    if (mountedRef.current) connect();
                }, 2000);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [runId, enabled, finalStatus, wsUnavailable, queryClient]);

    useEffect(() => {
        mountedRef.current = true;
        if (enabled && runId && !finalStatus && !wsUnavailable) {
            connect();
        }

        return () => {
            mountedRef.current = false;
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect, enabled, runId, finalStatus, wsUnavailable]);

    return { logs, isConnected, isReconnecting, wsUnavailable, finalStatus };
}
