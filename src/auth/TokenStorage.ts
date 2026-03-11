import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform Token Storage
 * Uses `expo-secure-store` on iOS/Android and standard `localStorage` on Web.
 */
export const TokenStorage = {
    async setItemAsync(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, value);
                }
            } catch (e) {
                console.error('Error saving to localStorage', e);
            }
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    },

    async getItemAsync(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') {
                    return window.localStorage.getItem(key);
                }
            } catch (e) {
                console.error('Error reading from localStorage', e);
            }
            return null;
        } else {
            return await SecureStore.getItemAsync(key);
        }
    },

    async deleteItemAsync(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(key);
                }
            } catch (e) {
                console.error('Error deleting from localStorage', e);
            }
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    }
};
