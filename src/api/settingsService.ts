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
