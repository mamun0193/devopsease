import { useQuery } from '@tanstack/react-query';
import { containerHealthApi } from '../api';
import type { ContainerHealthState } from '../api';

// Fetch health state for a single container — event-driven (refreshed via container_health_updated WS event)
export function useContainerHealth(containerId: string | null) {
    return useQuery<ContainerHealthState, Error>({
        queryKey: ['containerHealth', containerId],
        queryFn: () => containerHealthApi.getHealth(containerId!),
        enabled: !!containerId,
        staleTime: 20000,
    });
}

// Fetch health states for multiple containers in a single batch request
// Returns a map of containerId → health summary for efficient list rendering
// Event-driven (refreshed via container_health_updated WS event)
export function useContainerHealthBatch(containerIds: string[]) {
    const sortedIds = [...containerIds].sort().join(','); // stable key

    return useQuery<Record<string, Pick<ContainerHealthState, 'healthStatus' | 'lastFailureType' | 'instabilityScore' | 'restartCount' | 'lastUpdatedAt'>>, Error>({
        queryKey: ['containerHealthBatch', sortedIds],
        queryFn: () => containerHealthApi.getHealthBatch(containerIds),
        enabled: containerIds.length > 0,
        staleTime: 20000,
    });
}
