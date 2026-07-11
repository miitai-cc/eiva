export function createScheduleStore(db) {
  const insertSchedule = db.prepare(`
    INSERT INTO schedules (
      schedule_id,
      name,
      requirement,
      cron_expression,
      enabled,
      send_at,
      continuous,
      interval_value,
      interval_unit,
      repeat_count,
      remaining_count,
      last_sent_at,
      next_send_at,
      schedule_kind,
      fixed_frequency,
      fixed_time,
      fixed_day_of_week,
      fixed_day_of_month,
      system_settings,
      created_at,
      updated_at
    ) VALUES (
      @scheduleId,
      @name,
      @requirement,
      @cronExpression,
      @enabled,
      @sendAt,
      @continuous,
      @intervalValue,
      @intervalUnit,
      @repeatCount,
      @remainingCount,
      @lastSentAt,
      @nextSendAt,
      @scheduleKind,
      @fixedFrequency,
      @fixedTime,
      @fixedDayOfWeek,
      @fixedDayOfMonth,
      @systemSettings,
      @createdAt,
      @updatedAt
    )
  `);
  const selectSchedule = db.prepare(`
    SELECT
      schedule_id AS scheduleId,
      name,
      requirement,
      cron_expression AS cronExpression,
      enabled,
      send_at AS sendAt,
      continuous,
      interval_value AS intervalValue,
      interval_unit AS intervalUnit,
      repeat_count AS repeatCount,
      remaining_count AS remainingCount,
      last_sent_at AS lastSentAt,
      next_send_at AS nextSendAt,
      schedule_kind AS scheduleKind,
      fixed_frequency AS fixedFrequency,
      fixed_time AS fixedTime,
      fixed_day_of_week AS fixedDayOfWeek,
      fixed_day_of_month AS fixedDayOfMonth,
      system_settings AS systemSettings,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM schedules
    WHERE schedule_id = ?
  `);
  const selectSchedules = db.prepare(`
    SELECT
      schedule_id AS scheduleId,
      name,
      requirement,
      cron_expression AS cronExpression,
      enabled,
      send_at AS sendAt,
      continuous,
      interval_value AS intervalValue,
      interval_unit AS intervalUnit,
      repeat_count AS repeatCount,
      remaining_count AS remainingCount,
      last_sent_at AS lastSentAt,
      next_send_at AS nextSendAt,
      schedule_kind AS scheduleKind,
      fixed_frequency AS fixedFrequency,
      fixed_time AS fixedTime,
      fixed_day_of_week AS fixedDayOfWeek,
      fixed_day_of_month AS fixedDayOfMonth,
      system_settings AS systemSettings,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM schedules
    ORDER BY created_at DESC
  `);
  const selectDueSchedules = db.prepare(`
    SELECT
      schedule_id AS scheduleId,
      name,
      requirement,
      cron_expression AS cronExpression,
      enabled,
      send_at AS sendAt,
      continuous,
      interval_value AS intervalValue,
      interval_unit AS intervalUnit,
      repeat_count AS repeatCount,
      remaining_count AS remainingCount,
      last_sent_at AS lastSentAt,
      next_send_at AS nextSendAt,
      schedule_kind AS scheduleKind,
      fixed_frequency AS fixedFrequency,
      fixed_time AS fixedTime,
      fixed_day_of_week AS fixedDayOfWeek,
      fixed_day_of_month AS fixedDayOfMonth,
      system_settings AS systemSettings,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM schedules
    WHERE enabled = 1
      AND COALESCE(next_send_at, '') != ''
      AND next_send_at <= ?
    ORDER BY next_send_at ASC
  `);
  const updateSchedule = db.prepare(`
    UPDATE schedules
    SET
      name = @name,
      requirement = @requirement,
      cron_expression = @cronExpression,
      enabled = @enabled,
      send_at = @sendAt,
      continuous = @continuous,
      interval_value = @intervalValue,
      interval_unit = @intervalUnit,
      repeat_count = @repeatCount,
      remaining_count = @remainingCount,
      last_sent_at = @lastSentAt,
      next_send_at = @nextSendAt,
      schedule_kind = @scheduleKind,
      fixed_frequency = @fixedFrequency,
      fixed_time = @fixedTime,
      fixed_day_of_week = @fixedDayOfWeek,
      fixed_day_of_month = @fixedDayOfMonth,
      system_settings = @systemSettings,
      updated_at = @updatedAt
    WHERE schedule_id = @scheduleId
  `);
  const insertRun = db.prepare(`
    INSERT INTO schedule_runs (
      run_id,
      schedule_id,
      task_id,
      status,
      started_at,
      completed_at,
      error
    ) VALUES (
      @runId,
      @scheduleId,
      @taskId,
      @status,
      @startedAt,
      @completedAt,
      @error
    )
  `);
  const updateRun = db.prepare(`
    UPDATE schedule_runs
    SET
      status = @status,
      completed_at = @completedAt,
      error = @error
    WHERE run_id = @runId
  `);
  const deleteSchedule = db.prepare(`
    DELETE FROM schedules
    WHERE schedule_id = ?
  `);

  return {
    create({
      scheduleId,
      name,
      requirement,
      cronExpression,
      enabled = true,
      sendAt = '',
      continuous = false,
      intervalValue = 1,
      intervalUnit = 'minutes',
      repeatCount = 2,
      scheduleKind = 'one_time',
      fixedFrequency = '',
      fixedTime = '15:00',
      fixedDayOfWeek = 1,
      fixedDayOfMonth = 1,
      systemSettings = {},
      createdAt = new Date().toISOString()
    }) {
      const normalized = normalizeScheduleInput({
        enabled,
        sendAt,
        continuous,
        intervalValue,
        intervalUnit,
        repeatCount,
        scheduleKind,
        fixedFrequency,
        fixedTime,
        fixedDayOfWeek,
        fixedDayOfMonth
      });
      const initialNextSendAt = normalized.enabled
        ? getInitialNextSendAt(normalized, createdAt)
        : '';

      insertSchedule.run({
        scheduleId,
        name,
        requirement,
        cronExpression: cronExpression || '',
        enabled: normalized.enabled ? 1 : 0,
        sendAt: normalized.sendAt,
        continuous: normalized.continuous ? 1 : 0,
        intervalValue: normalized.intervalValue,
        intervalUnit: normalized.intervalUnit,
        repeatCount: normalized.repeatCount,
        remainingCount: normalized.enabled && !normalized.isFixed ? normalized.repeatCount : 0,
        lastSentAt: '',
        nextSendAt: initialNextSendAt,
        scheduleKind: normalized.scheduleKind,
        fixedFrequency: normalized.fixedFrequency,
        fixedTime: normalized.fixedTime,
        fixedDayOfWeek: normalized.fixedDayOfWeek,
        fixedDayOfMonth: normalized.fixedDayOfMonth,
        systemSettings: JSON.stringify(systemSettings),
        createdAt,
        updatedAt: createdAt
      });
      return this.get(scheduleId);
    },

    get(scheduleId) {
      const row = selectSchedule.get(scheduleId);
      return row ? normalizeSchedule(row) : null;
    },

    list() {
      return selectSchedules.all().map(normalizeSchedule);
    },

    listDue(now = new Date()) {
      return selectDueSchedules.all(toComparableDateTime(now)).map(normalizeSchedule);
    },

    update(scheduleId, patch) {
      const current = this.get(scheduleId);
      if (!current) return null;
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
      const normalized = normalizeScheduleInput(next);
      const shouldResetRunPlan = Boolean(
        'enabled' in patch
        || 'sendAt' in patch
        || 'continuous' in patch
        || 'intervalValue' in patch
        || 'intervalUnit' in patch
        || 'repeatCount' in patch
        || 'scheduleKind' in patch
        || 'fixedFrequency' in patch
        || 'fixedTime' in patch
        || 'fixedDayOfWeek' in patch
        || 'fixedDayOfMonth' in patch
      );
      const remainingCount = shouldResetRunPlan
        ? (normalized.isFixed ? 0 : normalized.repeatCount)
        : Number.parseInt(next.remainingCount ?? normalized.repeatCount, 10);
      const nextSendAt = shouldResetRunPlan
        ? getInitialNextSendAt(normalized, next.updatedAt)
        : (next.nextSendAt || normalized.sendAt);

      updateSchedule.run({
        scheduleId,
        name: next.name,
        requirement: next.requirement,
        cronExpression: next.cronExpression || '',
        enabled: normalized.enabled ? 1 : 0,
        sendAt: normalized.sendAt,
        continuous: normalized.continuous ? 1 : 0,
        intervalValue: normalized.intervalValue,
        intervalUnit: normalized.intervalUnit,
        repeatCount: normalized.repeatCount,
        remainingCount: normalized.enabled && !normalized.isFixed ? remainingCount : 0,
        lastSentAt: next.lastSentAt || '',
        nextSendAt: normalized.enabled ? nextSendAt : '',
        scheduleKind: normalized.scheduleKind,
        fixedFrequency: normalized.fixedFrequency,
        fixedTime: normalized.fixedTime,
        fixedDayOfWeek: normalized.fixedDayOfWeek,
        fixedDayOfMonth: normalized.fixedDayOfMonth,
        systemSettings: JSON.stringify(next.systemSettings || {}),
        updatedAt: next.updatedAt
      });

      return this.get(scheduleId);
    },

    markSent(scheduleId, sentAt = new Date().toISOString()) {
      const current = this.get(scheduleId);
      if (!current) return null;
      const next = {
        ...current,
        lastSentAt: sentAt,
        updatedAt: new Date().toISOString()
      };

      if (current.scheduleKind === 'fixed') {
        next.enabled = true;
        next.remainingCount = 0;
        next.nextSendAt = calculateNextFixedSendAt(current, sentAt);
      } else if (!current.continuous) {
        next.enabled = false;
        next.remainingCount = 0;
        next.nextSendAt = '';
      } else {
        next.remainingCount = Math.max(0, current.remainingCount - 1);
        next.enabled = next.remainingCount > 0;
        next.nextSendAt = next.remainingCount > 0
          ? addInterval(sentAt, current.intervalValue, current.intervalUnit)
          : '';
      }

      updateSchedule.run({
        scheduleId,
        name: next.name,
        requirement: next.requirement,
        cronExpression: next.cronExpression || '',
        enabled: next.enabled ? 1 : 0,
        sendAt: next.sendAt,
        continuous: next.continuous ? 1 : 0,
        intervalValue: next.intervalValue,
        intervalUnit: next.intervalUnit,
        repeatCount: next.repeatCount,
        remainingCount: next.remainingCount,
        lastSentAt: next.lastSentAt,
        nextSendAt: next.nextSendAt,
        scheduleKind: next.scheduleKind,
        fixedFrequency: next.fixedFrequency,
        fixedTime: next.fixedTime,
        fixedDayOfWeek: next.fixedDayOfWeek,
        fixedDayOfMonth: next.fixedDayOfMonth,
        systemSettings: JSON.stringify(next.systemSettings || {}),
        updatedAt: next.updatedAt
      });

      return this.get(scheduleId);
    },

    createRun({
      runId,
      scheduleId,
      taskId = '',
      status,
      startedAt = new Date().toISOString(),
      completedAt = '',
      error = ''
    }) {
      insertRun.run({
        runId,
        scheduleId,
        taskId,
        status,
        startedAt,
        completedAt,
        error
      });
    },

    updateRun(runId, { status, completedAt = new Date().toISOString(), error = '' }) {
      updateRun.run({
        runId,
        status,
        completedAt,
        error
      });
    },

    delete(scheduleId) {
      return deleteSchedule.run(scheduleId).changes > 0;
    }
  };
}

function normalizeSchedule(row) {
  return {
    ...row,
    enabled: Boolean(row.enabled),
    continuous: Boolean(row.continuous),
    fixedDayOfWeek: Number.parseInt(row.fixedDayOfWeek, 10) || 1,
    fixedDayOfMonth: Number.parseInt(row.fixedDayOfMonth, 10) || 1,
    systemSettings: parseJsonObject(row.systemSettings)
  };
}

function normalizeScheduleInput(input) {
  const enabled = Boolean(input.enabled);
  const scheduleKind = input.scheduleKind === 'fixed' ? 'fixed' : 'one_time';
  const isFixed = scheduleKind === 'fixed';
  const continuous = isFixed ? true : Boolean(input.continuous);
  const intervalValue = Math.max(1, Number.parseInt(input.intervalValue, 10) || 1);
  const repeatCount = Math.max(1, Number.parseInt(input.repeatCount, 10) || 2);
  const intervalUnit = input.intervalUnit === 'hours' ? 'hours' : 'minutes';
  const fixedFrequency = ['daily', 'weekly', 'monthly'].includes(input.fixedFrequency)
    ? input.fixedFrequency
    : 'daily';
  const fixedTime = normalizeFixedTime(input.fixedTime);
  const fixedDayOfWeek = clampInteger(input.fixedDayOfWeek, 0, 6, 1);
  const fixedDayOfMonth = clampInteger(input.fixedDayOfMonth, 1, 31, 1);

  return {
    enabled,
    sendAt: typeof input.sendAt === 'string' ? input.sendAt : '',
    continuous,
    intervalValue,
    intervalUnit,
    repeatCount: isFixed ? 0 : (continuous ? repeatCount : 1),
    scheduleKind,
    isFixed,
    fixedFrequency,
    fixedTime,
    fixedDayOfWeek,
    fixedDayOfMonth
  };
}

function getInitialNextSendAt(schedule, fromDate = new Date()) {
  if (schedule.isFixed) {
    return calculateNextFixedSendAt(schedule, fromDate);
  }
  return schedule.sendAt;
}

function calculateNextFixedSendAt(schedule, fromDate = new Date()) {
  const base = fromDate instanceof Date ? new Date(fromDate) : new Date(fromDate);
  const [hours, minutes] = normalizeFixedTime(schedule.fixedTime).split(':').map((part) => Number.parseInt(part, 10));
  let next = new Date(base);
  next.setSeconds(0, 0);
  next.setHours(hours, minutes, 0, 0);

  if (schedule.fixedFrequency === 'weekly') {
    const targetDay = clampInteger(schedule.fixedDayOfWeek, 0, 6, 1);
    const dayDelta = (targetDay - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + dayDelta);
    if (next.getTime() <= base.getTime()) {
      next.setDate(next.getDate() + 7);
    }
    return toComparableDateTime(next);
  }

  if (schedule.fixedFrequency === 'monthly') {
    const targetDay = clampInteger(schedule.fixedDayOfMonth, 1, 31, 1);
    next = setMonthlyDate(base.getFullYear(), base.getMonth(), targetDay, hours, minutes);
    if (next.getTime() <= base.getTime()) {
      next = setMonthlyDate(base.getFullYear(), base.getMonth() + 1, targetDay, hours, minutes);
    }
    return toComparableDateTime(next);
  }

  if (next.getTime() <= base.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return toComparableDateTime(next);
}

function setMonthlyDate(year, monthIndex, targetDay, hours, minutes) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(targetDay, lastDay), hours, minutes, 0, 0);
}

function normalizeFixedTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return '15:00';
  const hours = clampInteger(match[1], 0, 23, 15);
  const minutes = clampInteger(match[2], 0, 59, 0);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function clampInteger(value, min, max, fallback) {
  const numberValue = Number.parseInt(value, 10);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(min, Math.min(max, numberValue));
}

function addInterval(fromIsoString, intervalValue, intervalUnit) {
  const date = new Date(fromIsoString);
  const minutes = intervalUnit === 'hours' ? intervalValue * 60 : intervalValue;
  date.setMinutes(date.getMinutes() + minutes);
  return toComparableDateTime(date);
}

function toComparableDateTime(date) {
  const nextDate = date instanceof Date ? date : new Date(date);
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  const hours = String(nextDate.getHours()).padStart(2, '0');
  const minutes = String(nextDate.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
