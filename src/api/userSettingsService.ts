import apiClient from './apiClient';

export const GRID_SETTINGS_TYPE = {
    JOB_TASK_GRID: 0,
    JOB_GRID: 1,
    DARK_MODE: 4,
    JOB_DRAFT_GRID: 5,
    JOB_TASK_COMPLETED_GRID: 6,
    OPERATIONS_GRID: 8,
    DEVICE_LOCATION_GRID: 9,
} as const;

export type GridSettingsType = (typeof GRID_SETTINGS_TYPE)[keyof typeof GRID_SETTINGS_TYPE];

export interface UserGridColumnSetting {
    key?: string;
    field?: string;
    name?: string;
    columnKey?: string;
    width?: number;
    visible?: boolean;
    hidden?: boolean;
    order?: number;
    index?: number;
    position?: number;
    [key: string]: any;
}

export interface UserGridSettings {
    columns?: UserGridColumnSetting[];
    filter?: any;
    sort?: any;
    grouping?: any[];
    [key: string]: any;
}

export interface UserSettingsModel {
    settingsType: number;
    settings: UserGridSettings;
    customWidgetId?: number | null;
}

function tryParseSettings(raw: any): UserGridSettings {
    if (raw === null || raw === undefined) return {};
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }
    return typeof raw === 'object' ? raw : {};
}

export async function getUserSettings(settingsType: GridSettingsType): Promise<UserSettingsModel | null> {
    try {
        const response = await apiClient.get(`/api/scheduler/tasks/user-settings/${settingsType}`);
        const data = response.data;
        console.log(`[UserSettings] GET /api/scheduler/tasks/user-settings/${settingsType} raw response:`, data);
        if (!data) return null;

        // Some backends return full model, some return only settings object.
        if (data.settings !== undefined || data.Settings !== undefined) {
            const parsedModel = {
                settingsType: data.settingsType ?? data.SettingsType ?? settingsType,
                settings: tryParseSettings(data.settings ?? data.Settings),
                customWidgetId: data.customWidgetId ?? data.CustomWidgetId ?? null,
            };
            console.log(`[UserSettings] Parsed model for settingsType=${settingsType}:`, parsedModel);
            return parsedModel;
        }

        const parsedFallback = {
            settingsType,
            settings: tryParseSettings(data),
            customWidgetId: null,
        };
        console.log(`[UserSettings] Parsed fallback model for settingsType=${settingsType}:`, parsedFallback);
        return parsedFallback;
    } catch (err: any) {
        console.log(`[UserSettings] GET /api/scheduler/tasks/user-settings/${settingsType} failed:`, err?.response?.status, err?.response?.data || err?.message);
        if (err?.response?.status === 404) return null;
        throw err;
    }
}

export async function saveUserSettings(model: UserSettingsModel): Promise<void> {
    await apiClient.post('/api/scheduler/tasks/user-settings', model);
}
