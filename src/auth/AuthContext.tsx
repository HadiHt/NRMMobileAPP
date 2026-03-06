import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';

// IdentityServer configuration
const IDP_AUTHORITY = 'https://gdi-demo2.identityserver.gdi.net';
const CLIENT_ID = 'nrm-mobile';
const SCOPES = ['openid', 'profile', 'email', 'roles', 'tenant', 'w4api'];
const CLIENT_SECRET = 'secret';
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'nrm-mobile', path: 'auth/callback' });

// Log the exact redirect URI
console.log('=== REDIRECT URI ===', REDIRECT_URI);

// Token storage keys
const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

const TOKEN_ENDPOINT = `${IDP_AUTHORITY}/connect/token`;
const AUTH_ENDPOINT = `${IDP_AUTHORITY}/connect/authorize`;

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshAccessToken: () => Promise<string | null>;
    handleAuthCallback: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

interface Props {
    children: ReactNode;
}

/**
 * Generate a random string for the state parameter
 */
function generateState(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function AuthProvider({ children }: Props) {
    const [state, setState] = useState<AuthState>({
        accessToken: null,
        refreshToken: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // Restore tokens from SecureStore on mount
    useEffect(() => {
        (async () => {
            try {
                const token = await SecureStore.getItemAsync(TOKEN_KEY);
                const refresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
                console.log('=== AUTH INIT: token found?', token ? 'YES' : 'NO', '===');
                if (token) {
                    setState({
                        accessToken: token,
                        refreshToken: refresh,
                        isLoading: false,
                        isAuthenticated: true,
                    });
                    return;
                }
            } catch (e) {
                console.log('=== AUTH INIT: error restoring tokens ===', e);
            }
            setState((s) => ({ ...s, isLoading: false }));
        })();
    }, []);

    /**
     * Exchange authorization code for tokens using fetch directly
     */
    const exchangeCode = async (code: string): Promise<void> => {
        console.log('=== EXCHANGING CODE... ===');
        try {
            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                redirect_uri: REDIRECT_URI,
            }).toString();

            console.log('=== TOKEN REQUEST ===', TOKEN_ENDPOINT);

            const response = await fetch(TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            });

            const data = await response.json();
            console.log('=== TOKEN RESPONSE STATUS ===', response.status);

            if (!response.ok) {
                console.error('=== TOKEN ERROR ===', JSON.stringify(data));
                return;
            }

            console.log('=== TOKEN RECEIVED ===');
            console.log('Access Token (first 50 chars):', data.access_token?.substring(0, 50));
            console.log('Refresh Token:', data.refresh_token ? 'YES' : 'NO');
            console.log('Expires in:', data.expires_in, 'seconds');

            await saveTokens(data.access_token, data.refresh_token, data.expires_in);
        } catch (e) {
            console.error('=== CODE EXCHANGE FAILED ===', e);
        }
    };

    const saveTokens = async (accessToken: string, refreshToken?: string, expiresIn?: number) => {
        const expiry = Date.now() + (expiresIn ?? 3600) * 1000;

        console.log('=== SAVING TOKENS ===');

        if (accessToken) {
            await SecureStore.setItemAsync(TOKEN_KEY, String(accessToken));
        }
        if (refreshToken) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, String(refreshToken));
        }
        await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiry));

        setState({
            accessToken: accessToken || null,
            refreshToken: refreshToken || null,
            isLoading: false,
            isAuthenticated: !!accessToken,
        });
        console.log('=== AUTH STATE: AUTHENTICATED ===');
    };

    const clearTokens = async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
        setState({
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            isAuthenticated: false,
        });
    };

    const login = useCallback(async () => {
        console.log('=== LOGIN STARTED ===');

        const stateParam = generateState();
        const scopeString = SCOPES.join(' ');

        // Build the authorization URL manually
        const authUrl =
            `${AUTH_ENDPOINT}?` +
            `client_id=${encodeURIComponent(CLIENT_ID)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(scopeString)}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&state=${stateParam}` +
            `&prompt=login`;

        console.log('=== AUTH URL ===', authUrl);

        try {
            // Just open the browser — expo-router will handle the redirect
            // via the /auth/callback route
            await WebBrowser.openBrowserAsync(authUrl);
            console.log('=== BROWSER CLOSED ===');
        } catch (e) {
            console.error('=== LOGIN ERROR ===', e);
        }
    }, []);

    const logout = useCallback(async () => {
        await clearTokens();
    }, []);

    const refreshAccessToken = useCallback(async (): Promise<string | null> => {
        if (!state.refreshToken) return null;
        try {
            const body = new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: state.refreshToken,
            }).toString();

            const response = await fetch(TOKEN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
            });

            const data = await response.json();
            if (response.ok && data.access_token) {
                await saveTokens(data.access_token, data.refresh_token, data.expires_in);
                return data.access_token;
            }
        } catch (e) {
            console.error('Token refresh failed:', e);
        }
        await clearTokens();
        return null;
    }, [state.refreshToken]);

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                refreshAccessToken,
                handleAuthCallback: exchangeCode,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
