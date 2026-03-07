import { useState, useEffect, useRef, useCallback } from 'react';
import { useContainerStats } from './useContainers';

export interface MetricsDataPoint {
    timestamp: number;
    cpuPercent: number;
    memoryUsedMB: number;
    memoryLimitMB: number;
    memoryPercent: number;
    networkRxMB: number;
    networkTxMB: number;
}

interface UseMetricsStreamReturn {
    dataPoints: MetricsDataPoint[];
    latestStats: MetricsDataPoint | null;
    isStreaming: boolean;
}

const MAX_DATA_POINTS = 60;

function getWsBaseUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:3497`;
}

export function useMetricsStream(
    containerId: string | null,
    isRunning: boolean = true
): UseMetricsStreamReturn {
    const [dataPoints, setDataPoints] = useState<MetricsDataPoint[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // REST fallback — only active when WebSocket is NOT streaming
    const { data: restStats } = useContainerStats(containerId, !isStreaming, isRunning);

    // Append REST data as a data point when falling back
    useEffect(() => {
        if (!isStreaming && restStats && isRunning) {
            const point: MetricsDataPoint = {
                timestamp: Date.now(),
                cpuPercent: restStats.cpu.usagePercent,
                memoryUsedMB: restStats.memory.usedMB,
                memoryLimitMB: restStats.memory.limitMB,
                memoryPercent: restStats.memory.usagePercent,
                networkRxMB: restStats.network.rxMB,
                networkTxMB: restStats.network.txMB,
            };
            setDataPoints((prev) => {
                const next = [...prev, point];
                return next.length > MAX_DATA_POINTS ? next.slice(-MAX_DATA_POINTS) : next;
            });
        }
    }, [restStats, isStreaming, isRunning]);

    const connect = useCallback(() => {
        if (!containerId || !isRunning) return;

        const ws = new WebSocket(`${getWsBaseUrl()}/ws/metrics/${containerId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsStreaming(true);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.type === 'metrics_history') {
                    // Populate graph with existing history
                    setDataPoints(msg.dataPoints || []);
                } else if (msg.type === 'container_metrics' && msg.status === 'ok') {
                    const point: MetricsDataPoint = {
                        timestamp: msg.timestamp,
                        cpuPercent: msg.cpuPercent,
                        memoryUsedMB: msg.memoryUsedMB,
                        memoryLimitMB: msg.memoryLimitMB,
                        memoryPercent: msg.memoryPercent,
                        networkRxMB: msg.networkRxMB,
                        networkTxMB: msg.networkTxMB,
                    };

                    setDataPoints((prev) => {
                        const next = [...prev, point];
                        return next.length > MAX_DATA_POINTS ? next.slice(-MAX_DATA_POINTS) : next;
                    });
                }
            } catch {
                // ignore parse errors
            }
        };

        ws.onclose = () => {
            setIsStreaming(false);
            wsRef.current = null;

            // Auto-reconnect after 3 seconds if container is still running
            if (isRunning) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 3000);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [containerId, isRunning]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setIsStreaming(false);
        };
    }, [connect]);

    // Clear data when container changes
    useEffect(() => {
        setDataPoints([]);
    }, [containerId]);

    const latestStats = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1] : null;

    return { dataPoints, latestStats, isStreaming };
}
