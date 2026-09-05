import { Temporal } from '@js-temporal/polyfill';

const NEW_YORK_TIME_ZONE = 'America/New_York';

// converts supported values to temporal instants and throws otherwise
export function toTemporalInstant(value) {
  if (value instanceof Date) return Temporal.Instant.from(value.toISOString());
  if (typeof value === 'number') return Temporal.Instant.fromEpochMilliseconds(value);
  return Temporal.Instant.from(value);
}

// converts new york wall time to an offset timestamp and returns null when invalid
export function toEasternIso(dateString, timeString = '00:00') {
  if (!dateString) return null;
  try {
    return Temporal.PlainDateTime.from(`${dateString}T${timeString || '00:00'}`)
      .toZonedDateTime(NEW_YORK_TIME_ZONE, { disambiguation: 'reject' })
      .toString({ timeZoneName: 'never', smallestUnit: 'second' });
  } catch {
    return null;
  }
}

export function getCurrentEasternDate(now = new Date()) {
  return toTemporalInstant(now)
    .toZonedDateTimeISO(NEW_YORK_TIME_ZONE)
    .toPlainDate()
    .toString();
}

export function splitEasternDateTime(isoString) {
  if (!isoString) return { date: null, time: null };
  try {
    const local = toTemporalInstant(isoString).toZonedDateTimeISO(NEW_YORK_TIME_ZONE);
    return {
      date: local.toPlainDate().toString(),
      time: local.toPlainTime().toString({ smallestUnit: 'minute' }),
    };
  } catch {
    return { date: null, time: null };
  }
}

export function formatEasternFromIso(isoString, options = {}) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;

  const includeYear = options.includeYear ?? true;
  const includeTime = options.includeTime ?? true;
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    timeZone: NEW_YORK_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
    ...options.dateOptions,
  }).format(date);
  if (!includeTime) return formattedDate;

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    timeZone: NEW_YORK_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options.timeOptions,
  }).format(date);
  return `${formattedDate} at ${formattedTime}`;
}

export function formatEasternDateTime(dateString, timeString, options = {}) {
  const iso = toEasternIso(dateString, timeString);
  if (!iso) return null;
  const includeTime = options.includeTime ?? Boolean(timeString);
  return formatEasternFromIso(iso, { ...options, includeTime });
}

// preserves offset instants and reads date only values in new york
export function parseDueDateAsEastern(dueDate, dueTime = '23:59') {
  if (!dueDate) return null;
  const source = String(dueDate);
  if (source.includes('T') && /[+-]\d{2}:?\d{2}$|Z$/i.test(source)) {
    const date = new Date(source);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const iso = toEasternIso(source.slice(0, 10), dueTime || '23:59');
  return iso ? new Date(iso) : null;
}
