import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { eiva } from './eiva_api.js';
import './style.css';
import WorkflowEditor from './WorkflowEditor.jsx';
import McpConfigPage from './McpConfigPage.jsx';
import SkillConfigPage from './SkillConfigPage.jsx';
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

function RobotIcon() {
  return (
    <svg className="robot-icon" viewBox="0 0 24 24" role="img" aria-label={t('misc.robot')}>
      <path className="robot-antenna" d="M12 5V3" />
      <circle className="robot-antenna-dot" cx="12" cy="2.5" r="1" />
      <rect className="robot-face" x="5" y="7" width="14" height="12" rx="4" />
      <circle className="robot-eye" cx="9.5" cy="12" r="1.25" />
      <circle className="robot-eye" cx="14.5" cy="12" r="1.25" />
      <path className="robot-mouth" d="M9 15.5h6" />
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
    const parsed = JSON.parse(localStorage.getItem('Eiva-schedule-prompts') || '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => (
        item
        && typeof item.id === 'string'
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

  apiPrompts.forEach((item) => {
    merged.set(item.id, item);
  });
  localPrompts.forEach((item) => {
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
    localStorage.setItem('Eiva-schedule-prompts', JSON.stringify(prompts.slice(0, 30)));
  } catch {
    // Schedule prompts are local convenience data; the rest of the app should keep working.
  }
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
  const [activeView, setActiveView] = useState('current');
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [systemSidebarOpen, setSystemSidebarOpen] = useState(true);
  const [systemSettings, setSystemSettings] = useState(() => loadSystemSettings());
  const socketRef = useRef(null);
  const logRef = useRef(null);
  const statusLogRef = useRef(null);
  const composerRef = useRef(null);
  const isTaskRunning = status === 'queued' || status === 'running';
  const canStopTask = isTaskRunning && Boolean(taskId);
  const canUseComposer = activeView === 'current';
  const shouldShowComposer = canUseComposer;
  const shouldShowComposerStatus = status !== 'idle';
  const shortcutLabel = isMacPlatform() ? '⌘ Enter' : 'Alt Enter';
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
      const response = await fetch('/eiva/backend/api/ver-0.95/schedules', {
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
      setSchedulePrompts((current) => {
        const next = current.map((item) => (
          item.id === updatedItem.id ? persistedItem : item
        ));
        saveSchedulePrompts(next);
        return next;
      });
    }
    cancelEditingSchedulePrompt();
  }

  function updateEditingSchedulePromptDraft(value) {
    setEditingSchedulePromptValue(value);
  }

  async function updateSchedulePromptTiming(id, patch) {
    const currentItem = schedulePrompts.find((item) => item.id === id);
    if (!currentItem) return;

    const nextCandidate = normalizeSchedulePrompt({
      ...currentItem,
      ...patch,
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
      setSavingScheduleIds((current) => new Set(current).add(id));
      try {
        await persistAndReconcileSchedulePrompt(nextCandidate, { showError: true });
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

  function deleteSchedulePrompt(id) {
    setSchedulePrompts((current) => {
      const next = current.filter((item) => item.id !== id);
      saveSchedulePrompts(next);
      return next;
    });

    if (editingSchedulePromptId === id) {
      cancelEditingSchedulePrompt();
    }

    fetch(`/eiva/backend/api/ver-0.95/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => { });
  }

  async function persistSchedulePrompt(item, { showError = false } = {}) {
    if (!item.requirement.trim()) return null;

    const isLocalSchedule = isLocalSchedulePromptId(item.id);
    const endpoint = isLocalSchedule
      ? '/eiva/backend/api/ver-0.95/schedules'
      : `/eiva/backend/api/ver-0.95/schedules/${encodeURIComponent(item.id)}`;
    const method = isLocalSchedule ? 'POST' : 'PATCH';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedulePromptToPayload(item))
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (showError && payload.error) window.alert(payload.error);
        return null;
      }
      return normalizeSchedulePrompt(await response.json());
    } catch {
      // Local changes remain available; they can be retried on the next edit.
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
    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;

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

    socket.onopen = () => {
      appendLog({ message: t('chat.wsConnected') });
      const pingMsg = eiva.ClientMessage.create({ ping: {} });
      socket.send(eiva.ClientMessage.encode(pingMsg).finish());
    };

    socket.onclose = () => appendLog({ message: t('chat.wsDisconnected') });

    socket.onmessage = (event) => {
      try {
        const data = new Uint8Array(event.data);
        const serverMsg = eiva.ServerMessage.decode(data);
        const payloadType = serverMsg.payload;

        if (payloadType === 'taskCreated') {
          const ev = serverMsg.taskCreated;
          setTaskId(ev.taskId);
          updateLatestHistory({ taskId: ev.taskId });
          setRequirement('');
          setLogs([{ at: new Date().toISOString(), message: t('chat.taskCreated') }]);
          setStatus('queued');
          setIsSubmitting(false);
        } else if (payloadType === 'taskStatus') {
          const ev = serverMsg.taskStatus;
          if (ev.status === 'stopping') setIsStopping(true);
          else if (ev.status === 'running') {
            setIsStopping(false);
            setStatus('running');
            appendLog({ taskId: ev.taskId, message: t('chat.taskStarted'), at: new Date().toISOString() }, { addToHistory: true });
          }
        } else if (payloadType === 'taskLog') {
          const ev = serverMsg.taskLog;
          const shouldRecordLog = !ev.message?.startsWith('已訂閱任務 ');
          appendLog({ taskId: ev.taskId, message: ev.message, at: ev.at }, { addToHistory: shouldRecordLog });
        } else if (payloadType === 'taskCompleted') {
          const ev = serverMsg.taskCompleted;
          setIsStopping(false);
          setStatus('completed');
          setResult(ev.result);
          updateHistoryByTaskId(ev.taskId, { result: ev.result, completedAt: ev.at });
          appendLog({ taskId: ev.taskId, message: t('chat.taskCompleted'), at: ev.at }, { addToHistory: true });
        } else if (payloadType === 'taskFailed') {
          const ev = serverMsg.taskFailed;
          setIsStopping(false);
          setStatus('failed');
          setError(ev.error || t('chat.taskFailed'));
          updateHistoryByTaskId(ev.taskId, { error: ev.error || t('chat.taskFailed'), completedAt: ev.at });
          appendLog({ taskId: ev.taskId, message: ev.error || t('chat.taskFailed'), at: ev.at }, { addToHistory: true });
        } else if (payloadType === 'taskInterrupted') {
          const ev = serverMsg.taskInterrupted;
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

    return () => socket.close();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedulesFromApi() {
      try {
        const response = await fetch('/eiva/backend/api/ver-0.95/schedules');
        if (!response.ok) return;
        const payload = await response.json();
        if (!isMounted || !Array.isArray(payload.schedules)) return;
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
        const response = await fetch('/eiva/backend/api/ver-0.95/tasks?limit=30');
        if (!response.ok) return;
        const payload = await response.json();
        if (!isMounted || !Array.isArray(payload.tasks)) return;
        setHistory((current) => {
          const next = mergeHistoryItems(current, payload.tasks);
          saveHistory(next);
          return next;
        });
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
          const response = await fetch(`/eiva/backend/api/ver-0.95/tasks/${encodeURIComponent(item.taskId)}`);
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

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const req = eiva.ClientMessage.create({
        createTask: {
          requirement: trimmed,
          systemSettings: JSON.stringify(systemSettings)
        }
      });
      socketRef.current.send(eiva.ClientMessage.encode(req).finish());
    } else {
      setIsSubmitting(false);
      setStatus('failed');
      setError(t('chat.wsNotConnected'));
      updateLatestHistory({ error: t('chat.wsNotConnected') });
    }
  }

  async function stopTask() {
    if (!canStopTask || isStopping) return;

    setIsStopping(true);
    const entry = { at: new Date().toISOString(), message: t('chat.stoppingTask') };
    setLogs((current) => [...current, entry]);
    appendProcessLogToHistory(taskId, entry);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const req = eiva.ClientMessage.create({
        stopTask: {
          taskId: taskId
        }
      });
      socketRef.current.send(eiva.ClientMessage.encode(req).finish());
    } else {
      setIsStopping(false);
      const errorEntry = { at: new Date().toISOString(), message: t('chat.wsNotConnected') };
      setLogs((current) => [...current, errorEntry]);
      appendProcessLogToHistory(taskId, errorEntry);
    }
  }

  function handleRequirementKeyDown(event) {
    if (event.key !== 'Enter' || event.isComposing) return;

    const isSubmitShortcut = isMacPlatform()
      ? event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey
      : event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey;

    if (!isSubmitShortcut) return;

    event.preventDefault();
    if (canStopTask) {
      stopTask();
      return;
    }
    submitTask();
  }

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
                onClick={() => setActiveView('current')}
              >
                {t('sidebar.aiMaintenance')}
              </button>
              <button
                className={`nav-item ${activeView === 'history' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('history')}
              >
                {t('sidebar.history')}
              </button>
              <button
                className={`nav-item ${activeView === 'schedule' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('schedule')}
              >
                {t('sidebar.schedule')}
              </button>
              <button
                className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('settings')}
              >
                {t('sidebar.systemSettings')}
              </button>
              <button
                className={`nav-item ${activeView === 'workflow' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('workflow')}
              >
                {t('sidebar.workflowEditor')}
              </button>
              <button
                className={`nav-item ${activeView === 'mcp' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('mcp')}
              >
                {t('sidebar.mcpServer')}
              </button>
              <button
                className={`nav-item ${activeView === 'skill' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('skill')}
              >
                {t('sidebar.aiSkill')}
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
          <div>
            <h1>{t('chat.title')}</h1>
            <p>{t('chat.subtitle')}</p>
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
          ) : activeView === 'mcp' ? (
            <McpConfigPage />
          ) : activeView === 'skill' ? (
            <SkillConfigPage />
          ) : (
            <article className="message assistant-message settings-message">
              <div className="avatar">
                <RobotIcon />
              </div>
              <div className="message-body">
                <div className="message-title">
                  <span>{t('chat.systemSettingsTitle')}</span>
                </div>
                <div className="settings-form">
                  {systemSettingFields.map((field) => (
                    <div className="settings-field" key={field.key}>
                      <span className="settings-field-header">
                        <label className="settings-label" htmlFor={`system-setting-${field.key}`}>
                          {field.label}
                        </label>
                      </span>
                      <span className="settings-description">{field.description}</span>
                      <div className="settings-input-wrap">
                        <textarea
                          id={`system-setting-${field.key}`}
                          value={systemSettings[field.key]}
                          onChange={(event) => updateSystemSetting(field.key, event.target.value)}
                          placeholder={field.key === 'prefixPrompt' ? t('prompts.enterPrefix') :
                                       field.key === 'suffixPrompt' ? t('prompts.enterSuffix') :
                                       field.key === 'roleDefinition' ? t('prompts.enterRole') :
                                       field.key === 'shortDescription' ? t('prompts.enterShortDesc') :
                                       t('prompts.enterUsageTiming')}
                          rows={field.key === 'shortDescription' ? 2 : 4}
                        />
                        <button
                          className="settings-clear-button"
                          type="button"
                          onClick={() => clearSystemSetting(field.key)}
                        >
                          {t('prompts.clearContent')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
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
              <div className={`composer ${canStopTask ? 'has-stop-button' : ''}`}>
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
                  disabled={canStopTask ? isStopping : (!requirement.trim() || isSubmitting || isTaskRunning)}
                  aria-label={canStopTask ? t('chat.stopTaskLabel') : t('chat.sendLabel')}
                  aria-keyshortcuts="Meta+Enter Alt+Enter"
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
            <p className="composer-hint">
              {t('chat.composerHint', { shortcut: shortcutLabel, action: canStopTask ? t('chat.stopTaskLabel') : t('chat.send') })}
            </p>
          </form>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<I18nProvider><App /></I18nProvider>);
