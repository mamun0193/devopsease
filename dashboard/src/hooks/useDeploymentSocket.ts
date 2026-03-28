import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WS_BASE = 'ws://localhost:3497';

// real time deployment status updates
export function useDeploymentSocket(isAuthenticated = true) {
  const queryClient = useQueryClient();
  const backoffRef = useRef(1000);

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
