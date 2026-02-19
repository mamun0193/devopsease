import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBuildSocketOptions {
    buildId: string;
    enabled: boolean;
}

interface UseBuildSocketReturn {
    logs: string[];
    isConnected: boolean;
    isReconnecting: boolean;
    finalStatus: string | null;
}

export function useBuildSocket({ buildId, enabled }: UseBuildSocketOptions): UseBuildSocketReturn {
    const [logs, setLogs] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [finalStatus, setFinalStatus] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!buildId || !enabled || finalStatus) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = 'localhost:3497';
        const url = `${protocol}//${host}/ws/build/${buildId}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!mountedRef.current) return;
            setIsConnected(true);
            setIsReconnecting(false);
        };

        ws.onmessage = (event) => {
            if (!mountedRef.current) return;
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'build_log') {
                    setLogs((prev) => [...prev, data.data]);
                } else if (data.type === 'build_complete') {
                    setFinalStatus(data.status);
                }
            } catch {
                // Ignore malformed messages
            }
        };

        ws.onclose = () => {
            if (!mountedRef.current) return;
            setIsConnected(false);

            // Only reconnect if build is still active and no final status
            if (enabled && !finalStatus) {
                setIsReconnecting(true);
                reconnectTimerRef.current = setTimeout(() => {
                    if (mountedRef.current) connect();
                }, 2000);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [buildId, enabled, finalStatus]);

    useEffect(() => {
        mountedRef.current = true;
        if (enabled && buildId && !finalStatus) {
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
    }, [connect, enabled, buildId, finalStatus]);

    return { logs, isConnected, isReconnecting, finalStatus };
}
