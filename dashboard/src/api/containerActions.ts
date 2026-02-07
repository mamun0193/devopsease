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

  
  pause: async (containerId: string): Promise<ContainerActionResponse> => {
    const response = await api.post<ApiResponse<ContainerActionResponse['data']>>(
      `/containers/${containerId}/pause`
    );
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },

  
  unpause: async (containerId: string): Promise<ContainerActionResponse> => {
    const response = await api.post<ApiResponse<ContainerActionResponse['data']>>(
      `/containers/${containerId}/unpause`
    );
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },

  
  create: async (params: {
    image: string;
    name?: string;
    ports?: Record<string, number>;
    env?: Record<string, string>;
    autoStart?: boolean;
  }): Promise<{
    success: boolean;
    data: { id: string; name: string; status: string } | null;
    message: string;
  }> => {
    const response = await api.post<ApiResponse<{ id: string; name: string; status: string }>>(
      '/containers',
      params
    );
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
    };
  },
};
