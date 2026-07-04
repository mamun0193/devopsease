import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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

export const domainsApi = {
  // Domain Operations
  listDomains: async (params?: any): Promise<{ data: Domain[], pagination: any }> => {
    const res = await axios.get(`${API_BASE_URL}/domains`, { params, withCredentials: true });
    return { data: res.data.data, pagination: res.data.pagination };
  },
  
  getDomain: async (id: string): Promise<Domain> => {
    const res = await axios.get(`${API_BASE_URL}/domains/${id}`, { withCredentials: true });
    return res.data.data;
  },

  addDomain: async (data: { applicationId: string, hostname: string, type?: string, options?: any }): Promise<Domain> => {
    const res = await axios.post(`${API_BASE_URL}/domains`, data, { withCredentials: true });
    return res.data.data;
  },

  archiveDomain: async (id: string, reason?: string): Promise<Domain> => {
    const res = await axios.delete(`${API_BASE_URL}/domains/${id}`, { 
      data: { reason },
      withCredentials: true 
    });
    return res.data.data;
  },

  // Lifecycle Operations
  verifyDomain: async (id: string): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/domains/${id}/verify`, {}, { withCredentials: true });
    return res.data;
  },

  retryVerification: async (id: string, method?: string): Promise<Domain> => {
    const res = await axios.post(`${API_BASE_URL}/domains/${id}/retry-verification`, { method }, { withCredentials: true });
    return res.data.data;
  },

  connectDomain: async (id: string): Promise<Domain> => {
    const res = await axios.post(`${API_BASE_URL}/domains/${id}/connect`, {}, { withCredentials: true });
    return res.data.data;
  },

  disconnectDomain: async (id: string, reason?: string): Promise<Domain> => {
    const res = await axios.post(`${API_BASE_URL}/domains/${id}/disconnect`, { reason }, { withCredentials: true });
    return res.data.data;
  },

  evaluateHealth: async (id: string): Promise<any> => {
    const res = await axios.get(`${API_BASE_URL}/domains/${id}/health`, { withCredentials: true });
    return res.data.data;
  },

  // Certificate Operations
  requestCertificate: async (domainId: string): Promise<Certificate> => {
    const res = await axios.post(`${API_BASE_URL}/domains/${domainId}/certificates`, {}, { withCredentials: true });
    return res.data.data;
  },

  getCertificateHistory: async (domainId: string): Promise<Certificate[]> => {
    const res = await axios.get(`${API_BASE_URL}/domains/${domainId}/certificates`, { withCredentials: true });
    return res.data.data;
  },

  renewCertificate: async (domainId: string, certificateId: string): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/domains/${domainId}/certificates/${certificateId}/renew`, {}, { withCredentials: true });
    return res.data;
  },

  revokeCertificate: async (domainId: string, certificateId: string, reason?: string): Promise<any> => {
    const res = await axios.post(`${API_BASE_URL}/domains/${domainId}/certificates/${certificateId}/revoke`, { reason }, { withCredentials: true });
    return res.data;
  },

  // Events
  getDomainEvents: async (domainId: string, params?: any): Promise<{ data: DomainEvent[], pagination: any }> => {
    const res = await axios.get(`${API_BASE_URL}/domains/${domainId}/events`, { params, withCredentials: true });
    return { data: res.data.data, pagination: res.data.pagination };
  }
};
