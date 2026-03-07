import { useQuery } from '@tanstack/react-query';
import { containerHealthApi } from '../api';
import type { ContainerHealthState } from '../api';
import { useVisibilityInterval } from './useContainerPolling';

// Fetch health state for a single container — polls every 30s
export function useContainerHealth(containerId: string | null) {
    const refetchInterval = useVisibilityInterval(30000);

    return useQuery<ContainerHealthState, Error>({
        queryKey: ['containerHealth', containerId],
        queryFn: () => containerHealthApi.getHealth(containerId!),
        enabled: !!containerId,
        refetchInterval,
        staleTime: 20000,
    });
}

// Fetch health states for multiple containers in a single batch request
// Returns a map of containerId → health summary for efficient list rendering
export function useContainerHealthBatch(containerIds: string[]) {
    const refetchInterval = useVisibilityInterval(30000);
    const sortedIds = [...containerIds].sort().join(','); // stable key

    return useQuery<Record<string, Pick<ContainerHealthState, 'healthStatus' | 'lastFailureType' | 'instabilityScore' | 'restartCount' | 'lastUpdatedAt'>>, Error>({
        queryKey: ['containerHealthBatch', sortedIds],
        queryFn: () => containerHealthApi.getHealthBatch(containerIds),
        enabled: containerIds.length > 0,
        refetchInterval,
        staleTime: 20000,
    });
}
