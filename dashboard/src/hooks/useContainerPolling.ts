import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Centralized polling hook with visibility awareness
 * - Pauses polling when page is not visible
 * - Pauses stats polling when container is not running
 * - Provides immediate refetch trigger after mutations
 */
export function useContainerPolling(
    containerId: string | null,
    containerState: string | null
) {
    const queryClient = useQueryClient();
    const [isPageVisible, setIsPageVisible] = useState(true);

    // Track page visibility
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsPageVisible(document.visibilityState === 'visible');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Determine if container is running
    const isRunning = containerState?.toLowerCase() === 'running';

    // Determine polling states
    const shouldPollStats = isPageVisible && isRunning && !!containerId;
    const shouldPollState = isPageVisible && !!containerId;
    const shouldPollList = isPageVisible;

    // Immediate refetch after container actions
    const invalidateContainerQueries = useCallback(() => {
        if (!containerId) return;

        // Invalidate all queries related to this container
        queryClient.invalidateQueries({ queryKey: ['containers'] });
        queryClient.invalidateQueries({ queryKey: ['containerInspect', containerId] });
        queryClient.invalidateQueries({ queryKey: ['containerStats', containerId] });
        queryClient.invalidateQueries({ queryKey: ['containerAnalysis', containerId] });
        queryClient.invalidateQueries({ queryKey: ['actions'] });
    }, [queryClient, containerId]);

    // Invalidate just the container list
    const invalidateContainerList = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['containers'] });
    }, [queryClient]);

    return {
        isPageVisible,
        isRunning,
        shouldPollStats,
        shouldPollState,
        shouldPollList,
        invalidateContainerQueries,
        invalidateContainerList,
    };
}

/**
 * Hook to get visibility-based refetch interval
 * Returns 0 (disabled) when page is not visible
 */
export function useVisibilityInterval(baseInterval: number): number {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(document.visibilityState === 'visible');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return isVisible ? baseInterval : 0;
}
