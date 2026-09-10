// preserves finite numbers and numeric strings without rounding and returns null for missing or invalid values
export function numberOrNull(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// rounds finite numbers and numeric strings to three decimals for display and returns null for invalid values
export function roundNumber(value) {
  const number = numberOrNull(value);
  return number === null ? null : Math.round((number + Number.EPSILON) * 1000) / 1000;
}

// formats with up to three decimals and uses a dash for missing or invalid values
export function formatNumber(value) {
  const rounded = roundNumber(value);
  return rounded === null ? '—' : String(rounded);
}
