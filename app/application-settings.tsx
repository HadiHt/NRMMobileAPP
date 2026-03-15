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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    getAllJobTypesForConfiguration,
    getTaskListInfo,
    JobTypeSummary,
    TaskListInfoField,
    TaskListInfoResponse,
} from '../src/api/settingsService';
import { getTaskList } from '../src/api/taskService';
import { getJobDetails } from '../src/api/jobService';
import {
    getUserSettings,
    GRID_SETTINGS_TYPE,
    saveUserSettings,
    UserGridColumnSetting,
    UserSettingsModel,
} from '../src/api/userSettingsService';

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

type AttributeItem = {
    key: string;
    label: string;
    displayKey?: string;
    source: 'tasklist-info' | 'task-data' | 'create-form' | 'web-parts' | 'grid-settings';
};

const FALLBACK_WORKORDER_ROWS = [
    { left: 'ID', right: 'standard.id' },
    { left: 'Job', right: 'standard.jobId' },
    { left: 'Task name', right: 'standard.taskName' },
    { left: 'Scheduled start', right: 'standard.scheduledStart' },
    { left: 'Scheduled to', right: 'standard.scheduledTo' },
    { left: 'Duration', right: 'standard.duration' },
    { left: 'Accept date', right: 'standard.acceptDate' },
    { left: 'Custom Workorder Status', right: 'standard.customWorkorderStatus' },
    { left: 'Assignees', right: 'standard.assignees' },
    { left: 'Accepted by', right: 'standard.acceptedBy.fullName' },
    { left: 'Job Type', right: 'standard.typeName' },
    { left: 'Priority', right: 'standard.priority' },
];

const GRID_DEFAULT_COLUMN_WIDTH = 190;
const LOCKED_TASKLIST_KEYS = new Set(['taskId', 'jobId', 'taskName', 'jobTypeName'].map(normalizeKey));
const ENABLEABLE_BASE_COLUMNS: { key: string; label: string }[] = [
    { key: 'assignees', label: 'Assignees' },
    { key: 'areaName', label: 'Area Name' },
    { key: 'plannedStartDate', label: 'Planned Start' },
    { key: 'plannedEndDate', label: 'Planned End' },
    { key: 'currentState', label: 'Current State' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'projectProgress', label: 'Project Progress' },
    { key: 'createdBy', label: 'Created By' },
    { key: 'address', label: 'Address' },
];
const ENABLEABLE_BASE_KEY_SET = new Set(ENABLEABLE_BASE_COLUMNS.map((c) => normalizeKey(c.key)));
const SETTINGS_KEY_TO_TASKLIST_KEY: Record<string, string> = {
    id: 'taskId',
    taskid: 'taskId',
    jobid: 'jobId',
    taskname: 'taskName',
    typename: 'jobTypeName',
    jobtypename: 'jobTypeName',
    assignees: 'assignees',
    currentstate: 'currentState',
    dataareaname: 'areaName',
    areaname: 'areaName',
    dataplannedprojectstartdate: 'plannedStartDate',
    plannedprojectstartdate: 'plannedStartDate',
    dataplannedprojectenddate: 'plannedEndDate',
    plannedprojectenddate: 'plannedEndDate',
    dataprojectid: 'projectId',
    projectid: 'projectId',
    dataaddresswp: 'address',
    addresswp: 'address',
    dataprojectprogress: 'projectProgress',
    projectprogress: 'projectProgress',
};

function normalizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function createFormColumnKey(rawKey: string): string {
    return `cfv_${normalizeKey(rawKey)}`;
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

function shortAttributeKey(raw: string): string {
    if (/^cfv_/i.test(raw)) return humanize(raw.replace(/^cfv_/i, ''));
    return raw
        .replace(/^data\./i, '')
        .replace(/^createFormValues\./i, '')
        .replace(/^creationForm\./i, '')
        .replace(/^webParts\./i, '');
}

function resolveToTaskListColumnKey(rawSettingsKey: string): string {
    const raw = String(rawSettingsKey || '').trim();
    if (!raw) return '';
    const normalized = normalizeKey(raw);

    if (SETTINGS_KEY_TO_TASKLIST_KEY[normalized]) {
        return SETTINGS_KEY_TO_TASKLIST_KEY[normalized];
    }

    if (/^data\./i.test(raw)) {
        return createFormColumnKey(raw.slice(5));
    }

    if (raw.toLowerCase().startsWith('cfv_')) return raw;
    return raw;
}

function readSettingsColumnKey(col: UserGridColumnSetting): string {
    const raw = col?.name ?? col?.key ?? col?.field ?? col?.columnKey ?? '';
    return String(raw || '').trim();
}

function readSettingsColumnOrder(col: UserGridColumnSetting): number {
    const value = Number(col?.order ?? col?.index ?? col?.position ?? Number.MAX_SAFE_INTEGER);
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function isSettingsColumnVisible(col: UserGridColumnSetting): boolean {
    if (typeof col?.visible === 'boolean') return col.visible;
    if (typeof col?.hidden === 'boolean') return !col.hidden;
    return true;
}

function addAttribute(
    map: Map<string, AttributeItem>,
    key: string,
    label: string,
    source: AttributeItem['source'],
    displayKey?: string
) {
    const safeKey = String(key || '').trim();
    if (!safeKey) return;
    const n = normalizeKey(safeKey);
    if (map.has(n)) return;
    map.set(n, {
        key: safeKey,
        label: label.trim() || humanize(shortAttributeKey(safeKey)),
        displayKey,
        source,
    });
}

function flattenCreateFormValueKeys(
    value: any,
    collector: Set<string>,
    path = '',
    depth = 0
) {
    if (depth > 4 || value === null || value === undefined) return;

    if (typeof value === 'string') {
        const text = value.trim();
        if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
            try {
                flattenCreateFormValueKeys(JSON.parse(text), collector, path, depth + 1);
                return;
            } catch {
                // ignore malformed json-like strings
            }
        }
        if (path) collector.add(path);
        return;
    }

    if (typeof value !== 'object') {
        if (path) collector.add(path);
        return;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return;
        const isKvArray = value.every((item) => {
            if (!item || typeof item !== 'object') return false;
            const key = item.key ?? item.Key ?? item.name ?? item.Name ?? item.field ?? item.Field;
            return typeof key === 'string';
        });
        if (isKvArray) {
            value.forEach((item) => {
                const key = item.key ?? item.Key ?? item.name ?? item.Name ?? item.field ?? item.Field;
                const next = path ? `${path}.${key}` : String(key);
                const val = item.value ?? item.Value ?? item.val ?? item.Val;
                flattenCreateFormValueKeys(val, collector, next, depth + 1);
            });
            return;
        }
        value.slice(0, 6).forEach((item, idx) => {
            const next = path ? `${path}.${idx + 1}` : String(idx + 1);
            flattenCreateFormValueKeys(item, collector, next, depth + 1);
        });
        return;
    }

    Object.entries(value).forEach(([k, v]) => {
        const next = path ? `${path}.${k}` : k;
        flattenCreateFormValueKeys(v, collector, next, depth + 1);
    });
}

function tryGetCreateFormValues(job: any): any {
    const candidates = [
        job?.createFormValues,
        job?.CreateFormValues,
        job?.creationFormValues,
        job?.CreationFormValues,
        job?.createForm?.values,
        job?.CreateForm?.Values,
        job?.CreationForm,
        job?.CreationForm?.values,
        job?.CreationForm?.Values,
    ];
    for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof candidate === 'string') {
            const text = candidate.trim();
            if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
                try {
                    return JSON.parse(text);
                } catch {
                    return null;
                }
            }
            return null;
        }
        if (typeof candidate === 'object') return candidate;
    }
    return null;
}

function getBindingValue(bindings: Record<string, string>, candidates: string[]): string {
    const entries = Object.entries(bindings || {});
    for (const candidate of candidates) {
        const normalizedCandidate = normalizeKey(candidate);
        const found = entries.find(([k]) => normalizeKey(k) === normalizedCandidate);
        if (found?.[1]) return found[1];
    }
    return '';
}

function nextValue(current: string, values: string[]): string {
    if (!values.length) return current;
    const idx = values.findIndex((v) => v === current);
    if (idx < 0) return values[0];
    return values[(idx + 1) % values.length];
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
    const [jobTypes, setJobTypes] = useState<JobTypeSummary[]>([]);
    const [selectedJobType, setSelectedJobType] = useState<string>('NRM');
    const [allAttributes, setAllAttributes] = useState<AttributeItem[]>([]);
    const [selectedGridAttributes, setSelectedGridAttributes] = useState<AttributeItem[]>([]);
    const [taskGridSettingsModel, setTaskGridSettingsModel] = useState<UserSettingsModel | null>(null);
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
        const values = fields
            .map((f) => String(f?.name || '').trim())
            .filter(Boolean);
        return values.length ? values : ['taskName', 'jobId', 'taskStatus'];
    }, [fields]);

    const selectedGridSet = useMemo(
        () => new Set(selectedGridAttributes.map((item) => normalizeKey(item.key))),
        [selectedGridAttributes]
    );

    const availableAttributes = useMemo(
        () => allAttributes.filter((item) => !selectedGridSet.has(normalizeKey(item.key))),
        [allAttributes, selectedGridSet]
    );

    const responsiveFieldRows = useMemo(() => {
        if (selectedGridAttributes.length > 0) {
            return selectedGridAttributes
                .slice(0, 16)
                .map((f) => `${f.label} : ${f.displayKey || shortAttributeKey(f.key)}`);
        }
        return FALLBACK_WORKORDER_ROWS.slice(0, 8).map((r) => `${r.left} : ${shortAttributeKey(r.right)}`);
    }, [selectedGridAttributes]);

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
            const [info, jobTypeResult, gridSettings, tasks] = await Promise.all([
                getTaskListInfo(),
                getAllJobTypesForConfiguration(),
                getUserSettings(GRID_SETTINGS_TYPE.JOB_TASK_GRID),
                getTaskList().catch(() => []),
            ]);

            setTaskListInfo(info || null);
            setJobTypes(jobTypeResult || []);
            setTaskGridSettingsModel(gridSettings);

            const names = (jobTypeResult || [])
                .map((jt) => String(jt?.name || '').trim())
                .filter(Boolean);
            if (names.length > 0) {
                setSelectedJobType((prev) => (names.includes(prev) ? prev : names[0]));
            }

            const bindings = info?.guiInstructions?.taskItemBindings || {};
            const left = getBindingValue(bindings, ['title', 'taskName', 'middle', 'middle_1']);
            const right = getBindingValue(bindings, ['top-right', 'topRight', 'top-Right', 'middle_2']);

            if (left) setTaskHeaderLeft(left);
            if (right) setTaskHeaderRight(right);

            const attributeMap = new Map<string, AttributeItem>();

            // 1) Add known enableable Task List base columns
            ENABLEABLE_BASE_COLUMNS.forEach((col) => {
                addAttribute(attributeMap, col.key, col.label, 'tasklist-info');
            });

            // 2) Add mapped fields from task-list-info if they resolve to enableable keys
            (info?.fields || []).forEach((f) => {
                const rawName = String(f?.name || '').trim();
                if (!rawName) return;
                const resolved = resolveToTaskListColumnKey(rawName);
                if (!resolved) return;
                if (LOCKED_TASKLIST_KEYS.has(normalizeKey(resolved))) return;
                const isEnableableBase = ENABLEABLE_BASE_KEY_SET.has(normalizeKey(resolved));
                const isDynamic = resolved.toLowerCase().startsWith('cfv_');
                if (!isEnableableBase && !isDynamic) return;
                const alias = String(f?.alias || '').trim();
                addAttribute(
                    attributeMap,
                    resolved,
                    alias || humanize(shortAttributeKey(resolved)),
                    'tasklist-info',
                    shortAttributeKey(rawName)
                );
            });

            // 3) Dynamic fields from job details createFormValues -> TaskList dynamic cfv_* keys
            const jobIds = Array.from(
                new Set(
                    (Array.isArray(tasks) ? tasks : [])
                        .map((t: any) => Number(t?.jobId ?? t?.JobId ?? t?.jobID ?? t?.JobID ?? 0))
                        .filter((id: number) => Number.isFinite(id) && id > 0)
                )
            ).slice(0, 8);

            const jobs = await Promise.all(
                jobIds.map(async (id) => {
                    try {
                        return await getJobDetails(id);
                    } catch {
                        return null;
                    }
                })
            );

            jobs.forEach((job) => {
                if (!job) return;

                const createFormValues = tryGetCreateFormValues(job);
                if (createFormValues) {
                    const keys = new Set<string>();
                    flattenCreateFormValueKeys(createFormValues, keys);
                    keys.forEach((rawKey) => {
                        const cfvKey = createFormColumnKey(rawKey);
                        addAttribute(attributeMap, cfvKey, humanize(rawKey), 'create-form', rawKey);
                    });
                }
            });

            const allAttrs = Array.from(attributeMap.values()).sort((a, b) => a.label.localeCompare(b.label));
            setAllAttributes(allAttrs);

            // 4) Right side selected values from user grid settings (visible columns)
            const settingsColumns = gridSettings?.settings?.columns || [];
            const selectedKeySet = new Set<string>();
            const selectedFromSettings = settingsColumns
                .filter(isSettingsColumnVisible)
                .sort((a, b) => readSettingsColumnOrder(a) - readSettingsColumnOrder(b))
                .map((col) => {
                    const rawKey = readSettingsColumnKey(col);
                    if (!rawKey) return null;
                    const resolved = resolveToTaskListColumnKey(rawKey);
                    if (!resolved) return null;
                    if (LOCKED_TASKLIST_KEYS.has(normalizeKey(resolved))) return null;
                    const isEnableableBase = ENABLEABLE_BASE_KEY_SET.has(normalizeKey(resolved));
                    const isDynamic = resolved.toLowerCase().startsWith('cfv_');
                    if (!isEnableableBase && !isDynamic) return null;

                    const resolvedNorm = normalizeKey(resolved);
                    if (selectedKeySet.has(resolvedNorm)) return null;
                    selectedKeySet.add(resolvedNorm);

                    const existing = attributeMap.get(resolvedNorm);
                    if (existing) return existing;
                    const fallback: AttributeItem = {
                        key: resolved,
                        label: humanize(shortAttributeKey(resolved)),
                        displayKey: shortAttributeKey(rawKey),
                        source: 'grid-settings',
                    };
                    addAttribute(attributeMap, fallback.key, fallback.label, fallback.source, fallback.displayKey);
                    return fallback;
                })
                .filter((x): x is AttributeItem => x !== null);

            setSelectedGridAttributes(selectedFromSettings);

            console.log('[ApplicationSettings][Workorder] tasklist info loaded:', info);
            console.log('[ApplicationSettings][Workorder] job types loaded:', jobTypeResult);
            console.log('[ApplicationSettings][Workorder] grid settings loaded:', gridSettings);
            console.log('[ApplicationSettings][Workorder] available attributes extracted:', allAttrs.length);
        } catch (err: any) {
            console.log('[ApplicationSettings][Workorder] load failed:', err?.response?.status, err?.response?.data || err?.message);
            setWorkorderError('Could not load Workorder Configuration from API.');
        } finally {
            setWorkorderLoading(false);
        }
    }, []);

    const addToGridSelection = useCallback((item: AttributeItem) => {
        setSelectedGridAttributes((prev) => {
            if (prev.some((x) => normalizeKey(x.key) === normalizeKey(item.key))) return prev;
            return [...prev, item];
        });
    }, []);

    const removeFromGridSelection = useCallback((key: string) => {
        setSelectedGridAttributes((prev) => prev.filter((x) => normalizeKey(x.key) !== normalizeKey(key)));
    }, []);

    const saveWorkorderGridSelection = useCallback(async () => {
        if (isSavingWorkorder) return;
        try {
            setIsSavingWorkorder(true);
            const previous = taskGridSettingsModel?.settings || {};
            const previousColumns = Array.isArray(previous.columns) ? previous.columns : [];
            const previousByKey = new Map<string, UserGridColumnSetting>();
            previousColumns.forEach((col) => {
                const raw = readSettingsColumnKey(col);
                if (!raw) return;
                const resolved = resolveToTaskListColumnKey(raw);
                if (!resolved) return;
                previousByKey.set(normalizeKey(resolved), col);
            });

            const selectedKeySet = new Set(
                selectedGridAttributes.map((item) => normalizeKey(resolveToTaskListColumnKey(item.key)))
            );
            const enableableKeySet = new Set(allAttributes.map((item) => normalizeKey(item.key)));

            const selectedColumns: UserGridColumnSetting[] = selectedGridAttributes.map((item, index) => {
                const resolvedKey = resolveToTaskListColumnKey(item.key);
                const existing = previousByKey.get(normalizeKey(resolvedKey)) || {};
                return {
                    ...existing,
                    name: resolvedKey,
                    visible: true,
                    hidden: false,
                    width: Number(existing?.width) || GRID_DEFAULT_COLUMN_WIDTH,
                    order: index,
                };
            });

            const hiddenEnableableColumns: UserGridColumnSetting[] = previousColumns
                .filter((col) => {
                    const raw = readSettingsColumnKey(col);
                    if (!raw) return false;
                    const resolved = resolveToTaskListColumnKey(raw);
                    if (!resolved) return false;
                    if (LOCKED_TASKLIST_KEYS.has(normalizeKey(resolved))) return false;
                    if (!enableableKeySet.has(normalizeKey(resolved))) return false;
                    return !selectedKeySet.has(normalizeKey(resolved));
                })
                .map((col, idx) => ({
                    ...col,
                    visible: false,
                    hidden: true,
                    order: selectedColumns.length + idx,
                }));

            const untouchedColumns: UserGridColumnSetting[] = previousColumns
                .filter((col) => {
                    const raw = readSettingsColumnKey(col);
                    if (!raw) return false;
                    const resolved = resolveToTaskListColumnKey(raw);
                    if (!resolved) return false;
                    return !enableableKeySet.has(normalizeKey(resolved)) || LOCKED_TASKLIST_KEYS.has(normalizeKey(resolved));
                });

            const nextSettings = {
                ...previous,
                columns: [...selectedColumns, ...hiddenEnableableColumns, ...untouchedColumns],
            };

            await saveUserSettings({
                settingsType: GRID_SETTINGS_TYPE.JOB_TASK_GRID,
                settings: nextSettings,
                customWidgetId: taskGridSettingsModel?.customWidgetId ?? null,
            });

            setTaskGridSettingsModel({
                settingsType: GRID_SETTINGS_TYPE.JOB_TASK_GRID,
                settings: nextSettings,
                customWidgetId: taskGridSettingsModel?.customWidgetId ?? null,
            });

            console.log('[ApplicationSettings][Workorder] grid selection saved.');
        } catch (err: any) {
            console.log('[ApplicationSettings][Workorder] save failed:', err?.response?.status, err?.response?.data || err?.message);
        } finally {
            setIsSavingWorkorder(false);
        }
    }, [allAttributes, isSavingWorkorder, selectedGridAttributes, taskGridSettingsModel]);

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
                        <Text style={[s.tabText, activeTab === tab.key ? s.tabTextActive : null]}>{tab.label}</Text>
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
                                        {(jobTypes.length ? jobTypes : [{ id: 0, name: 'NRM' }]).map((jt) => {
                                            const name = String(jt?.name || 'NRM').trim() || 'NRM';
                                            const selected = selectedJobType === name;
                                            return (
                                                <TouchableOpacity
                                                    key={`${jt.id}-${name}`}
                                                    style={[s.jobTypeChip, selected ? s.jobTypeChipSelected : null]}
                                                    onPress={() => setSelectedJobType(name)}
                                                >
                                                    <Text style={[s.jobTypeChipText, selected ? s.jobTypeChipTextSelected : null]}>{name}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                    <ScrollView style={s.paneScroller}>
                                        {availableAttributes.length === 0 ? (
                                            <View style={s.emptyAttributeRow}>
                                                <Text style={s.emptyAttributeText}>No available attributes found.</Text>
                                            </View>
                                        ) : (
                                            availableAttributes.map((item) => (
                                                <View key={`left-${item.key}`} style={s.workorderMapRow}>
                                                    <Text numberOfLines={1} style={s.workorderMapRowText}>
                                                        {item.label} : {item.displayKey || shortAttributeKey(item.key)}
                                                    </Text>
                                                    <TouchableOpacity style={s.iconActionBtn} onPress={() => addToGridSelection(item)}>
                                                        <Ionicons name="add-outline" size={16} color="#111" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))
                                        )}
                                    </ScrollView>
                                </View>
                                <View style={s.workorderPaneRight}>
                                    <ScrollView style={s.paneScroller}>
                                        {selectedGridAttributes.length === 0 ? (
                                            <View style={s.emptyAttributeRow}>
                                                <Text style={s.emptyAttributeText}>No selected grid attributes.</Text>
                                            </View>
                                        ) : (
                                            selectedGridAttributes.map((item) => (
                                            <View key={`right-${item.key}`} style={s.workorderMapRow}>
                                                <Text numberOfLines={1} style={s.workorderMapRowText}>
                                                    {item.label} : {item.displayKey || shortAttributeKey(item.key)}
                                                </Text>
                                                <TouchableOpacity style={s.iconActionBtn} onPress={() => removeFromGridSelection(item.key)}>
                                                    <Ionicons name="close-outline" size={17} color="#111" />
                                                </TouchableOpacity>
                                            </View>
                                            ))
                                        )}
                                    </ScrollView>
                                </View>
                            </View>
                        </SectionCard>

                        <SectionCard title="Responsive TaskList Fields" darkHeader>
                            <View style={[s.workorderSplit, isDesktop ? s.workorderSplitDesktop : null]}>
                                <View style={s.workorderPaneLeft}>
                                    <View style={s.jobTypeRow}>
                                        <Text style={s.jobTypeText}>{selectedJobType || 'NRM'}</Text>
                                    </View>
                                    <View style={s.jobTypeRow}>
                                        <Text style={s.jobTypeText}>SYSTEM FIELDS</Text>
                                    </View>
                                </View>
                                <View style={s.workorderPaneRight}>
                                    <Text style={s.selectedFieldsTitle}>Selected fields</Text>
                                    <ScrollView style={s.paneScroller}>
                                        {responsiveFieldRows.map((label, idx) => (
                                            <View key={`${label}-${idx}`} style={s.selectedFieldRow}>
                                                <Text style={s.selectedFieldText}>{label}</Text>
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
                            <ScrollView style={s.paneScroller}>
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
    },
    tabRowContent: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
    tabBtn: {
        backgroundColor: '#f5f6f7',
        borderRadius: 0,
        borderWidth: 1,
        borderColor: '#d5d8df',
        paddingHorizontal: 12,
        paddingVertical: 8,
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
    workorderSplitDesktop: { flexDirection: 'row' },
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
    paneScroller: { maxHeight: 240 },
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
