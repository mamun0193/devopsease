import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApi } from '../api';
import type { Build, TriggerBuildResponse } from '../api';

export function useBuilds() {
    return useQuery<Build[]>({
        queryKey: ['builds'],
        queryFn: buildApi.listBuilds,
        refetchInterval: 10000,
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
        },
    });
}
