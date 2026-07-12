import express from 'express';
import { randomUUID } from 'node:crypto';

export function createScheduleRouter({ scheduleStore }) {
  const router = express.Router();

  router.get('/', (_request, response) => {
    response.json({ schedules: scheduleStore.list() });
  });

  router.post('/', (request, response) => {
    const payload = normalizeSchedulePayload(request.body);
    if (!payload.requirement) {
      response.status(400).json({ error: 'requirement 不可為空' });
      return;
    }
    const activationError = payload.enabled ? getActivationError(payload) : '';
    if (activationError) {
      response.status(400).json({ error: activationError });
      return;
    }

    const schedule = scheduleStore.create({
      scheduleId: randomUUID(),
      ...payload,
      name: payload.name || summarizeRequirement(payload.requirement)
    });

    response.status(201).json(schedule);
  });

  router.patch('/:scheduleId', (request, response) => {
    const current = scheduleStore.get(request.params.scheduleId);
    if (!current) {
      response.status(404).json({ error: '找不到排程設定' });
      return;
    }

    const patch = normalizeSchedulePayload(request.body, { partial: true });
    const shouldValidateActivation = (patch.enabled === true || 'sendAt' in patch) && ({ ...current, ...patch }).enabled;
    const activationError = shouldValidateActivation ? getActivationError({ ...current, ...patch }) : '';
    if (activationError) {
      response.status(400).json({ error: activationError });
      return;
    }

    const schedule = scheduleStore.update(request.params.scheduleId, patch);
    response.json(schedule);
  });

  router.delete('/:scheduleId', (request, response) => {
    const didDelete = scheduleStore.delete(request.params.scheduleId);
    if (!didDelete) {
      response.status(404).json({ error: '找不到排程設定' });
      return;
    }

    response.status(204).end();
  });

  return router;
}

function normalizeSchedulePayload(body = {}, { partial = false } = {}) {
  const payload = {};

  if (!partial || 'name' in body) payload.name = String(body.name ?? '').trim();
  if (!partial || 'requirement' in body) payload.requirement = String(body.requirement ?? '').trim();
  if (!partial || 'cronExpression' in body) payload.cronExpression = String(body.cronExpression ?? '').trim();
  if (!partial || 'enabled' in body) payload.enabled = Boolean(body.enabled);
  if (!partial || 'sendAt' in body) payload.sendAt = String(body.sendAt ?? '').trim();
  if (!partial || 'continuous' in body) payload.continuous = Boolean(body.continuous);
  if (!partial || 'intervalValue' in body) payload.intervalValue = Math.max(1, Number.parseInt(body.intervalValue, 10) || 1);
  if (!partial || 'intervalUnit' in body) payload.intervalUnit = body.intervalUnit === 'hours' ? 'hours' : 'minutes';
  if (!partial || 'repeatCount' in body) payload.repeatCount = Math.max(1, Number.parseInt(body.repeatCount, 10) || 2);
  if (!partial || 'scheduleKind' in body) payload.scheduleKind = body.scheduleKind === 'fixed' ? 'fixed' : 'one_time';
  if (!partial || 'fixedFrequency' in body) {
    payload.fixedFrequency = ['daily', 'weekly', 'monthly'].includes(body.fixedFrequency) ? body.fixedFrequency : 'daily';
  }
  if (!partial || 'fixedTime' in body) payload.fixedTime = normalizeFixedTime(body.fixedTime);
  if (!partial || 'fixedDayOfWeek' in body) payload.fixedDayOfWeek = clampInteger(body.fixedDayOfWeek, 0, 6, 1);
  if (!partial || 'fixedDayOfMonth' in body) payload.fixedDayOfMonth = clampInteger(body.fixedDayOfMonth, 1, 31, 1);
  if (!partial || 'systemSettings' in body) {
    payload.systemSettings = body.systemSettings && typeof body.systemSettings === 'object' && !Array.isArray(body.systemSettings)
      ? body.systemSettings
      : {};
  }

  return payload;
}

function summarizeRequirement(requirement) {
  return requirement.length > 40 ? `${requirement.slice(0, 40)}...` : requirement;
}

function getActivationError(schedule) {
  if (!schedule.enabled) return '';
  if (schedule.scheduleKind === 'fixed') return '';
  if (!schedule.sendAt) return '請先設定發送時間日期。';
  if (!isFutureSendAt(schedule.sendAt)) {
    return '發送時間日期必須晚於目前時間，請重新設定後再啟用。';
  }
  return '';
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

function isFutureSendAt(sendAt) {
  const sendTime = new Date(sendAt).getTime();
  return Number.isFinite(sendTime) && sendTime > Date.now();
}
