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
    const requestUrl = String(originalRequest?.url || '');
    const isDockerHubAuth = requestUrl.includes('/dockerhub/');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');
    const isNonRefreshableAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/logout') ||
      isRefreshRequest;

    // Handle 401 Unauthorized (Token Expiry)
    // Skip refresh for /dockerhub/ endpoints — those 401s are application-level auth failures, not session expiry
    if (error.response?.status === 401 && !originalRequest._retry && !isDockerHubAuth && !isNonRefreshableAuthRequest) {
      if (isRefreshing) {
        if (isRefreshRequest) {
          return Promise.reject(error);
        }
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
            if (!requestUrl.endsWith('/auth/me')) {
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
  resourceLimits?: {
    memoryMB: number | null;
    cpuCores: number | null;
  };
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
  instabilityScore: number;
  isUnstable: boolean;
  mtbfSeconds: number | null;
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

// Build API
export interface BuildFailureAnalysis {
  type: string;
  confidence: number;
  explanation: string;
  evidence: string[];
  failingStage: string | null;
}

export interface Build {
  _id: string;
  userId: string;
  tag: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  dockerfileContent?: string;
  logSummary?: string;
  dockerImageId?: string;
  imageSizeBytes?: number;
  layerCount?: number;
  error?: string;
  failureAnalysis?: BuildFailureAnalysis;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerBuildResponse {
  message: string;
  buildId: string;
  tag: string;
  status: string;
  wsUrl: string;
}

export interface BuiltImage {
  _id: string;
  tag: string;
  sizeMB: number;
  layerCount: number;
  createdAt: string;
}

export const buildApi = {
  triggerBuild: async (tag: string, dockerfile: string): Promise<TriggerBuildResponse> => {
    const response = await api.post<TriggerBuildResponse>('/builds', { tag, dockerfile });
    return response.data;
  },

  listBuilds: async (): Promise<Build[]> => {
    const response = await api.get<{ builds: Build[] }>('/builds');
    return response.data.builds;
  },

  getBuild: async (buildId: string): Promise<Build> => {
    const response = await api.get<{ build: Build }>(`/builds/${buildId}`);
    return response.data.build;
  },

  listImages: async (): Promise<BuiltImage[]> => {
    const response = await api.get<{ images: BuiltImage[] }>('/builds/images');
    return response.data.images;
  },
};

// Image Observability API
export interface ImageRecord {
  _id: string;
  tag: string;
  sizeMB: number;
  layerCount: number;
  imageUsageStatus: 'ACTIVE' | 'UNUSED' | 'DANGLING';
  attachedContainerIds: string[];
  lastUsedAt: string | null;
  pullCount: number;
  pulledFrom: 'DOCKERFILE' | 'REGISTRY';
  dockerImageId: string;
  createdAt: string;
}

export interface ImageUsageSummary {
  totalImageStorageMB: number;
  activeImages: number;
  unusedImages: number;
  danglingImages: number;
  buildCacheMB: number;
}

export const imageApi = {
  listImages: async (): Promise<ImageRecord[]> => {
    const response = await api.get<{ images: ImageRecord[] }>('/images');
    return response.data.images;
  },

  getUsageSummary: async (): Promise<ImageUsageSummary> => {
    const response = await api.get<{ summary: ImageUsageSummary }>('/images/usage-summary');
    return response.data.summary;
  },

  getImage: async (imageId: string): Promise<ImageRecord> => {
    const response = await api.get<{ image: ImageRecord }>(`/images/${imageId}`);
    return response.data.image;
  },

  prunePreview: async (): Promise<{ candidates: Array<{ id: string; tag: string; sizeMB: number }>; totalReclaimableMB: number }> => {
    const response = await api.get('/images/prune-preview');
    return response.data;
  },

  pruneUnused: async (): Promise<{ reclaimedMB: number; deletedCount: number; errors: Array<{ imageId: string; tag: string; error: string }> }> => {
    const response = await api.post('/images/prune-unused');
    return response.data;
  },

  pruneBuildCache: async (): Promise<{ reclaimedMB: number }> => {
    const response = await api.post('/images/prune-build-cache');
    return response.data;
  },
};

// Project API
export interface ProjectService {
  name: string;
  containerId: string;
  image: string;
}

export interface Project {
  _id: string;
  userId: string;
  name: string;
  namespace: string;
  composeYaml?: string;
  status: 'CREATED' | 'RUNNING' | 'STOPPED' | 'FAILED';
  services: ProjectService[];
  networks: string[];
  volumes: string[];
  createdAt: string;
  updatedAt: string;
}

export const projectApi = {
  create: async (name: string, composeYaml: string): Promise<Project> => {
    const response = await api.post<{ project: Project }>('/projects', { name, composeYaml });
    return response.data.project;
  },

  list: async (): Promise<Project[]> => {
    const response = await api.get<{ projects: Project[] }>('/projects');
    return response.data.projects;
  },

  getById: async (projectId: string): Promise<Project> => {
    const response = await api.get<{ project: Project }>(`/projects/${projectId}`);
    return response.data.project;
  },

  start: async (projectId: string): Promise<Project> => {
    const response = await api.post<{ project: Project }>(`/projects/${projectId}/start`);
    return response.data.project;
  },

  stop: async (projectId: string): Promise<Project> => {
    const response = await api.post<{ project: Project }>(`/projects/${projectId}/stop`);
    return response.data.project;
  },

  delete: async (projectId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}`);
  },
};

// Networks API 

export interface Network {
  id: string;
  name: string;
  projectId?: string;
  projectName?: string | null;
  status: 'ACTIVE' | 'UNUSED';
  createdAt: string;
}

export const networkApi = {
  list: async (): Promise<Network[]> => {
    const response = await api.get<{ networks: Network[] }>('/networks');
    return response.data.networks;
  },

  remove: async (networkId: string): Promise<void> => {
    await api.delete(`/networks/${networkId}`);
  },

  reconcile: async (): Promise<void> => {
    await api.post('/networks/reconcile');
  },
};

// Volumes API 

export interface Volume {
  id: string;
  name: string;
  sizeMB: number;
  attachedContainerIds: string[];
  status: 'ACTIVE' | 'UNUSED' | 'PENDING_DELETE';
  projectId?: string;
}

export interface VolumePruneCandidate {
  id: string;
  name: string;
  sizeMB: number;
}

export interface VolumePrunePreview {
  candidates: VolumePruneCandidate[];
  totalReclaimableMB: number;
}

export interface VolumePruneResult {
  reclaimedMB: number;
  prunedCount: number;
  errors: Array<{ volumeId: string; name: string; error: string }>;
}

export const volumeApi = {
  list: async (): Promise<Volume[]> => {
    const response = await api.get<{ volumes: Volume[] }>('/volumes');
    return response.data.volumes;
  },

  prunePreview: async (): Promise<VolumePrunePreview> => {
    const response = await api.get<VolumePrunePreview>('/volumes/prune-preview');
    return response.data;
  },

  pruneUnused: async (): Promise<VolumePruneResult> => {
    const response = await api.post<VolumePruneResult>('/volumes/prune-unused');
    return response.data;
  },
};

// Docker Hub API

export interface DockerHubStatus {
  connected: boolean;
  username: string | null;
}

export interface PullImageRequest {
  imageName: string;
}

export interface PullImageResponse {
  imageId: string;
  tag: string;
  sizeMB: number;
  layerCount: number;
  dockerImageId: string;
  pulledFrom: string;
  pullCount: number;
}

export interface PushImageRequest {
  imageId: string;
  repositoryTag: string;
}

export interface PushImageResponse {
  success: boolean;
  pushedAs: string;
  imageId: string;
}

export interface DockerHubSearchResult {
  name: string;
  description: string;
  starCount: number;
  isOfficial: boolean;
  pullCount: number;
}

export interface DockerHubSearchResponse {
  results: DockerHubSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const dockerHubApi = {
  connect: async (username: string, password: string): Promise<DockerHubStatus> => {
    const response = await api.post<DockerHubStatus>('/dockerhub/connect', { username, password });
    return response.data;
  },

  disconnect: async (): Promise<{ disconnected: boolean }> => {
    const response = await api.delete<{ disconnected: boolean }>('/dockerhub/disconnect');
    return response.data;
  },

  status: async (): Promise<DockerHubStatus> => {
    const response = await api.get<DockerHubStatus>('/dockerhub/status');
    return response.data;
  },

  pull: async (imageName: string): Promise<PullImageResponse> => {
    const response = await api.post<PullImageResponse>('/dockerhub/pull', { imageName });
    return response.data;
  },

  push: async (imageId: string, repositoryTag: string): Promise<PushImageResponse> => {
    const response = await api.post<PushImageResponse>('/dockerhub/push', { imageId, repositoryTag });
    return response.data;
  },

  search: async (query: string, page = 1, pageSize = 25): Promise<DockerHubSearchResponse> => {
    const response = await api.get<DockerHubSearchResponse>('/dockerhub/search', {
      params: { q: query, page, pageSize }
    });
    return response.data;
  },
};

// ── Container Health ──────────────────────────────────────────────────────────

export interface HealthHistoryEntry {
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  failureType: string | null;
  instabilityScore: number;
  changedAt: string;
}

export interface ContainerHealthState {
  containerId: string;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastFailureType: string | null;
  restartCount: number;
  lastExitCode: number | null;
  lastDockerHealthStatus: string | null;
  instabilityScore: number;
  history: HealthHistoryEntry[];
  lastUpdatedAt: string | null;
}

export const containerHealthApi = {
  getHealth: async (containerId: string): Promise<ContainerHealthState> => {
    const response = await api.get<ApiResponse<ContainerHealthState>>(`/containers/${containerId}/health`);
    return response.data.data;
  },

  getHealthBatch: async (ids: string[]): Promise<Record<string, Omit<ContainerHealthState, 'history' | 'containerId'>>> => {
    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids[]', id));
    const response = await api.get<ApiResponse<Record<string, Omit<ContainerHealthState, 'history' | 'containerId'>>>>(`/containers/health/batch?${params.toString()}`);
    return response.data.data;
  },
};

// ── Quota ─────────────────────────────────────────────────────────────────────


export interface QuotaData {
  maxContainers: number;
  maxCPU: number;
  maxMemoryMB: number;
  usedContainers: number;
  usedCPU: number;
  usedMemoryMB: number;
  remainingContainers: number;
  remainingCPU: number;
  remainingMemoryMB: number;
}

export const quotaApi = {
  get: async (): Promise<QuotaData> => {
    const response = await api.get<{ success: boolean; data: QuotaData; message: string }>('/quota');
    return response.data.data;
  },
};

export default api;
