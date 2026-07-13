import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { eiva } from './eiva_api.js';
import './style.css';
import WorkflowEditor from './WorkflowEditor.jsx';
import McpConfigPage from './McpConfigPage.jsx';
import SkillConfigPage from './SkillConfigPage.jsx';
import WorkspacePage from './WorkspacePage.jsx';
import { SystemConfigPage } from './SystemConfigPage.jsx';
import { I18nProvider, useI18n, locales } from './i18n/index.jsx';

const statusTone = {
  idle: 'neutral',
  queued: 'neutral',
  running: 'working',
  completed: 'success',
  failed: 'danger',
  interrupted: 'neutral'
};

function getSystemSettingFields(t) {
  return [
    {
      key: 'prefixPrompt',
      label: t('prompts.pre'),
      description: t('prompts.preDesc')
    },
    {
      key: 'suffixPrompt',
      label: t('prompts.post'),
      description: t('prompts.postDesc')
    },
    {
      key: 'roleDefinition',
      label: t('prompts.role'),
      description: t('prompts.roleDesc')
    },
    {
      key: 'shortDescription',
      label: t('prompts.shortDesc'),
      description: t('prompts.shortDescDesc')
    },
    {
      key: 'usageTiming',
      label: t('prompts.useWhen'),
      description: t('prompts.useWhenDesc')
    }
  ];
}

function getEmptySystemSettings(systemSettingFields) {
  return Object.fromEntries(
    systemSettingFields.map((field) => [field.key, ''])
  );
}

function getIntervalUnits(t) {
  return [
    { value: 'minutes', label: t('time.minutes') },
    { value: 'hours', label: t('time.hours') }
  ];
}
function getFixedFrequencyOptions(t) {
  return [
    { value: 'daily', label: t('time.daily') },
    { value: 'weekly', label: t('time.weekly') },
    { value: 'monthly', label: t('time.monthly') }
  ];
}
function getWeekdayOptions(t) {
  return [
    { value: '0', label: t('time.sunday') },
    { value: '1', label: t('time.monday') },
    { value: '2', label: t('time.tuesday') },
    { value: '3', label: t('time.wednesday') },
    { value: '4', label: t('time.thursday') },
    { value: '5', label: t('time.friday') },
    { value: '6', label: t('time.saturday') }
  ];
}

const validIntervalUnitValues = ['minutes', 'hours'];
const validFixedFrequencyValues = ['daily', 'weekly', 'monthly'];
const localScheduleIdPrefix = 'local-schedule-';
const scheduleRefreshIntervalMs = 10000;
const API_BASE = `${window.location.protocol}//${window.location.hostname}:39999/eiva/backend/api/ver-0.95`;

function RobotIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
      <path d="M144,168a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h16A8,8,0,0,1,144,168Zm72-64H200V88a48.05,48.05,0,0,0-48-48H104A48.05,48.05,0,0,0,56,88v16H40a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16H56v16a48.05,48.05,0,0,0,48,48h48a48.05,48.05,0,0,0,48-48V184h16a16,16,0,0,0,16-16V120A16,16,0,0,0,216,104ZM56,88a32,32,0,0,1,32-32h48a32,32,0,0,1,32,32v96a32,32,0,0,1-32,32H88a32,32,0,0,1-32-32Zm160,80H200V120h16ZM84,140a12,12,0,1,1,12-12A12,12,0,0,1,84,140Zm88,0a12,12,0,1,1,12-12A12,12,0,0,1,172,140Z"></path>
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
      <path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,35.73a40,40,0,1,1,56.61,56.55L105,191.46a24,24,0,1,1-34-33.9L161.67,67A8,8,0,0,1,173,78.33L82.35,168.89a8,8,0,0,0,11.31,11.32l99.26-99.18a24,24,0,0,0-34-33.9L60.59,146.3A40,40,0,1,0,117.2,202.85l81.14-80.51A8,8,0,0,1,209.66,122.34Z"></path>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="stop-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function isMacPlatform() {
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem('Eiva-history') || '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => {
      const { status: _status, ...rest } = item;
      return {
        ...rest,
        processLogs: (item.processLogs || item.logs || []).filter((log) => !isHiddenLogMessage(log.message))
      };
    });
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem('Eiva-history', JSON.stringify(history.slice(0, 30)));
  } catch {
    // History is a convenience feature; task submission should still work without storage.
  }
}

function loadSchedulePrompts() {
  try {
    const deletedIds = loadDeletedScheduleIds();
    const parsed = JSON.parse(localStorage.getItem('Eiva-schedule-prompts') || '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => (
        item
        && typeof item.id === 'string'
        && !deletedIds.has(item.id)
        && typeof item.requirement === 'string'
        && item.requirement.trim()
      ))
      .map(normalizeSchedulePrompt);
  } catch {
    return [];
  }
}

function normalizeSchedulePrompt(item) {
  const intervalUnit = validIntervalUnitValues.includes(item.intervalUnit)
    ? item.intervalUnit
    : 'minutes';
  const intervalValue = typeof item.intervalValue === 'number'
    ? String(item.intervalValue)
    : item.intervalValue;
  const repeatCount = typeof item.repeatCount === 'number'
    ? String(item.repeatCount)
    : item.repeatCount;
  const scheduleKind = item.scheduleKind === 'fixed' ? 'fixed' : 'one_time';
  const fixedFrequency = validFixedFrequencyValues.includes(item.fixedFrequency)
    ? item.fixedFrequency
    : 'daily';

  return {
    id: item.id || item.scheduleId,
    requirement: item.requirement,
    name: typeof item.name === 'string' ? item.name : '',
    enabled: Boolean(item.enabled),
    sendAt: typeof item.sendAt === 'string' ? item.sendAt : (typeof item.startAt === 'string' ? item.startAt : ''),
    continuous: Boolean(item.continuous),
    intervalValue: normalizePositiveIntegerText(intervalValue, '1'),
    intervalUnit,
    repeatCount: normalizePositiveIntegerText(repeatCount, '2'),
    scheduleKind,
    fixedFrequency,
    fixedTime: typeof item.fixedTime === 'string' && item.fixedTime ? item.fixedTime : '15:00',
    fixedDayOfWeek: normalizeIntegerText(item.fixedDayOfWeek, '1', 0, 6),
    fixedDayOfMonth: normalizeIntegerText(item.fixedDayOfMonth, '1', 1, 31),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : ''
  };
}

function schedulePromptToPayload(item) {
  return {
    name: item.name || item.requirement.slice(0, 40),
    requirement: item.requirement,
    enabled: item.enabled,
    sendAt: item.sendAt,
    continuous: item.continuous,
    intervalValue: Number.parseInt(item.intervalValue, 10) || 1,
    intervalUnit: item.intervalUnit,
    repeatCount: Number.parseInt(item.repeatCount, 10) || 2,
    scheduleKind: item.scheduleKind,
    fixedFrequency: item.fixedFrequency,
    fixedTime: item.fixedTime,
    fixedDayOfWeek: Number.parseInt(item.fixedDayOfWeek, 10) || 1,
    fixedDayOfMonth: Number.parseInt(item.fixedDayOfMonth, 10) || 1,
    cronExpression: ''
  };
}

function createEmptySchedulePrompt(requirement = '', options = {}) {
  const trimmed = requirement.trim();
  const scheduleKind = options.scheduleKind === 'fixed' ? 'fixed' : 'one_time';
  return {
    id: `${localScheduleIdPrefix}${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
    requirement: trimmed,
    name: trimmed.slice(0, 40),
    enabled: false,
    sendAt: '',
    continuous: false,
    intervalValue: '1',
    intervalUnit: 'minutes',
    repeatCount: '2',
    scheduleKind,
    fixedFrequency: 'daily',
    fixedTime: '15:00',
    fixedDayOfWeek: '1',
    fixedDayOfMonth: '1',
    updatedAt: new Date().toISOString()
  };
}

function isLocalSchedulePromptId(id) {
  return typeof id === 'string' && id.startsWith(localScheduleIdPrefix);
}

function getCurrentDateTimeInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isFutureScheduleTime(sendAt) {
  if (!sendAt) return false;
  const sendTime = new Date(sendAt).getTime();
  return Number.isFinite(sendTime) && sendTime > Date.now();
}

function mergeSchedulePrompts(localPrompts, apiPrompts) {
  const merged = new Map();
  const deletedIds = loadDeletedScheduleIds();

  apiPrompts.forEach((item) => {
    if (deletedIds.has(item.id)) return;
    merged.set(item.id, item);
  });
  localPrompts.forEach((item) => {
    if (deletedIds.has(item.id)) return;
    const existing = merged.get(item.id);
    if (!existing && !isLocalSchedulePromptId(item.id)) return;
    if (!existing || shouldUseLocalSchedulePrompt(item, existing)) {
      merged.set(item.id, item);
    }
  });

  return Array.from(merged.values());
}

function isNewerSchedulePrompt(candidate, current) {
  const candidateTime = new Date(candidate.updatedAt || 0).getTime();
  const currentTime = new Date(current.updatedAt || 0).getTime();
  return candidateTime > currentTime;
}

function shouldUseLocalSchedulePrompt(localItem, apiItem) {
  return isNewerSchedulePrompt(localItem, apiItem);
}

function shouldPersistLocalSchedulePrompt(localItem, apiItem) {
  if (!apiItem) return false;
  return shouldUseLocalSchedulePrompt(localItem, apiItem);
}

function taskToHistoryItem(task) {
  return {
    id: task.taskId,
    taskId: task.taskId,
    requirement: task.requirement,
    processLogs: (task.logs || []).filter((log) => !isHiddenLogMessage(log.message)),
    result: task.result || '',
    error: task.error || '',
    createdAt: task.createdAt,
    completedAt: task.completedAt || ''
  };
}

function mergeHistoryItems(localHistory, apiTasks) {
  const merged = new Map();

  apiTasks.map(taskToHistoryItem).forEach((item) => {
    merged.set(item.taskId, item);
  });
  localHistory.forEach((item) => {
    const key = item.taskId || item.id;
    if (!merged.has(key)) {
      merged.set(key, item);
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);
}

function normalizePositiveIntegerText(value, fallback) {
  const numberValue = Number.parseInt(value, 10);
  return Number.isFinite(numberValue) && numberValue >= 1 ? String(numberValue) : fallback;
}

function normalizeIntegerText(value, fallback, min, max) {
  const numberValue = Number.parseInt(value, 10);
  if (!Number.isFinite(numberValue)) return fallback;
  return String(Math.max(min, Math.min(max, numberValue)));
}

function saveSchedulePrompts(prompts) {
  try {
    const deletedIds = loadDeletedScheduleIds();
    const visiblePrompts = prompts.filter((item) => !deletedIds.has(item.id));
    localStorage.setItem('Eiva-schedule-prompts', JSON.stringify(visiblePrompts.slice(0, 30)));
  } catch {
    // Schedule prompts are local convenience data; the rest of the app should keep working.
  }
}

function loadDeletedScheduleIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem('Eiva-deleted-schedule-ids') || '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveDeletedScheduleIds(ids) {
  try {
    localStorage.setItem('Eiva-deleted-schedule-ids', JSON.stringify(Array.from(ids).slice(-100)));
  } catch {
    // Deletion tombstones are best-effort UI state.
  }
}

async function readApiError(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';
  let detail = '';

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => ({}));
    detail = payload.error || payload.message || '';
  } else {
    detail = await response.text().catch(() => '');
  }

  const statusText = response.statusText ? ` ${response.statusText}` : '';
  const suffix = detail ? `\n${detail}` : '';
  return `${fallbackMessage}\nHTTP ${response.status}${statusText}${suffix}`;
}

function readNetworkError(error, fallbackMessage) {
  const detail = error instanceof Error && error.message
    ? error.message
    : '無法連線到後端 API';
  return `${fallbackMessage}\n${detail}\nAPI：${API_BASE}`;
}

const systemSettingKeys = ['prefixPrompt', 'suffixPrompt', 'roleDefinition', 'shortDescription', 'usageTiming'];

function loadSystemSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem('Eiva-system-settings') || '{}');
    return systemSettingKeys.reduce((settings, key) => ({
      ...settings,
      [key]: typeof parsed[key] === 'string' ? parsed[key] : ''
    }), Object.fromEntries(systemSettingKeys.map((key) => [key, ''])));
  } catch {
    return Object.fromEntries(systemSettingKeys.map((key) => [key, '']));
  }
}

function saveSystemSettings(settings) {
  try {
    localStorage.setItem('Eiva-system-settings', JSON.stringify(settings));
  } catch {
    // Settings are local convenience data; task submission can continue without storage.
  }
}

function isHiddenLogMessage(message = '') {
  return message.startsWith('[stderr]');
}

function App() {
  const { t, locale, setLocale } = useI18n();
  const systemSettingFields = useMemo(() => getSystemSettingFields(t), [t]);
  const emptySystemSettings = useMemo(() => getEmptySystemSettings(systemSettingFields), [systemSettingFields]);
  const intervalUnits = useMemo(() => getIntervalUnits(t), [t]);
  const fixedFrequencyOptions = useMemo(() => getFixedFrequencyOptions(t), [t]);
  const weekdayOptions = useMemo(() => getWeekdayOptions(t), [t]);
  const statusText = useMemo(() => ({
    idle: t('status.idle'),
    queued: t('status.queued'),
    running: t('status.running'),
    completed: t('status.completed'),
    failed: t('status.failed'),
    interrupted: t('status.interrupted')
  }), [t]);
  const [requirement, setRequirement] = useState('');
  const [submittedRequirement, setSubmittedRequirement] = useState('');
  const [taskId, setTaskId] = useState('');
  const [activeView, setActiveView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    const validViews = ['current', 'history', 'schedule', 'settings', 'workflow', 'workspace', 'mcp', 'skill'];
    return validViews.includes(hash) ? hash : 'current';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validViews = ['current', 'history', 'schedule', 'settings', 'workflow', 'workspace', 'mcp', 'skill'];
      if (validViews.includes(hash)) {
        setActiveView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [status, setStatus] = useState('idle');
  const [history, setHistory] = useState(() => loadHistory());
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const [schedulePrompts, setSchedulePrompts] = useState(() => loadSchedulePrompts());
  const [editingSchedulePromptId, setEditingSchedulePromptId] = useState('');
  const [editingSchedulePromptValue, setEditingSchedulePromptValue] = useState('');
  const [savingScheduleIds, setSavingScheduleIds] = useState(() => new Set());
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [copyableError, setCopyableError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [systemSidebarOpen, setSystemSidebarOpen] = useState(true);
  const [systemSettings, setSystemSettings] = useState(() => loadSystemSettings());
  const [attachedFiles, setAttachedFiles] = useState([]);
  const socketRef = useRef(null);
  const logRef = useRef(null);
  const statusLogRef = useRef(null);
  const composerRef = useRef(null);
  const isTaskRunning = status === 'queued' || status === 'running';
  const taskIdRef = useRef('');
  const scheduledTaskIdsRef = useRef(new Set());
  const canStopTask = isTaskRunning && Boolean(taskId);
  const canUseComposer = activeView === 'current';
  const shouldShowComposer = canUseComposer;
  const shouldShowComposerStatus = status !== 'idle';
  const shortcutLabel = 'Enter';

  useEffect(() => {
    taskIdRef.current = taskId;
  }, [taskId]);

  function showCopyableError(message) {
    setCopyableError(message);
  }

  async function copyErrorMessage() {
    if (!copyableError) return;
    try {
      await navigator.clipboard.writeText(copyableError);
    } catch {
      // The text remains selectable in the dialog when clipboard permission is unavailable.
    }
  }

  async function refreshHistoryFromApi() {
    const response = await fetch(`${API_BASE}/tasks?limit=30`);
    if (!response.ok) return;
    const payload = await response.json();
    if (!Array.isArray(payload.tasks)) return;
    setHistory((current) => {
      const next = mergeHistoryItems(current, payload.tasks);
      saveHistory(next);
      return next;
    });
  }

  async function loadSchedulesFromApiOnce() {
    const response = await fetch(`${API_BASE}/schedules`);
    if (!response.ok) return;
    const payload = await response.json();
    if (!Array.isArray(payload.schedules)) return;
    const apiPrompts = payload.schedules.map(normalizeSchedulePrompt);
    const localNewerPrompts = [];
    setSchedulePrompts((current) => {
      const apiById = new Map(apiPrompts.map((item) => [item.id, item]));
      current.forEach((item) => {
        const apiItem = apiById.get(item.id);
        if (shouldPersistLocalSchedulePrompt(item, apiItem)) {
          localNewerPrompts.push(item);
        }
      });
      const next = mergeSchedulePrompts(current, apiPrompts);
      saveSchedulePrompts(next);
      return next;
    });
    queueMicrotask(() => {
      localNewerPrompts.forEach((item) => persistAndReconcileSchedulePrompt(item));
    });
  }

  const navigateTo = (view) => {
    window.location.hash = view;
    if (view === 'history') {
      refreshHistoryFromApi().catch(() => { });
    }
  };

  function updateSystemSetting(key, value) {
    setSystemSettings((current) => {
      const next = { ...current, [key]: value };
      saveSystemSettings(next);
      return next;
    });
  }

  function clearSystemSetting(key) {
    updateSystemSetting(key, '');
  }

  function updateLatestHistory(patch) {
    setHistory((current) => {
      const next = current.map((item, index) => (
        index === 0 ? { ...item, ...patch } : item
      ));
      saveHistory(next);
      return next;
    });
  }

  function updateHistoryByTaskId(nextTaskId, patch) {
    setHistory((current) => {
      let didUpdate = false;
      const next = current.map((item) => (
        item.taskId === nextTaskId
          ? (didUpdate = true, { ...item, ...patch })
          : item
      ));
      const patched = didUpdate || current.length === 0
        ? next
        : next.map((item, index) => (index === 0 ? { ...item, ...patch } : item));
      saveHistory(patched);
      return patched;
    });
  }

  function appendProcessLogToHistory(nextTaskId, entry) {
    if (!nextTaskId) return;

    setHistory((current) => {
      const next = current.map((item) => (
        item.taskId === nextTaskId ? appendHistoryLog(item, entry) : item
      ));
      saveHistory(next);
      return next;
    });
  }

  function appendHistoryLog(item, entry) {
    if (isHiddenLogMessage(entry.message)) return item;

    const processLogs = item.processLogs || [];
    const alreadyRecorded = processLogs.some((log) => (
      log.message === entry.message && (log.at === entry.at || entry.message === t('chat.taskCreated'))
    ));

    return alreadyRecorded
      ? item
      : { ...item, processLogs: [...processLogs, entry] };
  }

  async function addHistoryRequirementToSchedule(item) {
    const promptItem = createEmptySchedulePrompt(item.requirement);

    await addSchedulePrompt(promptItem);
  }

  async function addManualSchedulePrompt() {
    const promptItem = createEmptySchedulePrompt('');

    setSchedulePrompts((current) => {
      const next = [promptItem, ...current];
      saveSchedulePrompts(next);
      return next;
    });
    setActiveView('schedule');
    setEditingSchedulePromptId(promptItem.id);
    setEditingSchedulePromptValue('');
  }

  async function addManualFixedSchedulePrompt() {
    const promptItem = createEmptySchedulePrompt('', { scheduleKind: 'fixed' });

    setSchedulePrompts((current) => {
      const next = [promptItem, ...current];
      saveSchedulePrompts(next);
      return next;
    });
    setActiveView('schedule');
    setEditingSchedulePromptId(promptItem.id);
    setEditingSchedulePromptValue('');
  }

  async function addSchedulePrompt(promptItem) {
    let nextItem = promptItem;
    try {
      const response = await fetch(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedulePromptToPayload(promptItem))
      });
      if (response.ok) {
        nextItem = normalizeSchedulePrompt(await response.json());
      }
    } catch {
      // Keep local schedule prompt as a fallback if the API is temporarily unavailable.
    }

    setSchedulePrompts((current) => {
      const deletedIds = loadDeletedScheduleIds();
      deletedIds.delete(nextItem.id);
      saveDeletedScheduleIds(deletedIds);
      const next = [nextItem, ...current];
      saveSchedulePrompts(next);
      return next;
    });
    setEditingSchedulePromptId('');
    setEditingSchedulePromptValue('');
    setActiveView('schedule');
    return nextItem;
  }

  function startEditingSchedulePrompt(item) {
    setEditingSchedulePromptId(item.id);
    setEditingSchedulePromptValue(item.requirement);
  }

  function cancelEditingSchedulePrompt() {
    const editingItem = schedulePrompts.find((item) => item.id === editingSchedulePromptId);
    if (editingItem && isLocalSchedulePromptId(editingItem.id) && !editingItem.requirement.trim()) {
      setSchedulePrompts((current) => {
        const next = current.filter((item) => item.id !== editingItem.id);
        saveSchedulePrompts(next);
        return next;
      });
    }
    setEditingSchedulePromptId('');
    setEditingSchedulePromptValue('');
  }

  async function saveEditingSchedulePrompt() {
    const trimmed = editingSchedulePromptValue.trim();
    if (!editingSchedulePromptId || !trimmed) return;

    const currentItem = schedulePrompts.find((item) => item.id === editingSchedulePromptId);
    if (!currentItem) return;

    const updatedItem = {
      ...currentItem,
      requirement: trimmed,
      name: trimmed.slice(0, 40),
      updatedAt: new Date().toISOString()
    };

    setSchedulePrompts((current) => {
      const next = current.map((item) => (
        item.id === editingSchedulePromptId
          ? updatedItem
          : item
      ));
      saveSchedulePrompts(next);
      return next;
    });

    const persistedItem = await persistSchedulePrompt(updatedItem, { showError: true });
    if (persistedItem) {
      const deletedIds = loadDeletedScheduleIds();
      deletedIds.delete(persistedItem.id);
      saveDeletedScheduleIds(deletedIds);
      setSchedulePrompts((current) => {
        const next = current.map((item) => (
          item.id === updatedItem.id ? persistedItem : item
        ));
        saveSchedulePrompts(next);
        return next;
      });
    }
    setEditingSchedulePromptId('');
    setEditingSchedulePromptValue('');
  }

  function updateEditingSchedulePromptDraft(value) {
    setEditingSchedulePromptValue(value);
  }

  async function updateSchedulePromptTiming(id, patch) {
    const currentItem = schedulePrompts.find((item) => item.id === id);
    if (!currentItem) return;
    const editingDraft = editingSchedulePromptId === id
      ? editingSchedulePromptValue.trim()
      : '';

    const nextCandidate = normalizeSchedulePrompt({
      ...currentItem,
      ...patch,
      ...(editingDraft ? {
        requirement: editingDraft,
        name: editingDraft.slice(0, 40)
      } : {}),
      updatedAt: new Date().toISOString()
    });

    if (patch.enabled === true) {
      if (!nextCandidate.requirement.trim()) {
        window.alert(t('chat.scheduleAlert'));
        return;
      }
      if (nextCandidate.scheduleKind !== 'fixed' && !isFutureScheduleTime(nextCandidate.sendAt)) {
        window.alert(t('chat.timeAlert'));
        return;
      }
    }

    if (patch.enabled === true) {
      setSchedulePrompts((current) => {
        const next = current.map((item) => (
          item.id === id ? nextCandidate : item
        ));
        saveSchedulePrompts(next);
        return next;
      });
      setSavingScheduleIds((current) => new Set(current).add(id));
      try {
        const persistedItem = await persistAndReconcileSchedulePrompt(nextCandidate, { showError: true });
        if (!persistedItem) {
          setSchedulePrompts((current) => {
            const next = current.map((item) => (
              item.id === id ? currentItem : item
            ));
            saveSchedulePrompts(next);
            return next;
          });
          return;
        }
        if (persistedItem && editingSchedulePromptId === id) {
          const deletedIds = loadDeletedScheduleIds();
          deletedIds.delete(persistedItem.id);
          saveDeletedScheduleIds(deletedIds);
          setEditingSchedulePromptId('');
          setEditingSchedulePromptValue('');
        }
      } finally {
        setSavingScheduleIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
      return;
    }

    let updatedItem = null;
    setSchedulePrompts((current) => {
      const next = current.map((item) => (
        item.id === id
          ? (updatedItem = nextCandidate)
          : item
      ));
      saveSchedulePrompts(next);
      return next;
    });

    if (updatedItem && updatedItem.requirement.trim()) {
      persistAndReconcileSchedulePrompt(updatedItem, { showError: true });
    }
  }

  async function deleteSchedulePrompt(id) {
    const deletedIds = loadDeletedScheduleIds();
    deletedIds.add(id);
    saveDeletedScheduleIds(deletedIds);

    setSchedulePrompts((current) => {
      const next = current.filter((item) => item.id !== id);
      saveSchedulePrompts(next);
      return next;
    });

    if (editingSchedulePromptId === id) {
      cancelEditingSchedulePrompt();
    }

    try {
      const response = await fetch(`${API_BASE}/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) {
        const message = await readApiError(response, t('chat.deleteError'));
        deletedIds.delete(id);
        saveDeletedScheduleIds(deletedIds);
        showCopyableError(message);
        loadSchedulesFromApiOnce().catch(() => { });
      }
    } catch (error) {
      deletedIds.delete(id);
      saveDeletedScheduleIds(deletedIds);
      showCopyableError(readNetworkError(error, t('chat.deleteError')));
      loadSchedulesFromApiOnce().catch(() => { });
    }
  }

  async function persistSchedulePrompt(item, { showError = false } = {}) {
    if (!item.requirement.trim()) return null;

    const isLocalSchedule = isLocalSchedulePromptId(item.id);
    const endpoint = isLocalSchedule
      ? `${API_BASE}/schedules`
      : `${API_BASE}/schedules/${encodeURIComponent(item.id)}`;
    const method = isLocalSchedule ? 'POST' : 'PATCH';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedulePromptToPayload(item))
      });
      if (!response.ok) {
        if (showError) {
          showCopyableError(await readApiError(response, t('chat.saveScheduleError')));
        }
        return null;
      }
      return normalizeSchedulePrompt(await response.json());
    } catch (error) {
      // Local changes remain available; they can be retried on the next edit.
      if (showError) {
        showCopyableError(readNetworkError(error, t('chat.saveScheduleError')));
      }
      return null;
    }
  }

  async function persistAndReconcileSchedulePrompt(item, options = {}) {
    const persistedItem = await persistSchedulePrompt(item, options);
    if (!persistedItem) return null;

    setSchedulePrompts((current) => {
      const next = current.map((currentItem) => (
        currentItem.id === item.id ? persistedItem : currentItem
      ));
      saveSchedulePrompts(next);
      return next;
    });

    return persistedItem;
  }

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:39999/eiva/backend/api/ver-0.95/ws`;
    
    let reconnectTimer = null;
    let isMounted = true;

    const appendLog = (entry, options = {}) => {
      if (isHiddenLogMessage(entry.message)) return;

      const nextEntry = {
        at: entry.at || new Date().toISOString(),
        message: entry.message
      };
      setLogs((current) => [
        ...current,
        nextEntry
      ]);

      if (options.addToHistory) {
        appendProcessLogToHistory(entry.taskId, nextEntry);
      }
    };

    const shouldUpdateCurrentTaskView = (nextTaskId) => (
      taskIdRef.current === nextTaskId && !scheduledTaskIdsRef.current.has(nextTaskId)
    );

    const hydrateTaskFromApi = async (nextTaskId) => {
      try {
        const response = await fetch(`${API_BASE}/tasks/${encodeURIComponent(nextTaskId)}`);
        if (!response.ok) return;
        const task = await response.json();
        if (!task?.requirement) return;

        const isScheduledTask = Boolean(task.sourceScheduleId);
        if (isScheduledTask) {
          scheduledTaskIdsRef.current.add(nextTaskId);
        }

        const historyItem = taskToHistoryItem(task);
        setHistory((current) => {
          const next = mergeHistoryItems(current, [task]);
          saveHistory(next);
          return next;
        });

        if (isScheduledTask) return;

        setSubmittedRequirement(task.requirement);
        setActiveView('current');
        taskIdRef.current = nextTaskId;
        if (task.status === 'completed') {
          setTaskId(nextTaskId);
          setStatus('completed');
          setResult(task.result || '');
        } else if (task.status === 'failed') {
          setTaskId(nextTaskId);
          setStatus('failed');
          setError(task.error || t('chat.taskFailed'));
        } else if (historyItem.taskId === nextTaskId) {
          setTaskId(nextTaskId);
          setStatus('running');
        }
      } catch {
        // The task may not be persisted yet; websocket events still update state.
      }
    };

    const connectWs = () => {
      if (!isMounted) return;

      const socket = new WebSocket(wsUrl);
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      socket.onopen = () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        appendLog({ message: t('chat.wsConnected') });
        const pingMsg = eiva.ClientMessage.create({ ping: {} });
        socket.send(eiva.ClientMessage.encode(pingMsg).finish());
      };

      socket.onclose = () => {
        appendLog({ message: t('chat.wsDisconnected') });
        if (isMounted) {
          reconnectTimer = setTimeout(() => {
            if (isMounted) connectWs();
          }, 15000);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = new Uint8Array(event.data);
          const serverMsg = eiva.ServerMessage.decode(data);
          const payloadType = serverMsg.payload;

          if (payloadType === 'taskCreated') {
            const ev = serverMsg.taskCreated;
            setIsSubmitting(false);
            hydrateTaskFromApi(ev.taskId);
          } else if (payloadType === 'taskStatus') {
            const ev = serverMsg.taskStatus;
            if (!shouldUpdateCurrentTaskView(ev.taskId)) return;
            if (ev.status === 'stopping') setIsStopping(true);
            else if (ev.status === 'running') {
              setIsStopping(false);
              setStatus('running');
              appendLog({ taskId: ev.taskId, message: t('chat.taskStarted'), at: new Date().toISOString() }, { addToHistory: true });
            }
          } else if (payloadType === 'taskLog') {
            const ev = serverMsg.taskLog;
            if (!shouldUpdateCurrentTaskView(ev.taskId)) return;
            const shouldRecordLog = !ev.message?.startsWith('已訂閱任務 ');
            appendLog({ taskId: ev.taskId, message: ev.message, at: ev.at }, { addToHistory: shouldRecordLog });
          } else if (payloadType === 'taskCompleted') {
            const ev = serverMsg.taskCompleted;
            if (!shouldUpdateCurrentTaskView(ev.taskId)) {
              updateHistoryByTaskId(ev.taskId, { result: ev.result, completedAt: ev.at });
              hydrateTaskFromApi(ev.taskId);
              return;
            }
            setIsStopping(false);
            setStatus('completed');
            setResult(ev.result);
            updateHistoryByTaskId(ev.taskId, { result: ev.result, completedAt: ev.at });
            appendLog({ taskId: ev.taskId, message: t('chat.taskCompleted'), at: ev.at }, { addToHistory: true });
          } else if (payloadType === 'taskFailed') {
            const ev = serverMsg.taskFailed;
            if (!shouldUpdateCurrentTaskView(ev.taskId)) {
              updateHistoryByTaskId(ev.taskId, { error: ev.error || t('chat.taskFailed'), completedAt: ev.at });
              hydrateTaskFromApi(ev.taskId);
              return;
            }
            setIsStopping(false);
            setStatus('failed');
            setError(ev.error || t('chat.taskFailed'));
            updateHistoryByTaskId(ev.taskId, { error: ev.error || t('chat.taskFailed'), completedAt: ev.at });
            appendLog({ taskId: ev.taskId, message: ev.error || t('chat.taskFailed'), at: ev.at }, { addToHistory: true });
          } else if (payloadType === 'taskInterrupted') {
            const ev = serverMsg.taskInterrupted;
            if (!shouldUpdateCurrentTaskView(ev.taskId)) {
              updateHistoryByTaskId(ev.taskId, { error: ev.error || t('chat.taskStopped'), completedAt: ev.at });
              hydrateTaskFromApi(ev.taskId);
              return;
            }
            setIsStopping(false);
            setStatus('interrupted');
            setError(ev.error || t('chat.taskStopped'));
            updateHistoryByTaskId(ev.taskId, { error: ev.error || t('chat.taskStopped'), completedAt: ev.at });
            appendLog({ taskId: ev.taskId, message: ev.error || t('chat.taskStopped'), at: ev.at }, { addToHistory: true });
          } else if (payloadType === 'error') {
            setIsSubmitting(false);
            setStatus('failed');
            setError(serverMsg.error.message);
            updateLatestHistory({ error: serverMsg.error.message });
            setLogs([{ at: new Date().toISOString(), message: serverMsg.error.message }]);
          }
        } catch (err) {
          console.error("Failed to decode ServerMessage:", err);
        }
      };
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedulesFromApi() {
      try {
        if (!isMounted) return;
        await loadSchedulesFromApiOnce();
      } catch {
        // Keep localStorage cache if SQLite API is unavailable.
      }
    }

    loadSchedulesFromApi();
    const refreshTimer = setInterval(loadSchedulesFromApi, scheduleRefreshIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadHistoryFromApi() {
      try {
        if (!isMounted) return;
        await refreshHistoryFromApi();
      } catch {
        // Keep localStorage history if SQLite API is unavailable.
      }
    }

    loadHistoryFromApi();
    const timer = setInterval(loadHistoryFromApi, 30000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const pendingItems = history.filter((item) => item.taskId && !item.result && !item.error);
    if (pendingItems.length === 0) return;

    let isMounted = true;

    async function syncPendingHistory() {
      const updates = await Promise.all(pendingItems.map(async (item) => {
        try {
          const response = await fetch(`${API_BASE}/tasks/${encodeURIComponent(item.taskId)}`);
          if (response.status === 404) {
            return {
              taskId: item.taskId,
              patch: {
                error: t('chat.taskRecordGone')
              }
            };
          }
          if (!response.ok) return null;

          const task = await response.json();
          if (task.status === 'queued' || task.status === 'running') return null;

          return {
            taskId: item.taskId,
            patch: {
              processLogs: task.logs || item.processLogs || [],
              result: task.result || item.result || '',
              error: task.error || item.error || '',
              completedAt: task.completedAt || item.completedAt || ''
            }
          };
        } catch {
          return null;
        }
      }));

      if (!isMounted) return;

      setHistory((current) => {
        const next = current.map((item) => {
          const update = updates.find((candidate) => candidate?.taskId === item.taskId);
          return update ? { ...item, ...update.patch } : item;
        });
        saveHistory(next);
        return next;
      });
    }

    syncPendingHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (statusLogRef.current) {
        statusLogRef.current.scrollTop = statusLogRef.current.scrollHeight;
      }

      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [logs]);

  useEffect(() => {
    if (!composerRef.current) return;
    composerRef.current.style.height = 'auto';
    composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 220)}px`;
  }, [requirement]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  async function submitTask() {
    const trimmed = requirement.trim();
    if (!canUseComposer || !trimmed || isSubmitting || isTaskRunning) return;

    setIsSubmitting(true);
    setIsStopping(false);
    setStatus('queued');
    setTaskId('');
    setSubmittedRequirement(trimmed);
    setActiveView('current');
    setLogs([]);
    setResult('');
    setError('');
    setHistory((current) => {
      const now = new Date().toISOString();
      const next = [
        {
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          requirement: trimmed,
          taskId: '',
          processLogs: [{ at: now, message: t('chat.taskWaiting') }],
          createdAt: now
        },
        ...current
      ];
      saveHistory(next);
      return next;
    });
    setSelectedHistoryId('');

    try {
      const apiUrl = `${API_BASE}/tasks`;
      const payload = { requirement: trimmed, systemSettings, files: attachedFiles };
      console.log(`[API Call] POST ${apiUrl}`, payload);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      console.log(`[API Response] POST ${apiUrl}`, data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      if (data.taskId) {
        const createdAt = new Date().toISOString();
        taskIdRef.current = data.taskId;
        setTaskId(data.taskId);
        setRequirement('');
        setStatus(data.status || 'queued');
        setIsSubmitting(false);
        setLogs([{ at: createdAt, message: t('chat.taskCreated') }]);
        updateLatestHistory({
          taskId: data.taskId,
          processLogs: [{ at: createdAt, message: t('chat.taskCreated') }]
        });
      }

      if (data.schedule) {
        const savedSchedule = normalizeSchedulePrompt(data.schedule);
        setSchedulePrompts((current) => {
          const next = mergeSchedulePrompts(current, [savedSchedule]);
          saveSchedulePrompts(next);
          return next;
        });
      }

      setAttachedFiles([]);
    } catch (err) {
      setIsSubmitting(false);
      setStatus('failed');
      setError(err.message || t('chat.taskFailed'));
      updateLatestHistory({ error: err.message || t('chat.taskFailed') });
    }
  }

  async function stopTask() {
    if (!canStopTask || isStopping) return;

    setIsStopping(true);
    const entry = { at: new Date().toISOString(), message: t('chat.stoppingTask') };
    setLogs((current) => [...current, entry]);
    appendProcessLogToHistory(taskId, entry);

    try {
      const apiUrl = `${API_BASE}/tasks/${encodeURIComponent(taskId)}/stop`;
      console.log(`[API Call] POST ${apiUrl}`);
      
      const response = await fetch(apiUrl, { method: 'POST' });
      const data = await response.json();
      console.log(`[API Response] POST ${apiUrl}`, data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop task');
      }
    } catch (err) {
      setIsStopping(false);
      const errorEntry = { at: new Date().toISOString(), message: err.message || t('chat.taskFailed') };
      setLogs((current) => [...current, errorEntry]);
      appendProcessLogToHistory(taskId, errorEntry);
    }
  }

  function handleRequirementKeyDown(event) {
    if (event.key !== 'Enter' || event.isComposing) return;

    if (event.shiftKey) return;

    event.preventDefault();
    if (canStopTask) {
      stopTask();
      return;
    }
    submitTask();
  }

  const handleFiles = async (files) => {
    const newFiles = [];
    for (const file of files) {
      const content = await new Promise((resolve) => {
        const reader = new FileReader();
        const isText = file.type.startsWith('text/') || 
                       ['.js', '.jsx', '.json', '.md', '.rs', '.css', '.html', '.ts', '.tsx', '.py'].some(ext => file.name.endsWith(ext));
        reader.onload = (e) => resolve(e.target.result);
        if (isText) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      });
      newFiles.push({ name: file.name, content });
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  function renderSchedulePromptItem(item) {
    const isEditing = editingSchedulePromptId === item.id;
    const isSavingSchedule = savingScheduleIds.has(item.id);
    const isFixedSchedule = item.scheduleKind === 'fixed';

    return (
      <article className="schedule-prompt-item" key={item.id}>
        {isEditing ? (
          <>
            <textarea
              value={editingSchedulePromptValue}
              onChange={(event) => updateEditingSchedulePromptDraft(event.target.value)}
              rows={4}
              placeholder={t('chat.enterScheduleRequirement')}
              aria-label={t('chat.editSchedule')}
            />
            <div className="schedule-prompt-actions">
              <button
                className="schedule-text-button primary"
                type="button"
                onClick={saveEditingSchedulePrompt}
                disabled={!editingSchedulePromptValue.trim()}
              >
                {t('chat.save')}
              </button>
              <button
                className="schedule-text-button"
                type="button"
                onClick={cancelEditingSchedulePrompt}
              >
                {t('chat.cancel')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>{item.requirement || t('chat.noRequirement')}</p>
            <div className="schedule-prompt-actions">
              <button
                className="schedule-text-button"
                type="button"
                onClick={() => startEditingSchedulePrompt(item)}
              >
                {t('chat.edit')}
              </button>
              <button
                className="schedule-text-button danger"
                type="button"
                onClick={() => deleteSchedulePrompt(item.id)}
              >
                {t('chat.delete')}
              </button>
            </div>
          </>
        )}
        <div className="schedule-timing-fields">
          {isFixedSchedule ? (
            <>
              <label className="schedule-field">
                <span>{t('chat.fixedFrequency')}</span>
                <select
                  value={item.fixedFrequency}
                  onChange={(event) => updateSchedulePromptTiming(item.id, { fixedFrequency: event.target.value })}
                >
                  {fixedFrequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {item.fixedFrequency === 'weekly' && (
                <label className="schedule-field">
                  <span>{t('chat.dayOfWeek')}</span>
                  <select
                    value={item.fixedDayOfWeek}
                    onChange={(event) => updateSchedulePromptTiming(item.id, { fixedDayOfWeek: event.target.value })}
                  >
                    {weekdayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {item.fixedFrequency === 'monthly' && (
                <label className="schedule-field">
                  <span>{t('chat.dayOfMonth')}</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    value={item.fixedDayOfMonth}
                    onChange={(event) => updateSchedulePromptTiming(item.id, {
                      fixedDayOfMonth: normalizeIntegerText(event.target.value, '1', 1, 31)
                    })}
                  />
                </label>
              )}
              <label className="schedule-field">
                <span>{t('chat.sendTime')}</span>
                <input
                  type="time"
                  value={item.fixedTime}
                  onChange={(event) => updateSchedulePromptTiming(item.id, { fixedTime: event.target.value })}
                />
              </label>
            </>
          ) : (
            <>
              <label className="schedule-field">
                <span>{t('chat.sendDateTime')}</span>
                <input
                  type="datetime-local"
                  value={item.sendAt}
                  min={getCurrentDateTimeInputValue()}
                  onChange={(event) => updateSchedulePromptTiming(item.id, { sendAt: event.target.value })}
                />
              </label>
              <label className="schedule-switch-field">
                <span>{t('chat.continuous')}</span>
                <button
                  className={`switch-control ${item.continuous ? 'is-on' : ''}`}
                  type="button"
                  role="switch"
                  aria-checked={item.continuous}
                  onClick={() => updateSchedulePromptTiming(item.id, { continuous: !item.continuous })}
                >
                  <span />
                </button>
              </label>
              {item.continuous && (
                <>
                  <label className="schedule-field schedule-interval-field">
                    <span>{t('chat.interval')}</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={item.intervalValue}
                      onChange={(event) => updateSchedulePromptTiming(item.id, {
                        intervalValue: normalizePositiveIntegerText(event.target.value, '1')
                      })}
                    />
                    <select
                      value={item.intervalUnit}
                      onChange={(event) => updateSchedulePromptTiming(item.id, { intervalUnit: event.target.value })}
                      aria-label={t('chat.intervalUnit')}
                    >
                      {intervalUnits.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="schedule-field">
                    <span>{t('chat.repeatCount')}</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={item.repeatCount}
                      onChange={(event) => updateSchedulePromptTiming(item.id, {
                        repeatCount: normalizePositiveIntegerText(event.target.value, '2')
                      })}
                    />
                  </label>
                </>
              )}
            </>
          )}
          <label className="schedule-switch-field schedule-enable-field">
            <span>{t('chat.enableScheduleLabel')}</span>
            <button
              className={`switch-control ${item.enabled ? 'is-on' : ''}`}
              type="button"
              role="switch"
              aria-checked={item.enabled}
              disabled={(!isFixedSchedule && !item.sendAt) || isSavingSchedule}
              title={isFixedSchedule || item.sendAt ? t('chat.enableSchedule') : t('chat.setScheduleFirst')}
              onClick={() => updateSchedulePromptTiming(item.id, { enabled: !item.enabled })}
            >
              <span />
            </button>
          </label>
        </div>
      </article>
    );
  }

  const fixedSchedulePrompts = schedulePrompts.filter((item) => item.scheduleKind === 'fixed');
  const standardSchedulePrompts = schedulePrompts.filter((item) => item.scheduleKind !== 'fixed');

  return (
    <main className="app-shell">
      <div className="sidebar-container">
        {systemSidebarOpen && (
          <aside className="sidebar" aria-label={t('chat.workspaceLabel')}>
            <div className="brand">
              <span className="brand-mark">
                <RobotIcon />
              </span>
              <span>Eiva</span>
            </div>
            <nav className="sidebar-nav" aria-label={t('chat.taskStatusLabel')}>
              <button
                className={`nav-item ${activeView === 'current' ? 'active' : ''}`}
                type="button"
                onClick={() => navigateTo('current')}
              >
                🤖 {t('sidebar.aiMaintenance')}
              </button>
              <button
                className={`nav-item ${activeView === 'history' ? 'active' : ''}`}
                type="button"
                onClick={() => navigateTo('history')}
              >
                📜 {t('sidebar.history')}
              </button>
              <button
                className={`nav-item ${activeView === 'schedule' ? 'active' : ''}`}
                type="button"
                onClick={() => navigateTo('schedule')}
              >
                📅 {t('sidebar.schedule')}
              </button>
              <button
                className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
                type="button"
                onClick={() => navigateTo('settings')}
              >
                ⚙️ {t('sidebar.systemSettings')}
              </button>
              <button
                className={`nav-item ${activeView === 'workflow' ? 'active' : ''}`}
                type="button"
                onClick={() => navigateTo('workflow')}
              >
                🔄 {t('sidebar.workflowEditor')}
              </button>
              <button
                className={`nav-item ${activeView === 'workspace' ? 'active' : ''}`}
                type="button"
                onClick={() => navigateTo('workspace')}
              >
                📁 {t('sidebar.workspace') || 'Workspace'}
              </button>
              <button
                className={`nav-item ${activeView === 'mcp' ? 'active' : ''}`}
                type="button"
                onClick={() => navigateTo('mcp')}
              >
                🖥️ {t('sidebar.mcpServer')}
              </button>
              <button
                className={`nav-item ${activeView === 'skill' ? 'active' : ''}`}
                type="button"
                onClick={() => navigateTo('skill')}
              >
                🧠 {t('sidebar.aiSkill')}
              </button>
              <div className="sidebar-lang-switcher" style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                {locales.map((loc) => (
                  <button
                    key={loc.code}
                    className={`lang-btn ${locale === loc.code ? 'active' : ''}`}
                    onClick={() => setLocale(loc.code)}
                    title={loc.label}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: locale === loc.code ? '#2563eb' : '#475569', fontWeight: locale === loc.code ? '600' : '400' }}
                  >
                    {loc.flag} {loc.label}
                  </button>
                ))}
              </div>
            </nav>
          </aside>
        )}
        <div
          className="sidebar-toggle"
          onClick={() => setSystemSidebarOpen(!systemSidebarOpen)}
          title={systemSidebarOpen ? t('sidebar.collapse') : t('sidebar.expand')}
        >
          {systemSidebarOpen ? '◀' : '▶'}
        </div>
      </div>

      <section className="chat-panel">
        <header className="chat-header">
          <div className="chat-header-inner">
            <nav className="breadcrumb" aria-label="breadcrumb">
              <span className="breadcrumb-item">{t('breadcrumb.home')}</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-item active">{t(`breadcrumb.${activeView}`)}</span>
            </nav>
            <h1 className="hero-title">{t(`breadcrumb.${activeView}`)}</h1>
          </div>
          {taskId && <span className="task-chip">Task ID: {taskId}</span>}
        </header>

        <div className={`messages ${shouldShowComposer ? '' : 'without-composer'}`} ref={logRef}>
          {activeView === 'current' ? (
            <>
              <article className="message assistant-message">
                <div className="avatar">
                  <RobotIcon />
                </div>
                <div className="message-body">
                  <p>{t('chat.describeHint')}</p>
                </div>
              </article>

              {taskId && (
                <article className="message user-message">
                  <div className="message-body">
                    <p>{submittedRequirement}</p>
                  </div>
                </article>
              )}

              {logs.length > 0 && (
                <article className="message assistant-message">
                  <div className="avatar">
                    <RobotIcon />
                  </div>
                  <div className="message-body">
                    <div className="message-title">
                      <span>{t('chat.executionStatus')}</span>
                    </div>
                    <div
                      className="log-window status-window"
                      ref={statusLogRef}
                      role="log"
                      aria-live="polite"
                      aria-relevant="additions text"
                    >
                      {logs.map((log, index) => (
                        <div className="log-line" key={`${log.at}-${index}`}>
                          <time>{new Date(log.at).toLocaleTimeString()}</time>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              )}

              {(result || error) && (
                <article className={`message assistant-message result-message ${error ? 'error-message' : ''}`}>
                  <div className="avatar">
                    <RobotIcon />
                  </div>
                  <div className="message-body">
                    <div className="message-title">
                      <span>{error ? t('chat.failed') : t('chat.result')}</span>
                    </div>
                    {result ? <pre>{result}</pre> : <p>{error}</p>}
                  </div>
                </article>
              )}

              {logs.length === 0 && !taskId && (
                <div className="suggestions" aria-label={t('chat.suggestionHint')}>
                  <button type="button" onClick={() => setRequirement(t('chat.requirementPlaceholder1'))}>
                    {t('chat.changeToChat')}
                  </button>
                  <button type="button" onClick={() => setRequirement(t('chat.requirementPlaceholder2'))}>
                    {t('chat.addSidebar')}
                  </button>
                  <button type="button" onClick={() => setRequirement(t('chat.requirementPlaceholder3'))}>
                    {t('chat.optimizeMobile')}
                  </button>
                </div>
              )}
            </>
          ) : activeView === 'history' ? (
            <article className="message assistant-message history-message">
              <div className="avatar">
                <RobotIcon />
              </div>
              <div className="message-body">
                <div className="message-title">
                  <span>{t('chat.historyTitle')}</span>
                </div>
                {history.length > 0 ? (
                  <div className="history-list">
                    {history.map((item) => (
                      <article className="history-item" key={item.id}>
                        <div className="history-row">
                          <button
                            className="history-summary"
                            type="button"
                            onClick={() => setSelectedHistoryId((current) => (current === item.id ? '' : item.id))}
                            aria-expanded={selectedHistoryId === item.id}
                          >
                            <span className="history-main">{item.requirement}</span>
                            <span className="history-meta">
                              <time>{new Date(item.createdAt).toLocaleString()}</time>
                            </span>
                          </button>
                          <button
                            className="history-schedule-button"
                            type="button"
                            onClick={() => addHistoryRequirementToSchedule(item)}
                          >
                            {t('chat.addToSchedule')}
                          </button>
                        </div>

                        {selectedHistoryId === item.id && (
                          <div className="history-detail">
                            <div>
                              <h2>{t('chat.originalRequirement')}</h2>
                              <p>{item.requirement}</p>
                            </div>
                            <div>
                              <h2>{t('chat.executionProcess')}</h2>
                              {item.processLogs?.length > 0 ? (
                                <div className="history-process" role="log">
                                  {item.processLogs.map((log, index) => (
                                    <div className="log-line" key={`${log.at}-${index}`}>
                                      <time>{new Date(log.at).toLocaleTimeString()}</time>
                                      <span>{log.message}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p>{t('chat.noProcessLogs')}</p>
                              )}
                            </div>
                            <div>
                              <h2>{item.error ? t('chat.failureReason') : t('chat.executionResult')}</h2>
                              {item.result ? (
                                <pre>{item.result}</pre>
                              ) : (
                                <p>{item.error || t('chat.noResult')}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">{t('chat.emptyHistory')}</p>
                )}
              </div>
            </article>
          ) : activeView === 'schedule' ? (
            <article className="message assistant-message schedule-message">
              <div className="avatar">
                <RobotIcon />
              </div>
              <div className="message-body">
                <div className="message-title">
                  <span>{t('chat.scheduleTitle')}</span>
                  <div className="schedule-title-actions">
                    <button
                      className="schedule-text-button primary"
                      type="button"
                      onClick={addManualSchedulePrompt}
                    >
                      {t('chat.addSchedule')}
                    </button>
                    <button
                      className="schedule-text-button primary"
                      type="button"
                      onClick={addManualFixedSchedulePrompt}
                    >
                      {t('chat.addFixedSchedule')}
                    </button>
                  </div>
                </div>
                {schedulePrompts.length > 0 ? (
                  <div className="schedule-prompt-area">
                    {standardSchedulePrompts.length > 0 && (
                      <section className="schedule-group">
                        <h2>{t('chat.generalSchedule')}</h2>
                        <div className="schedule-prompt-list" aria-label={t('chat.generalScheduleList')}>
                          {standardSchedulePrompts.map(renderSchedulePromptItem)}
                        </div>
                      </section>
                    )}
                    {fixedSchedulePrompts.length > 0 && (
                      <section className="schedule-group">
                        <h2>{t('chat.fixedSchedule')}</h2>
                        <div className="schedule-prompt-list" aria-label={t('chat.fixedScheduleList')}>
                          {fixedSchedulePrompts.map(renderSchedulePromptItem)}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  <p className="empty-state">{t('chat.emptySchedule')}</p>
                )}
              </div>
            </article>
          ) : activeView === 'workflow' ? (
            <WorkflowEditor />
          ) : activeView === 'workspace' ? (
            <WorkspacePage />
          ) : activeView === 'mcp' ? (
            <McpConfigPage />
          ) : activeView === 'skill' ? (
            <SkillConfigPage />
          ) : (
            <SystemConfigPage 
              systemSettings={systemSettings}
              updateSystemSetting={updateSystemSetting}
              clearSystemSetting={clearSystemSetting}
              systemSettingFields={systemSettingFields}
              t={t}
            />
          )}
        </div>

        {shouldShowComposer && (
          <form
            className="composer-wrap"
            onSubmit={(event) => {
              event.preventDefault();
              if (canStopTask) {
                stopTask();
                return;
              }
              submitTask();
            }}
          >
            <div className="composer-shell">
              {shouldShowComposerStatus && (
                <span className={`composer-status tone-${statusTone[status]}`} aria-live="polite">
                  {status === 'running' && <span className="status-spinner" aria-hidden="true" />}
                  {statusText[status]}
                </span>
              )}
              <div 
                className={`composer ${canStopTask ? 'has-stop-button' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {attachedFiles.length > 0 && (
                  <div className="composer-attachments">
                    {attachedFiles.map((file, i) => (
                      <div className="attachment-chip" key={i}>
                        <span className="attachment-name" title={file.name}>{file.name}</span>
                        <button type="button" onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}>
                          <CloseIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display: 'flex', width: '100%', alignItems: 'flex-start'}}>
                  <input type="file" multiple hidden id="file-upload" onChange={(e) => handleFiles(e.target.files)} />
                  <label htmlFor="file-upload" className="attach-button" aria-label="Attach File">
                    <AttachIcon />
                  </label>
                  <textarea
                    ref={composerRef}
                    value={requirement}
                    onChange={(event) => setRequirement(event.target.value)}
                    onKeyDown={handleRequirementKeyDown}
                    placeholder={t('chat.placeholder')}
                    rows={1}
                  />
                  <button
                    className={`send-button ${canStopTask ? 'stop-button' : ''}`}
                    type="submit"
                    disabled={canStopTask ? isStopping : ((!requirement.trim() && attachedFiles.length === 0) || isSubmitting || isTaskRunning)}
                    aria-label={canStopTask ? t('chat.stopTaskLabel') : t('chat.sendLabel')}
                    aria-keyshortcuts="Enter"
                    title={canStopTask ? `${t('chat.stopTaskLabel')} (${shortcutLabel})` : `${t('chat.sendLabel')} (${shortcutLabel})`}
                  >
                    {isSubmitting || isStopping ? (
                      <span className="button-spinner" aria-hidden="true" />
                    ) : canStopTask ? (
                      <StopIcon />
                    ) : (
                      '↑'
                    )}
                  </button>
                </div>
              </div>
            </div>
            <p className="composer-hint">
              {t('chat.composerHint', { shortcut: shortcutLabel, action: canStopTask ? t('chat.stopTaskLabel') : t('chat.send') })}
            </p>
          </form>
        )}
      </section>

      {copyableError && (
        <div className="copyable-error-backdrop" role="presentation">
          <section
            className="copyable-error-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="copyable-error-title"
          >
            <div className="copyable-error-header">
              <h2 id="copyable-error-title">錯誤訊息</h2>
              <button
                className="copyable-error-close"
                type="button"
                onClick={() => setCopyableError('')}
                aria-label="關閉錯誤訊息"
              >
                ×
              </button>
            </div>
            <textarea
              className="copyable-error-text"
              readOnly
              value={copyableError}
              onFocus={(event) => event.target.select()}
              aria-label="可複製的錯誤訊息"
            />
            <div className="copyable-error-actions">
              <button type="button" className="schedule-text-button" onClick={() => setCopyableError('')}>
                關閉
              </button>
              <button type="button" className="schedule-text-button primary" onClick={copyErrorMessage}>
                複製錯誤
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<I18nProvider><App /></I18nProvider>);
