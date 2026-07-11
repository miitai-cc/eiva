import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { eiva } from './eiva_api.js';
import './style.css';
import WorkflowEditor from './WorkflowEditor.jsx';
import McpConfigPage from './McpConfigPage.jsx';
import SkillConfigPage from './SkillConfigPage.jsx';

const statusText = {
  idle: '尚未送出',
  queued: '已建立任務',
  running: '執行中',
  completed: '已完成',
  failed: '失敗',
  interrupted: '未完成'
};

const statusTone = {
  idle: 'neutral',
  queued: 'neutral',
  running: 'working',
  completed: 'success',
  failed: 'danger',
  interrupted: 'neutral'
};

const systemSettingFields = [
  {
    key: 'prefixPrompt',
    label: '前置提示詞',
    description: '送出需求時會放在使用者需求之前，作為任務開始前的補充指令。'
  },
  {
    key: 'suffixPrompt',
    label: '後置提示詞',
    description: '送出需求時會放在使用者需求之後，作為任務結尾的補充指令。'
  },
  {
    key: 'roleDefinition',
    label: '角色定義',
    description: '定義此模式下的專業知識和個性。此描述將會形塑展現自我及處理工作的方式。'
  },
  {
    key: 'shortDescription',
    label: '簡短描述',
    description: '在模式選擇下拉選單中顯示的簡短描述。'
  },
  {
    key: 'usageTiming',
    label: '使用時機',
    description: '提供何時應使用此模式的指引。這有助於為任務選擇正確的模式。'
  }
];

const emptySystemSettings = Object.fromEntries(
  systemSettingFields.map((field) => [field.key, ''])
);

const intervalUnits = [
  { value: 'minutes', label: '分鐘' },
  { value: 'hours', label: '小時' }
];
const fixedFrequencyOptions = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每星期' },
  { value: 'monthly', label: '每月' }
];
const weekdayOptions = [
  { value: '0', label: '星期日' },
  { value: '1', label: '星期一' },
  { value: '2', label: '星期二' },
  { value: '3', label: '星期三' },
  { value: '4', label: '星期四' },
  { value: '5', label: '星期五' },
  { value: '6', label: '星期六' }
];
const localScheduleIdPrefix = 'local-schedule-';
const scheduleRefreshIntervalMs = 10000;

function RobotIcon() {
  return (
    <svg className="robot-icon" viewBox="0 0 24 24" role="img" aria-label="機器人">
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
  const intervalUnit = intervalUnits.some((unit) => unit.value === item.intervalUnit)
    ? item.intervalUnit
    : 'minutes';
  const intervalValue = typeof item.intervalValue === 'number'
    ? String(item.intervalValue)
    : item.intervalValue;
  const repeatCount = typeof item.repeatCount === 'number'
    ? String(item.repeatCount)
    : item.repeatCount;
  const scheduleKind = item.scheduleKind === 'fixed' ? 'fixed' : 'one_time';
  const fixedFrequency = fixedFrequencyOptions.some((option) => option.value === item.fixedFrequency)
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

function loadSystemSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem('Eiva-system-settings') || '{}');
    return systemSettingFields.reduce((settings, field) => ({
      ...settings,
      [field.key]: typeof parsed[field.key] === 'string' ? parsed[field.key] : ''
    }), { ...emptySystemSettings });
  } catch {
    return { ...emptySystemSettings };
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
      log.message === entry.message && (log.at === entry.at || entry.message === '任務已建立')
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
        window.alert('請先輸入並儲存排程需求。');
        return;
      }
      if (nextCandidate.scheduleKind !== 'fixed' && !isFutureScheduleTime(nextCandidate.sendAt)) {
        window.alert('發送時間日期必須晚於目前時間，請重新設定後再啟用。');
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
      appendLog({ message: 'WebSocket 已連線' });
      const pingMsg = eiva.ClientMessage.create({ ping: {} });
      socket.send(eiva.ClientMessage.encode(pingMsg).finish());
    };

    socket.onclose = () => appendLog({ message: 'WebSocket 已中斷' });

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
          setLogs([{ at: new Date().toISOString(), message: '任務已建立' }]);
          setStatus('queued');
          setIsSubmitting(false);
        } else if (payloadType === 'taskStatus') {
          const ev = serverMsg.taskStatus;
          if (ev.status === 'stopping') setIsStopping(true);
          else if (ev.status === 'running') {
            setIsStopping(false);
            setStatus('running');
            appendLog({ taskId: ev.taskId, message: '任務已開始', at: new Date().toISOString() }, { addToHistory: true });
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
          appendLog({ taskId: ev.taskId, message: '任務完成', at: ev.at }, { addToHistory: true });
        } else if (payloadType === 'taskFailed') {
          const ev = serverMsg.taskFailed;
          setIsStopping(false);
          setStatus('failed');
          setError(ev.error || '任務處理失敗');
          updateHistoryByTaskId(ev.taskId, { error: ev.error || '任務處理失敗', completedAt: ev.at });
          appendLog({ taskId: ev.taskId, message: ev.error || '任務處理失敗', at: ev.at }, { addToHistory: true });
        } else if (payloadType === 'taskInterrupted') {
          const ev = serverMsg.taskInterrupted;
          setIsStopping(false);
          setStatus('interrupted');
          setError(ev.error || '任務已停止');
          updateHistoryByTaskId(ev.taskId, { error: ev.error || '任務已停止', completedAt: ev.at });
          appendLog({ taskId: ev.taskId, message: ev.error || '任務已停止', at: ev.at }, { addToHistory: true });
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
                error: '任務紀錄已不存在，可能是伺服器重啟或連線中斷。'
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
          processLogs: [{ at: now, message: '任務已送出，等待後端建立...' }],
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
      setError('WebSocket 未連線');
      updateLatestHistory({ error: 'WebSocket 未連線' });
    }
  }

  async function stopTask() {
    if (!canStopTask || isStopping) return;

    setIsStopping(true);
    const entry = { at: new Date().toISOString(), message: '正在要求停止任務' };
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
      const errorEntry = { at: new Date().toISOString(), message: 'WebSocket 未連線' };
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
              placeholder="輸入排程需求"
              aria-label="編輯排程提示詞"
            />
            <div className="schedule-prompt-actions">
              <button
                className="schedule-text-button primary"
                type="button"
                onClick={saveEditingSchedulePrompt}
                disabled={!editingSchedulePromptValue.trim()}
              >
                儲存
              </button>
              <button
                className="schedule-text-button"
                type="button"
                onClick={cancelEditingSchedulePrompt}
              >
                取消
              </button>
            </div>
          </>
        ) : (
          <>
            <p>{item.requirement || '尚未輸入排程需求'}</p>
            <div className="schedule-prompt-actions">
              <button
                className="schedule-text-button"
                type="button"
                onClick={() => startEditingSchedulePrompt(item)}
              >
                編輯
              </button>
              <button
                className="schedule-text-button danger"
                type="button"
                onClick={() => deleteSchedulePrompt(item.id)}
              >
                刪除
              </button>
            </div>
          </>
        )}
        <div className="schedule-timing-fields">
          {isFixedSchedule ? (
            <>
              <label className="schedule-field">
                <span>固定頻率</span>
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
                  <span>星期</span>
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
                  <span>日期</span>
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
                <span>發送時間</span>
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
                <span>發送時間日期</span>
                <input
                  type="datetime-local"
                  value={item.sendAt}
                  min={getCurrentDateTimeInputValue()}
                  onChange={(event) => updateSchedulePromptTiming(item.id, { sendAt: event.target.value })}
                />
              </label>
              <label className="schedule-switch-field">
                <span>持續發送</span>
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
                    <span>間隔時間</span>
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
                      aria-label="間隔單位"
                    >
                      {intervalUnits.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="schedule-field">
                    <span>次數</span>
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
            <span>啟用排程</span>
            <button
              className={`switch-control ${item.enabled ? 'is-on' : ''}`}
              type="button"
              role="switch"
              aria-checked={item.enabled}
              disabled={(!isFixedSchedule && !item.sendAt) || isSavingSchedule}
              title={isFixedSchedule || item.sendAt ? '啟用後會在指定時間發送' : '請先設定發送時間日期'}
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
    <main className="app-shell" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: '100%' }}>
        {systemSidebarOpen && (
          <aside className="sidebar" aria-label="工作區" style={{ width: '220px', overflowY: 'auto' }}>
            <div className="brand">
              <span className="brand-mark">
                <RobotIcon />
              </span>
              <span>Eiva</span>
            </div>
            <nav className="sidebar-nav" aria-label="任務狀態">
              <button
                className={`nav-item ${activeView === 'current' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('current')}
              >
                AI 功能維護
              </button>
              <button
                className={`nav-item ${activeView === 'history' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('history')}
              >
                歷史紀錄
              </button>
              <button
                className={`nav-item ${activeView === 'schedule' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('schedule')}
              >
                排程設定
              </button>
              <button
                className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('settings')}
              >
                系統設定
              </button>
              <button
                className={`nav-item ${activeView === 'workflow' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('workflow')}
              >
                工作流程 編輯器
              </button>
              <button
                className={`nav-item ${activeView === 'mcp' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('mcp')}
              >
                MCP 伺服器維護
              </button>
              <button
                className={`nav-item ${activeView === 'skill' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveView('skill')}
              >
                AI Skill 維護
              </button>
            </nav>
          </aside>
        )}
        <div
          style={{ width: '20px', backgroundColor: '#222', borderRight: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', fontSize: '10px' }}
          onClick={() => setSystemSidebarOpen(!systemSidebarOpen)}
          title={systemSidebarOpen ? '收合側邊欄' : '展開側邊欄'}
        >
          {systemSidebarOpen ? '◀' : '▶'}
        </div>
      </div>

      <section className="chat-panel" style={{ flex: 1, overflow: 'hidden' }}>
        <header className="chat-header">
          <div>
            <h1>需求派工工具</h1>
            <p>把想修改的畫面或功能輸入給 Codex。</p>
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
                  <p>請描述你想修改的畫面、功能或限制。我會在允許的專案目錄內執行。</p>
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
                      <span>執行狀態</span>
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
                      <span>{error ? '任務失敗' : '任務結果'}</span>
                    </div>
                    {result ? <pre>{result}</pre> : <p>{error}</p>}
                  </div>
                </article>
              )}

              {logs.length === 0 && !taskId && (
                <div className="suggestions" aria-label="範例需求">
                  <button type="button" onClick={() => setRequirement('將首頁改成更像 ChatGPT 的聊天介面')}>
                    將首頁改成聊天介面
                  </button>
                  <button type="button" onClick={() => setRequirement('幫我增加左側選單與任務狀態')}>
                    增加左側選單
                  </button>
                  <button type="button" onClick={() => setRequirement('優化手機版排版，避免文字重疊')}>
                    優化手機版排版
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
                  <span>歷史紀錄</span>
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
                            加入排程
                          </button>
                        </div>

                        {selectedHistoryId === item.id && (
                          <div className="history-detail">
                            <div>
                              <h2>當初需求</h2>
                              <p>{item.requirement}</p>
                            </div>
                            <div>
                              <h2>執行過程</h2>
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
                                <p>目前沒有可顯示的執行過程。</p>
                              )}
                            </div>
                            <div>
                              <h2>{item.error ? '失敗原因' : '執行結果'}</h2>
                              {item.result ? (
                                <pre>{item.result}</pre>
                              ) : (
                                <p>{item.error || '目前沒有可顯示的結果。'}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">尚無歷史問題。</p>
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
                  <span>排程設定</span>
                  <div className="schedule-title-actions">
                    <button
                      className="schedule-text-button primary"
                      type="button"
                      onClick={addManualSchedulePrompt}
                    >
                      新增排程
                    </button>
                    <button
                      className="schedule-text-button primary"
                      type="button"
                      onClick={addManualFixedSchedulePrompt}
                    >
                      新增固定排程
                    </button>
                  </div>
                </div>
                {schedulePrompts.length > 0 ? (
                  <div className="schedule-prompt-area">
                    {standardSchedulePrompts.length > 0 && (
                      <section className="schedule-group">
                        <h2>一般排程</h2>
                        <div className="schedule-prompt-list" aria-label="一般排程清單">
                          {standardSchedulePrompts.map(renderSchedulePromptItem)}
                        </div>
                      </section>
                    )}
                    {fixedSchedulePrompts.length > 0 && (
                      <section className="schedule-group">
                        <h2>固定排程</h2>
                        <div className="schedule-prompt-list" aria-label="固定排程清單">
                          {fixedSchedulePrompts.map(renderSchedulePromptItem)}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  <p className="empty-state">目前尚無可調整的排程設定。可從歷史紀錄將需求提示詞加入排程。</p>
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
                  <span>系統設定</span>
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
                          placeholder={`輸入${field.label}`}
                          rows={field.key === 'shortDescription' ? 2 : 4}
                        />
                        <button
                          className="settings-clear-button"
                          type="button"
                          onClick={() => clearSystemSetting(field.key)}
                        >
                          清空內容
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
                  placeholder="訊息 Codex"
                  rows={1}
                />
                <button
                  className={`send-button ${canStopTask ? 'stop-button' : ''}`}
                  type="submit"
                  disabled={canStopTask ? isStopping : (!requirement.trim() || isSubmitting || isTaskRunning)}
                  aria-label={canStopTask ? '停止目前任務' : '送出需求'}
                  aria-keyshortcuts="Meta+Enter Alt+Enter"
                  title={canStopTask ? `停止目前任務 (${shortcutLabel})` : `送出需求 (${shortcutLabel})`}
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
              使用 {shortcutLabel} {canStopTask ? '停止目前任務' : '送出'}。Codex 可能會修改專案檔案，送出前請確認需求明確。
            </p>
          </form>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
