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

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    const role = localStorage.getItem('devopsease_role') || 'operator';
    if (config.headers) {
      config.headers['x-user-role'] = role;
    }
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, { role });
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url}`, response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Token Expiry)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Multi-tab coordination using Web Locks API
      try {
        await navigator.locks.request('refresh_token_lock', async () => {
          // Check if another tab already refreshed the token while we were waiting for the lock
          // We can do this by attempting a lightweight call or just checking cookie existence (if accessible)
          // But since cookies are HttpOnly, we blindly attempt refresh. The backend should handle rotation gracefully.

          // However, if we just acquired the lock, we should proceed. 
          // If another tab processed it, we might want to verify if we are still unauthenticated?
          // Actually, the simplest 'multi-tab' protection for 401 is simply mostly handled by the lock preventing concurrent calls.
          // But `isRefreshing` memory flag only protects the *current* tab.
          // The Lock API ensures that across tabs, only ONE refresh request is in flight.

          try {
            await api.post('/auth/refresh');
            processQueue(null);
          } catch (refreshError) {
            processQueue(refreshError, null);
            // Verify if it's a real failure or just handled by another tab? 
            // If refresh fails, we generally redirect to login.
            if (!originalRequest.url?.endsWith('/auth/me')) {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        });

        return api(originalRequest);

      } catch (err) {
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Suppress logging for 401s as they are handled by the refresh flow
    if (error.response?.status !== 401) {
      console.error('❌ Response Error:', error.response?.data || error.message);
    }

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
  id: string; // Changed from Id
  name: string; // Changed from Names[] to name (backend sanitization)
  image: string; // Changed from Image
  state: {     // Changed from State: string
    status: string;
    running: boolean;
    [key: string]: any;
  };
  ports: any[]; // Simplified for now
  created: string; // Changed from Created: number
  // Remove other fields not returned by backend
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

export interface FailureIntelligence {
  containerId: string;
  containerName: string;
  type: 'CONFIG_ERROR' | 'RESOURCE_EXHAUSTION' | 'PORT_CONFLICT' | 'PERMISSION_ERROR' | 'CRASH_LOOP' | 'GRACEFUL_STOP' | 'HEALTHY' | 'PENDING' | 'PAUSED' | 'UNKNOWN';
  confidenceScore: number;
  summary: string;
  evidence: string[];
  restartCount: number;
  exitCode: number;
  state: string;
  stabilityInsight: string;
  analyzedAt: string;
  explanation: {
    summary: string;
    confidence: number;
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

  // Get failure intelligence analysis
  failureAnalysis: async (containerId: string): Promise<FailureIntelligence> => {
    const response = await api.get<ApiResponse<FailureIntelligence>>(`/containers/${containerId}/failure-analysis`);
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

  // Clear action history (for a specific container or all)
  clearHistory: async (containerId?: string): Promise<void> => {
    const params = containerId ? `?containerId=${containerId}` : '';
    await api.delete(`/actions${params}`);
  },
};

export default api;
