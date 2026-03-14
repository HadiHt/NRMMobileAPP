import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import { TokenStorage } from '../../src/auth/TokenStorage';

WebBrowser.maybeCompleteAuthSession();
const debugLog = (...args: any[]) => {
    if (__DEV__) {
        console.log(...args);
    }
};

export default function AuthCallback() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { handleAuthCallback, isAuthenticated } = useAuth();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(tabs)');
            return;
        }

        const code = params.code as string;
        const error = params.error as string;

        debugLog('=== AUTH CALLBACK ROUTE HIT ===', {
            hasCode: !!code,
            error: error || null,
        });

        if (error) {
            const desc = params.error_description as string;
            setErrorMsg(`${error}: ${desc || 'Unknown error'}`);
            return;
        }

        if (code) {
            setStatus('Completing authentication...');
            
            // On native or if the window wasn't a popup, we might still reach here and need to handle it manually.
            // On web as a popup, maybeCompleteAuthSession will usually redirect/close before reaching this 
            // point, but it's safe to have this as a fallback.
            handleAuthCallback(code)
                .then(() => {
                    debugLog('=== TOKEN EXCHANGE COMPLETE ===');
                    setStatus('Authenticated! Redirecting...');
                    setTimeout(() => router.replace('/(tabs)'), 500);
                })
                .catch((e: any) => {
                    debugLog('=== CALLBACK EXCHANGE ERROR ===', e);
                    // Avoid transient error flash if token was already saved by another auth path.
                    setStatus('Finalizing sign in...');
                    setTimeout(async () => {
                        const token = await TokenStorage.getItemAsync('auth_access_token');
                        if (token) {
                            router.replace('/(tabs)');
                            return;
                        }
                        setErrorMsg(e?.message || 'Token exchange failed');
                    }, 700);
                });
        } else {
            // Params can be briefly unavailable while auth session resolves.
            setStatus('Completing authentication...');
            setTimeout(async () => {
                const token = await TokenStorage.getItemAsync('auth_access_token');
                if (token) {
                    router.replace('/(tabs)');
                    return;
                }
                router.replace('/login');
            }, 500);
        }
    }, [params, router, handleAuthCallback, isAuthenticated]);

    if (errorMsg) {
        return (
            <View style={s.container}>
                <Text style={s.errorIcon}>⚠️</Text>
                <Text style={s.errorTitle}>Sign In Error</Text>
                <Text style={s.errorMsg}>{errorMsg}</Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => router.replace('/login')}>
                    <Text style={s.retryText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={s.container}>
            <ActivityIndicator size="large" color="#00AEEF" />
            <Text style={s.text}>{status}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
        gap: 16,
        padding: 24,
    },
    text: { fontSize: 16, color: '#666' },
    errorIcon: { fontSize: 48 },
    errorTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
    errorMsg: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
    retryBtn: { backgroundColor: '#00AEEF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 8 },
    retryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
