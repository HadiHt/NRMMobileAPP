import apiClient from './apiClient';

/**
 * Task detail model
 */
export interface TaskDetail {
    Id: number;
    JobId: number;
    Job: any;
    TaskType: any;
    Status: any;
    WebParts: any[];
    CreationForm: any;
    FormVariant: any;
    Transitions: any[];
    Actions: any[];
    ScheduledStartDate: string;
    ScheduledEndDate: string;
    ActualStartDate: string | null;
    ActualEndDate: string | null;
    Address: string;
    Latitude: number;
    Longitude: number;
    Notes: string;
    [key: string]: any;
}

/**
 * Response from GET /api/tasklist
 * Tasks is an array of dictionary objects with dynamic fields
 */
export interface TaskListResponse {
    Tasks: TaskListItem[];
}

/**
 * Each task is a dictionary with dynamic keys matching the configured TaskListInfo fields.
 * Common fields based on the web UI:
 */
export interface TaskListItem {
    [key: string]: any;
    jobId?: number;
    taskName?: string;
    jobTypeName?: string;
    assignees?: string;
    areaName?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    currentState?: string;
    projectId?: string;
    address?: string;
}

/**
 * Get task list for current user
 * GET /api/tasklist
 */
export async function getTaskList(): Promise<TaskListItem[]> {
    console.log('=== FETCHING TASK LIST ===');
    try {
        const response = await apiClient.get<any>('/api/tasklist');
        console.log('=== API RESPONSE KEYS ===', Object.keys(response.data || {}));

        // Handle different possible response formats
        const tasks = response.data?.Tasks || response.data?.tasks || (Array.isArray(response.data) ? response.data : []);
        console.log('=== GOT TASK LIST ===', tasks.length, 'tasks');

        if (tasks.length > 0) {
            console.log('=== FIRST TASK PREVIEW ===', JSON.stringify(tasks[0]).substring(0, 500));
        }

        return tasks;
    } catch (err: any) {
        console.log('=== TASK LIST FAILED ===', err.response?.status, JSON.stringify(err.response?.data || {}).substring(0, 500) || err.message);
        throw err;
    }
}

/**
 * Get filtered task list
 * POST /api/tasklist/filtered
 */
export async function getFilteredTaskList(filters: any, page = 1, size = 50): Promise<TaskListItem[]> {
    const response = await apiClient.post<TaskListResponse>('/api/tasklist/filtered', filters, {
        params: { page, size },
    });
    return response.data?.Tasks || [];
}

/**
 * Get task detail by ID
 */
export async function getTaskDetails(id: number): Promise<any> {
    const response = await apiClient.get(`/api/task/v2/${id}`);
    return response.data;
}

/**
 * Accept a task
 */
export async function acceptTask(id: number): Promise<any> {
    const response = await apiClient.post(`/api/tasks/${id}/accept`);
    return response.data;
}

/**
 * Save/update task
 */
export async function saveTask(model: any): Promise<any> {
    const response = await apiClient.post('/api/tasks/save', model);
    return response.data;
}

/**
 * Finalize a task
 */
export async function finalizeTask(id: number, model: any): Promise<any> {
    const response = await apiClient.post(`/api/tasks/${id}/finalize`, model);
    return response.data;
}
