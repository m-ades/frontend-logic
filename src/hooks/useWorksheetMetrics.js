export function useWorksheetMetrics({
  score,
  total,
  gradePercent,
  dueAt,
}) {
  const safeTotal = Number.isFinite(total) ? total : 0
  const safeScore = Number.isFinite(score) ? score : 0
  const completionPercent = safeTotal > 0
    ? Math.round((safeScore / safeTotal) * 100)
    : 0
  const fallbackPercent = safeTotal > 0
    ? (safeScore / safeTotal) * 100
    : null
  const gradeLabel = Number.isFinite(gradePercent)
    ? `${gradePercent.toFixed(1)}%`
    : Number.isFinite(fallbackPercent)
    ? `${fallbackPercent.toFixed(1)}%`
    : '—'
  const dueAtDate = dueAt ? new Date(dueAt) : null
  const isOverdue = dueAtDate && !Number.isNaN(dueAtDate.getTime())
    ? dueAtDate < new Date()
    : false

  return { completionPercent, gradeLabel, isOverdue }
}
