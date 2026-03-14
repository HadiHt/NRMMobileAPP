import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { TokenStorage } from '../auth/TokenStorage';

// Base URL for the W4 API
// Update this to your production/staging URL
const BASE_URL = 'https://wfm-w4-api-test.azurewebsites.net';

const TOKEN_KEY = 'auth_access_token';

let refreshCallback: (() => Promise<string | null>) | null = null;

export function setTokenRefreshCallback(cb: () => Promise<string | null>) {
    refreshCallback = cb;
}

const apiClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// Request interceptor — attach Bearer token
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await TokenStorage.getItemAsync(TOKEN_KEY);
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401 with token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry && refreshCallback) {
            originalRequest._retry = true;
            const newToken = await refreshCallback();
            if (newToken && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return apiClient(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
