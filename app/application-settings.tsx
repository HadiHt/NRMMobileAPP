import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    TextInput,
    useWindowDimensions,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    CreateFormField,
    getAllJobTypesForConfiguration,
    getCreateFormFields,
    getResponsiveTaskListConfig,
    getResponsiveTaskListMetadata,
    getTaskListInfo,
    JobTypeSummary,
    ResponsiveTaskListConfig,
    ResponsiveTaskListField,
    TaskListInfoField,
    TaskListInfoResponse,
    saveCreateFormFields,
    saveResponsiveTaskListConfig,
} from '../src/api/settingsService';
import { getUserSettings, GRID_SETTINGS_TYPE, UserGridColumnSetting } from '../src/api/userSettingsService';

type TabKey =
    | 'general'
    | 'workorder'
    | 'global-map'
    | 'mobile-app'
    | 'event-calendar'
    | 'portal'
    | 'custom-headers'
    | 'translations'
    | 'a3'
    | 'nearby';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'workorder', label: 'Workorder Configuration' },
    { key: 'global-map', label: 'Global Map Configuration' },
    { key: 'mobile-app', label: 'Mobile App' },
    { key: 'event-calendar', label: 'Event Calendar' },
    { key: 'portal', label: 'Portal Configuration' },
    { key: 'custom-headers', label: 'Custom Headers' },
    { key: 'translations', label: 'Translations' },
    { key: 'a3', label: 'A3 Integration' },
    { key: 'nearby', label: 'Nearby Tasks' },
];

type ColorRuleRow = {
    id: string;
    fieldName: string;
    value: string;
    color: string;
};

type JobTypeComponent = {
    key: string;
    label: string;
    raw: any;
};

type JobTypeWithComponents = JobTypeSummary & {
    creationForm?: { components?: any[] };
    flattenedComponents: JobTypeComponent[];
};

type MetadataField = {
    key: string;
    name: string;
};

type UserSettingColumnRow = UserGridColumnSetting & {
    __sourceIndex: number;
};

function normalizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function humanize(raw: string): string {
    return raw
        .replace(/\./g, ' ')
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (m) => m.toUpperCase());
}

function nextValue(current: string, values: string[]): string {
    if (!values.length) return current;
    const idx = values.findIndex((v) => v === current);
    if (idx < 0) return values[0];
    return values[(idx + 1) % values.length];
}

function flattenFormioComponents(components: any[] | undefined, collector: JobTypeComponent[]) {
    if (!Array.isArray(components)) return;

    components.forEach((component) => {
        if (!component || typeof component !== 'object') return;

        const key = String(component.key || '').trim();
        const label = String(component.label || component.title || key).trim();
        if (key) {
            collector.push({ key, label: label || key, raw: component });
        }

        if (Array.isArray(component.components) && component.components.length) {
            flattenFormioComponents(component.components, collector);
        }

        if (Array.isArray(component.columns)) {
            component.columns.forEach((column: any) => {
                if (Array.isArray(column?.components)) {
                    flattenFormioComponents(column.components, collector);
                }
            });
        }

        if (Array.isArray(component.rows)) {
            component.rows.forEach((row: any[]) => {
                row.forEach((cell: any) => {
                    if (Array.isArray(cell?.components)) {
                        flattenFormioComponents(cell.components, collector);
                    }
                });
            });
        }
    });
}

function mapColorName(color: string): string {
    const c = String(color || '').toLowerCase();
    if (c === 'green') return '#79b37b';
    if (c === 'blue') return '#58a8db';
    if (c === 'yellow') return '#d6cf52';
    if (c === 'red') return '#d46a6a';
    if (c === 'orange') return '#dd9c58';
    return '#c7c7c7';
}

function SectionCard({
    title,
    children,
    darkHeader = false,
}: {
    title: string;
    children: React.ReactNode;
    darkHeader?: boolean;
}) {
    return (
        <View style={s.card}>
            <View style={[s.cardHeader, darkHeader ? s.cardHeaderDark : null]}>
                <Text style={[s.cardHeaderText, darkHeader ? s.cardHeaderTextDark : null]}>{title}</Text>
            </View>
            <View style={s.cardBody}>{children}</View>
        </View>
    );
}

function FieldRow({ label, right }: { label: string; right: React.ReactNode }) {
    return (
        <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>{label}</Text>
            <View style={s.fieldRight}>{right}</View>
        </View>
    );
}

export default function ApplicationSettingsPage() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [activeTab, setActiveTab] = useState<TabKey>('general');
    const [enableResponsiveMap, setEnableResponsiveMap] = useState(true);
    const [fingerprintAuth, setFingerprintAuth] = useState(false);
    const [showAssetsInMobile, setShowAssetsInMobile] = useState(true);
    const [workorderLoading, setWorkorderLoading] = useState(false);
    const [workorderError, setWorkorderError] = useState<string | null>(null);
    const [taskListInfo, setTaskListInfo] = useState<TaskListInfoResponse | null>(null);
    const [jobTypes, setJobTypes] = useState<JobTypeWithComponents[]>([]);
    const [selectedJobTypeId, setSelectedJobTypeId] = useState<number | null>(null);
    const [selectedCreateFormFields, setSelectedCreateFormFields] = useState<CreateFormField[]>([]);
    const [selectedUserSettingColumns, setSelectedUserSettingColumns] = useState<UserSettingColumnRow[]>([]);
    const [responsiveConfig, setResponsiveConfig] = useState<ResponsiveTaskListConfig | null>(null);
    const [selectedResponsiveFields, setSelectedResponsiveFields] = useState<ResponsiveTaskListField[]>([]);
    const [systemFields, setSystemFields] = useState<MetadataField[]>([]);
    const [headerFields, setHeaderFields] = useState<MetadataField[]>([]);
    const [isSavingWorkorder, setIsSavingWorkorder] = useState(false);
    const [taskHeaderLeft, setTaskHeaderLeft] = useState<string>('taskName');
    const [taskHeaderRight, setTaskHeaderRight] = useState<string>('taskStatus');
    const loadedWorkorderRef = useRef(false);

    const handleBack = useCallback(() => {
        try {
            if (typeof (router as any).canGoBack === 'function' && (router as any).canGoBack()) {
                router.back();
                return;
            }
        } catch {
            // no-op and fallback below
        }
        router.replace('/(tabs)');
    }, [router]);

    const isDesktop = width >= 1100;
    const twoColStyle = useMemo(() => (isDesktop ? s.grid2 : s.grid1), [isDesktop]);

    const fields = useMemo<TaskListInfoField[]>(
        () => (Array.isArray(taskListInfo?.fields) ? taskListInfo?.fields || [] : []),
        [taskListInfo]
    );

    const fieldOptions = useMemo(() => {
        const metadataKeys = headerFields.map((field) => field.key);
        const infoKeys = fields.map((field) => String(field?.name || '').trim()).filter(Boolean);
        const values = Array.from(new Set([...metadataKeys, ...infoKeys]));
        return values.length ? values : ['taskName', 'jobId', 'taskStatus'];
    }, [fields, headerFields]);

    const selectedJobType = useMemo(
        () => jobTypes.find((jobType) => jobType.id === selectedJobTypeId) || null,
        [jobTypes, selectedJobTypeId]
    );

    const selectedCreateFormKeySet = useMemo(
        () => new Set(selectedCreateFormFields.map((field) => normalizeKey(field.key))),
        [selectedCreateFormFields]
    );

    const selectedResponsiveKeySet = useMemo(
        () => new Set(selectedResponsiveFields.map((field) => normalizeKey(field.key))),
        [selectedResponsiveFields]
    );

    const availableCreateFormComponents = useMemo(() => {
        if (!selectedJobType) return [];
        return selectedJobType.flattenedComponents.filter((component) => !selectedCreateFormKeySet.has(normalizeKey(component.key)));
    }, [selectedCreateFormKeySet, selectedJobType]);

    const availableResponsiveCreateFormComponents = useMemo(() => {
        if (!selectedJobType) return [];
        return selectedJobType.flattenedComponents.filter((component) => !selectedResponsiveKeySet.has(normalizeKey(component.key)));
    }, [selectedJobType, selectedResponsiveKeySet]);

    const availableSystemFields = useMemo(
        () => systemFields.filter((field) => !selectedResponsiveKeySet.has(normalizeKey(field.key))),
        [selectedResponsiveKeySet, systemFields]
    );

    const colorRuleRows = useMemo<ColorRuleRow[]>(() => {
        const colorMappings = taskListInfo?.guiInstructions?.colorMapping;
        if (!Array.isArray(colorMappings) || colorMappings.length === 0) {
            return [
                { id: 'fallback-1', fieldName: 'status', value: 'Created', color: 'yellow' },
                { id: 'fallback-2', fieldName: 'status', value: 'Active', color: 'blue' },
                { id: 'fallback-3', fieldName: 'status', value: 'Finished', color: 'green' },
            ];
        }

        const rows: ColorRuleRow[] = [];
        colorMappings.forEach((mapping, mapIdx) => {
            const fieldName = String(mapping?.fieldName || 'status');
            const values = mapping?.values || {};
            Object.entries(values).forEach(([value, color], valueIdx) => {
                rows.push({
                    id: `cm-${mapIdx}-${valueIdx}`,
                    fieldName,
                    value: humanize(String(value)),
                    color: String(color),
                });
            });
        });

        return rows.length
            ? rows
            : [{ id: 'fallback-empty', fieldName: 'status', value: 'Created', color: 'yellow' }];
    }, [taskListInfo]);

    const loadWorkorderConfiguration = useCallback(async () => {
        setWorkorderLoading(true);
        setWorkorderError(null);
        try {
            const [infoResult, jobTypeResultRaw, createFormFieldsResult, metadataResult, configResult, userSettingsResult] = await Promise.allSettled([
                getTaskListInfo(),
                getAllJobTypesForConfiguration(),
                getCreateFormFields(),
                getResponsiveTaskListMetadata(true),
                getResponsiveTaskListConfig(),
                getUserSettings(GRID_SETTINGS_TYPE.JOB_TASK_GRID),
            ]);

            const info = infoResult.status === 'fulfilled' ? infoResult.value : null;
            const jobTypeResult = jobTypeResultRaw.status === 'fulfilled' ? jobTypeResultRaw.value : [];
            const createFormFields = createFormFieldsResult.status === 'fulfilled' ? createFormFieldsResult.value : [];
            const metadata = metadataResult.status === 'fulfilled' ? metadataResult.value : null;
            const config = configResult.status === 'fulfilled' ? configResult.value : null;
            const userSettings = userSettingsResult.status === 'fulfilled' ? userSettingsResult.value : null;

            console.log(
                '[ApplicationSettings][Workorder] user settings response:',
                JSON.stringify(userSettings, null, 2)
            );

            setTaskListInfo(info || null);
            const enrichedJobTypes = (jobTypeResult || []).map((jobType) => {
                const flattenedComponents: JobTypeComponent[] = [];
                flattenFormioComponents(jobType?.creationForm?.components, flattenedComponents);
                const dedupedComponents = flattenedComponents.filter((component, index, arr) =>
                    arr.findIndex((item) => normalizeKey(item.key) === normalizeKey(component.key)) === index
                );
                return {
                    ...jobType,
                    flattenedComponents: dedupedComponents,
                };
            }).filter((jobType) => jobType.flattenedComponents.length > 0);

            setJobTypes(enrichedJobTypes);
            setSelectedCreateFormFields(Array.isArray(createFormFields) ? createFormFields : []);
            const userColumns = Array.isArray(userSettings?.settings?.columns)
                ? userSettings!.settings.columns
                    .map((column, index) => ({
                        ...column,
                        __sourceIndex: index,
                    }))
                    .sort((a, b) => {
                        const aOrder = a?.order ?? a?.index ?? a?.position;
                        const bOrder = b?.order ?? b?.index ?? b?.position;
                        if (aOrder === undefined && bOrder === undefined) {
                            return a.__sourceIndex - b.__sourceIndex;
                        }
                        if (aOrder === undefined) return 1;
                        if (bOrder === undefined) return -1;
                        return Number(aOrder) - Number(bOrder);
                    })
                : [];
            console.log(
                '[ApplicationSettings][Workorder] user settings columns:',
                userColumns.length,
                userColumns.map((column) => column.name || column.key || column.field || column.columnKey)
            );
            setSelectedUserSettingColumns(userColumns);
            setResponsiveConfig(config || {});
            setSelectedResponsiveFields(Array.isArray(config?.fields) ? config.fields : []);

            const conditionalAttributes = metadata?.conditionalAttributes || {};
            const nextHeaderFields = Object.keys(conditionalAttributes)
                .map((key) => ({
                    key,
                    name: String(conditionalAttributes[key]?.name || key),
                    phone: conditionalAttributes[key]?.format === 'tel',
                }))
                .filter((field) => !field.phone)
                .map(({ key, name }) => ({ key, name }));
            const nextSystemFields = Object.keys(conditionalAttributes)
                .filter((key) => !key.startsWith('createForm'))
                .map((key) => ({
                    key: `systemField.${key}`,
                    name: String(conditionalAttributes[key]?.name || key),
                }));

            setHeaderFields(nextHeaderFields);
            setSystemFields(nextSystemFields);
            setTaskHeaderLeft(config?.responsiveTaskListHeaderPrimaryTitle || nextHeaderFields[0]?.key || 'taskName');
            setTaskHeaderRight(config?.responsiveTaskListHeaderSecondaryTitle || nextHeaderFields[1]?.key || nextHeaderFields[0]?.key || 'taskStatus');

            if (enrichedJobTypes.length > 0) {
                setSelectedJobTypeId((prev) => {
                    if (prev && enrichedJobTypes.some((jobType) => jobType.id === prev)) return prev;
                    return enrichedJobTypes[0].id;
                });
            }

            const failedSources: string[] = [];
            if (infoResult.status === 'rejected') failedSources.push(`task list info (${infoResult.reason?.message || 'request failed'})`);
            if (jobTypeResultRaw.status === 'rejected') failedSources.push(`job types (${jobTypeResultRaw.reason?.message || 'request failed'})`);
            if (userSettingsResult.status === 'rejected') failedSources.push(`user settings (${userSettingsResult.reason?.message || 'request failed'})`);

            const hasAnyWorkorderData =
                enrichedJobTypes.length > 0 ||
                userColumns.length > 0 ||
                Object.keys(conditionalAttributes).length > 0 ||
                (Array.isArray(config?.fields) && config.fields.length > 0);

            if (!hasAnyWorkorderData) {
                setWorkorderError('Could not load Workorder Configuration from the current API.');
            } else if (failedSources.length > 0) {
                setWorkorderError(`Some Workorder Configuration sources are unavailable on this API: ${failedSources.join(', ')}.`);
            }
        } catch (err: any) {
            console.log('[ApplicationSettings][Workorder] load failed:', err?.response?.status, err?.response?.data || err?.message);
            setWorkorderError('Could not load Workorder Configuration from API.');
        } finally {
            setWorkorderLoading(false);
        }
    }, []);

    const addCreateFormField = useCallback((component: JobTypeComponent) => {
        if (!selectedJobType) return;
        setSelectedCreateFormFields((prev) => {
            if (prev.some((field) => normalizeKey(field.key) === normalizeKey(component.key))) return prev;
            return [
                ...prev,
                {
                    key: component.key,
                    name: component.label,
                    jobTypeId: selectedJobType.id,
                    jobTypeName: selectedJobType.name,
                    isResponsive: false,
                    isDate: !!component.raw?.datePicker,
                    order: prev.length,
                    format: component.raw?.format,
                },
            ];
        });
    }, [selectedJobType]);

    const addResponsiveField = useCallback((field: MetadataField) => {
        setSelectedResponsiveFields((prev) => {
            if (prev.some((item) => normalizeKey(item.key) === normalizeKey(field.key))) return prev;
            return [
                ...prev,
                {
                    key: field.key,
                    name: field.name,
                    order: prev.length,
                    rowNumber: 0,
                },
            ];
        });
    }, []);

    const removeResponsiveField = useCallback((key: string) => {
        setSelectedResponsiveFields((prev) => prev.filter((field) => normalizeKey(field.key) !== normalizeKey(key)));
    }, []);

    const saveWorkorderGridSelection = useCallback(async () => {
        if (isSavingWorkorder) return;
        try {
            setIsSavingWorkorder(true);
            const nonResponsiveFields = selectedCreateFormFields.map((field, index) => ({
                ...field,
                order: index,
                isResponsive: false,
            }));
            const responsiveFields = selectedResponsiveFields.map((field, index) => ({
                ...field,
                order: index,
                rowNumber: 0,
            }));

            const [savedCreateFormFields, savedResponsiveConfig] = await Promise.all([
                saveCreateFormFields(nonResponsiveFields),
                saveResponsiveTaskListConfig({
                    ...(responsiveConfig || {}),
                    fields: responsiveFields,
                    responsiveTaskListHeaderPrimaryTitle: taskHeaderLeft,
                    responsiveTaskListHeaderSecondaryTitle: taskHeaderRight,
                }),
            ]);

            setSelectedCreateFormFields(savedCreateFormFields);
            setResponsiveConfig(savedResponsiveConfig);
            setSelectedResponsiveFields(Array.isArray(savedResponsiveConfig?.fields) ? savedResponsiveConfig.fields : []);

            console.log('[ApplicationSettings][Workorder] configuration saved.');
        } catch (err: any) {
            console.log('[ApplicationSettings][Workorder] save failed:', err?.response?.status, err?.response?.data || err?.message);
            setWorkorderError('Could not save Workorder Configuration.');
        } finally {
            setIsSavingWorkorder(false);
        }
    }, [isSavingWorkorder, responsiveConfig, selectedCreateFormFields, selectedResponsiveFields, taskHeaderLeft, taskHeaderRight]);

    useEffect(() => {
        if (activeTab !== 'workorder' || loadedWorkorderRef.current) return;
        loadedWorkorderRef.current = true;
        loadWorkorderConfiguration();
    }, [activeTab, loadWorkorderConfiguration]);

    return (
        <SafeAreaView style={s.container}>
            <View style={s.topBar}>
                <TouchableOpacity style={s.backBtn} onPress={handleBack}>
                    <Ionicons name="arrow-back-outline" size={20} color="#fff" />
                    <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>Application Settings</Text>
                <TouchableOpacity style={s.saveBtn}>
                    <Text style={s.saveText}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal style={s.tabRow} contentContainerStyle={s.tabRowContent} showsHorizontalScrollIndicator={false}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[s.tabBtn, activeTab === tab.key ? s.tabBtnActive : null]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text numberOfLines={1} style={[s.tabText, activeTab === tab.key ? s.tabTextActive : null]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView contentContainerStyle={s.content}>
                {activeTab === 'general' && (
                    <SectionCard title="Application General Settings">
                        <FieldRow label="Supported Languages" right={<TextInput style={s.input} defaultValue="en, de, pl" />} />
                        <FieldRow label="Default Language" right={<TextInput style={s.input} defaultValue="en" />} />
                        <FieldRow label="Theme" right={<TextInput style={s.input} defaultValue="Light Green" />} />
                    </SectionCard>
                )}

                {activeTab === 'workorder' && (
                    <View style={s.workorderContainer}>
                        <SectionCard title="Job types workorder fields" darkHeader>
                            {workorderLoading ? (
                                <View style={s.workorderLoading}>
                                    <ActivityIndicator size="small" color="#1f2640" />
                                    <Text style={s.workorderLoadingText}>Loading configuration...</Text>
                                </View>
                            ) : null}

                            {workorderError ? (
                                <View style={s.workorderErrorBar}>
                                    <Text style={s.workorderErrorText}>{workorderError}</Text>
                                    <TouchableOpacity onPress={loadWorkorderConfiguration}>
                                        <Text style={s.workorderRetry}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            <View style={[s.workorderSplit, isDesktop ? s.workorderSplitDesktop : null]}>
                                <View style={s.workorderPaneLeft}>
                                    <ScrollView horizontal style={s.jobTypeTabs} contentContainerStyle={s.jobTypeTabsContent}>
                                        {jobTypes.map((jt) => {
                                            const name = String(jt?.name || 'NRM').trim() || 'NRM';
                                            const selected = selectedJobTypeId === jt.id;
                                            return (
                                                <TouchableOpacity
                                                    key={`${jt.id}-${name}`}
                                                    style={[s.jobTypeChip, selected ? s.jobTypeChipSelected : null]}
                                                    onPress={() => setSelectedJobTypeId(jt.id)}
                                                >
                                                    <Text style={[s.jobTypeChipText, selected ? s.jobTypeChipTextSelected : null]}>{name}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                    <ScrollView style={s.paneScroller} contentContainerStyle={s.paneScrollerContent}>
                                        {availableCreateFormComponents.length === 0 ? (
                                            <View style={s.emptyAttributeRow}>
                                                <Text style={s.emptyAttributeText}>No available create form fields for this job type.</Text>
                                            </View>
                                        ) : (
                                            availableCreateFormComponents.map((item) => (
                                                <View key={`left-${item.key}`} style={s.workorderMapRow}>
                                                    <Text numberOfLines={1} style={s.workorderMapRowText}>
                                                        {item.label} : {item.key}
                                                    </Text>
                                                    <TouchableOpacity style={s.iconActionBtn} onPress={() => addCreateFormField(item)}>
                                                        <Ionicons name="add-outline" size={16} color="#111" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))
                                        )}
                                    </ScrollView>
                                </View>
                                <View style={s.workorderPaneRight}>
                                    <View style={s.paneInfoBar}>
                                        <Text style={s.paneInfoText}>Columns: {selectedUserSettingColumns.length}</Text>
                                    </View>
                                    {Platform.OS === 'web' ? (
                                        <View style={s.userSettingsWebScroll}>
                                            {selectedUserSettingColumns.length === 0 ? (
                                                <View style={s.emptyAttributeRow}>
                                                    <Text style={s.emptyAttributeText}>No columns found in user settings.</Text>
                                                </View>
                                            ) : (
                                                selectedUserSettingColumns.map((item, index) => (
                                                    <View key={`right-${item.name || item.key || item.columnKey || index}`} style={s.workorderMapRow}>
                                                        <Text numberOfLines={1} style={s.workorderMapRowText}>
                                                            {String(item.name || item.key || item.field || item.columnKey || '').trim()}
                                                        </Text>
                                                        <Text style={[s.columnVisibilityTag, item.visible === false || item.hidden === true ? s.columnVisibilityTagHidden : null]}>
                                                            {item.visible === false || item.hidden === true ? 'Hidden' : 'Visible'}
                                                        </Text>
                                                    </View>
                                                ))
                                            )}
                                        </View>
                                    ) : (
                                        <ScrollView
                                            style={s.userSettingsNativeScroll}
                                            contentContainerStyle={s.paneScrollerContent}
                                            showsVerticalScrollIndicator
                                            nestedScrollEnabled
                                        >
                                            {selectedUserSettingColumns.length === 0 ? (
                                                <View style={s.emptyAttributeRow}>
                                                    <Text style={s.emptyAttributeText}>No columns found in user settings.</Text>
                                                </View>
                                            ) : (
                                                selectedUserSettingColumns.map((item, index) => (
                                                    <View key={`right-${item.name || item.key || item.columnKey || index}`} style={s.workorderMapRow}>
                                                        <Text numberOfLines={1} style={s.workorderMapRowText}>
                                                            {String(item.name || item.key || item.field || item.columnKey || '').trim()}
                                                        </Text>
                                                        <Text style={[s.columnVisibilityTag, item.visible === false || item.hidden === true ? s.columnVisibilityTagHidden : null]}>
                                                            {item.visible === false || item.hidden === true ? 'Hidden' : 'Visible'}
                                                        </Text>
                                                    </View>
                                                ))
                                            )}
                                        </ScrollView>
                                    )}
                                </View>
                            </View>
                        </SectionCard>

                        <SectionCard title="Responsive TaskList Fields" darkHeader>
                            <View style={[s.workorderSplit, isDesktop ? s.workorderSplitDesktop : null]}>
                                <View style={s.workorderPaneLeft}>
                                    <View style={s.jobTypeRow}>
                                        <Text style={s.jobTypeText}>{selectedJobType?.name || 'No Job Type'}</Text>
                                    </View>
                                    <ScrollView style={s.paneScroller} contentContainerStyle={s.paneScrollerContent}>
                                        {availableResponsiveCreateFormComponents.map((field) => (
                                            <View key={`responsive-create-${field.key}`} style={s.workorderMapRow}>
                                                <Text numberOfLines={1} style={s.workorderMapRowText}>
                                                    {field.label} : {field.key}
                                                </Text>
                                                <TouchableOpacity style={s.iconActionBtn} onPress={() => addResponsiveField({ key: field.key, name: field.label })}>
                                                    <Ionicons name="add-outline" size={16} color="#111" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    <View style={s.jobTypeRow}>
                                        <Text style={s.jobTypeText}>SYSTEM FIELDS</Text>
                                    </View>
                                        {availableSystemFields.map((field) => (
                                            <View key={`system-${field.key}`} style={s.workorderMapRow}>
                                                <Text numberOfLines={1} style={s.workorderMapRowText}>
                                                    {field.name} : {field.key}
                                                </Text>
                                                <TouchableOpacity style={s.iconActionBtn} onPress={() => addResponsiveField(field)}>
                                                    <Ionicons name="add-outline" size={16} color="#111" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                                <View style={s.workorderPaneRight}>
                                    <Text style={s.selectedFieldsTitle}>Selected fields</Text>
                                    <ScrollView style={s.paneScroller} contentContainerStyle={s.paneScrollerContent}>
                                        {selectedResponsiveFields.length === 0 ? (
                                            <View style={s.emptyAttributeRow}>
                                                <Text style={s.emptyAttributeText}>No responsive fields selected.</Text>
                                            </View>
                                        ) : selectedResponsiveFields.map((field) => (
                                            <View key={`${field.key}`} style={s.workorderMapRow}>
                                                <Text style={s.selectedFieldText}>{field.name} : {field.key}</Text>
                                                <TouchableOpacity style={s.iconActionBtn} onPress={() => removeResponsiveField(field.key)}>
                                                    <Ionicons name="close-outline" size={17} color="#111" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </SectionCard>

                        <SectionCard title="Task Headers" darkHeader>
                            <View style={[s.workorderSplit, isDesktop ? s.workorderSplitDesktop : null]}>
                                <TouchableOpacity
                                    style={s.selectLike}
                                    onPress={() => setTaskHeaderLeft((prev) => nextValue(prev, fieldOptions))}
                                >
                                    <Text style={s.selectLikeText}>{taskHeaderLeft || 'Select header field'}</Text>
                                    <Ionicons name="chevron-down-outline" size={16} color="#111" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={s.selectLike}
                                    onPress={() => setTaskHeaderRight((prev) => nextValue(prev, fieldOptions))}
                                >
                                    <Text style={s.selectLikeText}>{taskHeaderRight || 'Select secondary field'}</Text>
                                    <Ionicons name="chevron-down-outline" size={16} color="#111" />
                                </TouchableOpacity>
                            </View>
                            <Text style={s.selectHint}>Tap each selector to cycle through available fields.</Text>
                        </SectionCard>

                        <SectionCard title="Task/workorder list color rules" darkHeader>
                            <ScrollView style={s.paneScroller} contentContainerStyle={s.paneScrollerContent}>
                                {colorRuleRows.map((rule) => (
                                    <View key={rule.id} style={s.colorRuleRow}>
                                        <View style={[s.colorSwatch, { backgroundColor: mapColorName(rule.color) }]}>
                                            <Text style={s.colorSwatchText}>Aa</Text>
                                        </View>
                                        <Text style={s.colorRuleText} numberOfLines={1}>
                                            {humanize(rule.fieldName)} == {rule.value}
                                        </Text>
                                        <TouchableOpacity style={s.iconActionBtn}>
                                            <Ionicons name="settings-outline" size={15} color="#111" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={s.iconActionBtn}>
                                            <Ionicons name="close-outline" size={17} color="#111" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        </SectionCard>

                        <View style={s.workorderFooter}>
                            <TouchableOpacity
                                style={[s.footerSaveBtn, isSavingWorkorder ? s.footerSaveBtnDisabled : null]}
                                disabled={isSavingWorkorder}
                                onPress={saveWorkorderGridSelection}
                            >
                                <Text style={s.footerSaveText}>{isSavingWorkorder ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {activeTab === 'global-map' && (
                    <View style={twoColStyle}>
                        <SectionCard title="Map Layers & Extent">
                            <FieldRow label="Enable Responsive Map" right={<Switch value={enableResponsiveMap} onValueChange={setEnableResponsiveMap} />} />
                            <FieldRow label="Base Layer Title" right={<TextInput style={s.input} defaultValue="Streets" />} />
                            <FieldRow label="Portal Item ID" right={<TextInput style={s.input} defaultValue="abc123" />} />
                            <FieldRow label="Dynamic Layer URL" right={<TextInput style={s.input} defaultValue="https://..." />} />
                            <FieldRow label="Initial Extent WKID" right={<TextInput style={s.input} defaultValue="3857" />} />
                        </SectionCard>
                        <SectionCard title="Map Preview">
                            <View style={s.mapMock}>
                                <Ionicons name="map-outline" size={34} color="#0f569b" />
                                <Text style={s.mapMockText}>Configuration Map</Text>
                            </View>
                        </SectionCard>
                    </View>
                )}

                {activeTab === 'mobile-app' && (
                    <View style={twoColStyle}>
                        <SectionCard title="Mobile App General">
                            <FieldRow label="Fingerprint Authentication" right={<Switch value={fingerprintAuth} onValueChange={setFingerprintAuth} />} />
                            <FieldRow label="Show Assets In Mobile" right={<Switch value={showAssetsInMobile} onValueChange={setShowAssetsInMobile} />} />
                            <FieldRow label="Distance Change" right={<TextInput style={s.input} defaultValue="50" />} />
                            <FieldRow label="Idle Period" right={<TextInput style={s.input} defaultValue="120" />} />
                        </SectionCard>
                        <SectionCard title="Bindings & Quick Filters">
                            <FieldRow label="Title Field" right={<TextInput style={s.input} defaultValue="taskName" />} />
                            <FieldRow label="Bottom Field" right={<TextInput style={s.input} defaultValue="jobId" />} />
                            <FieldRow label="Top-Right Field" right={<TextInput style={s.input} defaultValue="taskStatus" />} />
                            <FieldRow label="Quick Filter" right={<TextInput style={s.input} defaultValue="Task status = New" />} />
                        </SectionCard>
                    </View>
                )}

                {['event-calendar', 'portal', 'custom-headers', 'translations', 'a3', 'nearby'].includes(activeTab) && (
                    <SectionCard title={TABS.find((t) => t.key === activeTab)?.label || 'Settings'}>
                        <Text style={s.placeholderText}>
                            This section is prepared for desktop and mobile. We can now wire real API data/actions for this tab.
                        </Text>
                    </SectionCard>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#dde2e9' },
    topBar: {
        backgroundColor: '#12a6e3',
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    backText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    title: { color: '#fff', fontSize: 16, fontWeight: '700' },
    saveBtn: { backgroundColor: '#0d4d8b', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6 },
    saveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    tabRow: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#1f2438',
        minHeight: 56,
        maxHeight: 56,
        flexGrow: 0,
    },
    tabRowContent: {
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 8,
        alignItems: 'center',
    },
    tabBtn: {
        backgroundColor: '#f5f6f7',
        borderRadius: 0,
        borderWidth: 1,
        borderColor: '#d5d8df',
        paddingHorizontal: 12,
        height: 40,
        minHeight: 40,
        maxHeight: 40,
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    tabBtnActive: {
        backgroundColor: '#22263b',
        borderColor: '#22263b',
    },
    tabText: { color: '#2f3548', fontSize: 12, fontWeight: '500' },
    tabTextActive: { color: '#fff' },
    content: { padding: 12, gap: 12, paddingBottom: 24 },
    grid1: { gap: 12 },
    grid2: { flexDirection: 'row', gap: 12 },
    card: {
        flex: 1,
        backgroundColor: '#e6e6e6',
        borderRadius: 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#cfd3d8',
    },
    cardHeader: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#d4d9e1',
    },
    cardHeaderDark: {
        backgroundColor: '#24293f',
        borderBottomColor: '#1d2234',
    },
    cardHeaderText: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
    cardHeaderTextDark: { color: '#fff' },
    cardBody: { paddingHorizontal: 8, paddingVertical: 8, gap: 10 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    fieldLabel: { color: '#334155', fontSize: 12, flex: 1 },
    fieldRight: { minWidth: 140, maxWidth: '58%' },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#dbe4ef',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 12,
        color: '#0f172a',
    },
    mapMock: {
        height: 260,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#9db8d7',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f8ff',
    },
    mapMockText: { marginTop: 8, color: '#0f569b', fontSize: 12, fontWeight: '600' },
    placeholderText: { color: '#475569', fontSize: 13, lineHeight: 18 },
    workorderContainer: { gap: 10 },
    workorderLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
    workorderLoadingText: { color: '#3f465d', fontSize: 12, fontWeight: '600' },
    workorderErrorBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fbe8e8',
        borderWidth: 1,
        borderColor: '#efc6c6',
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    workorderErrorText: { color: '#8f2c2c', fontSize: 12, flex: 1 },
    workorderRetry: { color: '#0f569b', fontSize: 12, fontWeight: '700' },
    workorderSplit: { gap: 8 },
    workorderSplitDesktop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    workorderPaneLeft: {
        flex: 1,
        minHeight: 180,
        borderWidth: 1,
        borderColor: '#d0d5db',
        backgroundColor: '#ececec',
    },
    workorderPaneRight: {
        flex: 1,
        minHeight: 180,
        borderWidth: 1,
        borderColor: '#d0d5db',
        backgroundColor: '#ececec',
    },
    jobTypeTabs: {
        maxHeight: 44,
        borderBottomWidth: 1,
        borderBottomColor: '#d0d5db',
        backgroundColor: '#e7eaef',
    },
    jobTypeTabsContent: {
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    jobTypeChip: {
        borderWidth: 1,
        borderColor: '#c7ced8',
        backgroundColor: '#f2f4f7',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    jobTypeChipSelected: {
        backgroundColor: '#dde8f7',
        borderColor: '#8fa8cc',
    },
    jobTypeChipText: {
        fontSize: 12,
        color: '#2e3340',
        fontWeight: '600',
    },
    jobTypeChipTextSelected: {
        color: '#122643',
        fontWeight: '700',
    },
    paneScroller: {
        maxHeight: 320,
        flexGrow: 0,
    },
    paneScrollerContent: {
        paddingBottom: 20,
    },
    paneInfoBar: {
        minHeight: 30,
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#d5d5d5',
        backgroundColor: '#e7eaef',
    },
    paneInfoText: {
        color: '#374151',
        fontSize: 11,
        fontWeight: '700',
    },
    userSettingsWebScroll: {
        height: 420,
        maxHeight: 420,
        overflow: 'scroll',
    },
    userSettingsNativeScroll: {
        height: 420,
        maxHeight: 420,
        paddingBottom: 20,
    },
    jobTypeRow: {
        minHeight: 34,
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#d5d5d5',
        backgroundColor: '#ececec',
    },
    jobTypeRowSelected: { backgroundColor: '#dfe7f0' },
    jobTypeText: { color: '#333', fontSize: 12, fontWeight: '500' },
    jobTypeTextSelected: { color: '#102845', fontWeight: '700' },
    workorderMapRow: {
        minHeight: 34,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#d7d7d7',
        backgroundColor: '#ececec',
        paddingHorizontal: 8,
        gap: 8,
    },
    workorderMapRowText: { flex: 1, color: '#222', fontSize: 12 },
    columnVisibilityTag: {
        borderWidth: 1,
        borderColor: '#96b2d1',
        backgroundColor: '#e2edf8',
        color: '#12385f',
        fontSize: 10,
        fontWeight: '700',
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    columnVisibilityTagHidden: {
        borderColor: '#c9cfd8',
        backgroundColor: '#eef1f4',
        color: '#677284',
    },
    emptyAttributeRow: {
        minHeight: 40,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    emptyAttributeText: {
        color: '#60667a',
        fontSize: 12,
        fontStyle: 'italic',
    },
    iconActionBtn: {
        width: 24,
        height: 24,
        borderWidth: 1,
        borderColor: '#cfd4dc',
        backgroundColor: '#f1f1f1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedFieldsTitle: {
        color: '#2f3449',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 6,
        marginBottom: 4,
        marginHorizontal: 8,
    },
    selectedFieldRow: {
        minHeight: 30,
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#d7d7d7',
        paddingHorizontal: 8,
    },
    selectedFieldText: { color: '#232323', fontSize: 12 },
    selectLike: {
        flex: 1,
        minHeight: 34,
        borderWidth: 1,
        borderColor: '#cfd4dc',
        backgroundColor: '#f7f7f7',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    selectLikeText: { color: '#242424', fontSize: 12 },
    selectHint: { color: '#596279', fontSize: 11, fontStyle: 'italic' },
    colorRuleRow: {
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#d6d6d6',
        backgroundColor: '#ececec',
        paddingHorizontal: 8,
        gap: 8,
    },
    colorSwatch: {
        width: 22,
        height: 22,
        borderWidth: 1,
        borderColor: '#afb5bc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorSwatchText: { fontSize: 11, color: '#1d232f' },
    colorRuleText: { flex: 1, fontSize: 12, color: '#202020' },
    workorderFooter: { flexDirection: 'row', justifyContent: 'flex-start' },
    footerSaveBtn: {
        backgroundColor: '#1f2438',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 0,
    },
    footerSaveBtnDisabled: {
        opacity: 0.7,
    },
    footerSaveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
