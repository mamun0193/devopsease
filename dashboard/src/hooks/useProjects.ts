import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api';

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: projectApi.list,
    });
}

export function useProject(projectId: string) {
    return useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectApi.getById(projectId),
        enabled: !!projectId,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ name, composeYaml }: { name: string; composeYaml: string }) =>
            projectApi.create(name, composeYaml),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

export function useStartProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (projectId: string) => projectApi.start(projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project'] });
        },
    });
}

export function useStopProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (projectId: string) => projectApi.stop(projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project'] });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (projectId: string) => projectApi.delete(projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}
