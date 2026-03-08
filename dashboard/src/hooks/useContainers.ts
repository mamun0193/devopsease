import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { containerApi, healthApi, actionsApi } from '../api';
import type { Container, ContainerInspect, FailureAnalysis, FailureIntelligence, ContainerLogs, ContainerStats, ActionsResponse, ActionStats } from '../api';
import api from '../api';
import { useVisibilityInterval } from './useContainerPolling';

// ============================================================================
// Container Queries — Event-Driven Architecture
//
// Most queries NO LONGER poll. Instead, the useContainerEvents hook listens
// on the /ws/events WebSocket and calls queryClient.invalidateQueries()
// when the backend emits container_update, action_history_updated, etc.
//
// Only container stats (real-time CPU/memory) retains 2-second polling.
// ============================================================================

// Fetch all containers — event-driven (refreshed via container_update WS event)
export function useContainers() {
  return useQuery<Container[], Error>({
    queryKey: ['containers'],
    queryFn: containerApi.getAll,
    staleTime: 10000,
    placeholderData: keepPreviousData,
  });
}

// Fetch container logs — REST fallback (prefer useLogStream for real-time)
// Kept for snapshot / time-range queries; no continuous polling.
export function useContainerLogs(
  containerId: string | null,
  options?: { tail?: number; since?: number; until?: number }
) {
  return useQuery<ContainerLogs, Error>({
    queryKey: ['containerLogs', containerId, options?.since, options?.until],
    queryFn: () => containerApi.getLogs(containerId!, options),
    enabled: !!containerId,
    staleTime: 5000,
  });
}

// Fetch container inspection data — event-driven (refreshed via container_update WS event)
export function useContainerInspect(containerId: string | null) {
  return useQuery<ContainerInspect, Error>({
    queryKey: ['containerInspect', containerId],
    queryFn: () => containerApi.inspect(containerId!),
    enabled: !!containerId,
    staleTime: 25000,
  });
}

// Fetch container analysis — event-driven (refreshed via failure_analysis_updated WS event)
export function useContainerAnalysis(containerId: string | null) {
  return useQuery<FailureAnalysis, Error>({
    queryKey: ['containerAnalysis', containerId],
    queryFn: () => containerApi.analyze(containerId!),
    enabled: !!containerId,
    staleTime: 15000,
  });
}

// Fetch failure intelligence analysis — event-driven (refreshed via failure_analysis_updated WS event)
export function useFailureAnalysis(containerId: string | null) {
  return useQuery<FailureIntelligence, Error>({
    queryKey: ['failureAnalysis', containerId],
    queryFn: () => containerApi.failureAnalysis(containerId!),
    enabled: !!containerId,
    staleTime: 0,
  });
}

// Fetch container stats (CPU, memory, network) - Poll every 2s (real-time, no cache) when running & visible
// This is the ONLY hook that retains polling — continuous metrics require it.
export function useContainerStats(
  containerId: string | null,
  isVisible: boolean = true,
  isRunning: boolean = true
) {
  // Only poll when visible AND running
  const shouldPoll = isVisible && isRunning;
  const refetchInterval = shouldPoll ? 2000 : 0;

  return useQuery<ContainerStats, Error>({
    queryKey: ['containerStats', containerId],
    queryFn: () => containerApi.stats(containerId!),
    enabled: !!containerId && isRunning,
    refetchInterval,
    staleTime: 1000,
  });
}

// Health check - Poll every 30s (lightweight endpoint, kept for system status)
export function useHealthCheck() {
  const refetchInterval = useVisibilityInterval(30000);

  return useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval,
    staleTime: 15000,
  });
}

// Fetch action history — event-driven (refreshed via action_history_updated WS event)
export function useActions(options?: { containerId?: string; limit?: number; cursor?: string }) {
  return useQuery<ActionsResponse, Error>({
    queryKey: ['actions', options?.containerId, options?.limit, options?.cursor],
    queryFn: () => actionsApi.getActions(options),
    staleTime: 5000,
  });
}

// Fetch action stats — event-driven (refreshed via action_history_updated WS event)
export function useActionStats() {
  return useQuery<ActionStats, Error>({
    queryKey: ['actionStats'],
    queryFn: actionsApi.getStats,
    staleTime: 15000,
  });
}

// ============================================================================
// Container Mutations with Automatic Cache Invalidation
// ============================================================================

interface MutationResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// Container action mutations with automatic cache invalidation (containers list, inspect data, stats, history)
export function useContainerMutations(containerId: string) {
  const queryClient = useQueryClient();

  const invalidateContainerQueries = async () => {
    // Use refetchQueries to force immediate refetch instead of just marking as stale
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['containers'] }),
      queryClient.refetchQueries({ queryKey: ['containerInspect', containerId] }),
      queryClient.refetchQueries({ queryKey: ['containerStats', containerId] }),
      queryClient.refetchQueries({ queryKey: ['containerAnalysis', containerId] }),
      queryClient.refetchQueries({ queryKey: ['failureAnalysis', containerId] }),
      queryClient.refetchQueries({ queryKey: ['actions'] }),
    ]);
  };

  const start = useMutation<MutationResult, Error>({
    mutationFn: async () => {
      const response = await api.post(`/containers/${containerId}/start`);
      return response.data;
    },
    onSuccess: invalidateContainerQueries,
  });

  const stop = useMutation<MutationResult, Error>({
    mutationFn: async () => {
      const response = await api.post(`/containers/${containerId}/stop`);
      return response.data;
    },
    onSuccess: invalidateContainerQueries,
  });

  const restart = useMutation<MutationResult, Error>({
    mutationFn: async () => {
      const response = await api.post(`/containers/${containerId}/restart`);
      return response.data;
    },
    onSuccess: invalidateContainerQueries,
  });

  const remove = useMutation<MutationResult, Error, { force?: boolean }>({
    mutationFn: async ({ force = false }) => {
      const response = await api.delete(`/containers/${containerId}?force=${force}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.removeQueries({ queryKey: ['containerInspect', containerId] });
      queryClient.removeQueries({ queryKey: ['containerStats', containerId] });
      queryClient.removeQueries({ queryKey: ['containerAnalysis', containerId] });
      queryClient.removeQueries({ queryKey: ['failureAnalysis', containerId] });
    },
  });

  const pause = useMutation<MutationResult, Error>({
    mutationFn: async () => {
      const response = await api.post(`/containers/${containerId}/pause`);
      return response.data;
    },
    onSuccess: invalidateContainerQueries,
  });

  const unpause = useMutation<MutationResult, Error>({
    mutationFn: async () => {
      const response = await api.post(`/containers/${containerId}/unpause`);
      return response.data;
    },
    onSuccess: invalidateContainerQueries,
  });

  return {
    start,
    stop,
    restart,
    remove,
    pause,
    unpause,
    isLoading: start.isPending || stop.isPending || restart.isPending || remove.isPending || pause.isPending || unpause.isPending,
  };
}
