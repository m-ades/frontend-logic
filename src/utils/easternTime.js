const EASTERN_TIMEZONE = 'America/New_York';

const padTwo = (value) => String(value).padStart(2, '0');

const firstSundayOfMonth = (date) =>
  date.getUTCDay() === 0 ? 1 : 8 - date.getUTCDay();

export function easternOffsetFor(dateString) {
  if (!dateString || dateString.length < 10) return '-05:00';
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '-05:00';

  const mar1 = new Date(Date.UTC(year, 2, 1));
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const dstStart = new Date(
    Date.UTC(year, 2, firstSundayOfMonth(mar1) + 7)
  );
  const dstEnd = new Date(
    Date.UTC(year, 10, firstSundayOfMonth(nov1))
  );
  const reference = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return reference >= dstStart && reference < dstEnd ? '-04:00' : '-05:00';
}

export function toEasternIso(dateString, timeString = '00:00') {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;

  const [hourStr, minuteStr] = (timeString || '00:00').split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr || '0');
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const offset = easternOffsetFor(dateString);
  return `${year}-${padTwo(month)}-${padTwo(day)}T${padTwo(hour)}:${padTwo(
    minute
  )}:00${offset}`;
}

export function formatEasternFromIso(isoString, options = {}) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;

  const includeYear = options.includeYear ?? true;
  const includeTime = options.includeTime ?? true;

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TIMEZONE,
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
    ...options.dateOptions,
  });

  const formattedDate = dateFormatter.format(date);
  if (!includeTime) {
    return formattedDate;
  }

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options.timeOptions,
  });
  const formattedTime = timeFormatter.format(date);

  return `${formattedDate} at ${formattedTime}`;
}

export function formatEasternDateTime(dateString, timeString, options = {}) {
  const iso = toEasternIso(dateString, timeString);
  if (!iso) return null;
  const includeTime = options.includeTime ?? Boolean(timeString);
  return formatEasternFromIso(iso, { ...options, includeTime });
}

/**
 * Parse due date (and optional time) as Eastern, return a Date for comparison.
 * Use this for "is past due" / deadline checks so Feb 1 means end of Feb 1 Eastern.
 * - If dueDate is full ISO with offset (e.g. from API), parses as-is.
 * - If date-only (YYYY-MM-DD), treats as that day at 23:59 Eastern (or dueTime if provided).
 */
export function parseDueDateAsEastern(dueDate, dueTime = '23:59') {
  if (!dueDate) return null;
  const dateOnly = String(dueDate).slice(0, 10);
  if (String(dueDate).includes('T') && /[+-]\d{2}:?\d{2}$|Z$/i.test(String(dueDate))) {
    return new Date(dueDate);
  }
  const iso = toEasternIso(dateOnly, dueTime || '23:59');
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
