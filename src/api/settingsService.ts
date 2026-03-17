import axios from 'axios';
import apiClient, { API_BASE_URL } from './apiClient';
import { TokenStorage } from '../auth/TokenStorage';
import { Platform } from 'react-native';

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

export interface CreateFormField {
    key: string;
    name: string;
    isResponsive: boolean;
    jobTypeId: number;
    jobTypeName: string;
    order: number;
    isDate: boolean;
    format?: string;
    [key: string]: any;
}

export interface ResponsiveTaskListField {
    key: string;
    name: string;
    order: number;
    rowNumber: number;
    [key: string]: any;
}

export interface ResponsiveTaskListConfig {
    fields?: ResponsiveTaskListField[];
    responsiveTaskListHeaderPrimaryTitle?: string;
    responsiveTaskListHeaderSecondaryTitle?: string;
    [key: string]: any;
}

export interface ConditionalAttributeMetadata {
    name?: string;
    format?: string;
    [key: string]: any;
}

export interface ResponsiveTaskListMetadataResponse {
    conditionalAttributes?: Record<string, ConditionalAttributeMetadata>;
}

const TOKEN_KEY = 'auth_access_token';
const DEFAULT_WFM_TENANT_DOMAIN = 'gdi-demo2';

function decodeBase64(base64: string): string {
    if (typeof atob === 'function') {
        return atob(base64);
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = '';
    let i = 0;

    while (i < base64.length) {
        const enc1 = chars.indexOf(base64.charAt(i++));
        const enc2 = chars.indexOf(base64.charAt(i++));
        const enc3 = chars.indexOf(base64.charAt(i++));
        const enc4 = chars.indexOf(base64.charAt(i++));

        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;

        str += String.fromCharCode(chr1);
        if (enc3 !== 64) str += String.fromCharCode(chr2);
        if (enc4 !== 64) str += String.fromCharCode(chr3);
    }

    return str;
}

function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const decoded = decodeBase64(padded);
        const utf8 = decodeURIComponent(
            decoded
                .split('')
                .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
                .join('')
        );
        return JSON.parse(utf8);
    } catch {
        return null;
    }
}

function resolveTenantDomainFromClaims(claims: Record<string, any> | null): string {
    const candidates = [
        claims?.tenant,
        claims?.tenantDomain,
        claims?.tenantdomain,
        claims?.tenancyName,
        claims?.tenancy_name,
    ];

    for (const candidate of candidates) {
        if (typeof candidate !== 'string') continue;
        const value = candidate.trim();
        if (!value) continue;
        if (!/^[a-z0-9][a-z0-9-_]*$/i.test(value)) continue;
        if (!/[a-z]/i.test(value)) continue;
        return value;
        }

    return DEFAULT_WFM_TENANT_DOMAIN;
}

function deriveWfmWebAppBaseUrl(apiBaseUrl: string): string {
    const trimmed = apiBaseUrl.replace(/\/+$/, '');

    if (/wfm-w4-api-/i.test(trimmed)) {
        return trimmed.replace(/wfm-w4-api-/i, 'wfm-w4-');
    }

    if (/\/W4\.API$/i.test(trimmed)) {
        return trimmed.replace(/\/W4\.API$/i, '/W4');
    }

    if (/\/W4Api$/i.test(trimmed)) {
        return trimmed.replace(/\/W4Api$/i, '/W4');
    }

    return trimmed;
}

async function buildWfmWebAppUrl(path: string): Promise<string> {
    const token = await TokenStorage.getItemAsync(TOKEN_KEY);
    const claims = token ? decodeJwtPayload(token) : null;
    const tenantDomain = resolveTenantDomainFromClaims(claims);
    const baseUrl = deriveWfmWebAppBaseUrl(API_BASE_URL);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}/${tenantDomain}${normalizedPath}`;
}

async function wfmWebAppGet<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = await buildWfmWebAppUrl(path);

    if (Platform.OS === 'web') {
        const response = await axios.get<T>(url, {
            params,
            withCredentials: true,
        });
        return response.data;
    }

    const response = await apiClient.get<T>(url, { params });
    return response.data;
}

async function wfmWebAppPost<T>(path: string, body: any): Promise<T> {
    const url = await buildWfmWebAppUrl(path);

    if (Platform.OS === 'web') {
        const response = await axios.post<T>(url, body, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
        return response.data;
    }

    const response = await apiClient.post<T>(url, body);
    return response.data;
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

export async function getCreateFormFields(): Promise<CreateFormField[]> {
    const data = await wfmWebAppGet<any>('/api/create-form-field/non-responsive');
    return Array.isArray(data) ? data : [];
}

export async function saveCreateFormFields(fields: CreateFormField[]): Promise<CreateFormField[]> {
    const data = await wfmWebAppPost<any>('/api/create-form-field/', fields);
    return Array.isArray(data) ? data : [];
}

export async function getResponsiveTaskListMetadata(includeFormioFields = true): Promise<ResponsiveTaskListMetadataResponse> {
    const data = await wfmWebAppGet<any>('/api/responsive-task-list/metadata', { includeFormioFields });
    return data || {};
}

export async function getResponsiveTaskListConfig(): Promise<ResponsiveTaskListConfig> {
    const data = await wfmWebAppGet<any>('/api/responsive-task-list/config');
    return data || {};
}

export async function saveResponsiveTaskListConfig(model: ResponsiveTaskListConfig): Promise<ResponsiveTaskListConfig> {
    const data = await wfmWebAppPost<any>('/api/responsive-task-list/config', model);
    return data || {};
}
