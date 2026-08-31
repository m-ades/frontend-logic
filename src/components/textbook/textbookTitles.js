export function stripNumberPrefix(title) {
  if (!title) return ''
  return String(title)
    .replace(/^Part\s+[IVXLCDM]+\s+/i, '')
    .replace(/^Chapter\s+\d+\s+/i, '')
    .replace(/^[IVXLCDM]+\s+/, '')
    .replace(/^\d+\s+/, '')
    .trim()
}
