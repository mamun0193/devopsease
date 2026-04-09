import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clusterApi } from '../api';

export function useClusters() {
    return useQuery({
        queryKey: ['clusters'],
        queryFn: clusterApi.list,
        staleTime: 30_000,
    });
}

export function useConnectCluster() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ name, kubeconfig }: { name: string; kubeconfig: string }) =>
            clusterApi.connect(name, kubeconfig),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clusters'] });
        },
    });
}

export function useClusterPods(clusterId: string | null, namespace = 'default') {
    return useQuery({
        queryKey: ['cluster-pods', clusterId, namespace],
        queryFn: () => clusterApi.getPods(clusterId!, namespace),
        enabled: !!clusterId,
        staleTime: 15_000,
        refetchInterval: 30_000,
    });
}

export function useClusterNamespaces(clusterId: string | null) {
    return useQuery({
        queryKey: ['cluster-namespaces', clusterId],
        queryFn: () => clusterApi.getNamespaces(clusterId!),
        enabled: !!clusterId,
        staleTime: 60_000,
    });
}

export function usePodLogs(
    clusterId: string | null,
    podName: string | null,
    options: { namespace?: string; tailLines?: number; container?: string } = {},
) {
    return useQuery({
        queryKey: ['pod-logs', clusterId, podName, options.namespace, options.tailLines, options.container],
        queryFn: () => clusterApi.getPodLogs(clusterId!, podName!, options),
        enabled: !!clusterId && !!podName,
        staleTime: 10_000,
        refetchInterval: false, // manual refresh via invalidation
    });
}

export function useClusterOverview(clusterId: string | null, namespace = 'default') {
    return useQuery({
        queryKey: ['cluster-overview', clusterId, namespace],
        queryFn: () => clusterApi.getOverview(clusterId!, namespace),
        enabled: !!clusterId,
        staleTime: 8_000,
        refetchInterval: 10_000, // auto-refresh every 10 seconds
    });
}

