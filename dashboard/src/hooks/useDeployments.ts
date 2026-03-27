import { useQuery } from '@tanstack/react-query';
import { deploymentApi } from '../api';
import type { Deployment } from '../api';

export function useDeployments() {
  return useQuery<Deployment[]>({
    queryKey: ['deployments'],
    queryFn: deploymentApi.list,
    staleTime: 30 * 1000,
    retry: 1,
  });
}
