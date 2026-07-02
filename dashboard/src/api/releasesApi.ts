import { api } from './index';

export interface ExplainabilityRecord {
  timestamp: string;
  decision: string;
  trigger: string;
  actor: string;
  reason: string;
  relatedResource: any;
}

export interface ReleaseTarget {
  name: string;
  deploymentId: string;
  status: string;
}

export interface ReleaseManifest {
  _id: string;
  schemaVersion: string;
  applicationId: string;
  configSnapshotId: string;
  buildManifestId: string;
  imageId: string;
  createdAt: string;
}

export interface Release {
  _id: string;
  schemaVersion: string;
  applicationId: string;
  manifestId: string | ReleaseManifest;
  version: string;
  status: 'Draft' | 'Prepared' | 'Deploying' | 'Validating' | 'Promoting' | 'Active' | 'Archived' | 'RolledBack';
  targets: ReleaseTarget[];
  explainabilityLog: ExplainabilityRecord[];
  createdAt: string;
  updatedAt: string;
}

export const releasesApi = {
  getReleases: async (applicationId?: string): Promise<Release[]> => {
    const params = applicationId ? { applicationId } : {};
    const { data } = await api.get('/releases', { params });
    return data;
  },

  getRelease: async (id: string): Promise<Release> => {
    const { data } = await api.get(`/releases/${id}`);
    return data;
  },

  promoteRelease: async (id: string, reason?: string): Promise<Release> => {
    const { data } = await api.post(`/releases/${id}/promote`, { reason });
    return data;
  },

  rollbackRelease: async (id: string, reason?: string): Promise<Release> => {
    const { data } = await api.post(`/releases/${id}/rollback`, { reason });
    return data;
  }
};
