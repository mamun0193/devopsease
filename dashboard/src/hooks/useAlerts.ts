import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../api/alerts';
import { useAppDispatch } from '../store/hooks';
import { setAlerts, setUnresolvedCount, markResolved, markAllResolved } from '../store/alertSlice';
import { addToast } from '../store/toastSlice';
import { useEffect } from 'react';

/**
 * Fetch alerts for the current user — polls every 30s.
 */
export function useAlerts(params?: { resolved?: boolean; page?: number; limit?: number }) {
  const dispatch = useAppDispatch();

  // Event-driven — invalidated by useAlertSocket on incoming WebSocket alerts
  // and by resolve mutations. No polling needed.
  const query = useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertsApi.getAlerts(params),
  });

  // Sync to Redux store
  useEffect(() => {
    if (query.data?.alerts) {
      dispatch(setAlerts(query.data.alerts));
    }
  }, [query.data, dispatch]);

  return query;
}

/**
 * Fetch unresolved alert count — polls every 15s.
 */
export function useUnresolvedAlertCount() {
  const dispatch = useAppDispatch();

  // Event-driven — invalidated by useAlertSocket on incoming WebSocket alerts
  // and by resolve mutations. No polling needed.
  const query = useQuery({
    queryKey: ['alertsUnresolvedCount'],
    queryFn: () => alertsApi.getUnresolvedCount(),
  });

  useEffect(() => {
    if (query.data !== undefined) {
      dispatch(setUnresolvedCount(query.data));
    }
  }, [query.data, dispatch]);

  return query;
}

/**
 * Resolve a single alert.
 */
export function useResolveAlert() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (alertId: string) => alertsApi.resolveAlert(alertId),
    onSuccess: (resolved) => {
      dispatch(markResolved(resolved._id));
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alertsUnresolvedCount'] });
    },
    onError: () => {
      dispatch(addToast({ message: 'Failed to resolve alert', type: 'error', duration: 4000 }));
    },
  });
}

/**
 * Resolve all unresolved alerts.
 */
export function useResolveAllAlerts() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: () => alertsApi.resolveAll(),
    onSuccess: (count) => {
      dispatch(markAllResolved());
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alertsUnresolvedCount'] });
      dispatch(addToast({ message: `${count} alert${count !== 1 ? 's' : ''} resolved`, type: 'success', duration: 3000 }));
    },
    onError: () => {
      dispatch(addToast({ message: 'Failed to resolve alerts', type: 'error', duration: 4000 }));
    },
  });
}
