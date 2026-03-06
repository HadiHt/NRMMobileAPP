import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { getTaskDetails } from '../api/taskService';
import FormioInlineWebView from '../components/FormioInlineWebView';

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
    onOpenInWebView: (taskId: number) => void;
}

export default function TaskDetailScreen({ taskId, onBack, onOpenInWebView }: Props) {
    const [taskData, setTaskData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);

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
        } catch (err: any) {
            console.log('=== TASK DETAIL FAILED ===', err.response?.status, err.message);
            setError(`Failed to load task: ${err.response?.status || ''} ${err.message}`);
        } finally {
            setLoading(false);
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
                                        <FormioInlineWebView formioConfig={config} formData={formData} />
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
});
