import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addAlert } from '../store/alertSlice';
import { addToast } from '../store/toastSlice';
import { useQueryClient } from '@tanstack/react-query';
import type { Alert } from '../api/alerts';

const WS_BASE = 'ws://localhost:3497';

const SEVERITY_TOAST_MAP: Record<string, 'error' | 'warning' | 'info'> = {
  CRITICAL: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Custom hook to manage WebSocket connection for real-time alerts.
// Uses a closure-scoped `active` flag (not a ref) so that each effect
// invocation has its own flag — critical for React StrictMode compatibility.
export function useAlertSocket(isAuthenticated = true) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const backoffRef = useRef(1000);

  useEffect(() => {
    if (!isAuthenticated) return; // Don't connect WebSocket when not logged in

    // Closure-scoped flag: when this specific effect invocation is cleaned up,
    // `active` becomes false and the first invocation's onclose handler won't
    // interfere with the second invocation's WebSocket in StrictMode.
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!active) return;

      ws = new WebSocket(`${WS_BASE}/ws/alerts`);

      ws.onopen = () => {
        if (!active) { ws?.close(); return; }
        console.log('🔔 Alert WebSocket connected');
        backoffRef.current = 1000;
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'alert' && payload.data) {
            const alert: Alert = payload.data;

            dispatch(addAlert(alert));

            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['alertsUnresolvedCount'] });

            const toastType = SEVERITY_TOAST_MAP[alert.severity] || 'info';
            dispatch(addToast({
              message: alert.message,
              type: toastType,
              duration: alert.severity === 'CRITICAL' ? 8000 : 5000,
            }));
          }
        } catch (err) {
          console.error('Alert WebSocket message parse error', err);
        }
      };

      ws.onclose = () => {
        if (!active) return;          // this effect invocation was cleaned up — do nothing
        console.log('🔔 Alert WebSocket disconnected, reconnecting…');
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
        // Only close if already open; closing a CONNECTING socket logs a browser warning
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.close(); } catch { /* ignore */ }
        }
        ws = null;
      }
    };
  }, [isAuthenticated, dispatch, queryClient]);
}
