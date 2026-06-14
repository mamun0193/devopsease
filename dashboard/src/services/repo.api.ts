import axios from 'axios';

const API_BASE_URL = 'http://localhost:3497';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


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
   
  getAll: async (): Promise<Repository[]> => {
    const response = await api.get<{ repositories: Repository[] }>('/api/repos');
    return response.data?.repositories ?? [];
  },

  // Connect a new Git repository.
  connect: async (payload: ConnectRepoPayload): Promise<Repository> => {
    const response = await api.post<{ repository: Repository }>('/api/repos/connect', payload);
    return response.data.repository;
  },

  // Delete a connected repository by ID.

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/repos/${id}`);
  },
};
