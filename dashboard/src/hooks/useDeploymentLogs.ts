import { useQuery } from '@tanstack/react-query';
import { deploymentApi } from '../api';

export function useDeploymentLogs(deploymentId: string | null) {
  return useQuery({
    queryKey: ['deployment-logs', deploymentId],
    queryFn: () => deploymentApi.getLogs(deploymentId!),
    enabled: !!deploymentId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
