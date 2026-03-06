import apiClient from './apiClient';

export interface JobDetail {
    Id: number;
    Description: string;
    JobTypeDescription: string;
    Status: string;
    StatusId: number;
    CreatedDate: string;
    Address: string;
    Latitude: number;
    Longitude: number;
    Tasks: any[];
    WebParts: any[];
    CreationForm: any;
    [key: string]: any;
}

/**
 * Get job details by ID (used by mobile)
 */
export async function getJobDetails(id: number): Promise<JobDetail> {
    const response = await apiClient.get(`/api/jobs/${id}`);
    return response.data;
}

/**
 * Create a new job (used by mobile)
 */
export async function createJob(model: any): Promise<any> {
    const response = await apiClient.post('/api/jobs', model);
    return response.data;
}

/**
 * Delete jobs (soft delete)
 */
export async function deleteJobs(model: any): Promise<any> {
    const response = await apiClient.post('/api/jobs/delete', model);
    return response.data;
}
