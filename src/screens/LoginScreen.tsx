import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

export default function LoginScreen() {
    const { login, isLoading } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Logo area */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="grid" size={48} color={Colors.accent} />
                    </View>
                    <Text style={styles.appName}>NRM Mobile</Text>
                    <Text style={styles.subtitle}>Workforce Management</Text>
                </View>

                {/* Features list */}
                <View style={styles.features}>
                    {[
                        { icon: 'clipboard-outline' as const, text: 'View & manage tasks' },
                        { icon: 'calendar-outline' as const, text: 'Calendar scheduling' },
                        { icon: 'document-text-outline' as const, text: 'Fill forms on the go' },
                        { icon: 'notifications-outline' as const, text: 'Real-time updates' },
                    ].map((item, idx) => (
                        <View key={idx} style={styles.featureRow}>
                            <View style={styles.featureIcon}>
                                <Ionicons name={item.icon} size={18} color={Colors.accent} />
                            </View>
                            <Text style={styles.featureText}>{item.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Login button */}
                <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={login}
                    activeOpacity={0.8}
                    disabled={isLoading}
                >
                    <Ionicons name="log-in-outline" size={22} color="#fff" />
                    <Text style={styles.loginButtonText}>
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.footerText}>
                    Secured by IdentityServer
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.accent + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        borderWidth: 2,
        borderColor: Colors.accent + '30',
    },
    appName: {
        ...Typography.h1,
        color: Colors.textPrimary,
        fontSize: 32,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        ...Typography.body,
        color: Colors.textSecondary,
    },
    features: {
        width: '100%',
        marginBottom: Spacing.xxl,
        gap: Spacing.md,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    featureIcon: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    featureText: {
        ...Typography.body,
        color: Colors.textSecondary,
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.accent,
        paddingVertical: 16,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.lg,
        width: '100%',
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        ...Typography.button,
        color: '#fff',
        fontSize: 17,
    },
    footerText: {
        ...Typography.bodySmall,
        color: Colors.textMuted,
        marginTop: Spacing.lg,
    },
});
