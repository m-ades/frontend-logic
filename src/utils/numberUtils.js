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

// interpolates between ranks like postgres percentile_cont and returns null for an empty list
export function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

// formats with up to one decimal and uses a dash for missing or invalid values
export function formatNumber(value) {
  const rounded = roundNumber(value);
  return rounded === null ? '—' : String(rounded);
}
