import { useQuery } from '@tanstack/react-query';
import { volumeApi } from '../api';

// Static query — refreshed via prune mutations.
export function useVolumes() {
    return useQuery({
        queryKey: ['volumes'],
        queryFn: volumeApi.list,
        staleTime: Infinity,
    });
}
