import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationApi } from '../api';
import type { Application, CreateApplicationPayload, ApplicationGatewayMetrics, GatewayDashboardMetrics } from '../api';

// Query Keys 

const KEYS = {
  all: ['applications'] as const,
  detail: (id: string) => ['applications', id] as const,
  metrics: (id: string) => ['applications', id, 'metrics'] as const,
  gateway: ['gateway-metrics'] as const,
  deployments: (id: string) => ['applications', id, 'deployments'] as const,
};

// Queries 

export function useApplications() {
  return useQuery<Application[]>({
    queryKey: KEYS.all,
    queryFn: applicationApi.list,
    staleTime: 30_000,
  });
}

export function useApplication(id: string | undefined) {
  return useQuery<Application>({
    queryKey: KEYS.detail(id!),
    queryFn: () => applicationApi.getById(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useApplicationMetrics(id: string | undefined) {
  return useQuery<ApplicationGatewayMetrics>({
    queryKey: KEYS.metrics(id!),
    queryFn: () => applicationApi.getMetrics(id!),
    enabled: !!id,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useGatewayMetrics() {
  return useQuery<GatewayDashboardMetrics>({
    queryKey: KEYS.gateway,
    queryFn: applicationApi.getGatewayMetrics,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useApplicationDeployments(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.deployments(id!),
    queryFn: () => applicationApi.getDeployments(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

// Mutations 

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateApplicationPayload) => applicationApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<Application, 'name' | 'description' | 'visibility'>> }) =>
      applicationApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicationApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
