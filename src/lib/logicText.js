export function displayLogicText(value) {
  return typeof value === 'string'
    ? value.replace(/↔[\uFE0E\uFE0F]?/g, '↔︎')
    : value
}

// normalizes json response values for text presentation
export function normalizeLogicTextData(value) {
  if (typeof value === 'string') return displayLogicText(value)
  if (Array.isArray(value)) return value.map(normalizeLogicTextData)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeLogicTextData(entry)])
    )
  }
  return value
}
