import { useQuery } from '@tanstack/react-query';
import { quotaApi } from '../api';
import { useVisibilityInterval } from './useContainerPolling';

// Real-time polling — quota changes as containers run (CPU/memory/count)
export function useQuota() {
  const refetchInterval = useVisibilityInterval(20000);
  return useQuery({
    queryKey: ['quota'],
    queryFn: quotaApi.get,
    refetchInterval,
    staleTime: 15000,
  });
}
