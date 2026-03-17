import apiClient from './apiClient';

const JOB_DETAIL_CACHE_TTL_MS = 10 * 60 * 1000;

type JobDetailCacheEntry = {
    data: JobDetail;
    timestamp: number;
};

const jobDetailCache = new Map<number, JobDetailCacheEntry>();
const jobDetailInFlight = new Map<number, Promise<JobDetail>>();

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
    const cached = jobDetailCache.get(id);
    if (cached && Date.now() - cached.timestamp < JOB_DETAIL_CACHE_TTL_MS) {
        return cached.data;
    }

    const existingRequest = jobDetailInFlight.get(id);
    if (existingRequest) {
        return existingRequest;
    }

    const request = apiClient.get(`/api/job/${id}`)
        .then((response) => {
            jobDetailCache.set(id, {
                data: response.data,
                timestamp: Date.now(),
            });
            return response.data;
        })
        .finally(() => {
            jobDetailInFlight.delete(id);
        });

    jobDetailInFlight.set(id, request);
    return request;
}

/**
 * Create a new job (used by mobile)
 */
export async function createJob(model: any): Promise<any> {
    const response = await apiClient.post('/api/job', model);
    return response.data;
}

/**
 * Delete jobs (soft delete)
 */
export async function deleteJobs(model: any): Promise<any> {
    const response = await apiClient.post('/api/job/delete', model);
    return response.data;
}
