import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WS_BASE = 'ws://localhost:3497';

/**
 * Event types emitted by the backend via /ws/events:
 * - container_update           → refetch containers, containerInspect, containerAnalysis
 * - action_history_updated     → refetch actions, actionStats
 * - container_health_updated   → refetch containerHealth, containerHealthBatch
 * - failure_analysis_updated   → refetch failureAnalysis, containerAnalysis
 */

type EventType =
    | 'container_update'
    | 'action_history_updated'
    | 'container_health_updated'
    | 'failure_analysis_updated';

interface ServerEvent {
    type: EventType;
    data: {
        containerId?: string;
        action?: string;
        timestamp?: number;
        actionId?: string;
    };
}

/**
 * Hook that connects to the /ws/events WebSocket and invalidates
 * React Query caches when backend events arrive — replacing polling
 * for container list, inspect, analysis, actions, and health queries.
 *
 * Usage: Call once in a top-level layout component (e.g. App or LandingLayout).
 */
export function useContainerEvents(isAuthenticated = true) {
    const queryClient = useQueryClient();
    const backoffRef = useRef(1000);

    const handleEvent = useCallback(
        (event: ServerEvent) => {
            const { type, data } = event;
            const containerId = data?.containerId;

            switch (type) {
                case 'container_update':
                    // Refetch container list + specific container data
                    queryClient.invalidateQueries({ queryKey: ['containers'] });
                    // Container lifecycle changes may affect quota and images
                    queryClient.invalidateQueries({ queryKey: ['quota'] });
                    if (containerId) {
                        queryClient.invalidateQueries({ queryKey: ['containerInspect', containerId] });
                        queryClient.invalidateQueries({ queryKey: ['containerAnalysis', containerId] });
                        queryClient.invalidateQueries({ queryKey: ['containerStats', containerId] });
                    }
                    break;

                case 'action_history_updated':
                    queryClient.invalidateQueries({ queryKey: ['actions'] });
                    queryClient.invalidateQueries({ queryKey: ['actionStats'] });
                    break;

                case 'container_health_updated':
                    queryClient.invalidateQueries({ queryKey: ['containerHealth'] });
                    queryClient.invalidateQueries({ queryKey: ['containerHealthBatch'] });
                    // Health events often generate alerts
                    queryClient.invalidateQueries({ queryKey: ['alerts'] });
                    queryClient.invalidateQueries({ queryKey: ['alertsUnresolvedCount'] });
                    if (containerId) {
                        queryClient.invalidateQueries({ queryKey: ['containerHealth', containerId] });
                    }
                    break;

                case 'failure_analysis_updated':
                    if (containerId) {
                        queryClient.invalidateQueries({ queryKey: ['failureAnalysis', containerId] });
                        queryClient.invalidateQueries({ queryKey: ['containerAnalysis', containerId] });
                    } else {
                        queryClient.invalidateQueries({ queryKey: ['failureAnalysis'] });
                        queryClient.invalidateQueries({ queryKey: ['containerAnalysis'] });
                    }
                    break;

                default:
                    break;
            }
        },
        [queryClient],
    );

    useEffect(() => {
        if (!isAuthenticated) return; // Don't connect WebSocket when not logged in

        let active = true;
        let ws: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        function connect() {
            if (!active) return;

            ws = new WebSocket(`${WS_BASE}/ws/events`);

            ws.onopen = () => {
                if (!active) {
                    ws?.close();
                    return;
                }
                console.log('📡 Event WebSocket connected');
                backoffRef.current = 1000;
            };

            ws.onmessage = (event) => {
                if (!active) return;
                try {
                    const payload: ServerEvent = JSON.parse(event.data);
                    if (payload.type) {
                        handleEvent(payload);
                    }
                } catch (err) {
                    console.error('Event WebSocket message parse error', err);
                }
            };

            ws.onclose = () => {
                if (!active) return;
                console.log('📡 Event WebSocket disconnected, reconnecting…');
                scheduleReconnect();
            };

            ws.onerror = () => {
                // onclose fires after onerror — handled there
            };
        }

        function scheduleReconnect() {
            if (!active) return;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                if (!active) return;
                connect();
                backoffRef.current = Math.min(backoffRef.current * 2, 30000);
            }, backoffRef.current);
        }

        connect();

        return () => {
            active = false;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (ws) {
                if (ws.readyState === WebSocket.OPEN) {
                    try {
                        ws.close();
                    } catch {
                        /* ignore */
                    }
                }
                ws = null;
            }
        };
    }, [isAuthenticated, handleEvent]);
}
