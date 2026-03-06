import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { getTaskList, TaskListItem } from '../api/taskService';

interface Props {
    onTaskPress: (taskId: number) => void;
}

// Table column definitions matching the web UI
const COLUMNS = [
    { key: 'taskId', label: 'ID', width: 60 },
    { key: 'jobId', label: 'Job', width: 70 },
    { key: 'taskName', label: 'Task Name', width: 200 },
    { key: 'jobTypeName', label: 'Job Type', width: 100 },
    { key: 'assignees', label: 'Assignees', width: 200 },
    { key: 'areaName', label: 'Area Name', width: 120 },
    { key: 'plannedStartDate', label: 'Planned Start', width: 150 },
    { key: 'plannedEndDate', label: 'Planned End', width: 150 },
    { key: 'currentState', label: 'Current State', width: 120 },
    { key: 'projectId', label: 'Project ID', width: 100 },
    { key: 'address', label: 'Address', width: 150 },
];

function formatDate(val: any): string {
    if (!val) return '';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }) + ' ' + d.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return String(val);
    }
}

function getCellValue(task: TaskListItem, key: string): string {
    // Specific field mappings requested by the user
    const mapping: Record<string, string[]> = {
        taskId: ['taskId', 'TaskId', 'id', 'Id'],
        taskName: ['taskName', 'taskTypeName', 'TaskTypeName', 'TaskName'],
        currentState: ['currentState', 'taskStatus', 'TaskStatus', 'Status', 'CurrentState'],
    };

    const keysToTry = mapping[key] || [
        key,
        key.charAt(0).toUpperCase() + key.slice(1),
        key.toLowerCase(),
    ];

    for (const k of keysToTry) {
        if (task[k] !== undefined && task[k] !== null) {
            let val = task[k];

            // If it's a numeric status, map to string
            if (k.toLowerCase().includes('status') && typeof val === 'number') {
                const statusMap: Record<number, string> = {
                    1: 'New',
                    2: 'Accepted',
                    3: 'In Progress',
                    4: 'Finalized',
                    5: 'Canceled',
                    6: 'Rejected',
                    7: 'Executed',
                };
                val = statusMap[val] || `Status ${val}`;
            }

            if (key.includes('Date') || key.includes('date')) {
                return formatDate(val);
            }
            return String(val);
        }
    }

    return '';
}

export default function TaskListScreen({ onTaskPress }: Props) {
    const [tasks, setTasks] = useState<TaskListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actualColumns, setActualColumns] = useState(COLUMNS);

    const fetchTasks = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setError(null);

            const SecureStore = require('expo-secure-store');
            const token = await SecureStore.getItemAsync('auth_access_token');

            if (!token) {
                setError('NO TOKEN FOUND');
                setLoading(false);
                return;
            }

            // Decode JWT to see claims
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    console.log('=== JWT ISSUER:', payload.iss, '===');
                    console.log('=== JWT AUDIENCE:', payload.aud, '===');
                    console.log('=== JWT SCOPE:', payload.scope, '===');
                    console.log('=== JWT SUB:', payload.sub, '===');
                    console.log('=== JWT NAME:', payload.name || payload.preferred_username, '===');
                    console.log('=== JWT EXP:', new Date(payload.exp * 1000).toISOString(), '===');
                }
            } catch (e) {
                console.log('=== Cannot decode JWT ===');
            }

            const data = await getTaskList();
            setTasks(data);

            console.log('=== TASK LIST: GOT', data.length, 'TASKS ===');

            if (data.length > 0) {
                const keys = Object.keys(data[0]);
                console.log('=== TASK KEYS ===', keys);
            }
        } catch (err: any) {
            const status = err.response?.status || 'unknown';
            const serverMsg = err.response?.data
                ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data).substring(0, 500))
                : err.message;
            const url = (err.config?.baseURL || '') + (err.config?.url || '');
            console.log('=== TASK LIST FAILED ===');
            console.log('=== STATUS:', status, '===');
            console.log('=== URL:', url, '===');
            console.log('=== SERVER RESPONSE:', serverMsg, '===');
            setError(`Status: ${status}\nURL: ${url}\nError: ${serverMsg}`);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTasks();
        }, [])
    );

    const getStateColor = (state: string | undefined) => {
        if (!state) return Colors.textMuted;
        const s = state.toLowerCase();
        if (s.includes('new') || s.includes('open')) return '#4CAF50';
        if (s.includes('progress') || s.includes('active')) return '#2196F3';
        if (s.includes('finali') || s.includes('complet') || s.includes('done')) return '#9E9E9E';
        if (s.includes('cancel')) return '#F44336';
        return Colors.textPrimary;
    };

    if (loading && tasks.length === 0) {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={s.loadingText}>Loading tasks...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container}>
            {/* Header bar */}
            <View style={s.headerBar}>
                <View style={s.headerLeft}>
                    <Ionicons name="menu-outline" size={22} color="#fff" />
                    <Text style={s.breadcrumb}>/ Tasks</Text>
                </View>
                <Text style={s.headerCount}>{tasks.length} tasks</Text>
            </View>

            {error && (
                <View style={s.errorBar}>
                    <Ionicons name="warning-outline" size={16} color="#fff" />
                    <Text style={s.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => fetchTasks()}>
                        <Text style={s.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Table */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                    {/* Table header row */}
                    <View style={s.tableHeader}>
                        {actualColumns.map((col) => (
                            <View key={col.key} style={[s.headerCell, { width: col.width }]}>
                                <Text style={s.headerCellText} numberOfLines={1}>
                                    {col.label}
                                </Text>
                                <Ionicons name="swap-vertical-outline" size={12} color="#555" />
                            </View>
                        ))}
                    </View>

                    {/* Table rows */}
                    <FlatList
                        data={tasks}
                        keyExtractor={(item, index) => {
                            const id = item.taskId || item.TaskId || item.id || item.Id || item.jobId || item.JobId || index;
                            return String(id) + '-' + index;
                        }}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                style={[
                                    s.tableRow,
                                    index % 2 === 0 ? s.rowEven : s.rowOdd,
                                ]}
                                onPress={() => {
                                    const id = item.taskId || item.TaskId || item.id || item.Id || 0;
                                    onTaskPress(Number(id));
                                }}
                                activeOpacity={0.6}
                            >
                                {actualColumns.map((col) => {
                                    const val = getCellValue(item, col.key);
                                    const isState = col.key === 'currentState';
                                    return (
                                        <View key={col.key} style={[s.cell, { width: col.width }]}>
                                            {isState ? (
                                                <View style={[s.stateBadge, { backgroundColor: getStateColor(val) + '25' }]}>
                                                    <Text
                                                        style={[s.cellText, { color: getStateColor(val), fontWeight: '600' }]}
                                                        numberOfLines={1}
                                                    >
                                                        {val}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={s.cellText} numberOfLines={1}>
                                                    {val}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </TouchableOpacity>
                        )}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => {
                                    setRefreshing(true);
                                    fetchTasks(false);
                                }}
                                tintColor={Colors.accent}
                                colors={[Colors.accent]}
                            />
                        }
                        ListEmptyComponent={
                            <View style={s.emptyState}>
                                <Ionicons name="clipboard-outline" size={48} color={Colors.textMuted} />
                                <Text style={s.emptyText}>No tasks found</Text>
                                <Text style={s.emptySubtext}>Pull down to refresh</Text>
                            </View>
                        }
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
    },
    loadingText: {
        ...Typography.body,
        color: Colors.textMuted,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#00AEEF', // GDI cyan/blue
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    breadcrumb: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    headerCount: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.85,
    },
    errorBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F44336',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    errorText: {
        color: '#fff',
        fontSize: 13,
        flex: 1,
    },
    retryText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F5C518', // GDI yellow header
        borderBottomWidth: 1,
        borderBottomColor: '#e0b000',
    },
    headerCell: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRightWidth: 1,
        borderRightColor: '#e0b000',
    },
    headerCellText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#333',
        flex: 1,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e8e8e8',
    },
    rowEven: {
        backgroundColor: '#fff',
    },
    rowOdd: {
        backgroundColor: '#f7f9fc',
    },
    cell: {
        paddingHorizontal: 8,
        paddingVertical: 10,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#eee',
    },
    cellText: {
        fontSize: 12,
        color: '#333',
    },
    stateBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: Spacing.sm,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    emptySubtext: {
        fontSize: 13,
        color: Colors.textMuted,
    },
});
