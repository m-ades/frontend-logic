// preserves finite numbers and numeric strings without rounding and returns null for missing or invalid values
export function numberOrNull(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// rounds finite numbers and numeric strings to one decimal for display and returns null for invalid values
export function roundNumber(value) {
  const number = numberOrNull(value);
  return number === null ? null : Math.round((number + Number.EPSILON) * 10) / 10;
}

// formats with up to one decimal and uses a dash for missing or invalid values
export function formatNumber(value) {
  const rounded = roundNumber(value);
  return rounded === null ? '—' : String(rounded);
}

// formats minutes as seconds under a minute and whole minutes otherwise with a dash for missing values
export function formatMinutes(value) {
  const minutes = numberOrNull(value);
  if (minutes === null) return '—';
  const seconds = Math.round(minutes * 60);
  if (seconds < 60) return `${seconds} sec`;
  const rounded = Math.round(minutes);
  return `${rounded} min${rounded === 1 ? '' : 's'}`;
}
