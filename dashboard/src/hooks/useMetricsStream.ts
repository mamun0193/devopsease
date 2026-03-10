import { useState, useEffect, useRef, useCallback } from 'react';
import { useContainerStats } from './useContainers';
import api from '../api';

export interface MetricsDataPoint {
    timestamp: number;
    cpuPercent: number;
    cpuMin?: number;
    cpuMax?: number;
    memoryUsedMB: number;
    memoryMin?: number;
    memoryMax?: number;
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
    const seededRef = useRef(false);

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

    // ── Seed chart immediately from REST on page load ──
    // Fetches the 2-minute buffer from /recent-metrics so the chart
    // renders instantly, before the WebSocket is even connected.
    useEffect(() => {
        if (!containerId || !isRunning) return;

        seededRef.current = false;
        let cancelled = false;

        api.get(`/containers/${containerId}/recent-metrics`)
            .then((res: any) => {
                if (cancelled) return;
                const points = res.data?.data?.dataPoints;
                if (points && points.length > 0) {
                    seededRef.current = true;
                    setDataPoints(points);
                }
            })
            .catch(() => {
                // silently fail — WS will seed later
            });

        return () => { cancelled = true; };
    }, [containerId, isRunning]);

    // Use a ref to break the circular dependency (connect → onclose → connect)
    const connectRef = useRef<() => void>(() => { });

    const connect = useCallback(() => {
        if (!containerId || !isRunning) return;

        // Clean up any existing connection first
        if (wsRef.current) {
            const old = wsRef.current;
            old.onmessage = null;
            if (old.readyState === WebSocket.OPEN) {
                old.onclose = null;
                old.onerror = null;
                old.close();
            } else if (old.readyState === WebSocket.CONNECTING) {
                // Don't call close() on CONNECTING socket — let it open then close itself
                old.onclose = null;
                old.onerror = null;
                old.onopen = () => { old.close(); };
            }
            wsRef.current = null;
        }

        const ws = new WebSocket(`${getWsBaseUrl()}/ws/metrics/${containerId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsStreaming(true);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.type === 'metrics_history') {
                    // Only use WS seed if REST seed hasn't already populated the chart
                    if (!seededRef.current) {
                        setDataPoints(msg.dataPoints || []);
                        seededRef.current = true;
                    }
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
                    connectRef.current();
                }, 3000);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [containerId, isRunning]);

    // Keep ref in sync with latest connect
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (wsRef.current) {
                const ws = wsRef.current;
                ws.onmessage = null;
                ws.onclose = null;
                ws.onerror = null;
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                } else if (ws.readyState === WebSocket.CONNECTING) {
                    // Let it finish connecting, then close — avoids browser warning
                    ws.onopen = () => { ws.close(); };
                }
                wsRef.current = null;
            }
            setIsStreaming(false);
        };
    }, [connect]);

    // Clear data when container changes
    useEffect(() => {
        setDataPoints([]);
        seededRef.current = false;
    }, [containerId]);

    const latestStats = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1] : null;

    return { dataPoints, latestStats, isStreaming };
}
