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
    projectProgress?: string;
    createdBy?: string;
    address?: string;
}

/**
 * Get task list for current user
 * GET /api/tasklist
 */
export async function getTaskList(): Promise<TaskListItem[]> {
    try {
        const response = await apiClient.get<any>('/api/tasklist');

        // Handle different possible response formats
        const tasks = response.data?.Tasks || response.data?.tasks || (Array.isArray(response.data) ? response.data : []);
        return tasks;
    } catch (err: any) {
        throw err;
    }
}

/**
 * Get finalized/completed task list for current user
 * POST /api/tasklist/finalized
 */
export async function getFinalizedTaskList(
    filters: any = { condition: 'and', rules: [] },
    page = 1,
    size = 50
): Promise<TaskListItem[]> {
    const response = await apiClient.post<any>('/api/tasklist/finalized', filters, {
        params: { page, size },
    });
    return response.data?.Tasks || response.data?.tasks || (Array.isArray(response.data) ? response.data : []);
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
    try {
        console.log('=== ACCEPT TASK ===', id);
        const response = await apiClient.post('/api/task/accept', null, { params: { taskid: id } });
        return response.data;
    } catch (err: any) {
        console.log('=== ACCEPT TASK ERROR ===', err.response?.status, JSON.stringify(err.response?.data, null, 2));
        throw err;
    }
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
 * POST /api/task/finalize-v2?id={taskId}
 * Body: the full task data model (only populated fields)
 */
export async function finalizeTask(id: number, taskData: any): Promise<any> {
    try {
        console.log('=== FINALIZE TASK ===', id);
        console.log('=== FINALIZE PAYLOAD ===', JSON.stringify(taskData, null, 2));
        const response = await apiClient.post('/api/task/finalize-v2', taskData, { params: { id } });
        return response.data;
    } catch (err: any) {
        const status = err.response?.status;
        console.log('=== FINALIZE TASK ERROR ===', status, JSON.stringify(err.response?.data, null, 2));

        // Some environments still rely on the legacy finalize route.
        // If v2 fails server-side, try the legacy endpoint once.
        if (status >= 500) {
            console.log('=== FINALIZE FALLBACK: /api/task/finalize?id={id} ===', id);
            const fallback = await apiClient.post('/api/task/finalize', taskData, { params: { id } });
            return fallback.data;
        }

        throw err;
    }
}
