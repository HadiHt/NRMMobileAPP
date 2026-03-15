import apiClient from './apiClient';

export interface AppSettings {
    IsFingerprintRequired: boolean;
    MinimalAndroidAppVersion: string;
    MinimalIosAppVersion: string;
    MapConfiguration: any;
    W4FileUploadMaxAllowedFileSize: number;
    A3EndPoint: string;
    ShowAssetsInMobileApp: boolean;
    A3ApplicationEndPoint: string;
}

export interface TaskListInfoField {
    name: string;
    alias?: string;
    type?: string;
    [key: string]: any;
}

export interface TaskListInfoResponse {
    fields?: TaskListInfoField[];
    guiInstructions?: {
        taskItemBindings?: Record<string, string>;
        colorMapping?: {
            fieldName?: string;
            values?: Record<string, string>;
        }[];
    };
    quickFilterOptions?: {
        name?: string;
        fieldName?: string;
        fieldValue?: string;
    }[];
    [key: string]: any;
}

export interface JobTypeSummary {
    id: number;
    name: string;
    [key: string]: any;
}

/**
 * Get mobile application settings
 */
export async function getAppSettings(): Promise<AppSettings> {
    const response = await apiClient.get('/api/mobile-application-settings');
    return response.data;
}

/**
 * Get worker fleet device ID
 */
export async function getFleetDeviceId(): Promise<{ FleetDeviceId: string }> {
    const response = await apiClient.get('/api/mobile/worker/fleet-device-id');
    return response.data;
}

/**
 * GET /api/tasklist/info
 * Returns task list configuration used by mobile and scheduler clients.
 */
export async function getTaskListInfo(): Promise<TaskListInfoResponse> {
    const response = await apiClient.get('/api/tasklist/info');
    return response.data || {};
}

/**
 * GET /api/jobType/GetAllJobTypes
 * Returns available job types for configuration screens.
 */
export async function getAllJobTypesForConfiguration(): Promise<JobTypeSummary[]> {
    const response = await apiClient.get('/api/jobType/GetAllJobTypes');
    const raw = Array.isArray(response.data) ? response.data : [];

    return raw.map((item: any) => ({
        id: Number(item?.id ?? item?.Id ?? 0),
        name: String(item?.name ?? item?.Name ?? item?.jobTypeName ?? item?.JobTypeName ?? '').trim(),
        ...item,
    }));
}
