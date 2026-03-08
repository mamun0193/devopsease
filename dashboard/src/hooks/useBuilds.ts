import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApi } from '../api';
import type { Build, TriggerBuildResponse } from '../api';

// Static query — refreshed via mutation (useTriggerBuild) or build_complete WebSocket event.
export function useBuilds() {
    return useQuery<Build[]>({
        queryKey: ['builds'],
        queryFn: buildApi.listBuilds,
        staleTime: Infinity,
    });
}

export function useBuild(buildId: string) {
    return useQuery<Build>({
        queryKey: ['build', buildId],
        queryFn: () => buildApi.getBuild(buildId),
        enabled: !!buildId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'PENDING' || status === 'RUNNING') return 3000;
            return false;
        },
    });
}

export function useTriggerBuild() {
    const queryClient = useQueryClient();
    return useMutation<TriggerBuildResponse, Error, { tag: string; dockerfile: string }>({
        mutationFn: ({ tag, dockerfile }) => buildApi.triggerBuild(tag, dockerfile),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['builds'] });
            queryClient.invalidateQueries({ queryKey: ['images'] });
            queryClient.invalidateQueries({ queryKey: ['images-usage-summary'] });
        },
    });
}
