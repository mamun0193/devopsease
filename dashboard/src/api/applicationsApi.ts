import { api } from './index';

export interface Application {
    _id: string;
    name: string;
    slug: string;
    userId: string;
    projectId?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    [key: string]: any;
}

export const applicationsApi = {
    getApplications: async (params?: Record<string, any>): Promise<Application[]> => {
        const response = await api.get('/applications', { params });
        // The API might return { success: true, data: [...] } or just [...]
        return response.data?.data || response.data || [];
    },
    
    getApplication: async (id: string): Promise<Application> => {
        const response = await api.get(`/applications/${id}`);
        return response.data?.data || response.data;
    },
    
    createApplication: async (data: any): Promise<Application> => {
        const response = await api.post('/applications', data);
        return response.data?.data || response.data;
    },
    
    updateApplication: async (id: string, data: any): Promise<Application> => {
        const response = await api.put(`/applications/${id}`, data);
        return response.data?.data || response.data;
    },
    
    deleteApplication: async (id: string): Promise<void> => {
        await api.delete(`/applications/${id}`);
    }
};
