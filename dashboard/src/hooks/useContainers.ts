import { useQuery } from '@tanstack/react-query';
import { containerApi, healthApi } from '../api';
import type { Container, ContainerInspect, FailureAnalysis, ContainerLogs, ContainerStats } from '../api';

// Fetch all containers
export function useContainers() {
  return useQuery<Container[], Error>({
    queryKey: ['containers'],
    queryFn: containerApi.getAll,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
  });
}

// Fetch container logs (now returns parsed logs from server)
export function useContainerLogs(
  containerId: string | null, 
  options?: { tail?: number; since?: number; until?: number }
) {
  return useQuery<ContainerLogs, Error>({
    queryKey: ['containerLogs', containerId, options?.since, options?.until],
    queryFn: () => containerApi.getLogs(containerId!, options),
    enabled: !!containerId,
    refetchInterval: 5000, // Refresh logs every 5 seconds
    staleTime: 2000,
  });
}

// Fetch container inspection
export function useContainerInspect(containerId: string | null) {
  return useQuery<ContainerInspect, Error>({
    queryKey: ['containerInspect', containerId],
    queryFn: () => containerApi.inspect(containerId!),
    enabled: !!containerId,
    staleTime: 10000,
  });
}

// Fetch container analysis
export function useContainerAnalysis(containerId: string | null) {
  return useQuery<FailureAnalysis, Error>({
    queryKey: ['containerAnalysis', containerId],
    queryFn: () => containerApi.analyze(containerId!),
    enabled: !!containerId,
    staleTime: 10000,
  });
}

// Fetch container stats
export function useContainerStats(containerId: string | null, enabled: boolean = true) {
  return useQuery<ContainerStats, Error>({
    queryKey: ['containerStats', containerId],
    queryFn: () => containerApi.stats(containerId!),
    enabled: !!containerId && enabled,
    refetchInterval: 3000,
    staleTime: 1000,
  });
}

// Health check 
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval: 30000, // Check health every 30 seconds
    staleTime: 15000,
  });
}
