import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dockerHubApi } from '../api';
import type { AxiosError } from 'axios';
import { useDispatch } from 'react-redux';
import { addToast } from '../store/toastSlice';

interface ApiErrorResponse {
    message?: string;
    errorCode?: string;
}

function getErrorMessage(error: AxiosError<ApiErrorResponse>): string {
    const status = error.response?.status;
    if (status === 401) return 'Invalid Docker Hub credentials.';
    if (status === 429) return 'Rate limit exceeded.';
    return 'Something went wrong. Please try again.';
}

// Static query — refreshed only when connect/disconnect mutations succeed.
export function useDockerHubStatus() {
    return useQuery({
        queryKey: ['dockerhub-status'],
        queryFn: dockerHubApi.status,
        staleTime: Infinity,
        retry: 1,
    });
}

export function useConnectDockerHub() {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();

    return useMutation({
        mutationFn: ({ username, password }: { username: string; password: string }) =>
            dockerHubApi.connect(username, password),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dockerhub-status'] });
            dispatch(addToast({ message: 'Docker Hub connected successfully', type: 'success', duration: 4000 }));
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            dispatch(addToast({ message: getErrorMessage(error), type: 'error', duration: 5000 }));
        },
    });
}

export function useDisconnectDockerHub() {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();

    return useMutation({
        mutationFn: () => dockerHubApi.disconnect(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dockerhub-status'] });
            dispatch(addToast({ message: 'Docker Hub disconnected', type: 'success', duration: 4000 }));
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            dispatch(addToast({ message: getErrorMessage(error), type: 'error', duration: 5000 }));
        },
    });
}

export function usePullImage() {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();

    return useMutation({
        mutationFn: (imageName: string) => dockerHubApi.pull(imageName),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['images'] });
            queryClient.invalidateQueries({ queryKey: ['images-usage-summary'] });
            dispatch(addToast({
                message: `Pulled ${data.tag} (${data.sizeMB.toFixed(1)} MB)`,
                type: 'success',
                duration: 4000,
            }));
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            dispatch(addToast({ message: getErrorMessage(error), type: 'error', duration: 5000 }));
        },
    });
}

export function usePushImage() {
    const queryClient = useQueryClient();
    const dispatch = useDispatch();

    return useMutation({
        mutationFn: ({ imageId, repositoryTag }: { imageId: string; repositoryTag: string }) =>
            dockerHubApi.push(imageId, repositoryTag),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['images'] });
            dispatch(addToast({ message: `Pushed as ${data.pushedAs}`, type: 'success', duration: 4000 }));
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            dispatch(addToast({ message: getErrorMessage(error), type: 'error', duration: 5000 }));
        },
    });
}

export function useDockerHubSearch(query: string) {
    return useQuery({
        queryKey: ['dockerhub-search', query],
        queryFn: () => dockerHubApi.search(query),
        enabled: query.length >= 2,
        staleTime: 30000,
        placeholderData: (prev) => prev,
        retry: 1,
    });
}
