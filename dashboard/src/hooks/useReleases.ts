import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { releasesApi } from '../api/releasesApi';

export const useReleases = (applicationId?: string) => {
  return useQuery({
    queryKey: ['releases', applicationId],
    queryFn: () => releasesApi.getReleases(applicationId)
  });
};

export const useRelease = (id: string) => {
  return useQuery({
    queryKey: ['release', id],
    queryFn: () => releasesApi.getRelease(id),
    enabled: !!id
  });
};

export const usePromoteRelease = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string, reason?: string }) => releasesApi.promoteRelease(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['release', variables.id] });
    }
  });
};

export const useRollbackRelease = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string, reason?: string }) => releasesApi.rollbackRelease(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['release', variables.id] });
    }
  });
};
