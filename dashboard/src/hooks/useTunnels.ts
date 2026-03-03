import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';
import api from '../api';
export interface Tunnel {
    id: string;
    containerId: string;
    internalPort: number;
    publicUrl: string;
    provider: string;
    status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
    expiresAt: string;
    createdAt: string;
    revokedAt: string | null;
}

interface TunnelsResponse {
    tunnels: Tunnel[];
}

interface CreateTunnelPayload {
    containerId: string;
    port: number;
    durationMinutes: number;
}

interface CreateTunnelResult {
    tunnel: {
        tunnelId: string;
        publicUrl: string;
        expiresAt: string;
    };
    message: string;
}

interface RevokeTunnelResult {
    tunnelId: string;
    status: string;
    message: string;
}

function extractErrorMessage(error: unknown): string {
    if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data
    ) {
        return String((error.response.data as { message: string }).message);
    }
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred';
}

function extractStatusCode(error: unknown): number | null {
    if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response
    ) {
        return Number((error.response as { status: number }).status);
    }
    return null;
}


export function useUserTunnels(containerId?: string) {
    return useQuery<Tunnel[], Error>({
        queryKey: ['tunnels', containerId],
        queryFn: async () => {
            const response = await api.get<TunnelsResponse>('/tunnels');
            const all = response.data.tunnels;
            if (containerId) {
                return all.filter((t) => t.containerId === containerId);
            }
            return all;
        },
        staleTime: 15_000,
        refetchInterval: 30_000,
    });
}


export function useCreateTunnel() {
    const queryClient = useQueryClient();
    const dispatch = useAppDispatch();

    return useMutation<CreateTunnelResult, unknown, CreateTunnelPayload>({
        mutationFn: async (payload) => {
            const response = await api.post<CreateTunnelResult>('/tunnels', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tunnels'] });
            dispatch(
                addToast({
                    type: 'success',
                    message: 'Port exposed successfully. Public URL is ready.',
                    duration: 4000,
                })
            );
        },
        onError: (error) => {
            const status = extractStatusCode(error);
            let message: string;

            if (status === 429) {
                message = 'Tunnel quota exceeded. Maximum 3 active tunnels allowed. Revoke one first.';
            } else if (status === 400) {
                message = extractErrorMessage(error) || 'Invalid port. Make sure the port is exposed by the container.';
            } else if (status === 403) {
                message = 'Access denied. You do not own this container.';
            } else {
                message = extractErrorMessage(error) || 'Failed to create tunnel. Please try again.';
            }

            dispatch(addToast({ type: 'error', message, duration: 5000 }));
        },
    });
}


export function useRevokeTunnel() {
    const queryClient = useQueryClient();
    const dispatch = useAppDispatch();

    return useMutation<RevokeTunnelResult, unknown, string>({
        mutationFn: async (tunnelId) => {
            const response = await api.delete<RevokeTunnelResult>(`/tunnels/${tunnelId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tunnels'] });
            dispatch(
                addToast({
                    type: 'info',
                    message: 'Tunnel revoked. Public URL is no longer accessible.',
                    duration: 3500,
                })
            );
        },
        onError: (error) => {
            const message = extractErrorMessage(error) || 'Failed to revoke tunnel.';
            dispatch(addToast({ type: 'error', message, duration: 4000 }));
        },
    });
}
