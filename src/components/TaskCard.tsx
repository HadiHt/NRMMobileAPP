import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

interface TaskCardProps {
    id: number;
    jobDescription: string;
    taskType: string;
    status: string;
    statusId: number;
    scheduledDate: string;
    address: string;
    priority?: number;
    onPress: () => void;
    style?: ViewStyle;
}

function getStatusColor(statusId: number): string {
    // Common status IDs: 1=New, 2=Assigned, 3=InProgress, 4=Completed, 5=Cancelled
    switch (statusId) {
        case 1: return Colors.taskStatusNew;
        case 2: return Colors.info;
        case 3: return Colors.taskStatusInProgress;
        case 4: return Colors.taskStatusCompleted;
        case 5: return Colors.taskStatusCancelled;
        default: return Colors.textSecondary;
    }
}

function getPriorityIcon(priority?: number): { name: keyof typeof Ionicons.glyphMap; color: string } {
    if (!priority || priority <= 1) return { name: 'arrow-down-circle-outline', color: Colors.success };
    if (priority === 2) return { name: 'remove-circle-outline', color: Colors.warning };
    return { name: 'arrow-up-circle-outline', color: Colors.error };
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateStr;
    }
}

export default function TaskCard({
    id,
    jobDescription,
    taskType,
    status,
    statusId,
    scheduledDate,
    address,
    priority,
    onPress,
    style,
}: TaskCardProps) {
    const statusColor = getStatusColor(statusId);
    const priorityInfo = getPriorityIcon(priority);

    return (
        <TouchableOpacity
            style={[styles.card, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Status indicator bar */}
            <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

            <View style={styles.content}>
                {/* Header row */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.taskId}>#{id}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
                        </View>
                    </View>
                    {priority !== undefined && (
                        <Ionicons name={priorityInfo.name} size={20} color={priorityInfo.color} />
                    )}
                </View>

                {/* Job description */}
                <Text style={styles.jobDescription} numberOfLines={2}>
                    {jobDescription}
                </Text>

                {/* Task type */}
                <View style={styles.infoRow}>
                    <Ionicons name="construct-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{taskType}</Text>
                </View>

                {/* Date */}
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{formatDate(scheduledDate)}</Text>
                </View>

                {/* Address */}
                {address ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color={Colors.accent} />
                        <Text style={[styles.infoText, { color: Colors.textSecondary }]} numberOfLines={1}>
                            {address}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Chevron */}
            <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
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
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statusBar: {
        width: 4,
    },
    content: {
        flex: 1,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    taskId: {
        ...Typography.caption,
        color: Colors.textMuted,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        ...Typography.caption,
        fontSize: 10,
    },
    jobDescription: {
        ...Typography.h3,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: 4,
    },
    infoText: {
        ...Typography.bodySmall,
        color: Colors.textSecondary,
    },
    chevron: {
        justifyContent: 'center',
        paddingRight: Spacing.md,
    },
});
