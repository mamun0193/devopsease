import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WS_BASE = 'ws://localhost:3497';

interface UseDeploymentSocketOptions {
  isAuthenticated?: boolean;
  onLogs?: (deploymentId: string, logs: string[]) => void;
}

export function useDeploymentSocket({
  isAuthenticated = true,
  onLogs,
}: UseDeploymentSocketOptions = {}) {
  const queryClient = useQueryClient();
  const backoffRef = useRef(1000);
  const onLogsRef = useRef(onLogs);

  // Keep ref in sync so reconnect closure sees latest callback
  useEffect(() => {
    onLogsRef.current = onLogs;
  }, [onLogs]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!active) return;

      ws = new WebSocket(`${WS_BASE}/ws/deployments`);

      ws.onopen = () => {
        if (!active) { ws?.close(); return; }
        console.log('🚀 Deployment WebSocket connected');
        backoffRef.current = 1000;
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'deployment:update') {
            queryClient.invalidateQueries({ queryKey: ['deployments'] });
          } else if (payload.type === 'deployment:logs') {
            const { deploymentId, logs } = payload.data ?? {};
            if (deploymentId && Array.isArray(logs)) {
              onLogsRef.current?.(deploymentId, logs);
            }
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!active) return;
        console.log('🚀 Deployment WebSocket disconnected, reconnecting…');
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose fires after onerror — reconnect handled there
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
          try { ws.close(); } catch { /* ignore */ }
        }
        ws = null;
      }
    };
  }, [isAuthenticated, queryClient]);
}

