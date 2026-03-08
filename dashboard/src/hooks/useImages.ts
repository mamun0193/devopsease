import { useQuery } from '@tanstack/react-query';
import { imageApi } from '../api';

// Static query — refreshed via mutation (pull/push/build/delete) or image events.
export function useImages() {
    return useQuery({
        queryKey: ['images'],
        queryFn: imageApi.listImages,
        staleTime: Infinity,
        retry: 1,
    });
}

// Static query — refreshed alongside images.
export function useImageUsageSummary() {
    return useQuery({
        queryKey: ['images-usage-summary'],
        queryFn: imageApi.getUsageSummary,
        staleTime: Infinity,
        retry: 1,
    });
}
