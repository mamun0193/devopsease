import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trafficApi } from '../api/trafficApi';

export const useTrafficPolicies = (applicationId?: string) => {
  return useQuery({
    queryKey: ['trafficPolicies', applicationId],
    queryFn: () => trafficApi.getPolicies(applicationId)
  });
};

export const useRoutingTable = (slug: string) => {
  return useQuery({
    queryKey: ['routingTable', slug],
    queryFn: () => trafficApi.getRoutingTable(slug),
    enabled: !!slug
  });
};

export const useApplyTrafficPolicy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ applicationId, mode, targets, reason }: { applicationId: string, mode: string, targets: any[], reason: string }) => 
      trafficApi.applyPolicy(applicationId, mode, targets, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trafficPolicies', variables.applicationId] });
      queryClient.invalidateQueries({ queryKey: ['routingTable'] }); // Can be refined if slug is known
    }
  });
};
