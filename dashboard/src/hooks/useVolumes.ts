import { useQuery } from '@tanstack/react-query';
import { volumeApi } from '../api';

export function useVolumes() {
    return useQuery({
        queryKey: ['volumes'],
        queryFn: volumeApi.list,
    });
}
