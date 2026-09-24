export const formatChapterLabel = (subchapter, fallback) => {
  const label = String(subchapter ?? '').trim()
  if (!label) return fallback
  const chapter = label.replace(/^HW\s*(\d+(?:\.\d+)*)$/i, '$1')
  return `Chapter ${chapter}`
}
