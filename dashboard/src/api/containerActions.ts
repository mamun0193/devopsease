import api from './index';

export interface ContainerActionResponse {
  success: boolean;
  data: {
    containerId: string;
    action: string;
    previousState: string;
    currentState: string;
  } | null;
  message: string;
}

// API wrapper response
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const containerActionsApi = {
  /**
   * Start a stopped container
   */
  start: async (containerId: string): Promise<ContainerActionResponse> => {
    const response = await api.post<ApiResponse<ContainerActionResponse['data']>>(
      `/containers/${containerId}/start`
    );
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },

  /**
   * Stop a running container (graceful shutdown with 10s timeout)
   */
  stop: async (containerId: string): Promise<ContainerActionResponse> => {
    const response = await api.post<ApiResponse<ContainerActionResponse['data']>>(
      `/containers/${containerId}/stop`
    );
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },

  /**
   * Restart a container (stop + start)
   */
  restart: async (containerId: string): Promise<ContainerActionResponse> => {
    const response = await api.post<ApiResponse<ContainerActionResponse['data']>>(
      `/containers/${containerId}/restart`
    );
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },

  /**
   * Remove a container
   * @param force - If true, force remove even if running
   */
  remove: async (containerId: string, force: boolean = false): Promise<ContainerActionResponse> => {
    const response = await api.delete<ApiResponse<ContainerActionResponse['data']>>(
      `/containers/${containerId}${force ? '?force=true' : ''}`
    );
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },
};
