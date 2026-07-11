import { api } from '../api';

export type RepoStatus = 'active' | 'disconnected';

export interface Repository {
  _id: string;
  repoName: string;
  owner: string;
  cloneUrl: string;
  defaultBranch: string;
  status: RepoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectRepoPayload {
  repoName: string;
  owner: string;
  cloneUrl: string;
  defaultBranch?: string;
}

export const repoApi = {
  // Fetch all connected repositories for the authenticated user.
  // Backend uses paginatedResponse → { data: [...], meta: {...} }
  getAll: async (): Promise<Repository[]> => {
    const response = await api.get('/api/repos');
    return response.data?.data || [];
  },

  // Connect a new Git repository.
  // Backend uses standardResponse(repository) → { data: {...} }
  connect: async (payload: ConnectRepoPayload): Promise<Repository> => {
    const response = await api.post('/api/repos/connect', payload);
    return response.data?.data || response.data;
  },

  // Delete a connected repository by ID.
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/repos/${id}`);
  },
};
