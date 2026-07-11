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
        const response = await api.get('/api/applications', { params });
        const data = response.data?.data || response.data;
        return data.applications || [];
    },
    
    getApplication: async (id: string): Promise<Application> => {
        const response = await api.get(`/api/applications/${id}`);
        const data = response.data?.data || response.data;
        return data.application || data;
    },
    
    createApplication: async (payload: any): Promise<Application> => {
        const response = await api.post('/api/applications', payload);
        const data = response.data?.data || response.data;
        return data.application || data;
    },
    
    updateApplication: async (id: string, payload: any): Promise<Application> => {
        const response = await api.put(`/api/applications/${id}`, payload);
        const data = response.data?.data || response.data;
        return data.application || data;
    },
    
    deleteApplication: async (id: string): Promise<void> => {
        await api.delete(`/api/applications/${id}`);
    }
};
