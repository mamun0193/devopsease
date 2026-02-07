import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.data || error.message);

    // Detect 503 initializing state and emit event for UI handling
    if (error.response?.status === 503 && error.response?.data?.initializing) {
      console.warn('⏳ Server is initializing...', error.response.data.status);
      window.dispatchEvent(new CustomEvent('server-initializing', {
        detail: error.response.data.status
      }));
    }

    return Promise.reject(error);
  }
);

export interface Container {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  Ports: Array<{
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
  Labels: Record<string, string>;
  State: string;
  Status: string;
  HostConfig: {
    NetworkMode: string;
  };
  NetworkSettings: {
    Networks: Record<string, unknown>;
  };
  Mounts: Array<{
    Type: string;
    Source: string;
    Destination: string;
    Mode: string;
    RW: boolean;
  }>;
}

export interface ContainerInspect {
  name: string;
  image: string;
  state: {
    status: string;
    running: boolean;
    paused: boolean;
    restarting: boolean;
    oomKilled: boolean;
    dead: boolean;
    pid: number;
    exitCode: number;
    exitCodeReason: string | null;
    error: string;
    startedAt: string;
    finishedAt: string;
  };
  restartCount: number;
  ports: Record<string, Array<{ HostIp: string; HostPort: string }>>;
  environmentVariables: Array<{ key: string; value: string }>;
  networks: Array<{ name: string; ipAddress: string }>;
  mounts: Array<{
    type: string;
    source: string;
    destination: string;
    mode: string;
    rw: boolean;
  }>;
  labels: Record<string, string>;
  healthcheck: {
    test: string[];
    interval: number;
    timeout: number;
    retries: number;
    startPeriod: number;
  } | null;
}

export interface FailureAnalysis {
  containerId: string;
  containerName: string;
  state: string;
  failure: {
    category: 'RESOURCE' | 'NETWORK' | 'RUNTIME' | 'CONFIGURATION' | 'UNKNOWN' | null;
    stage: 'STARTUP' | 'RUN' | 'SHUTDOWN' | null;
    confidence: 'high' | 'medium' | 'low';
    stabilityInsight?: string;
    metadata?: {
      recentFailures: Array<{
        category: string;
        timestamp: string;
      }>;
    };
  } | null;
  explanation: {
    summary: string;
    confidence: string;
    explanation: string;
    likelyCauses: string[];
    suggestedChecks: string[];
    signalsObserved: string[];
  } | null;
}

export interface ParsedLogLine {
  id: number;
  timestamp: string | null;
  timezone: string;
  level: 'error' | 'warning' | 'info' | 'debug' | 'success' | 'unknown';
  message: string;
  rawLine: string;
  explanation: string;
  isImportant: boolean;
  hasDetails: boolean;
}

export interface LogStats {
  total: number;
  errors: number;
  warnings: number;
  info: number;
  success: number;
}

export interface ContainerLogs {
  raw: string;
  parsed: ParsedLogLine[];
  stats: LogStats;
}

export interface ContainerStats {
  cpu: {
    usagePercent: number;
  };
  memory: {
    usedMB: number;
    limitMB: number;
    usagePercent: number;
  };
  network: {
    rxMB: number;
    txMB: number;
  };
}

export interface ActionRecord {
  id: string;
  timestamp: string;
  container: {
    id: string;
    name: string | null;
  };
  action: 'start' | 'stop' | 'restart' | 'remove' | 'pause' | 'unpause' | 'create';
  status: 'pending' | 'success' | 'failed';
  reason: string | null;
  source: 'user' | 'system';
  completedAt?: string;
}

export interface ActionsResponse {
  items: ActionRecord[];
  nextCursor: string | null;
}

export interface ActionStats {
  total: number;
  success: number;
  failed: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// API Functions
export const containerApi = {
  // Get all containers
  getAll: async (): Promise<Container[]> => {
    const response = await api.get<ApiResponse<Container[]>>('/containers');
    return response.data.data;
  },

  // Get container logs (now returns parsed logs from server)
  getLogs: async (containerId: string, options?: { tail?: number; since?: number; until?: number }): Promise<ContainerLogs> => {
    const params = new URLSearchParams();
    if (options?.tail) params.append('tail', String(options.tail));
    if (options?.since) params.append('since', String(options.since));
    if (options?.until) params.append('until', String(options.until));
    const queryString = params.toString();
    const url = `/containers/${containerId}/logs${queryString ? `?${queryString}` : ''}`;
    const response = await api.get<ApiResponse<ContainerLogs>>(url);
    return response.data.data;
  },

  // Get container inspection data
  inspect: async (containerId: string): Promise<ContainerInspect> => {
    const response = await api.get<ApiResponse<ContainerInspect>>(`/containers/${containerId}/inspect`);
    return response.data.data;
  },
  // Get container failure analysis 
  analyze: async (containerId: string): Promise<FailureAnalysis> => {
    const response = await api.get<ApiResponse<FailureAnalysis>>(`/containers/${containerId}/analysis`);
    return response.data.data;
  },

  // Get container stats
  stats: async (containerId: string): Promise<ContainerStats> => {
    const response = await api.get<ApiResponse<ContainerStats>>(`/containers/${containerId}/stats`);
    return response.data.data;
  },
};

// Health check
export const healthApi = {
  check: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Action history
export const actionsApi = {
  // Get all actions or filtered by containerId
  getActions: async (options?: { containerId?: string; limit?: number; cursor?: string }): Promise<ActionsResponse> => {
    const params = new URLSearchParams();
    if (options?.containerId) params.append('containerId', options.containerId);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.cursor) params.append('cursor', options.cursor);
    const queryString = params.toString();
    const url = `/actions${queryString ? `?${queryString}` : ''}`;
    const response = await api.get<ApiResponse<ActionsResponse>>(url);
    return response.data.data;
  },

  // Get action by ID
  getActionById: async (actionId: string): Promise<ActionRecord> => {
    const response = await api.get<ApiResponse<ActionRecord>>(`/actions/${actionId}`);
    return response.data.data;
  },

  // Get action stats
  getStats: async (): Promise<ActionStats> => {
    const response = await api.get<ApiResponse<ActionStats>>('/actions/stats');
    return response.data.data;
  },
};

export default api;
