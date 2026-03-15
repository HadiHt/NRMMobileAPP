import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
    PanResponder,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../theme';
import { getFinalizedTaskList, getTaskList, TaskListItem } from '../api/taskService';
import { getJobDetails } from '../api/jobService';
import { getUserSettings, GRID_SETTINGS_TYPE, saveUserSettings, UserGridSettings } from '../api/userSettingsService';
import { TokenStorage } from '../auth/TokenStorage';

interface Props {
    onTaskPress: (taskId: number) => void;
    mode?: 'active' | 'completed';
}

const IS_WEB = Platform.OS === 'web';

const DASHBOARD_MENU_OPTIONS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'workers', label: 'Workers', icon: 'person-outline' },
    { key: 'field-work', label: 'Field Work', icon: 'bicycle-outline' },
    { key: 'workorders', label: 'Workorders', icon: 'archive-outline' },
    { key: 'departments', label: 'Departments', icon: 'people-outline' },
    { key: 'field-material', label: 'Field Material', icon: 'cube-outline' },
    { key: 'web-hooks', label: 'Web Hooks', icon: 'swap-horizontal-outline' },
    { key: 'skills', label: 'Skills', icon: 'ribbon-outline' },
    { key: 'web-parts', label: 'Web Parts', icon: 'apps-outline' },
    { key: 'web-hook-request-logs', label: 'Web Hook Request Logs', icon: 'swap-horizontal-outline' },
    { key: 'application-settings', label: 'Application Settings', icon: 'settings-outline' },
    { key: 'job-types', label: 'Job Types', icon: 'briefcase-outline' },
    { key: 'tasks', label: 'Tasks', icon: 'list-outline' },
    { key: 'completed-tasks', label: 'Completed Tasks', icon: 'checkmark-outline' },
];

// Table column definitions matching the web UI
type TableColumn = { key: string; label: string; width: number };

const BASE_COLUMNS: TableColumn[] = [
    { key: 'taskId', label: 'ID', width: IS_WEB ? 44 : 60 },
    { key: 'jobId', label: 'Job', width: IS_WEB ? 48 : 70 },
    { key: 'taskName', label: 'Task Name', width: IS_WEB ? 96 : 200 },
    { key: 'jobTypeName', label: 'Job Type', width: IS_WEB ? 76 : 100 },
    { key: 'assignees', label: 'Assignees', width: IS_WEB ? 96 : 200 },
    { key: 'areaName', label: 'Area Name', width: IS_WEB ? 82 : 120 },
    { key: 'plannedStartDate', label: 'Planned Start', width: IS_WEB ? 92 : 150 },
    { key: 'plannedEndDate', label: 'Planned End', width: IS_WEB ? 92 : 150 },
    { key: 'currentState', label: 'Current State', width: IS_WEB ? 86 : 120 },
    { key: 'projectId', label: 'Project ID', width: IS_WEB ? 72 : 100 },
    { key: 'projectProgress', label: 'Project Progress', width: IS_WEB ? 88 : 130 },
    { key: 'createdBy', label: 'Created By', width: IS_WEB ? 92 : 150 },
    { key: 'address', label: 'Address', width: IS_WEB ? 92 : 150 },
];
const LOCKED_COLUMN_KEYS = ['taskId', 'jobId', 'taskName', 'jobTypeName'];

const STATUS_MAP: Record<number, string> = {
    1: 'New',
    2: 'Accepted',
    3: 'In Progress',
    4: 'Finalized',
    5: 'Canceled',
    6: 'Rejected',
    7: 'Executed',
};

type SortDirection = 'asc' | 'desc' | null;

const FIELD_MAPPING: Record<string, string[]> = {
    taskId: ['taskId', 'taskIdDisplayedToUser', 'TaskId', 'id', 'Id'],
    jobId: ['jobId', 'JobId', 'jobID', 'job'],
    taskName: ['taskName', 'taskTypeName', 'TaskTypeName', 'TaskName', 'jobTaskTypeName'],
    jobTypeName: ['jobTypeName', 'jobType', 'JobTypeName', 'JobType'],
    assignees: [
        'assignees',
        'assignee',
        'assignedTo',
        'assignedToNames',
        'workers',
        'workerNames',
        'resourceNames',
        'crewMembers',
    ],
    areaName: ['areaName', 'area', 'region', 'regionName', 'jobAreaName', 'serviceArea'],
    plannedStartDate: [
        'plannedStartDate',
        'plannedStart',
        'scheduledStartDate',
        'schedulingPlannedDate',
        'schedulingScheduledStart',
        'SchedulingScheduledStart',
    ],
    plannedEndDate: [
        'plannedEndDate',
        'plannedEnd',
        'scheduledEndDate',
        'schedulingScheduledEnd',
        'SchedulingScheduledEnd',
        'targetEndDate',
    ],
    currentState: [
        'currentState',
        'currentStateName',
        'taskStatus',
        'taskStatusName',
        'TaskStatus',
        'Status',
        'CurrentState',
    ],
    projectId: ['projectId', 'projectID', 'ProjectId', 'ProjectID', 'jobProjectId', 'project'],
    projectProgress: [
        'projectProgress',
        'progress',
        'progressPercent',
        'jobProgress',
        'projectCompletion',
        'completion',
    ],
    createdBy: [
        'createdBy',
        'createdByName',
        'creator',
        'createdUser',
        'createdByWorker',
        'createdByDisplayName',
        'createdByFullName',
    ],
    address: ['address', 'jobAddress', 'locationAddress', 'streetAddress', 'fullAddress'],
};

type TaskIndexEntry = { value: any; matchedKey: string };
const TASK_SEARCH_INDEX_CACHE = new WeakMap<object, Record<string, TaskIndexEntry>>();

function safeStringify(value: any): string {
    const seen = new WeakSet<object>();
    try {
        return JSON.stringify(
            value,
            (key, val) => {
                if (typeof val === 'object' && val !== null) {
                    if (seen.has(val)) return '[Circular]';
                    seen.add(val);
                }
                return val;
            },
            2
        );
    } catch (err: any) {
        return `<<unserializable: ${err?.message || 'unknown error'}>>`;
    }
}

function normalizeKeyName(key: string): string {
    return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function tryGetNestedValue(source: TaskListItem, dottedPath: string): any {
    if (!dottedPath.includes('.')) return undefined;
    const parts = dottedPath.split('.');
    let current: any = source;
    for (const part of parts) {
        if (!current || typeof current !== 'object') return undefined;
        current = current[part];
    }
    return current;
}

function toDisplayableValue(value: any): any {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'object') return value;

    if (Array.isArray(value)) {
        if (value.length === 0) return null;
        if (value.every((x) => x === null || x === undefined || typeof x !== 'object')) {
            return value.join(', ');
        }
        const named = value
            .map((x) => {
                if (!x || typeof x !== 'object') return null;
                return x.name || x.Name || x.fullName || x.FullName || x.title || x.Title || null;
            })
            .filter(Boolean);
        if (named.length > 0) return named.join(', ');
        return null;
    }

    return value.name || value.Name || value.fullName || value.FullName || value.title || value.Title || null;
}

function getTaskSearchIndex(task: TaskListItem): Record<string, TaskIndexEntry> {
    if (!task || typeof task !== 'object') return {};

    const cached = TASK_SEARCH_INDEX_CACHE.get(task as object);
    if (cached) return cached;

    const index: Record<string, TaskIndexEntry> = {};
    const seen = new Set<any>();
    const stack: { value: any; path: string; depth: number }[] = [{ value: task, path: '', depth: 0 }];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || !current.value || typeof current.value !== 'object') continue;
        if (seen.has(current.value)) continue;
        seen.add(current.value);

        for (const [rawKey, rawValue] of Object.entries(current.value)) {
            const path = current.path ? `${current.path}.${rawKey}` : rawKey;
            const normalizedPath = normalizeKeyName(path);
            const normalizedKey = normalizeKeyName(rawKey);
            const directValue = toDisplayableValue(rawValue);

            if (directValue !== null) {
                if (!index[normalizedPath]) index[normalizedPath] = { value: directValue, matchedKey: path };
                if (!index[normalizedKey]) index[normalizedKey] = { value: directValue, matchedKey: rawKey };
            }

            // Support generic key/value field-item payloads, e.g. { name: 'taskId', value: 123 }.
            if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
                const kvKey =
                    rawValue.key ??
                    rawValue.Key ??
                    rawValue.name ??
                    rawValue.Name ??
                    rawValue.field ??
                    rawValue.Field;
                const kvValue =
                    rawValue.value ??
                    rawValue.Value ??
                    rawValue.val ??
                    rawValue.Val;

                if (typeof kvKey === 'string' && kvValue !== undefined && kvValue !== null) {
                    const normalizedKvKey = normalizeKeyName(kvKey);
                    const displayKvValue = toDisplayableValue(kvValue) ?? kvValue;
                    if (!index[normalizedKvKey]) {
                        index[normalizedKvKey] = { value: displayKvValue, matchedKey: `${path}.${kvKey}` };
                    }
                }
            }

            if (rawValue && typeof rawValue === 'object' && current.depth < 2) {
                if (Array.isArray(rawValue)) {
                    for (let i = 0; i < rawValue.length && i < 5; i += 1) {
                        const arrItem = rawValue[i];
                        if (arrItem && typeof arrItem === 'object') {
                            stack.push({ value: arrItem, path: `${path}.${i}`, depth: current.depth + 1 });
                        }
                    }
                } else {
                    stack.push({ value: rawValue, path, depth: current.depth + 1 });
                }
            }
        }
    }

    TASK_SEARCH_INDEX_CACHE.set(task as object, index);
    return index;
}

const SEMANTIC_RULES: Record<string, string[][]> = {
    assignees: [['assignee'], ['assigned'], ['worker'], ['resource'], ['crew']],
    areaName: [['areaname'], ['area'], ['region'], ['zone']],
    plannedStartDate: [['planned', 'start'], ['schedule', 'start']],
    plannedEndDate: [['planned', 'end'], ['schedule', 'end']],
    currentState: [['currentstate'], ['status']],
    projectId: [['project', 'id']],
    projectProgress: [['project', 'progress'], ['progress'], ['completion']],
    createdBy: [['createdby'], ['creator'], ['created', 'worker'], ['created', 'user']],
    address: [['address'], ['street'], ['location']],
};

function findSemanticValue(task: TaskListItem, key: string): TaskIndexEntry | null {
    const rules = SEMANTIC_RULES[key];
    if (!rules || rules.length === 0) return null;

    const index = getTaskSearchIndex(task);
    const entries = Object.entries(index);
    for (const tokenGroup of rules) {
        const match = entries.find(([normalizedKey]) => tokenGroup.every((token) => normalizedKey.includes(token)));
        if (match) return match[1];
    }

    return null;
}

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

function getTaskJobId(task: TaskListItem): number | null {
    const raw = task.jobId || task.JobId || task.jobID || task.JobID || task.job || task.Job || null;
    const asNumber = Number(raw);
    return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : null;
}

function toSpacedLabel(rawKey: string): string {
    return rawKey
        .replace(/\./g, ' ')
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Za-z])(\d)/g, '$1 $2')
        .replace(/(\d)([A-Za-z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (m) => m.toUpperCase());
}

function flattenCreateFormValues(
    value: any,
    output: Record<string, any>,
    path = '',
    depth = 0
) {
    if (depth > 4 || value === null || value === undefined) return;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                const parsed = JSON.parse(trimmed);
                flattenCreateFormValues(parsed, output, path, depth + 1);
                return;
            } catch {
                // Keep raw string fallback below.
            }
        }

        if (path) output[path] = value;
        return;
    }

    if (typeof value !== 'object') {
        if (path) output[path] = value;
        return;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return;

        // Common pattern: [{ key/name/field, value }]
        const isKeyValueArray = value.every((item) => {
            if (!item || typeof item !== 'object') return false;
            const k = item.key ?? item.Key ?? item.name ?? item.Name ?? item.field ?? item.Field;
            return typeof k === 'string';
        });

        if (isKeyValueArray) {
            value.forEach((item) => {
                const k = item.key ?? item.Key ?? item.name ?? item.Name ?? item.field ?? item.Field;
                const v = item.value ?? item.Value ?? item.val ?? item.Val;
                const nextPath = path ? `${path}.${k}` : String(k);
                flattenCreateFormValues(v, output, nextPath, depth + 1);
            });
            return;
        }

        // Primitive arrays can stay as one value column.
        if (value.every((x) => x === null || x === undefined || typeof x !== 'object')) {
            if (path) output[path] = value.join(', ');
            return;
        }

        // Object arrays: flatten first few entries to keep table usable.
        value.slice(0, 5).forEach((item, idx) => {
            flattenCreateFormValues(item, output, path ? `${path}.${idx + 1}` : String(idx + 1), depth + 1);
        });
        return;
    }

    Object.entries(value).forEach(([k, v]) => {
        const nextPath = path ? `${path}.${k}` : k;
        flattenCreateFormValues(v, output, nextPath, depth + 1);
    });
}

function getCreateFormValues(job: any): Record<string, any> {
    const candidates = [
        job?.createFormValues,
        job?.CreateFormValues,
        job?.creationFormValues,
        job?.CreationFormValues,
        job?.createForm?.values,
        job?.CreateForm?.Values,
        job?.creationForm?.values,
        job?.CreationForm?.Values,
        job?.CreationForm,
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof candidate === 'object') {
            const flattened: Record<string, any> = {};
            flattenCreateFormValues(candidate, flattened);
            return flattened;
        }
    }

    return {};
}

function createFormColumnKey(rawKey: string): string {
    return `cfv_${normalizeKeyName(rawKey)}`;
}

function getColumnSettingKey(column: any): string | null {
    const key = column?.key ?? column?.Key ?? column?.field ?? column?.Field ?? column?.name ?? column?.Name ?? column?.columnKey ?? column?.ColumnKey ?? null;
    return typeof key === 'string' && key.trim() ? key.trim() : null;
}

function getColumnSettingOrder(column: any): number {
    const raw = column?.order ?? column?.Order ?? column?.index ?? column?.Index ?? column?.position ?? column?.Position;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function getColumnSettingVisible(column: any): boolean | null {
    if (typeof column?.visible === 'boolean') return column.visible;
    if (typeof column?.Visible === 'boolean') return column.Visible;
    if (typeof column?.hidden === 'boolean') return !column.hidden;
    if (typeof column?.Hidden === 'boolean') return !column.Hidden;
    return null;
}

function getColumnSettingWidth(column: any): number | null {
    const parsed = Number(column?.width ?? column?.Width);
    if (!Number.isFinite(parsed)) return null;
    const minWidth = IS_WEB ? 44 : 60;
    const maxWidth = IS_WEB ? 110 : 240;
    return Math.max(minWidth, Math.min(maxWidth, parsed));
}

function parseSortFromSettings(rawSort: any): { key: string; direction: SortDirection } | null {
    if (!rawSort) return null;

    const sortObj = Array.isArray(rawSort) ? rawSort[0] : rawSort;
    if (!sortObj || typeof sortObj !== 'object') return null;

    const key = sortObj.key ?? sortObj.Key ?? sortObj.field ?? sortObj.Field ?? sortObj.columnKey ?? sortObj.ColumnKey ?? sortObj.name ?? sortObj.Name ?? null;
    const dir = sortObj.direction ?? sortObj.Direction ?? sortObj.dir ?? sortObj.Dir ?? sortObj.order ?? sortObj.Order ?? null;
    if (typeof key !== 'string' || !key) return null;
    const normalizedDir = String(dir || '').toLowerCase();
    if (normalizedDir.startsWith('asc')) return { key, direction: 'asc' };
    if (normalizedDir.startsWith('desc')) return { key, direction: 'desc' };
    return null;
}

const SETTINGS_NAME_TO_COLUMN_KEY: Record<string, string> = {
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

function resolveSettingsColumnKeyToLocalKey(
    rawSettingsKey: string,
    availableColumns: TableColumn[]
): string | null {
    const normalizedRaw = normalizeKeyName(rawSettingsKey);

    const byAlias = SETTINGS_NAME_TO_COLUMN_KEY[normalizedRaw];
    if (byAlias) {
        const foundAlias = availableColumns.find((c) => c.key === byAlias);
        if (foundAlias) return foundAlias.key;
    }

    const direct = availableColumns.find((c) => normalizeKeyName(c.key) === normalizedRaw);
    if (direct) return direct.key;

    if (rawSettingsKey.toLowerCase().startsWith('data.')) {
        const tail = rawSettingsKey.slice(5);
        const cfvKey = createFormColumnKey(tail);
        const foundCfv = availableColumns.find((c) => normalizeKeyName(c.key) === normalizeKeyName(cfvKey));
        if (foundCfv) return foundCfv.key;
    }

    const cfvFallback = createFormColumnKey(rawSettingsKey);
    const foundCfvFallback = availableColumns.find((c) => normalizeKeyName(c.key) === normalizeKeyName(cfvFallback));
    if (foundCfvFallback) return foundCfvFallback.key;

    return null;
}

function parseSortFromSettingsColumns(
    settingsColumns: any[],
    availableColumns: TableColumn[]
): { key: string; direction: SortDirection } | null {
    const sortable = settingsColumns
        .map((col) => {
            const sort = col?.sort ?? col?.Sort;
            const direction = sort?.direction ?? sort?.Direction;
            const priority = Number(sort?.priority ?? sort?.Priority ?? Number.MAX_SAFE_INTEGER);
            const rawName = getColumnSettingKey(col);
            if (!rawName || !direction || !Number.isFinite(priority)) return null;
            const key = resolveSettingsColumnKeyToLocalKey(rawName, availableColumns);
            if (!key) return null;
            const d = String(direction).toLowerCase();
            if (!d.startsWith('asc') && !d.startsWith('desc')) return null;
            return {
                key,
                direction: d.startsWith('asc') ? 'asc' as SortDirection : 'desc' as SortDirection,
                priority,
            };
        })
        .filter((x): x is { key: string; direction: SortDirection; priority: number } => x !== null)
        .sort((a, b) => a.priority - b.priority);

    if (sortable.length === 0) return null;
    return { key: sortable[0].key, direction: sortable[0].direction };
}

function resolveFieldValue(task: TaskListItem, key: string): { value: any; matchedKey: string } | null {
    const keysToTry = FIELD_MAPPING[key] || [
        key,
        key.charAt(0).toUpperCase() + key.slice(1),
        key.toLowerCase(),
    ];
    const searchIndex = getTaskSearchIndex(task);

    for (const k of keysToTry) {
        const nested = tryGetNestedValue(task, k);
        if (nested !== undefined && nested !== null) {
            return {
                value: nested,
                matchedKey: k,
            };
        }

        if (task[k] !== undefined && task[k] !== null) {
            return {
                value: task[k],
                matchedKey: k,
            };
        }

        const normalizedCandidate = normalizeKeyName(k);
        const indexed = searchIndex[normalizedCandidate];
        if (indexed) return indexed;
    }

    const semantic = findSemanticValue(task, key);
    if (semantic) return semantic;

    return null;
}

function getCellValue(task: TaskListItem, key: string): string {
    const resolved = resolveFieldValue(task, key);
    if (!resolved) return '';

    let val = resolved.value;

    // If it's a numeric status, map to string
    if (resolved.matchedKey.toLowerCase().includes('status') && typeof val === 'number') {
        val = STATUS_MAP[val] || `Status ${val}`;
    }

    if (key.includes('Date') || key.includes('date')) {
        return formatDate(val);
    }

    if (typeof val === 'object') {
        if (Array.isArray(val)) {
            return val.map((x) => String(x)).join(', ');
        }
        if (val.name || val.Name) return String(val.name || val.Name);
        if (val.fullName || val.FullName) return String(val.fullName || val.FullName);
        if (val.title || val.Title) return String(val.title || val.Title);
        return JSON.stringify(val);
    }

    return String(val);
}

function getComparableValue(task: TaskListItem, key: string): number | string {
    const resolved = resolveFieldValue(task, key);
    if (!resolved) return '';

    let val = resolved.value;

    if (resolved.matchedKey.toLowerCase().includes('status') && typeof val === 'number') {
        val = STATUS_MAP[val] || `Status ${val}`;
    }

    if (val instanceof Date) return val.getTime();

    if (typeof val === 'number') return val;

    if (typeof val === 'string') {
        const n = Number(val);
        if (!Number.isNaN(n) && val.trim() !== '') return n;

        const maybeDate = Date.parse(val);
        if (!Number.isNaN(maybeDate) && key.toLowerCase().includes('date')) return maybeDate;

        return val.toLowerCase();
    }

    if (typeof val === 'boolean') return val ? 1 : 0;

    return '';
}

export default function TaskListScreen({ onTaskPress, mode = 'active' }: Props) {
    const [tasks, setTasks] = useState<TaskListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actualColumns, setActualColumns] = useState(BASE_COLUMNS);
    const [isHorizontalScrollEnabled, setIsHorizontalScrollEnabled] = useState(true);
    const [webResizingKey, setWebResizingKey] = useState<string | null>(null);
    const resizeStateRef = useRef<{
        columnKey: string | null;
        startX: number;
        startWidth: number;
        pendingWidth: number | null;
        rafId: number | null;
    }>({
        columnKey: null,
        startX: 0,
        startWidth: 120,
        pendingWidth: null,
        rafId: null,
    });
    const [sortState, setSortState] = useState<{ key: string | null; direction: SortDirection }>({
        key: null,
        direction: null,
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const [isSavingGrid, setIsSavingGrid] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
        () => Object.fromEntries(BASE_COLUMNS.map((col) => [col.key, true]))
    );
    const jobCreateFormCacheRef = useRef<Map<number, Record<string, any>>>(new Map());
    const loadedSettingsRef = useRef<UserGridSettings | null>(null);
    const hasAttemptedSettingsLoadRef = useRef(false);
    const isApplyingSettingsRef = useRef(false);
    const lockedColumnSet = useMemo(() => new Set(LOCKED_COLUMN_KEYS), []);
    const gridSettingsType = mode === 'completed'
        ? GRID_SETTINGS_TYPE.JOB_TASK_COMPLETED_GRID
        : GRID_SETTINGS_TYPE.JOB_TASK_GRID;
    const visibleColumns = useMemo(
        () => actualColumns.filter((col) => columnVisibility[col.key] !== false),
        [actualColumns, columnVisibility]
    );
    const togglableColumns = useMemo(
        () => actualColumns.filter((col) => !lockedColumnSet.has(col.key)),
        [actualColumns, lockedColumnSet]
    );

    const enrichTasksWithJobData = useCallback(async (sourceTasks: TaskListItem[]) => {
        const uniqueJobIds = Array.from(
            new Set(
                sourceTasks
                    .map((task) => getTaskJobId(task))
                    .filter((id): id is number => id !== null)
            )
        );

        const idsToFetch = uniqueJobIds.filter((id) => !jobCreateFormCacheRef.current.has(id));
        if (idsToFetch.length > 0) {
            const fetched = await Promise.all(
                idsToFetch.map(async (id) => {
                    try {
                        const job = await getJobDetails(id);
                        console.log(`[TaskList][Job ${id}] Parent job object:\n${safeStringify(job)}`);
                        console.log(
                            `[TaskList][Job ${id}] createFormValues candidates:\n${safeStringify({
                                createFormValues: job?.createFormValues,
                                CreateFormValues: job?.CreateFormValues,
                                creationFormValues: job?.creationFormValues,
                                CreationFormValues: job?.CreationFormValues,
                                createForm: job?.createForm,
                                CreateForm: job?.CreateForm,
                                creationForm: job?.creationForm,
                                CreationForm: job?.CreationForm,
                            })}`
                        );
                        return { id, values: getCreateFormValues(job) };
                    } catch {
                        return { id, values: {} as Record<string, any> };
                    }
                })
            );

            fetched.forEach((entry) => {
                jobCreateFormCacheRef.current.set(entry.id, entry.values || {});
            });
        }

        const formColumns = new Map<string, { key: string; label: string; width: number }>();
        const enrichedTasks = sourceTasks.map((task) => {
            const jobId = getTaskJobId(task);
            if (!jobId) return task;

            const formValues = jobCreateFormCacheRef.current.get(jobId);
            if (!formValues || Object.keys(formValues).length === 0) return task;

            const mergedTask: TaskListItem = { ...task };
            for (const [rawKey, rawValue] of Object.entries(formValues)) {
                if (rawValue === null || rawValue === undefined || rawValue === '') continue;
                const colKey = createFormColumnKey(rawKey);
                mergedTask[colKey] = rawValue;
                if (!formColumns.has(colKey)) {
                    formColumns.set(colKey, {
                        key: colKey,
                        label: toSpacedLabel(rawKey),
                        width: IS_WEB ? 92 : 170,
                    });
                }
            }

            return mergedTask;
        });

        return {
            enrichedTasks,
            dynamicColumns: Array.from(formColumns.values()),
        };
    }, []);

    const sortedTasks = useMemo(() => {
        if (!sortState.key || !sortState.direction) return tasks;

        const sorted = [...tasks];
        sorted.sort((a, b) => {
            const av = getComparableValue(a, sortState.key!);
            const bv = getComparableValue(b, sortState.key!);

            if (typeof av === 'number' && typeof bv === 'number') {
                return sortState.direction === 'asc' ? av - bv : bv - av;
            }

            const as = String(av);
            const bs = String(bv);
            const comparison = as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' });
            return sortState.direction === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [tasks, sortState]);

    const toggleSort = (key: string) => {
        setSortState((prev) => {
            if (prev.key !== key) return { key, direction: 'asc' };
            if (prev.direction === 'asc') return { key, direction: 'desc' };
            return { key: null, direction: null };
        });
    };

    const toggleColumnVisibility = useCallback((columnKey: string) => {
        if (lockedColumnSet.has(columnKey)) return;
        setColumnVisibility((prev) => {
            const currentlyVisible = prev[columnKey] !== false;
            return {
                ...prev,
                [columnKey]: !currentlyVisible,
            };
        });
    }, [lockedColumnSet]);

    const renderColumnToggleItem = useCallback(({ item: col }: { item: { key: string; label: string; width: number } }) => {
        const isVisible = columnVisibility[col.key] !== false;
        return (
            <TouchableOpacity
                style={s.menuItem}
                onPress={() => toggleColumnVisibility(col.key)}
                activeOpacity={0.8}
            >
                <View style={s.menuItemLeft}>
                    <Ionicons
                        name={isVisible ? 'checkbox-outline' : 'square-outline'}
                        size={18}
                        color={isVisible ? '#0a84c8' : '#6b7280'}
                    />
                    <Text style={s.menuItemTitle}>{col.label}</Text>
                </View>
                <Ionicons
                    name={isVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={16}
                    color={isVisible ? '#0a84c8' : '#9ca3af'}
                />
            </TouchableOpacity>
        );
    }, [columnVisibility, toggleColumnVisibility]);

    useEffect(() => {
        if (!sortState.key) return;
        const isSortColumnVisible = visibleColumns.some((col) => col.key === sortState.key);
        if (!isSortColumnVisible) {
            setSortState({ key: null, direction: null });
        }
    }, [sortState.key, visibleColumns]);

    const applyColumnWidth = useCallback((columnKey: string, width: number) => {
        setActualColumns((prev) =>
            prev.map((col) => {
                if (col.key !== columnKey) return col;
                if (Math.abs(col.width - width) < 1) return col;
                return { ...col, width };
            })
        );
    }, []);

    const createResizePanResponder = (columnKey: string) => {
        let startWidth = 120;
        let rafId: number | null = null;
        let pendingWidth: number | null = null;

        const commitWidth = (nextWidth: number) => {
            if (typeof requestAnimationFrame === 'function') {
                pendingWidth = nextWidth;
                if (rafId !== null) return;
                rafId = requestAnimationFrame(() => {
                    rafId = null;
                    if (pendingWidth !== null) {
                        applyColumnWidth(columnKey, pendingWidth);
                        pendingWidth = null;
                    }
                });
                return;
            }

            applyColumnWidth(columnKey, nextWidth);
        };

        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: () => {
                const current = actualColumns.find((col) => col.key === columnKey);
                startWidth = current?.width ?? 120;
                setIsHorizontalScrollEnabled(false);
            },
            onPanResponderMove: (_, gestureState) => {
                const minWidth = IS_WEB ? 44 : 60;
                const nextWidth = Math.max(minWidth, startWidth + gestureState.dx);
                commitWidth(nextWidth);
            },
            onPanResponderRelease: () => {
                if (pendingWidth !== null) {
                    applyColumnWidth(columnKey, pendingWidth);
                    pendingWidth = null;
                }
                if (rafId !== null && typeof cancelAnimationFrame === 'function') {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                setIsHorizontalScrollEnabled(true);
            },
            onPanResponderTerminate: () => {
                if (pendingWidth !== null) {
                    applyColumnWidth(columnKey, pendingWidth);
                    pendingWidth = null;
                }
                if (rafId !== null && typeof cancelAnimationFrame === 'function') {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                setIsHorizontalScrollEnabled(true);
            },
        });
    };

    const startWebResize = useCallback((columnKey: string, clientX: number) => {
        const current = actualColumns.find((col) => col.key === columnKey);
        resizeStateRef.current = {
            columnKey,
            startX: clientX,
            startWidth: current?.width ?? 120,
            pendingWidth: null,
            rafId: null,
        };
        setWebResizingKey(columnKey);
        setIsHorizontalScrollEnabled(false);
    }, [actualColumns]);

    useEffect(() => {
        if (Platform.OS !== 'web' || !webResizingKey) return;

        const onMouseMove = (event: MouseEvent) => {
            const current = resizeStateRef.current;
            if (!current.columnKey) return;

            const nextWidth = Math.max(44, current.startWidth + (event.clientX - current.startX));
            current.pendingWidth = nextWidth;

            if (current.rafId !== null || typeof requestAnimationFrame !== 'function') return;
            current.rafId = requestAnimationFrame(() => {
                const c = resizeStateRef.current;
                c.rafId = null;
                if (c.columnKey && c.pendingWidth !== null) {
                    applyColumnWidth(c.columnKey, c.pendingWidth);
                }
            });
        };

        const finishResize = () => {
            const current = resizeStateRef.current;
            if (current.rafId !== null && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(current.rafId);
            }
            if (current.columnKey && current.pendingWidth !== null) {
                applyColumnWidth(current.columnKey, current.pendingWidth);
            }
            resizeStateRef.current = {
                columnKey: null,
                startX: 0,
                startWidth: 120,
                pendingWidth: null,
                rafId: null,
            };
            setWebResizingKey(null);
            setIsHorizontalScrollEnabled(true);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', finishResize);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', finishResize);
        };
    }, [webResizingKey, applyColumnWidth]);

    const fetchTasks = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setError(null);

            const token = await TokenStorage.getItemAsync('auth_access_token');

            if (!token) {
                setError('NO TOKEN FOUND');
                setLoading(false);
                return;
            }

            const data = mode === 'completed'
                ? await getFinalizedTaskList({ condition: 'and', rules: [] })
                : await getTaskList();

            const { enrichedTasks, dynamicColumns } = await enrichTasksWithJobData(data);
            let settings: UserGridSettings | null = null;
            try {
                const response = await getUserSettings(gridSettingsType);
                settings = response?.settings || null;
                loadedSettingsRef.current = settings;
                console.log(`[TaskList] Active grid settings type=${gridSettingsType} parsed settings:`, settings);
            } catch {
                settings = null;
                console.log(`[TaskList] Active grid settings type=${gridSettingsType} could not be loaded.`);
            }
            hasAttemptedSettingsLoadRef.current = true;

            const settingsColumnsRaw = (settings as any)?.columns ?? (settings as any)?.Columns;
            const settingsColumns = Array.isArray(settingsColumnsRaw) ? settingsColumnsRaw : [];
            const sortFromSettingsGlobal = parseSortFromSettings((settings as any)?.sort ?? (settings as any)?.Sort);

            isApplyingSettingsRef.current = true;
            setTasks(enrichedTasks);
            setActualColumns((prev) => {
                const widthByKey = new Map(prev.map((col) => [col.key, col.width]));
                const base = BASE_COLUMNS.map((col) => ({
                    ...col,
                    width: widthByKey.get(col.key) ?? col.width,
                }));
                const dynamic = dynamicColumns.map((col) => ({
                    ...col,
                    width: widthByKey.get(col.key) ?? col.width,
                }));
                const merged = [...base, ...dynamic];
                const settingsByLocalKey = new Map<string, any>();
                settingsColumns.forEach((colSetting) => {
                    const rawName = getColumnSettingKey(colSetting);
                    if (!rawName) return;
                    const localKey = resolveSettingsColumnKeyToLocalKey(rawName, merged);
                    if (!localKey) return;
                    settingsByLocalKey.set(localKey, colSetting);
                });

                const withSettings = merged.map((col, idx) => {
                    const colSetting = settingsByLocalKey.get(col.key);
                    return {
                        column: {
                            ...col,
                            width: getColumnSettingWidth(colSetting) ?? col.width,
                        },
                        visible: getColumnSettingVisible(colSetting),
                        order: getColumnSettingOrder(colSetting),
                        fallbackOrder: idx,
                    };
                });

                withSettings.sort((a, b) => {
                    if (a.order === b.order) return a.fallbackOrder - b.fallbackOrder;
                    return a.order - b.order;
                });

                const finalColumns = withSettings.map((x) => x.column);
                setColumnVisibility((prevVisibility) => {
                    const next = { ...prevVisibility };
                    withSettings.forEach((entry) => {
                        const key = entry.column.key;
                        if (entry.visible !== null) {
                            next[key] = entry.visible;
                            return;
                        }
                        if (next[key] === undefined) next[key] = true;
                    });
                    return next;
                });
                return finalColumns;
            });

            const sortFromSettingsColumns = parseSortFromSettingsColumns(settingsColumns, [
                ...BASE_COLUMNS,
                ...dynamicColumns,
            ]);
            const sortFromSettings = sortFromSettingsGlobal || sortFromSettingsColumns;
            if (sortFromSettings) {
                setSortState(sortFromSettings);
            }

            setTimeout(() => {
                isApplyingSettingsRef.current = false;
            }, 0);
        } catch (err: any) {
            const status = err.response?.status || 'unknown';
            const serverMsg = err.response?.data
                ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data).substring(0, 500))
                : err.message;
            const url = (err.config?.baseURL || '') + (err.config?.url || '');
            setError(`Status: ${status}\nURL: ${url}\nError: ${serverMsg}`);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [enrichTasksWithJobData, gridSettingsType, mode]);

    useFocusEffect(
        useCallback(() => {
            fetchTasks();
        }, [fetchTasks])
    );

    useEffect(() => {
        loadedSettingsRef.current = null;
        hasAttemptedSettingsLoadRef.current = false;
    }, [gridSettingsType]);

    const saveGridSettingsNow = useCallback(async () => {
        if (isSavingGrid) return;
        try {
            setIsSavingGrid(true);
            const previous = loadedSettingsRef.current || {};
            const columns = actualColumns.map((col, index) => ({
                key: col.key,
                width: col.width,
                visible: columnVisibility[col.key] !== false,
                order: index,
            }));
            const sort = sortState.key && sortState.direction
                ? { key: sortState.key, direction: sortState.direction }
                : null;

            const nextSettings: UserGridSettings = {
                ...previous,
                columns,
                sort,
            };

            await saveUserSettings({
                settingsType: gridSettingsType,
                settings: nextSettings,
                customWidgetId: null,
            });
            loadedSettingsRef.current = nextSettings;
            console.log(`[TaskList] Grid settings saved for settingsType=${gridSettingsType}`);
        } catch (err: any) {
            console.log('[TaskList] Grid settings save failed:', err?.response?.status, err?.response?.data || err?.message);
        } finally {
            setIsSavingGrid(false);
        }
    }, [actualColumns, columnVisibility, gridSettingsType, isSavingGrid, sortState]);

    const getStateColor = (state: string | undefined) => {
        if (!state) return Colors.textMuted;
        const s = state.toLowerCase();
        if (s.includes('new') || s.includes('open')) return '#4CAF50';
        if (s.includes('accepted')) return '#2196F3';
        if (s.includes('progress') || s.includes('active')) return '#FF9800';
        if (s.includes('finali') || s.includes('complet') || s.includes('done')) return '#9E9E9E';
        if (s.includes('cancel')) return '#F44336';
        return Colors.textPrimary;
    };

    if (loading && tasks.length === 0) {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={s.loadingText}>
                        {mode === 'completed' ? 'Loading completed tasks...' : 'Loading tasks...'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container}>
            {isMenuOpen && (
                <View style={s.menuOverlay}>
                    <View style={s.sideMenu}>
                        <View style={s.sideMenuHeader}>
                            <Text style={s.sideMenuTitle}>Dashboard Menu</Text>
                            <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                                <Ionicons name="close-outline" size={22} color="#1f2937" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={s.sideMenuContent}>
                            {DASHBOARD_MENU_OPTIONS.map((item) => {
                                const isCurrent = item.key === 'tasks';
                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[s.menuItem, !isCurrent ? s.menuItemDisabled : null]}
                                        onPress={() => setIsMenuOpen(false)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={s.menuItemLeft}>
                                            <Ionicons name={item.icon} size={18} color={isCurrent ? '#0a84c8' : '#6b7280'} />
                                            <Text style={[s.menuItemTitle, !isCurrent ? s.menuItemTitleDisabled : null]}>
                                                {item.label}
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={16}
                                            color={isCurrent ? '#0a84c8' : '#9ca3af'}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                    <TouchableOpacity
                        style={s.menuBackdrop}
                        activeOpacity={1}
                        onPress={() => setIsMenuOpen(false)}
                    />
                </View>
            )}
            {isColumnMenuOpen && (
                <View style={s.columnMenuOverlay}>
                    <TouchableOpacity
                        style={s.menuBackdrop}
                        activeOpacity={1}
                        onPress={() => setIsColumnMenuOpen(false)}
                    />
                    <View style={s.columnSideMenu}>
                        <View style={s.sideMenuHeader}>
                            <Text style={s.sideMenuTitle}>Table Columns</Text>
                            <TouchableOpacity onPress={() => setIsColumnMenuOpen(false)}>
                                <Ionicons name="close-outline" size={22} color="#1f2937" />
                            </TouchableOpacity>
                        </View>
                        {togglableColumns.length === 0 ? (
                            <View style={s.columnsEmptyWrap}>
                                <Text style={s.columnsEmptyText}>No extra columns available.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={togglableColumns}
                                keyExtractor={(item) => item.key}
                                renderItem={renderColumnToggleItem}
                                contentContainerStyle={s.sideMenuContent}
                                initialNumToRender={18}
                                maxToRenderPerBatch={20}
                                windowSize={6}
                                removeClippedSubviews={Platform.OS !== 'web'}
                            />
                        )}
                    </View>
                </View>
            )}

            {/* Header bar */}
            <View style={s.headerBar}>
                <View style={s.headerLeft}>
                    <TouchableOpacity style={s.menuToggleBtn} onPress={() => setIsMenuOpen(true)}>
                        <Ionicons name="menu-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={s.breadcrumb}>{mode === 'completed' ? '/ Completed Tasks' : '/ Tasks'}</Text>
                </View>
                <View style={s.headerRight}>
                    <TouchableOpacity
                        style={[s.saveGridBtn, isSavingGrid ? s.saveGridBtnDisabled : null]}
                        onPress={saveGridSettingsNow}
                        disabled={isSavingGrid}
                    >
                        <Text style={s.saveGridBtnText}>{isSavingGrid ? 'Saving...' : 'Save Grid'}</Text>
                    </TouchableOpacity>
                    <Text style={s.headerCount}>{tasks.length} tasks</Text>
                    <TouchableOpacity
                        style={s.columnsToggleBtn}
                        onPress={() => {
                            setIsMenuOpen(false);
                            setIsColumnMenuOpen((prev) => !prev);
                        }}
                    >
                        <Ionicons name="menu-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
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
            <ScrollView horizontal showsHorizontalScrollIndicator scrollEnabled={isHorizontalScrollEnabled}>
                <View>
                    {/* Table header row */}
                    <View style={s.tableHeader}>
                        {visibleColumns.map((col) => {
                            const isSorted = sortState.key === col.key && !!sortState.direction;
                            const sortIcon = !isSorted
                                ? 'swap-vertical-outline'
                                : sortState.direction === 'asc'
                                    ? 'arrow-up-outline'
                                    : 'arrow-down-outline';
                            const resizeResponder = Platform.OS === 'web' ? null : createResizePanResponder(col.key);
                            const webMouseHandlers = Platform.OS === 'web'
                                ? {
                                    onMouseDown: (e: any) => {
                                        e.preventDefault?.();
                                        e.stopPropagation?.();
                                        startWebResize(col.key, e.clientX);
                                    },
                                }
                                : {};

                            return (
                                <View key={col.key} style={[s.headerCell, { width: col.width }]}>
                                    <TouchableOpacity
                                        style={s.headerPressArea}
                                        onPress={() => toggleSort(col.key)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[s.headerCellText, isSorted ? s.headerCellTextSorted : null]} numberOfLines={1}>
                                            {col.label}
                                        </Text>
                                        <Ionicons name={sortIcon} size={12} color={isSorted ? '#222' : '#555'} />
                                    </TouchableOpacity>
                                    <View
                                        style={[s.resizeHandle, webResizingKey === col.key ? s.resizeHandleActive : null]}
                                        {...(resizeResponder?.panHandlers || {})}
                                        {...webMouseHandlers}
                                    >
                                        <Ionicons name="reorder-three-outline" size={12} color="#666" />
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Table rows */}
                    <FlatList
                        data={sortedTasks}
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
                                {visibleColumns.map((col) => {
                                    const val = getCellValue(item, col.key);
                                    const isState = col.key === 'currentState';
                                    return (
                                        <View key={col.key} style={[s.cell, { width: col.width }]}>
                                            {isState ? (
                                                <View style={[s.stateBadge, { backgroundColor: getStateColor(val) + '40' }]}>
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
                                <Text style={s.emptyText}>
                                    {mode === 'completed' ? 'No completed tasks found' : 'No tasks found'}
                                </Text>
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
    menuOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 120,
        flexDirection: 'row',
    },
    columnMenuOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 125,
        flexDirection: 'row',
    },
    sideMenu: {
        width: 300,
        maxWidth: '86%',
        backgroundColor: '#ffffff',
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
        shadowColor: '#0f172a',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    columnSideMenu: {
        width: 320,
        maxWidth: '88%',
        backgroundColor: '#ffffff',
        borderLeftWidth: 1,
        borderLeftColor: '#e5e7eb',
        shadowColor: '#0f172a',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    menuBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(7, 16, 30, 0.42)',
    },
    sideMenuHeader: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sideMenuTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
    },
    sideMenuContent: {
        paddingVertical: 8,
    },
    menuItem: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    menuItemDisabled: {
        backgroundColor: '#f8fafc',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    menuItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
    menuItemTitleDisabled: {
        color: '#6b7280',
    },
    columnsEmptyWrap: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    columnsEmptyText: {
        fontSize: 13,
        color: '#6b7280',
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
        paddingVertical: 7,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    saveGridBtn: {
        backgroundColor: '#0b3a66',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    saveGridBtnDisabled: {
        opacity: 0.65,
    },
    saveGridBtnText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
    menuToggleBtn: {
        paddingVertical: 2,
        paddingRight: 2,
    },
    columnsToggleBtn: {
        paddingVertical: 2,
        paddingLeft: 2,
    },
    breadcrumb: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    headerCount: {
        color: '#fff',
        fontSize: 11,
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
        height: IS_WEB ? 32 : 44,
    },
    headerCell: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: IS_WEB ? 4 : 8,
        borderRightWidth: 1,
        borderRightColor: '#e0b000',
        height: IS_WEB ? 32 : 44,
    },
    headerPressArea: {
        flex: 1,
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 0,
        paddingRight: IS_WEB ? 3 : 6,
    },
    headerCellText: {
        fontSize: IS_WEB ? 10 : 12,
        fontWeight: '700',
        color: '#333',
        flex: 1,
    },
    headerCellTextSorted: {
        color: '#111',
    },
    resizeHandle: {
        width: IS_WEB ? 10 : 14,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 1,
        borderLeftColor: '#d8ad00',
    },
    resizeHandleActive: {
        backgroundColor: 'rgba(255,255,255,0.18)',
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
        paddingHorizontal: IS_WEB ? 4 : 8,
        paddingVertical: IS_WEB ? 7 : 10,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#eee',
    },
    cellText: {
        fontSize: IS_WEB ? 11 : 12,
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
