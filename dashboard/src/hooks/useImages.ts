import { useQuery } from '@tanstack/react-query';
import { imageApi } from '../api';

export function useImages() {
    return useQuery({
        queryKey: ['images'],
        queryFn: imageApi.listImages,
        retry: 1,
    });
}

export function useImageUsageSummary() {
    return useQuery({
        queryKey: ['images-usage-summary'],
        queryFn: imageApi.getUsageSummary,
        retry: 1,
    });
}
