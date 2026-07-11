import { api } from './index';

export interface Domain {
  _id: string;
  hostname: string;
  type: string;
  status: string;
  autoManaged: boolean;
  applicationId: any;
  verification?: {
    method: string;
    token: string;
    instructions: string;
    verifiedAt: string | null;
    attempts: number;
    lastError: string | null;
  };
  activeCertificate?: {
    certificateId: string;
    expiresAt: string;
    status: string;
  };
  healthStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainEvent {
  _id: string;
  domainId: string;
  certificateId?: string;
  decision: string;
  trigger: string;
  actor: string;
  reason: string;
  createdAt: string;
}

export interface Certificate {
  _id: string;
  domainId: string;
  hostname: string;
  status: string;
  provider: string;
  serialNumber?: string;
  issuer?: string;
  issuedAt?: string;
  expiresAt?: string;
  renewAt?: string;
  lastRenewalError?: string;
  createdAt: string;
}

// ponytail: helper — backend wraps everything in standardResponse({ data }) or paginatedResponse({ data, meta })
function unwrap<T>(res: any): T {
  return res.data?.data ?? res.data;
}

export const domainsApi = {
  // Domain Operations
  listDomains: async (params?: any): Promise<{ data: Domain[], pagination: any }> => {
    const res = await api.get('/api/domains', { params });
    return { data: unwrap(res), pagination: res.data.meta || res.data.pagination };
  },
  
  getDomain: async (id: string): Promise<Domain> => {
    const res = await api.get(`/api/domains/${id}`);
    return unwrap(res);
  },

  addDomain: async (data: { applicationId: string, hostname: string, type?: string, options?: any }): Promise<Domain> => {
    const res = await api.post('/api/domains', data);
    return unwrap(res);
  },

  archiveDomain: async (id: string, reason?: string): Promise<Domain> => {
    const res = await api.delete(`/api/domains/${id}`, { data: { reason } });
    return unwrap(res);
  },

  // Lifecycle Operations
  verifyDomain: async (id: string): Promise<any> => {
    const res = await api.post(`/api/domains/${id}/verify`);
    return unwrap(res);
  },

  retryVerification: async (id: string, method?: string): Promise<Domain> => {
    const res = await api.post(`/api/domains/${id}/retry-verification`, { method });
    return unwrap(res);
  },

  connectDomain: async (id: string): Promise<Domain> => {
    const res = await api.post(`/api/domains/${id}/connect`);
    return unwrap(res);
  },

  disconnectDomain: async (id: string, reason?: string): Promise<Domain> => {
    const res = await api.post(`/api/domains/${id}/disconnect`, { reason });
    return unwrap(res);
  },

  evaluateHealth: async (id: string): Promise<any> => {
    const res = await api.get(`/api/domains/${id}/health`);
    return unwrap(res);
  },

  // Certificate Operations
  requestCertificate: async (domainId: string): Promise<Certificate> => {
    const res = await api.post(`/api/domains/${domainId}/certificates`);
    return unwrap(res);
  },

  getCertificateHistory: async (domainId: string): Promise<Certificate[]> => {
    const res = await api.get(`/api/domains/${domainId}/certificates`);
    return unwrap(res);
  },

  renewCertificate: async (domainId: string, certificateId: string): Promise<any> => {
    const res = await api.post(`/api/domains/${domainId}/certificates/${certificateId}/renew`);
    return unwrap(res);
  },

  revokeCertificate: async (domainId: string, certificateId: string, reason?: string): Promise<any> => {
    const res = await api.post(`/api/domains/${domainId}/certificates/${certificateId}/revoke`, { reason });
    return unwrap(res);
  },

  // Events
  getDomainEvents: async (domainId: string, params?: any): Promise<{ data: DomainEvent[], pagination: any }> => {
    const res = await api.get(`/api/domains/${domainId}/events`, { params });
    return { data: unwrap(res), pagination: res.data.meta || res.data.pagination };
  }
};
