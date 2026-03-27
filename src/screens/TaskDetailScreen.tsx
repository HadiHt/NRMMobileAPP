import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { getTaskDetails } from '../api/taskService';
import FormioInlineWebView from '../components/FormioInlineWebView';
import TaskComments from '../components/TaskComments';
import DocumentList from '../components/documents/DocumentList';
import { acceptTask, finalizeTask } from '../api/taskService';
import { invalidateTaskScreenCache } from './TaskListScreen';

const extractFormioConfig = (webPart: any) => {
    if (!webPart) return null;

    // Check known keys commonly used for Formio
    const possibleKeys = ['configuration', 'formioConfig', 'formLayout', 'form', 'schema'];
    for (const key of possibleKeys) {
        if (webPart[key]) {
            try {
                const parsed = typeof webPart[key] === 'string' ? JSON.parse(webPart[key]) : webPart[key];
                if (parsed && (parsed.components || parsed.display === 'form')) {
                    return parsed;
                }
            } catch (e) { }
        }
    }

    // Fallback: search all values inside webPart for a Formio schema pattern
    for (const key of Object.keys(webPart)) {
        try {
            const val = webPart[key];
            if (!val) continue;
            const parsed = typeof val === 'string' ? JSON.parse(val) : val;
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.components)) {
                return parsed;
            }
        } catch (e) { }
    }
    return null;
};

const formatTabName = (name: string): string => {
    if (!name) return 'Tab';
    let formatted = name;

    // 1. Change "portal.creationForm" to "Creation Form"
    if (formatted === 'portal.creationForm') {
        formatted = 'Creation Form';
    }

    // 2. Remove "custom.CRM_RDTT_Tabs." prefix
    if (formatted.startsWith('custom.CRM_RDTT_Tabs.')) {
        formatted = formatted.replace('custom.CRM_RDTT_Tabs.', '');
    }

    return formatted;
};

interface WebPart {
    tabName: string;
    [key: string]: any;
}

interface Props {
    taskId: number;
    onBack: () => void;
    onFinalizeSuccess?: () => void;
    onOpenInWebView: (taskId: number) => void;
}

export default function TaskDetailScreen({ taskId, onBack, onFinalizeSuccess, onOpenInWebView }: Props) {
    const [taskData, setTaskData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [actionLoading, setActionLoading] = useState(false);

    // Extract task status name (handle both string and object formats)
    const getStatusName = (): string => {
        const status = taskData?.status;
        if (!status) return '';
        if (typeof status === 'string') return status;
        return status.name || status.Name || status.description || '';
    };

    const statusName = taskData ? getStatusName() : '';
    const isNew = statusName.toLowerCase() === 'new';
    const isAccepted = statusName.toLowerCase() === 'accepted';
    const isReadOnly = isNew; // "New" tasks are read-only

    useEffect(() => {
        fetchTask();
    }, [taskId]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getTaskDetails(taskId);
            console.log('=== TASK DETAIL RESPONSE KEYS ===', Object.keys(data || {}));
            console.log('=== TASK TYPE KEYS ===', Object.keys(data?.taskType || {}));

            const rawWebParts = data?.taskType?.webParts || [];
            console.log('=== WEBPARTS COUNT ===', rawWebParts.length);
            if (rawWebParts.length > 0) {
                console.log('=== FIRST WEBPART ENTRY KEYS ===', Object.keys(rawWebParts[0]));
                console.log('=== FIRST WEBPART ENTRY ===', JSON.stringify(rawWebParts[0]).substring(0, 500));
            }
            rawWebParts.forEach((entry: any, i: number) => {
                // tabName could be at entry.webPart.tabName or entry.tabName
                const name = entry?.webPart?.tabName || entry?.tabName || `Tab ${i + 1}`;
                console.log(`=== WEBPART[${i}] tabName: "${name}" ===`);
            });

            setTaskData(data);
            console.log('=== TASK STATUS ===', JSON.stringify(data?.status));
        } catch (err: any) {
            console.log('=== TASK DETAIL FAILED ===', err.response?.status, err.message);
            setError(`Failed to load task: ${err.response?.status || ''} ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleAccept = async () => {
        try {
            setActionLoading(true);
            await acceptTask(taskId);
            invalidateTaskScreenCache();
            showAlert('Success', 'Task has been accepted.');
            await fetchTask(); // Refresh to get new status
        } catch (err: any) {
            console.error('Failed to accept task', err);
            const msg = err.response?.data?.message || err.message || 'Unknown error';
            showAlert('Error', `Failed to accept task: ${msg}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleFinalize = async () => {
        try {
            setActionLoading(true);
            const transitions = Array.isArray(taskData?.transitions)
                ? taskData.transitions
                : Array.isArray(taskData?.Transitions)
                    ? taskData.Transitions
                    : [];

            const existingNextTransition = taskData?.nextTransition || taskData?.NextTransition || null;
            const explicitNextAction = taskData?.nextAction || taskData?.NextAction || null;

            const finalizeTransition = existingNextTransition || transitions.find((t: any) => {
                const devName = String(t?.devName ?? t?.DevName ?? '').toLowerCase();
                const name = String(t?.name ?? t?.Name ?? '').toLowerCase();
                const finalizationAction = t?.finalizationAction ?? t?.FinalizationAction;
                return devName === 'finalize' || name === 'finalize' || !!(finalizationAction?.name ?? finalizationAction?.Name);
            });

            const transitionDevName = finalizeTransition?.devName ?? finalizeTransition?.DevName ?? 'Finalize';
            const transitionName = finalizeTransition?.name ?? finalizeTransition?.Name ?? transitionDevName;
            const rawFinalizationAction = finalizeTransition?.finalizationAction ?? finalizeTransition?.FinalizationAction;
            const finalizationActionName =
                rawFinalizationAction?.name ??
                rawFinalizationAction?.Name ??
                explicitNextAction ??
                transitionName ??
                'Finalize';

            const normalizedTransition = {
                ...(finalizeTransition || {}),
                devName: transitionDevName,
                name: transitionName,
                finalizationAction: {
                    ...(rawFinalizationAction || {}),
                    id: rawFinalizationAction?.id ?? rawFinalizationAction?.Id ?? transitionDevName,
                    name: finalizationActionName,
                },
            };

            const finalizePayload = {
                ...taskData,
                nextAction: finalizationActionName,
                nextTransition: normalizedTransition,
            };

            // Send the full task data as the finalize body (it came from the API so it matches the expected model)
            console.log('=== FINALIZE: taskData keys ===', Object.keys(taskData));
            console.log('=== FINALIZE: status ===', JSON.stringify(taskData.status));
            console.log('=== FINALIZE: transitions ===', JSON.stringify(taskData.transitions));
            console.log('=== FINALIZE: nextTransition ===', JSON.stringify(taskData.nextTransition));
            console.log('=== FINALIZE: nextAction ===', finalizationActionName);
            console.log('=== FINALIZE: normalized nextTransition ===', JSON.stringify(normalizedTransition));
            const result = await finalizeTask(taskId, finalizePayload);
            invalidateTaskScreenCache();
            showAlert('Success', 'Task has been finalized.');
            // If a new task was created (next in flow), navigate to it
            if (result?.newTaskId || result?.nextTaskId) {
                const nextId = result.newTaskId || result.nextTaskId;
                showAlert('Next Task', `A new task #${nextId} has been created.`);
            }
            if (onFinalizeSuccess) {
                onFinalizeSuccess();
            } else {
                onBack();
            }
            return;
        } catch (err: any) {
            console.error('Failed to finalize task', err);
            const msg = err.response?.data?.message || err.response?.data || err.message || 'Unknown error';
            showAlert('Error', `Failed to finalize task: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Loading task #{taskId}...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !taskData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Task #{taskId}</Text>
                </View>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                    <Text style={styles.errorText}>{error || 'Task not found'}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchTask}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const rawWebParts: any[] = taskData?.taskType?.webParts || [];
    // Each entry may have a nested .webPart object
    const activeEntry = rawWebParts[activeTab] || null;
    const activeWebPart = activeEntry?.webPart || activeEntry;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    Task #{taskId}
                </Text>
                {statusName ? (
                    <View style={[
                        styles.statusBadge,
                        isNew && styles.statusNew,
                        isAccepted && styles.statusAccepted,
                        !isNew && !isAccepted && styles.statusOther,
                    ]}>
                        <Text style={styles.statusBadgeText}>{statusName}</Text>
                    </View>
                ) : null}
                <TouchableOpacity onPress={() => onOpenInWebView(taskId)} style={styles.webViewButton}>
                    <Ionicons name="open-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Tab bar */}
            {rawWebParts.length > 0 ? (
                <View style={styles.tabBarContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabBarScroll}
                    >
                        {rawWebParts.map((entry, index) => {
                            const isActive = index === activeTab;
                            let name = entry?.webPart?.tabName || entry?.tabName || `Tab ${index + 1}`;
                            name = formatTabName(name);
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.tab, isActive && styles.tabActive]}
                                    onPress={() => setActiveTab(index)}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[styles.tabText, isActive && styles.tabTextActive]}
                                        numberOfLines={1}
                                    >
                                        {name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : (
                <View style={styles.noTabsBar}>
                    <Text style={styles.noTabsText}>No web parts configured</Text>
                </View>
            )}

            {/* Tab content */}
            <View style={styles.content}>
                {activeWebPart ? (
                    <View style={styles.webPartInfo}>
                        <Text style={styles.webPartTitle}>
                            {formatTabName(activeWebPart.tabName || activeWebPart.name || 'WebPart')}
                        </Text>

                        {(() => {
                            const isCommentWebPart =
                                activeWebPart.name?.toLowerCase().includes('comment') ||
                                activeWebPart.tabName?.toLowerCase().includes('comment') ||
                                activeWebPart.type === 'comments';

                            if (isCommentWebPart) {
                                return (
                                    <View style={styles.formioSection}>
                                        <TaskComments taskId={taskId} jobId={taskData?.job?.id} readOnly={isReadOnly || activeWebPart.readOnly} />
                                    </View>
                                );
                            }

                            const isDocumentWebPart =
                                activeWebPart.name?.toLowerCase().includes('document') ||
                                activeWebPart.tabName?.toLowerCase().includes('doc') ||
                                activeWebPart.type === 'documents' ||
                                activeWebPart.name === 'WP_Documents';

                            if (isDocumentWebPart) {
                                return (
                                    <View style={styles.formioSection}>
                                        <DocumentList 
                                            taskId={taskId} 
                                            jobId={taskData?.job?.id} 
                                            taskTypeId={taskData?.taskType?.id} 
                                            readOnly={isReadOnly || activeWebPart.readOnly} 
                                        />
                                    </View>
                                );
                            }

                            const config = extractFormioConfig(activeWebPart);
                            if (config) {
                                // The API response nests the target webpart ID under taskType -> webParts -> entry -> webPart -> id
                                // We are looping over taskData.taskType.webParts as `rawWebParts`. `activeEntry` is an item in that array.
                                const wpId = activeEntry?.webPart?.id;

                                let formData = null;

                                // Print raw active entry and wpId to debug the lookup
                                console.log(`=== Formio Check wpId: ${wpId} for Tab: ${activeEntry?.webPart?.name} ===`);

                                const webPartsValuesRoot = taskData?.job?.webPartsValues;

                                // 1. Match the webPart.id against the nested taskData.job.webPartsValues array
                                if (wpId && Array.isArray(webPartsValuesRoot)) {
                                    const matchingValue = webPartsValuesRoot.find((val: any) => val.webPartId === wpId);
                                    if (matchingValue) {
                                        // The backend might capitalize 'Data' as 'Data' instead of 'data' depending on serialization
                                        const rawData = matchingValue.Data || matchingValue.data;
                                        if (rawData) {
                                            formData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
                                            console.log(`=== MATCHED webPartsValue for wpId ${wpId} === Successfully parsed data.`);
                                        } else {
                                            console.log(`=== MATCHED webPartsValue for wpId ${wpId} === But 'data' property was empty.`);
                                        }
                                    } else {
                                        console.log(`=== NO MATCH in taskData.job.webPartsValues for wpId ${wpId}. webPartsValues array size: ${webPartsValuesRoot.length} ===`);
                                    }
                                } else if (!webPartsValuesRoot) {
                                    console.log('=== taskData.job.webPartsValues is UNDEFINED or missing ===');
                                }

                                // Fallbacks for old API structures
                                if (!formData && wpId && taskData?.data && taskData.data[wpId]) {
                                    formData = taskData.data[wpId];
                                } else if (!formData && wpId && taskData?.createFormValues && taskData.createFormValues[wpId]) {
                                    formData = taskData.createFormValues[wpId];
                                } else if (!formData && taskData?.createFormValues) {
                                    formData = taskData.createFormValues;
                                }

                                return (
                                    <View style={styles.formioSection}>
                                        <FormioInlineWebView formioConfig={config} formData={formData} readOnly={isReadOnly} />
                                    </View>
                                );
                            }
                            // If it's not a Formio config, we can still show a fallback or nothing.
                            return (
                                <View style={styles.centered}>
                                    <Text style={styles.emptyText}>Formio configuration not found in this webpart.</Text>
                                </View>
                            );
                        })()}
                    </View>
                ) : (
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>No content</Text>
                    </View>
                )}
            </View>

            {/* Action buttons at bottom */}
            {isNew && (
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={handleAccept}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.actionButtonText}>Accept Task</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {isAccepted && (
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.finalizeButton]}
                        onPress={handleFinalize}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.actionButtonText}>Finalize Task</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: 20,
    },
    loadingText: {
        fontSize: 14,
        color: Colors.textMuted,
        marginTop: 8,
    },
    errorText: {
        fontSize: 14,
        color: Colors.error,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 12,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: Colors.accent,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00AEEF',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    webViewButton: {
        padding: 4,
    },

    /* Tab bar */
    tabBarContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tabBarScroll: {
        paddingHorizontal: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#00AEEF',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#888',
    },
    tabTextActive: {
        color: '#00AEEF',
        fontWeight: '700',
    },
    noTabsBar: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    noTabsText: {
        fontSize: 13,
        color: '#888',
        fontStyle: 'italic',
    },

    /* Content */
    content: {
        flex: 1,
        padding: 16,
    },
    webPartInfo: {
        flex: 1,
        gap: 16,
    },
    webPartTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    formioSection: {
        flex: 1,
    },

    emptyText: {
        fontSize: 14,
        color: '#888',
    },

    /* Status badge */
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    statusNew: {
        backgroundColor: 'rgba(255, 193, 7, 0.25)',
    },
    statusAccepted: {
        backgroundColor: 'rgba(76, 175, 80, 0.25)',
    },
    statusOther: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },

    /* Action bar */
    actionBar: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    actionButton: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    finalizeButton: {
        backgroundColor: '#FF9800',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
