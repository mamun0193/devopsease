import axios from 'axios';
import { API_BASE_URL } from '../config';

export const api = axios.create({
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
  restartPolicy?: {
    name: string;
    maximumRetryCount: number;
    restartLimit: number;
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
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'timeout';
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

export interface BuildManifest {
  _id: string;
  repoId: string;
  branch: string;
  commitSha: string;
  contextHash: string;
  dependencyFingerprint: string;
  dockerfileFingerprint: string;
  buildFingerprint: string;
  strategy: 'FULL_REUSE' | 'PARTIAL_REUSE' | 'FULL_REBUILD' | 'UNKNOWN';
  invalidationReason: string | null;
  estimatedSavedTimeMs: number;
  layers: {
    layerId: string;
    instructionHash: string;
    instruction: string;
    layerType: 'DEPENDENCY' | 'SOURCE' | 'SYSTEM' | 'RUNTIME' | 'UNKNOWN';
    cacheStatus: 'HIT' | 'MISS' | 'UNKNOWN';
    cacheKey: string | null;
    cacheability: 'CACHEABLE' | 'UNCACHEABLE' | 'VOLATILE' | 'UNKNOWN';
    reason: string | null;
  }[];
  comparison: {
    previousBuildId: string | null;
    dependencyChanges: boolean;
    dockerfileChanges: boolean;
    contextChanged: boolean;
  };
  createdAt: string;
}

export interface CacheAnalytics {
  totalBuilds: number;
  cacheHits: number;
  partialHits: number;
  hitRatePercentage: number;
  totalSavedTimeMs: number;
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

  getBuildManifest: async (buildId: string): Promise<BuildManifest> => {
    const response = await api.get<{ manifest: BuildManifest }>(`/builds/${buildId}/manifest`);
    return response.data.manifest;
  },

  getCacheAnalytics: async (): Promise<CacheAnalytics> => {
    const response = await api.get<{ analytics: CacheAnalytics }>('/builds/cache/analytics');
    return response.data.analytics;
  },
  deleteBuild: async (id: string): Promise<void> => {
    const res = await api.delete(`/builds/${id}`);
    return res.data;
  },
  deleteAllBuilds: async (): Promise<void> => {
    const res = await api.delete('/builds');
    return res.data;
  }
};

// Image Observability API
export interface ImageRecord {
  _id: string;
  tag: string;
  sizeMB: number;
  layerCount: number;
  imageUsageStatus: 'ACTIVE' | 'UNUSED' | 'DANGLING';
  lifecycleStatus?: 'BUILDING' | 'READY' | 'DEPLOYED' | 'PUSHED' | 'ARCHIVED' | 'DELETED';
  attachedContainerIds: string[];
  lastUsedAt: string | null;
  pullCount: number;
  pulledFrom: 'DOCKERFILE' | 'REGISTRY';
  dockerImageId: string;
  createdAt: string;
  
  // Intelligence Metadata
  runtime?: string;
  os?: string;
  language?: string;
  framework?: string;

  // Relationships
  buildId?: string;
  repoId?: string;
  
  // Registry
  registry?: {
      provider: string;
      repository: string;
      pushedTag: string;
      pushedDigest: string | null;
      pushTimestamp: string | null;
  };
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

  deleteImage: async (imageId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/images/${imageId}`);
    return response.data;
  }
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

export interface SystemPipelineMetrics {
  containersTracked: number;
  metricsCacheSize: number;
  collectorCycleMs: number;
  lastCycleTimestamp: number;
  isLeader: boolean;
  wsSubscribers: number;
  redisConnected: boolean;
  watchdogRestarts: number;
  aggregationRunning: boolean;
}

export const systemApi = {
  getMetrics: async (): Promise<SystemPipelineMetrics> => {
    const response = await api.get<ApiResponse<SystemPipelineMetrics>>('/system/metrics');
    return response.data.data;
  },
  getBlueprint: async (repoId: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/system/blueprint/${repoId}`);
    return response.data.data;
  },
  getArtifacts: async (repoId: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/system/artifacts/${repoId}`);
    return response.data.data;
  },
};

// CI/CD Pipelines 

export interface PipelineStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  exitCode?: number | null;
}

export interface PipelineRepo {
  _id: string;
  repoName: string;
  owner: string;
  provider: string;
}

export interface Pipeline {
  id: string;
  name: string;
  steps: string[];
  config?: { steps: string[];[key: string]: any };
  rawYaml?: string;
  version: number;
  status: 'active' | 'inactive' | 'error';
  repo: PipelineRepo | string | null;
  createdAt: string;
  updatedAt: string;
  lastRun?: {
    id: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    startedAt: string | null;
    completedAt: string | null;
  } | null;
}

export interface PipelineRun {
  _id: string;
  pipelineId: string;
  repositoryId: string;
  userId: string;
  commitHash: string | null;
  branch: string | null;
  commitMessage: string | null;
  author: string | null;
  status: 'pending' | 'running' | 'success' | 'failed';
  triggerSource: 'webhook' | 'manual';
  buildId: string | null;
  deploymentId: string | null;
  steps: PipelineStep[];
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  logPath: string | null;
  logSize: number;
  logSummary: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CIPipelineMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgDurationMs: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export interface RunPipelineResponse {
  id: string;
  runId: string;
  name: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreatePipelinePayload {
  repoId: string;
  yaml: string;
  name?: string;
}

export const pipelineApi = {
  list: async (): Promise<Pipeline[]> => {
    const response = await api.get<{ pipelines: Pipeline[] }>('/api/pipelines');
    return response.data.pipelines;
  },

  get: async (id: string): Promise<Pipeline> => {
    const response = await api.get<Pipeline>(`/api/pipelines/${id}`);
    return response.data;
  },

  create: async (payload: CreatePipelinePayload): Promise<Pipeline> => {
    const response = await api.post<Pipeline>('/api/pipelines', payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/pipelines/${id}`);
  },

  toggle: async (id: string, status: 'active' | 'inactive'): Promise<void> => {
    await api.patch(`/api/pipelines/${id}/status`, { status });
  },

  run: async (id: string, body?: { triggerSource?: string; commitHash?: string; branch?: string }): Promise<RunPipelineResponse> => {
    const response = await api.post<RunPipelineResponse>(`/api/pipelines/${id}/run`, body || {});
    return response.data;
  },

  getStatus: async (id: string): Promise<any> => {
    const response = await api.get(`/api/pipelines/${id}/status`);
    return response.data;
  },

  getRuns: async (id: string, opts?: { limit?: number; skip?: number }): Promise<PipelineRun[]> => {
    const params = new URLSearchParams();
    if (opts?.limit) params.append('limit', String(opts.limit));
    if (opts?.skip) params.append('skip', String(opts.skip));
    const qs = params.toString();
    const response = await api.get<{ runs: PipelineRun[] }>(`/api/pipelines/${id}/runs${qs ? `?${qs}` : ''}`);
    return response.data.runs;
  },

  getMetrics: async (id: string): Promise<CIPipelineMetrics> => {
    const response = await api.get<{ metrics: CIPipelineMetrics }>(`/api/pipelines/${id}/metrics`);
    return response.data.metrics;
  },

  getRun: async (runId: string): Promise<PipelineRun> => {
    const response = await api.get<{ run: PipelineRun }>(`/api/pipeline-runs/${runId}`);
    return response.data.run;
  },

  getRunLogsUrl: (runId: string): string => {
    return `${API_BASE_URL}/api/pipeline-runs/${runId}/logs`;
  },
};

// ── Deployments ───────────────────────────────────────────────────────────────

export interface Deployment {
  _id: string;
  status: 'running' | 'deploying' | 'failed' | 'stopped';
  environment: 'development' | 'staging' | 'production';
  imageTag: string | null;
  port?: number | null;
  containerId?: string | null;
  containerName?: string | null;
  repositoryName?: string;
  applicationId?: string | null;
  applicationSlug?: string | null;
  createdAt: string;
  build: {
    commitHash: string;
    branch: string;
  };
}

export const deploymentApi = {
  list: async (): Promise<Deployment[]> => {
    const response = await api.get<Deployment[] | { deployments: Deployment[] }>('/api/deployments');
    return Array.isArray(response.data)
      ? response.data
      : (response.data as any).deployments ?? [];
  },

  start: async (id: string): Promise<Deployment> => {
    const response = await api.post<{ deployment: Deployment }>(`/api/deployments/${id}/start`);
    return response.data.deployment;
  },

  stop: async (id: string): Promise<Deployment> => {
    const response = await api.post<{ deployment: Deployment }>(`/api/deployments/${id}/stop`);
    return response.data.deployment;
  },

  remove: async (id: string): Promise<Deployment> => {
    const response = await api.post<{ deployment: Deployment }>(`/api/deployments/${id}/remove`);
    return response.data.deployment;
  },

  rollback: async (id: string, reason?: string): Promise<Deployment> => {
    const payload = reason ? { reason } : undefined;
    const response = await api.post<{ deployment: Deployment }>(`/api/deployments/${id}/rollback`, payload);
    return response.data.deployment;
  },

  getById: async (id: string): Promise<Deployment> => {
    const response = await api.get<{ deployment: Deployment }>(`/api/deployments/${id}`);
    return response.data.deployment;
  },

  getLogs: async (id: string): Promise<string[]> => {
    const response = await api.get<{ logs: string[] }>(`/api/deployments/${id}/logs`);
    return response.data.logs ?? [];
  },
};

//  Kubernetes Clusters 

export interface K8sCluster {
  _id: string;
  userId: string;
  name: string;
  status: 'connected' | 'failed';
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface K8sPodContainer {
  name: string;
  ready: boolean;
  restarts: number;
  image: string;
}

export interface K8sPod {
  name: string;
  namespace: string;
  status: string;
  ready: boolean;
  restarts: number;
  age: string | null;
  nodeName: string | null;
  containers: K8sPodContainer[];
}

export interface K8sNamespace {
  name: string;
  status: string;
  age: string | null;
  labels: Record<string, string>;
}

//  K8s Dashboard Overview 

export interface K8sDashboardPod {
  name: string;
  status: string;
  restarts: number;
  age: string | null;
}

export interface K8sDashboardService {
  name: string;
  type: string;
  clusterIP: string;
  ports: Array<{
    port: number;
    targetPort: number | string;
    protocol: string;
    nodePort?: number;
  }>;
}

export interface K8sDashboardDeployment {
  name: string;
  replicas: number;
  availableReplicas: number;
  age: string | null;
}

export interface K8sClusterOverview {
  pods: K8sDashboardPod[];
  services: K8sDashboardService[];
  deployments: K8sDashboardDeployment[];
}

export const clusterApi = {
  connect: async (name: string, kubeconfig: string): Promise<K8sCluster> => {
    const response = await api.post<{ cluster: K8sCluster }>('/api/clusters/connect', { name, kubeconfig });
    return response.data.cluster;
  },

  list: async (): Promise<K8sCluster[]> => {
    const response = await api.get<{ clusters: K8sCluster[] }>('/api/clusters');
    return response.data.clusters;
  },

  getPods: async (clusterId: string, namespace = 'default'): Promise<K8sPod[]> => {
    const response = await api.get<{ pods: K8sPod[] }>(`/api/clusters/${clusterId}/pods`, {
      params: { namespace },
    });
    return response.data.pods;
  },

  getPodLogs: async (
    clusterId: string,
    podName: string,
    options: { namespace?: string; tailLines?: number; container?: string } = {},
  ): Promise<string> => {
    const response = await api.get<{ logs: string }>(
      `/api/clusters/${clusterId}/pods/${encodeURIComponent(podName)}/logs`,
      {
        params: {
          namespace: options.namespace || 'default',
          tailLines: options.tailLines || 100,
          ...(options.container ? { container: options.container } : {}),
        },
      },
    );
    return response.data.logs;
  },

  getNamespaces: async (clusterId: string): Promise<K8sNamespace[]> => {
    const response = await api.get<{ namespaces: K8sNamespace[] }>(`/api/clusters/${clusterId}/namespaces`);
    return response.data.namespaces;
  },

  getOverview: async (clusterId: string, namespace = 'default'): Promise<K8sClusterOverview> => {
    const response = await api.get<K8sClusterOverview>(`/api/clusters/${clusterId}/overview`, {
      params: { namespace },
    });
    return response.data;
  },
};

export default api;

// Re-export alerts API
export { alertsApi } from './alerts';
export type { Alert, AlertsResponse } from './alerts';

// Application Gateway 

export interface Application {
  _id: string;
  userId: string;
  repositoryId: string;
  name: string;
  slug: string;
  description: string;
  status: 'running' | 'starting' | 'stopping' | 'unhealthy' | 'stopped';
  provider: 'docker' | 'kubernetes' | 'ecs' | 'ssh';
  currentDeploymentId: string | null;
  defaultDomain: string;
  customDomains: string[];
  visibility: 'public' | 'private';
  health: 'running' | 'starting' | 'stopping' | 'unhealthy' | 'stopped';
  createdAt: string;
  updatedAt: string;
  // Populated fields
  gatewayUrl?: string;
  currentDeployment?: Deployment | null;
  repository?: { repoName: string; owner: string; provider: string } | null;
  runtime?: {
    endpoint: string | null;
    provider: string;
    protocol: string;
    healthy: boolean;
    version: string | null;
    capabilities: string[];
    metadata: {
      containerId?: string;
      containerName?: string;
      containerIds?: string[];
      port?: number;
      replicaCount?: number;
      [key: string]: unknown;
    };
    deploymentId?: string;
    applicationId?: string;
  } | null;
}

export interface ApplicationGatewayMetrics {
  requests: number;
  errors: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  activeConnections: number;
  bytesTransferred: number;
  statusCodes: Record<number, number>;
}

export interface GatewayDashboardMetrics {
  totalRequests: number;
  totalErrors: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  requestsPerSecond: number;
  activeConnections: number;
  connectedApps: number;
  healthyApps: number;
  bytesTransferred: number;
  gatewayUptime: number;
  recentRequests: Array<{ slug: string; status: number; latencyMs: number; timestamp: string }>;
  topResponseCodes: Array<{ code: number; count: number }>;
  topRequestedUrls: Array<{ url: string; count: number }>;
  topErrors: Array<{ error: string; count: number }>;
}

export interface CreateApplicationPayload {
  repositoryId: string;
  name: string;
  slug?: string;
  description?: string;
}

export const applicationApi = {
  list: async (): Promise<Application[]> => {
    const response = await api.get<{ applications: Application[] }>('/api/applications');
    return response.data.applications;
  },

  getById: async (id: string): Promise<Application> => {
    const response = await api.get<{ application: Application }>(`/api/applications/${id}`);
    return response.data.application;
  },

  create: async (payload: CreateApplicationPayload): Promise<Application> => {
    const response = await api.post<{ application: Application }>('/api/applications', payload);
    return response.data.application;
  },

  update: async (id: string, data: Partial<Pick<Application, 'name' | 'description' | 'visibility'>>): Promise<Application> => {
    const response = await api.patch<{ application: Application }>(`/api/applications/${id}`, data);
    return response.data.application;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/applications/${id}`);
  },

  getDeployments: async (id: string): Promise<Deployment[]> => {
    const response = await api.get<{ deployments: Deployment[] }>(`/api/applications/${id}/deployments`);
    return response.data.deployments;
  },

  getDomains: async (id: string): Promise<{ default: string; custom: string[] }> => {
    const response = await api.get<{ domains: { default: string; custom: string[] } }>(`/api/applications/${id}/domains`);
    return response.data.domains;
  },

  getMetrics: async (id: string): Promise<ApplicationGatewayMetrics> => {
    const response = await api.get<{ metrics: ApplicationGatewayMetrics }>(`/api/applications/${id}/metrics`);
    return response.data.metrics;
  },

  getGatewayMetrics: async (): Promise<GatewayDashboardMetrics> => {
    const response = await api.get<{ metrics: GatewayDashboardMetrics }>('/api/applications/gateway-metrics');
    return response.data.metrics;
  },
};

// ── Environment & Secrets Management ──────────────────────────────────────────

export interface ConfigEntry {
  id: string;
  repositoryId: string;
  environmentId: string;
  name: string;
  type: 'variable' | 'secret';
  encrypted: boolean;
  description: string;
  source: 'manual' | 'detected' | 'imported' | 'scanner';
  version: number;
  value: string;
  lastRotatedAt: string | null;
  lastRotatedBy: string | null;
  detection: {
    sourceFile: string | null;
    lineNumber: number | null;
    language: string | null;
    framework: string | null;
    confidence: number | null;
    heuristic: string | null;
    defaultValue: string | null;
    requiredBy: string[];
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigVersion {
  id: string;
  configEntryId: string;
  version: number;
  changedBy: string;
  changeType: 'created' | 'updated' | 'rotated' | 'rolled_back' | 'imported';
  reason: string | null;
  deploymentId: string | null;
  rollbackFromVersion: number | null;
  createdAt: string;
}

export interface DetectedVariable {
  name: string;
  confidence: number;
  isSecret: boolean;
  source: string;
  requiredBy: string[];
  defaultValue: string | null;
  heuristic: string;
  sourceFile: string;
  lineNumber: number;
}

export interface ReadinessScores {
  security: number;
  configuration: number;
  deployment: number;
  environment: number;
  overall: number;
}

export interface ReadinessSuggestion {
  type: string;
  severity: 'error' | 'warning' | 'info';
  key: string;
  message: string;
  action: string;
  confidence?: number;
  requiredBy?: string[];
  defaultValue?: string | null;
  currentType?: string;
  suggestedType?: string;
}

export interface ReadinessReport {
  detected: DetectedVariable[];
  configured: { name: string; type: string; version: number; source: string; lastUpdated: string }[];
  missing: { name: string; isSecret: boolean; requiredBy: string[]; confidence: number; defaultValue: string | null }[];
  unused: { name: string; type: string; source: string }[];
  misclassified: { name: string; currentType: string; suggestedType: string; reason: string }[];
  scores: ReadinessScores;
  deploymentReady: boolean;
  warnings: string[];
  errors: string[];
  suggestions: ReadinessSuggestion[];
  scanMetadata: { scannedAt: string | null; durationMs?: number; filesScanned?: number; servicesDetected?: string[] };
}

export interface ScanResult {
  variables: DetectedVariable[];
  metadata: { scannedAt: string; durationMs: number; filesScanned: number; servicesDetected: string[] };
}

export interface ConfigSnapshotEntry {
  name: string;
  type: string;
  version: number;
  valueHash: string;
  encrypted: boolean;
}

export interface ConfigSnapshot {
  _id: string;
  deploymentId: string;
  repositoryId: string;
  environmentId: string;
  entries: ConfigSnapshotEntry[];
  generatedAt: string;
  generatedBy: string;
}

export interface SnapshotDiff {
  from: { deploymentId: string; generatedAt: string };
  to: { deploymentId: string; generatedAt: string };
  added: { name: string; type: string; version: number }[];
  removed: { name: string; type: string; version: number }[];
  changed: { name: string; type: string; fromVersion: number; toVersion: number; valueChanged: boolean }[];
  unchanged: { name: string; type: string; version: number }[];
  summary: { totalFrom: number; totalTo: number; addedCount: number; removedCount: number; changedCount: number; unchangedCount: number };
}

export interface BulkUpsertResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: { name: string; error: string }[];
}

export const configApi = {
  // CRUD
  getEntries: async (repositoryId: string, environmentId?: string, type?: string): Promise<ConfigEntry[]> => {
    const params = new URLSearchParams({ repositoryId });
    if (environmentId) params.append('environmentId', environmentId);
    if (type) params.append('type', type);
    const response = await api.get<{ entries: ConfigEntry[] }>(`/api/config/entries?${params}`);
    return response.data.entries;
  },

  createEntry: async (payload: {
    repositoryId: string; name: string; value: string; type: string; environmentId: string; description?: string;
  }): Promise<ConfigEntry> => {
    const response = await api.post<{ entry: ConfigEntry }>('/api/config/entries', payload);
    return response.data.entry;
  },

  updateEntry: async (entryId: string, payload: { value?: string; description?: string; reason?: string }): Promise<ConfigEntry> => {
    const response = await api.put<{ entry: ConfigEntry }>(`/api/config/entries/${entryId}`, payload);
    return response.data.entry;
  },

  deleteEntry: async (entryId: string): Promise<void> => {
    await api.delete(`/api/config/entries/${entryId}`);
  },

  // Versioning
  getVersions: async (entryId: string): Promise<ConfigVersion[]> => {
    const response = await api.get<{ versions: ConfigVersion[] }>(`/api/config/entries/${entryId}/versions`);
    return response.data.versions;
  },

  rollbackEntry: async (entryId: string, payload: { targetVersion: number; reason?: string }): Promise<ConfigEntry> => {
    const response = await api.post<{ entry: ConfigEntry }>(`/api/config/entries/${entryId}/rollback`, payload);
    return response.data.entry;
  },

  // Bulk
  bulkUpsert: async (repositoryId: string, environmentId: string, entries: { name: string; value: string; type: string }[]): Promise<BulkUpsertResult> => {
    const response = await api.post<{ result: BulkUpsertResult }>('/api/config/entries/bulk', { repositoryId, environmentId, entries });
    return response.data.result;
  },

  // Import / Export
  importConfig: async (repositoryId: string, environmentId: string, content: string, format?: string): Promise<BulkUpsertResult> => {
    const response = await api.post<{ result: BulkUpsertResult }>('/api/config/import', { repositoryId, environmentId, content, format });
    return response.data.result;
  },

  exportConfig: async (repositoryId: string, environmentId: string, format: string): Promise<string> => {
    const params = new URLSearchParams({ repositoryId, environmentId });
    const response = await api.get(`/api/config/export/${format}?${params}`, { responseType: 'text' });
    return response.data as string;
  },

  // Scanner
  scanRepository: async (repositoryId: string): Promise<ScanResult> => {
    const response = await api.post<{ scan: ScanResult }>(`/api/config/scan/${repositoryId}`);
    return response.data.scan;
  },

  getScanResults: async (repositoryId: string): Promise<ScanResult> => {
    const response = await api.get<{ scan: ScanResult }>(`/api/config/scan/${repositoryId}`);
    return response.data.scan;
  },

  // Readiness
  getReadiness: async (repositoryId: string, environmentId: string): Promise<ReadinessReport> => {
    const response = await api.get<{ report: ReadinessReport }>(`/api/config/readiness/${repositoryId}/${environmentId}`);
    return response.data.report;
  },

  // Snapshots
  getSnapshot: async (deploymentId: string): Promise<ConfigSnapshot> => {
    const response = await api.get<{ snapshot: ConfigSnapshot }>(`/api/config/snapshots/${deploymentId}`);
    return response.data.snapshot;
  },

  compareSnapshots: async (fromDeploymentId: string, toDeploymentId: string): Promise<SnapshotDiff> => {
    const params = new URLSearchParams({ from: fromDeploymentId, to: toDeploymentId });
    const response = await api.get<{ diff: SnapshotDiff }>(`/api/config/snapshots/compare?${params}`);
    return response.data.diff;
  },
};
