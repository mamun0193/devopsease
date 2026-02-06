import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { containerApi, healthApi, actionsApi } from '../api';
import type { Container, ContainerInspect, FailureAnalysis, ContainerLogs, ContainerStats, ActionsResponse, ActionStats } from '../api';
import api from '../api';
import { useVisibilityInterval } from './useContainerPolling';

// ============================================================================
// Container Queries with Optimized Polling
// ============================================================================

// Fetch all containers - Poll every 15s (cached 15s TTL), pause when hidden
export function useContainers() {
  const refetchInterval = useVisibilityInterval(15000);

  return useQuery<Container[], Error>({
    queryKey: ['containers'],
    queryFn: containerApi.getAll,
    refetchInterval,
    staleTime: 10000,
  });
}

// Fetch container logs - Poll every 5s (live, not cached), pause when hidden
export function useContainerLogs(
  containerId: string | null,
  options?: { tail?: number; since?: number; until?: number }
) {
  const refetchInterval = useVisibilityInterval(5000);

  return useQuery<ContainerLogs, Error>({
    queryKey: ['containerLogs', containerId, options?.since, options?.until],
    queryFn: () => containerApi.getLogs(containerId!, options),
    enabled: !!containerId,
    refetchInterval,
    staleTime: 2000,
  });
}

// Fetch container inspection data - Poll every 30s (static config cached 45s TTL), pause when hidden
export function useContainerInspect(containerId: string | null) {
  const refetchInterval = useVisibilityInterval(30000);

  return useQuery<ContainerInspect, Error>({
    queryKey: ['containerInspect', containerId],
    queryFn: () => containerApi.inspect(containerId!),
    enabled: !!containerId,
    refetchInterval,
    staleTime: 25000,
  });
}

// Fetch container analysis - Poll every 30s, pause when hidden
export function useContainerAnalysis(containerId: string | null) {
  const refetchInterval = useVisibilityInterval(30000);

  return useQuery<FailureAnalysis, Error>({
    queryKey: ['containerAnalysis', containerId],
    queryFn: () => containerApi.analyze(containerId!),
    enabled: !!containerId,
    refetchInterval,
    staleTime: 15000,
  });
}

// Fetch container stats (CPU, memory, network) - Poll every 2s (real-time, no cache) when running & visible
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

// Health check - Poll every 30s
export function useHealthCheck() {
  const refetchInterval = useVisibilityInterval(30000);

  return useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval,
    staleTime: 15000,
  });
}

// Fetch action history - Poll every 10s (Redis persisted), pause when hidden
export function useActions(options?: { containerId?: string; limit?: number; cursor?: string }) {
  const refetchInterval = useVisibilityInterval(10000);

  return useQuery<ActionsResponse, Error>({
    queryKey: ['actions', options?.containerId, options?.limit, options?.cursor],
    queryFn: () => actionsApi.getActions(options),
    staleTime: 5000,
    refetchInterval,
  });
}

// Fetch action stats - Poll every 30s
export function useActionStats() {
  const refetchInterval = useVisibilityInterval(30000);

  return useQuery<ActionStats, Error>({
    queryKey: ['actionStats'],
    queryFn: actionsApi.getStats,
    staleTime: 15000,
    refetchInterval,
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

  const invalidateContainerQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['containers'] });
    queryClient.invalidateQueries({ queryKey: ['containerInspect', containerId] });
    queryClient.invalidateQueries({ queryKey: ['containerStats', containerId] });
    queryClient.invalidateQueries({ queryKey: ['containerAnalysis', containerId] });
    queryClient.invalidateQueries({ queryKey: ['actions'] });
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
      // After removal, we don't need to refetch container-specific queries
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      // Remove stale data for this container
      queryClient.removeQueries({ queryKey: ['containerInspect', containerId] });
      queryClient.removeQueries({ queryKey: ['containerStats', containerId] });
      queryClient.removeQueries({ queryKey: ['containerAnalysis', containerId] });
    },
  });

  return {
    start,
    stop,
    restart,
    remove,
    isLoading: start.isPending || stop.isPending || restart.isPending || remove.isPending,
  };
}
