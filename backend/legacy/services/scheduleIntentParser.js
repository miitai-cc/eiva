const intervalPattern = /每隔\s*(\d+)\s*(分鐘|分|小時|時)(?:\D{0,12}?(\d+)\s*次)?/;
const repeatPattern = /(\d+)\s*次/;

export function parseScheduleIntent(text, now = new Date()) {
  const requirement = String(text || '').trim();
  if (!requirement) return { isSchedule: false };
  if (looksLikeScheduleDiscussion(requirement)) return { isSchedule: false };

  const fixedIntent = parseFixedScheduleIntent(requirement);
  if (fixedIntent) return fixedIntent;

  const timeMatch = findScheduleTime(requirement, now);
  if (!timeMatch) return { isSchedule: false };

  const intervalMatch = requirement.match(intervalPattern);
  const repeatMatch = requirement.match(repeatPattern);
  const continuous = Boolean(intervalMatch);
  const intervalUnit = intervalMatch?.[2]?.includes('小') || intervalMatch?.[2] === '時'
    ? 'hours'
    : 'minutes';
  const intervalValue = continuous ? Math.max(1, Number.parseInt(intervalMatch[1], 10) || 1) : 1;
  const repeatCount = continuous
    ? Math.max(2, Number.parseInt(intervalMatch?.[3] || repeatMatch?.[1], 10) || 2)
    : 1;
  const sendAt = toDateTimeInputValue(timeMatch.date);

  if (timeMatch.date.getTime() <= now.getTime()) {
    return {
      isSchedule: true,
      error: '排程時間必須晚於目前時間，請重新指定未來時間。'
    };
  }

  return {
    isSchedule: true,
    schedule: {
      requirement: cleanScheduledRequirement(requirement, [timeMatch.raw, intervalMatch?.[0]]),
      sendAt,
      continuous,
      intervalValue,
      intervalUnit,
      repeatCount,
      scheduleKind: 'one_time',
      enabled: true
    }
  };
}

function parseFixedScheduleIntent(text) {
  const dailyMatch = text.match(/(每天|每日|每一天|天天)\s*(上午|早上|下午|晚上|中午|凌晨)?\s*(\d{1,2})(?:(?:[:：]|點)(半|\d{1,2})?)?/);
  if (dailyMatch) {
    return buildFixedIntent(text, {
      raw: dailyMatch[0],
      fixedFrequency: 'daily',
      fixedTime: toFixedTime(dailyMatch[2] || '', dailyMatch[3], dailyMatch[4])
    });
  }

  const weeklyMatch = text.match(/(每星期|每週|每周)\s*([日天一二三四五六0-6])\s*(上午|早上|下午|晚上|中午|凌晨)?\s*(\d{1,2})(?:(?:[:：]|點)(半|\d{1,2})?)?/);
  if (weeklyMatch) {
    return buildFixedIntent(text, {
      raw: weeklyMatch[0],
      fixedFrequency: 'weekly',
      fixedDayOfWeek: parseWeekday(weeklyMatch[2]),
      fixedTime: toFixedTime(weeklyMatch[3] || '', weeklyMatch[4], weeklyMatch[5])
    });
  }

  const monthlyMatch = text.match(/每月\s*(\d{1,2})\s*(?:號|日)?\s*(上午|早上|下午|晚上|中午|凌晨)?\s*(\d{1,2})(?:(?:[:：]|點)(半|\d{1,2})?)?/);
  if (monthlyMatch) {
    const fixedDayOfMonth = Math.max(1, Math.min(31, Number.parseInt(monthlyMatch[1], 10) || 1));
    return buildFixedIntent(text, {
      raw: monthlyMatch[0],
      fixedFrequency: 'monthly',
      fixedDayOfMonth,
      fixedTime: toFixedTime(monthlyMatch[2] || '', monthlyMatch[3], monthlyMatch[4])
    });
  }

  return null;
}

function buildFixedIntent(text, options) {
  return {
    isSchedule: true,
    schedule: {
      requirement: cleanScheduledRequirement(text, [options.raw]),
      sendAt: '',
      continuous: true,
      intervalValue: 1,
      intervalUnit: 'minutes',
      repeatCount: 0,
      scheduleKind: 'fixed',
      fixedFrequency: options.fixedFrequency,
      fixedTime: options.fixedTime,
      fixedDayOfWeek: options.fixedDayOfWeek ?? 1,
      fixedDayOfMonth: options.fixedDayOfMonth ?? 1,
      enabled: true
    }
  };
}

function findScheduleTime(text, now) {
  const explicitDateTime = text.match(
    /(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\s*(上午|早上|下午|晚上|中午|凌晨)?\s*(\d{1,2})(?:(?:[:：]|點)(半|\d{1,2})?)?/,
  );
  if (explicitDateTime) {
    return buildDateTimeMatch({
      raw: explicitDateTime[0],
      year: Number.parseInt(explicitDateTime[1], 10),
      month: Number.parseInt(explicitDateTime[2], 10),
      day: Number.parseInt(explicitDateTime[3], 10),
      meridiem: explicitDateTime[4] || '',
      hour: explicitDateTime[5],
      minute: explicitDateTime[6]
    });
  }

  const monthDayTime = text.match(
    /(\d{1,2})[-/](\d{1,2})\s*(上午|早上|下午|晚上|中午|凌晨)?\s*(\d{1,2})(?:(?:[:：]|點)(半|\d{1,2})?)?/,
  );
  if (monthDayTime) {
    return buildDateTimeMatch({
      raw: monthDayTime[0],
      year: now.getFullYear(),
      month: Number.parseInt(monthDayTime[1], 10),
      day: Number.parseInt(monthDayTime[2], 10),
      meridiem: monthDayTime[3] || '',
      hour: monthDayTime[4],
      minute: monthDayTime[5]
    });
  }

  const relativeDate = text.match(/(今天|今日|明天|明日|後天)/);
  const relativeText = relativeDate ? text.slice(relativeDate.index + relativeDate[0].length) : '';
  const relativeTime = relativeText.match(
    /(上午|早上|下午|晚上|中午|凌晨)?\s*(\d{1,2})(?:(?:[:：]|點)(半|\d{1,2})?)?\s*(?:分)?/,
  );
  if (relativeDate && relativeTime) {
    const date = new Date(now);
    if (relativeDate[1] === '明天' || relativeDate[1] === '明日') {
      date.setDate(date.getDate() + 1);
    } else if (relativeDate[1] === '後天') {
      date.setDate(date.getDate() + 2);
    }

    return buildDateTimeMatch({
      raw: `${relativeDate[0]}${relativeTime[0]}`,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      meridiem: relativeTime[1] || '',
      hour: relativeTime[2],
      minute: relativeTime[3]
    });
  }

  return null;
}

function buildDateTimeMatch({ raw, year, month, day, meridiem, hour, minute }) {
  const normalizedHour = normalizeHour(Number.parseInt(hour, 10), meridiem);
  const normalizedMinute = normalizeMinute(minute);
  const date = new Date(year, month - 1, day, normalizedHour, normalizedMinute, 0, 0);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || !Number.isFinite(date.getTime())
  ) {
    return null;
  }

  return { raw, date };
}

function normalizeHour(hour, meridiem) {
  if (!Number.isFinite(hour)) return 0;
  if ((meridiem === '下午' || meridiem === '晚上') && hour < 12) return hour + 12;
  if ((meridiem === '上午' || meridiem === '早上' || meridiem === '凌晨') && hour === 12) return 0;
  if (meridiem === '中午' && hour < 11) return hour + 12;
  return hour;
}

function normalizeMinute(value) {
  if (value === '半') return 30;
  return Math.max(0, Math.min(59, Number.parseInt(value || '0', 10) || 0));
}

function toFixedTime(meridiem, hour, minute) {
  const normalizedHour = normalizeHour(Number.parseInt(hour, 10), meridiem);
  const normalizedMinute = normalizeMinute(minute);
  return `${String(normalizedHour).padStart(2, '0')}:${String(normalizedMinute).padStart(2, '0')}`;
}

function parseWeekday(value) {
  const weekdayMap = {
    日: 0,
    天: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6
  };
  if (value in weekdayMap) return weekdayMap[value];
  return Math.max(0, Math.min(6, Number.parseInt(value, 10) || 0));
}

function cleanScheduledRequirement(text, removableParts) {
  let cleaned = text;
  removableParts.filter(Boolean).forEach((part) => {
    cleaned = cleaned.replace(part, ' ');
  });
  cleaned = cleaned
    .replace(/幫我\s*(?:增加|新增|建立|設定)\s*(?:一個)?\s*排程/g, ' ')
    .replace(/(?:增加|新增|建立|設定)\s*(?:一個)?\s*排程/g, ' ')
    .replace(/請(?:在|於)?/g, ' ')
    .replace(/(?:排程|提醒我|發送|執行|固定)(?:一下)?/g, ' ')
    .replace(/[，,。]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || text;
}

function looksLikeScheduleDiscussion(text) {
  return /(應該是|不是|卻|疑問|問題|判斷有|請修正|修正\s*-|內容為[：:])/.test(text);
}

function toDateTimeInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
