import { useQuery } from '@tanstack/react-query';
import { repoApi } from '../services/repo.api';

export function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: repoApi.getAll,
    staleTime: 60_000,
    retry: 1,
  });
}
