import apiClient from './apiClient';

const USER_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

type UserSettingsCacheEntry = {
    data: UserSettingsModel | null;
    timestamp: number;
};

const userSettingsCache = new Map<number, UserSettingsCacheEntry>();
const userSettingsInFlight = new Map<number, Promise<UserSettingsModel | null>>();

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
    const cached = userSettingsCache.get(settingsType);
    if (cached && Date.now() - cached.timestamp < USER_SETTINGS_CACHE_TTL_MS) {
        return cached.data;
    }

    const existingRequest = userSettingsInFlight.get(settingsType);
    if (existingRequest) {
        return existingRequest;
    }

    try {
        const request = apiClient.get(`/api/scheduler/tasks/user-settings/${settingsType}`)
            .then((response) => {
                const data = response.data;
                if (!data) {
                    userSettingsCache.set(settingsType, { data: null, timestamp: Date.now() });
                    return null;
                }

                // Some backends return full model, some return only settings object.
                if (data.settings !== undefined || data.Settings !== undefined) {
                    const parsedModel = {
                        settingsType: data.settingsType ?? data.SettingsType ?? settingsType,
                        settings: tryParseSettings(data.settings ?? data.Settings),
                        customWidgetId: data.customWidgetId ?? data.CustomWidgetId ?? null,
                    };
                    userSettingsCache.set(settingsType, { data: parsedModel, timestamp: Date.now() });
                    return parsedModel;
                }

                const parsedFallback = {
                    settingsType,
                    settings: tryParseSettings(data),
                    customWidgetId: null,
                };
                userSettingsCache.set(settingsType, { data: parsedFallback, timestamp: Date.now() });
                return parsedFallback;
            })
            .finally(() => {
                userSettingsInFlight.delete(settingsType);
            });

        userSettingsInFlight.set(settingsType, request);
        return await request;
    } catch (err: any) {
        userSettingsInFlight.delete(settingsType);
        if (err?.response?.status === 404) {
            userSettingsCache.set(settingsType, { data: null, timestamp: Date.now() });
            return null;
        }
        throw err;
    }
}

export async function saveUserSettings(model: UserSettingsModel): Promise<void> {
    await apiClient.post('/api/scheduler/tasks/user-settings', model);
    userSettingsCache.set(model.settingsType, {
        data: model,
        timestamp: Date.now(),
    });
}
