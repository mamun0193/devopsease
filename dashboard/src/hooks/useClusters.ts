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
