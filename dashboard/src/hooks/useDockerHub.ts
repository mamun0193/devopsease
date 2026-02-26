import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dockerHubApi } from '../api';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
    message?: string;
    errorCode?: string;
}

function getErrorMessage(error: AxiosError<ApiErrorResponse>): string {
    const status = error.response?.status;
    const errorCode = error.response?.data?.errorCode;
    const message = error.response?.data?.message;

    if (status === 429) return 'Rate limit exceeded. Please wait before trying again.';
    if (status === 401) return errorCode === 'AUTH_FAILED'
        ? 'Invalid Docker Hub credentials. Please check your username and password.'
        : 'Session expired. Please log in again.';
    if (status === 403) return 'Storage quota exceeded. Free up space before pulling.';
    if (status === 404) return message || 'Resource not found.';

    return message || 'An unexpected error occurred. Please try again.';
}

export function useDockerHubStatus() {
    return useQuery({
        queryKey: ['dockerhub-status'],
        queryFn: dockerHubApi.status,
        refetchInterval: 60000,
        retry: 1,
    });
}

export function useConnectDockerHub() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ username, password }: { username: string; password: string }) =>
            dockerHubApi.connect(username, password),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dockerhub-status'] });
            toast.success('Docker Hub connected successfully', {
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #064e3b' },
            });
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            toast.error(getErrorMessage(error), {
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #7f1d1d' },
            });
        },
    });
}

export function useDisconnectDockerHub() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => dockerHubApi.disconnect(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dockerhub-status'] });
            toast.success('Docker Hub disconnected', {
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #064e3b' },
            });
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            toast.error(getErrorMessage(error), {
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #7f1d1d' },
            });
        },
    });
}

export function usePullImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (imageName: string) => dockerHubApi.pull(imageName),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['images'] });
            queryClient.invalidateQueries({ queryKey: ['images-usage-summary'] });
            toast.success(`Pulled ${data.tag} (${data.sizeMB.toFixed(1)} MB)`, {
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #064e3b' },
            });
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            toast.error(getErrorMessage(error), {
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #7f1d1d' },
            });
        },
    });
}

export function usePushImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ imageId, repositoryTag }: { imageId: string; repositoryTag: string }) =>
            dockerHubApi.push(imageId, repositoryTag),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['images'] });
            toast.success(`Pushed as ${data.pushedAs}`, {
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #064e3b' },
            });
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            toast.error(getErrorMessage(error), {
                style: { background: '#020617', color: '#f1f5f9', border: '1px solid #7f1d1d' },
            });
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
