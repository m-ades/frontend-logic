export function useWorksheetMetrics({
  score,
  total,
  calculatedGradePercent,
  dueAt,
}) {
  const safeTotal = Number.isFinite(total) ? total : 0
  const safeScore = Number.isFinite(score) ? score : 0
  const completionPercent = safeTotal > 0
    ? Math.round((safeScore / safeTotal) * 100)
    : 0
  // total from local calc only. no api fetch.
  const gradeLabel = Number.isFinite(calculatedGradePercent)
    ? `${calculatedGradePercent.toFixed(1)}%`
    : '—'
  const dueAtDate = dueAt ? new Date(dueAt) : null
  const isOverdue = dueAtDate && !Number.isNaN(dueAtDate.getTime())
    ? dueAtDate < new Date()
    : false

  return { completionPercent, gradeLabel, isOverdue }
}
