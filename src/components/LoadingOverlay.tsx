import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Typography } from '../theme';

interface LoadingOverlayProps {
    message?: string;
    visible?: boolean;
}

export default function LoadingOverlay({ message = 'Loading...', visible = true }: LoadingOverlayProps) {
    if (!visible) return null;

    return (
        <View style={styles.container}>
            <View style={styles.box}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.message}>{message}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    box: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    message: {
        ...Typography.body,
        color: Colors.textSecondary,
    },
});
