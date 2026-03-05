import { useQuery } from '@tanstack/react-query';
import { quotaApi } from '../api';
import { useVisibilityInterval } from './useContainerPolling';

export function useQuota() {
  const refetchInterval = useVisibilityInterval(15000);
  return useQuery({
    queryKey: ['quota'],
    queryFn: quotaApi.get,
    refetchInterval,
    staleTime: 10000,
  });
}
