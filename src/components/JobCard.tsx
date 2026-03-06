import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

interface JobCardProps {
    id: number;
    description: string;
    jobType: string;
    status: string;
    createdDate: string;
    taskCount?: number;
    address?: string;
    onPress: () => void;
    style?: ViewStyle;
}

export default function JobCard({
    id,
    description,
    jobType,
    status,
    createdDate,
    taskCount,
    address,
    onPress,
    style,
}: JobCardProps) {
    return (
        <TouchableOpacity
            style={[styles.card, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="briefcase" size={22} color={Colors.accent} />
            </View>
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.jobId}>JOB-{id}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{status}</Text>
                    </View>
                </View>
                <Text style={styles.description} numberOfLines={2}>
                    {description}
                </Text>
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Ionicons name="layers-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.metaText}>{jobType}</Text>
                    </View>
                    {taskCount !== undefined && (
                        <View style={styles.metaItem}>
                            <Ionicons name="list-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.metaText}>{taskCount} tasks</Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.accent + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    content: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    jobId: {
        ...Typography.caption,
        color: Colors.accent,
    },
    badge: {
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    badgeText: {
        ...Typography.caption,
        fontSize: 9,
        color: Colors.textSecondary,
    },
    description: {
        ...Typography.body,
        color: Colors.textPrimary,
        fontWeight: '600',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        ...Typography.bodySmall,
        color: Colors.textMuted,
        fontSize: 11,
    },
    chevron: {
        marginLeft: Spacing.sm,
    },
});
