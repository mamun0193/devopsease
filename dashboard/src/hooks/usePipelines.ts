import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelineApi } from '../api';
import type { Pipeline, PipelineRun, CIPipelineMetrics, RunPipelineResponse, CreatePipelinePayload } from '../api';

// List all pipelines 
export function usePipelines() {
    return useQuery<Pipeline[]>({
        queryKey: ['pipelines'],
        queryFn: pipelineApi.list,
        staleTime: 30_000,
    });
}

// Single pipeline 
export function usePipeline(id: string) {
    return useQuery<Pipeline>({
        queryKey: ['pipeline', id],
        queryFn: () => pipelineApi.get(id),
        enabled: !!id,
    });
}

// Pipeline runs 
export function usePipelineRuns(pipelineId: string) {
    return useQuery<PipelineRun[]>({
        queryKey: ['pipeline-runs', pipelineId],
        queryFn: () => pipelineApi.getRuns(pipelineId, { limit: 50 }),
        enabled: !!pipelineId,
        staleTime: 15_000,
    });
}

// Single pipeline run 
export function usePipelineRun(runId: string) {
    return useQuery<PipelineRun>({
        queryKey: ['pipeline-run', runId],
        queryFn: () => pipelineApi.getRun(runId),
        enabled: !!runId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'pending' || status === 'running') return 3000;
            return false;
        },
    });
}

// Pipeline metrics 
export function usePipelineMetrics(pipelineId: string) {
    return useQuery<CIPipelineMetrics>({
        queryKey: ['pipeline-metrics', pipelineId],
        queryFn: () => pipelineApi.getMetrics(pipelineId),
        enabled: !!pipelineId,
        staleTime: 30_000,
    });
}

// Run pipeline (mutation) 
export function useRunPipeline() {
    const queryClient = useQueryClient();
    return useMutation<RunPipelineResponse, Error, { pipelineId: string; branch?: string }>({
        mutationFn: ({ pipelineId, branch }) =>
            pipelineApi.run(pipelineId, { triggerSource: 'manual', branch }),
        onSuccess: (_data, { pipelineId }) => {
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline', pipelineId] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-runs', pipelineId] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-metrics', pipelineId] });
        },
    });
}

// Create pipeline (mutation) 
export function useCreatePipeline() {
    const queryClient = useQueryClient();
    return useMutation<Pipeline, Error, CreatePipelinePayload>({
        mutationFn: (payload) => pipelineApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
        },
    });
}

// Delete pipeline (mutation) 
export function useDeletePipeline() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (id) => pipelineApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
        },
    });
}
