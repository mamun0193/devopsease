import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { networkApi } from '../api';

export function useNetworks() {
    const queryClient = useQueryClient();
    useEffect(() => {
        networkApi.reconcile()
            .then(() => queryClient.invalidateQueries({ queryKey: ['networks'] }))
            .catch(() => { /* non-critical: reconcile failure shouldn't block the page */ });
    }, []);

    return useQuery({
        queryKey: ['networks'],
        queryFn: networkApi.list,
    });
}

export function useDeleteNetwork() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (networkId: string) => networkApi.remove(networkId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['networks'] });
        },
    });
}
