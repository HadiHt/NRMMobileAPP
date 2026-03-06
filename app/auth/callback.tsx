import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';

export default function AuthCallback() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { handleAuthCallback } = useAuth();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        const code = params.code as string;
        const error = params.error as string;

        console.log('========================================');
        console.log('=== AUTH CALLBACK ROUTE HIT ===');
        console.log('=== code:', code ? code.substring(0, 30) + '...' : 'NONE');
        console.log('=== error:', error || 'NONE');
        console.log('=== all params:', JSON.stringify(params));
        console.log('========================================');

        if (error) {
            const desc = params.error_description as string;
            setErrorMsg(`${error}: ${desc || 'Unknown error'}`);
            return;
        }

        if (code) {
            setStatus('Exchanging code for token...');
            handleAuthCallback(code)
                .then(() => {
                    console.log('========================================');
                    console.log('=== TOKEN EXCHANGE COMPLETE ===');
                    console.log('========================================');
                    setStatus('Authenticated! Redirecting...');
                    setTimeout(() => router.replace('/(tabs)'), 500);
                })
                .catch((e: any) => {
                    console.error('=== CALLBACK EXCHANGE ERROR ===', e);
                    setErrorMsg(e?.message || 'Token exchange failed');
                });
        } else {
            setErrorMsg('No authorization code received');
        }
    }, []);

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
