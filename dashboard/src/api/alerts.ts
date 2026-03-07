import api from './index';


export interface Alert {
  _id: string;
  userId: string;
  containerId: string | null;
  type: 'CRASH' | 'CRASH_LOOP' | 'OOM' | 'HIGH_CPU' | 'HIGH_MEMORY' | 'QUOTA_WARNING' | 'HEALTH_DEGRADED' | 'HEALTH_UNHEALTHY';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}


export const alertsApi = {
  /**
   * Fetch alerts for the current user.
   */
  getAlerts: async (params?: { resolved?: boolean; page?: number; limit?: number }): Promise<AlertsResponse> => {
    const query = new URLSearchParams();
    if (params?.resolved !== undefined) query.set('resolved', String(params.resolved));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const response = await api.get<{ success: boolean; data: Alert[]; pagination: AlertsResponse['pagination'] }>(
      `/alerts?${query.toString()}`
    );
    return { alerts: response.data.data, pagination: response.data.pagination };
  },

  /**
   * Get count of unresolved alerts.
   */
  getUnresolvedCount: async (): Promise<number> => {
    const response = await api.get<{ success: boolean; data: { count: number } }>('/alerts/unresolved-count');
    return response.data.data.count;
  },

  /**
   * Resolve a single alert.
   */
  resolveAlert: async (alertId: string): Promise<Alert> => {
    const response = await api.patch<{ success: boolean; data: Alert }>(`/alerts/${alertId}/resolve`);
    return response.data.data;
  },

  /**
   * Resolve all unresolved alerts.
   */
  resolveAll: async (): Promise<number> => {
    const response = await api.patch<{ success: boolean; data: { resolved: number } }>('/alerts/resolve-all');
    return response.data.data.resolved;
  },
};
