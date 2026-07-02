import { api } from './index';
import type { ExplainabilityRecord } from './releasesApi';

export interface TrafficTargetRule {
  releaseId: string;
  weight: number;
}

export interface TrafficPolicy {
  _id: string;
  schemaVersion: string;
  applicationId: string;
  mode: 'blue-green' | 'canary' | 'rolling' | 'all-at-once';
  targets: TrafficTargetRule[];
  explainabilityLog: ExplainabilityRecord[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoutingTable {
  _id: string;
  schemaVersion: string;
  version: number;
  slug: string;
  applicationId: string;
  routes: {
    releaseId: string;
    weight: number;
    targets: { name: string; deploymentId: string }[];
  }[];
  generatedAt: string;
}

export const trafficApi = {
  getPolicies: async (applicationId?: string): Promise<TrafficPolicy[]> => {
    const params = applicationId ? { applicationId } : {};
    const { data } = await api.get('/traffic/policies', { params });
    return data;
  },

  applyPolicy: async (
    applicationId: string, 
    mode: string, 
    targets: { releaseId: string, weight: number }[],
    reason: string
  ): Promise<TrafficPolicy> => {
    const { data } = await api.post('/traffic/policies', { applicationId, mode, targets, reason });
    return data;
  },

  getRoutingTable: async (slug: string): Promise<RoutingTable> => {
    const { data } = await api.get(`/traffic/routing-table/${slug}`);
    return data;
  }
};
