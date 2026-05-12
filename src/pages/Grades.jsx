import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Typography, CardContent, Stack } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx'
import { formatDateTime } from '../utils/formatting.js'
import { API_CONFIG, fetchJson, getActiveUserId } from '../utils/api.js'
import { sortAssignmentsBySubchapter } from '../utils/assignmentSort.js'
import { useAppRuntime } from '../hooks/useAppRuntime.js'

function NoRowsOverlay() {
  return (
    <Box sx={{ p: 2, textAlign: 'center', width: '100%' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1rem' }}>
        No unlocked assignments yet.
      </Typography>
    </Box>
  )
}

export default function Grades() {
  const { isSandbox, sandbox: sandboxData, user, activeCourseId } = useAppRuntime()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const courseIdForApi = isSandbox ? null : (activeCourseId ?? null)
  const userId = isSandbox ? user.id : getActiveUserId()

  const assignmentsQuery = useQuery({
    queryKey: ['course-assignments', courseIdForApi],
    queryFn: () => fetchJson(`/api/courses/${courseIdForApi}/assignments`),
    enabled: !isSandbox && !!courseIdForApi,
  })

  const gradesQuery = useQuery({
    queryKey: ['user-grades', userId],
    queryFn: () => fetchJson(`/api/users/${userId}/grades`),
    enabled: !isSandbox && !!userId,
  })

  const assignments = isSandbox ? sandboxData.assignments : (assignmentsQuery.data ?? [])
  const grades = isSandbox ? sandboxData.grades : (gradesQuery.data ?? [])
  const isLoadingGrades = isSandbox ? false : (assignmentsQuery.isPending || gradesQuery.isPending)

  const gradeEntries = useMemo(() => {
    if (!isSandbox && !courseIdForApi) return []
    const gradedAssignments = sortAssignmentsBySubchapter(
      (assignments || []).filter(
        (a) => a.kind !== 'practice' && a.is_locked === false
      )
    )
    const gradeMap = new Map((grades || []).map((g) => [g.assignment_id, g]))
    return gradedAssignments.map((assignment) => ({
      assignment,
      grade: gradeMap.get(assignment.id) || null,
    }))
  }, [isSandbox, courseIdForApi, assignments, grades])

  const assignmentPercents = useMemo(() => {
    return gradeEntries.flatMap((entry) => {
      const grade = entry.grade
      if (isSandbox && (!grade || (grade.graded_at == null && grade.graded_by == null))) {
        return []
      }
      const max = grade?.max_score ?? entry.assignment?.total_points ?? 0
      const score = grade?.final_score ?? grade?.raw_score ?? null
      const percent =
        max > 0 && score !== null && score !== undefined ? (score / max) * 100 : 0
      return [percent]
    })
  }, [gradeEntries])

  const overallPercentage = useMemo(() => {
    if (isSandbox) {
      const totalPossiblePoints = gradeEntries.reduce(
        (sum, entry) => sum + (Number(entry.grade?.max_score ?? entry.assignment?.total_points) || 0),
        0
      )
      const totalEarnedPoints = gradeEntries.reduce(
        (sum, entry) => sum + (Number(entry.grade?.final_score ?? entry.grade?.raw_score) || 0),
        0
      )
      return totalPossiblePoints > 0 ? (totalEarnedPoints / totalPossiblePoints) * 100 : 0
    }
    if (assignmentPercents.length === 0) return 0
    const forAverage =
      assignmentPercents.length >= 3
        ? [...assignmentPercents].sort((a, b) => a - b).slice(2)
        : assignmentPercents
    return forAverage.reduce((s, p) => s + p, 0) / forAverage.length
  }, [assignmentPercents, gradeEntries, isSandbox])

  const rows = useMemo(
    () =>
      gradeEntries.map((entry, index) => {
        const assignment = entry.assignment || entry.grade?.Assignment || {}
        const grade = entry.grade
        const total = grade?.max_score ?? assignment.total_points ?? 0
        const score = grade?.final_score ?? grade?.raw_score ?? null
        const percentage =
          total > 0 && score !== null && score !== undefined
            ? (score / total) * 100
            : 0

        const noSubmission =
          !grade ||
          ((grade.final_score ?? 0) === 0 &&
            (grade.raw_score ?? 0) === 0 &&
            grade.graded_by == null)
        const submittedLabel = noSubmission
          ? 'No submission'
          : grade?.graded_at
            ? formatDateTime(grade.graded_at)
            : '—'

        return {
          id: assignment.id ?? entry.grade?.id ?? `grade-${index}`,
          assignment: assignment.title || 'Assignment',
          due: assignment.due_at || assignment.due_date
            ? formatDateTime(assignment.due_at ?? assignment.due_date)
            : '—',
          submitted: submittedLabel,
          percent: `${percentage.toFixed(1)}%`
        }
      }),
    [gradeEntries]
  )

  const columns = useMemo(
    () => [
      { field: 'assignment', headerName: 'Assignment', flex: 1, minWidth: 200 },
      { field: 'due', headerName: 'Due', minWidth: 140 },
      { field: 'submitted', headerName: 'Submitted', minWidth: 140 },
      { field: 'percent', headerName: 'Percent', minWidth: 110, align: 'right', headerAlign: 'right' }
    ],
    []
  )

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
        Grades
      </Typography>

      <ThemedCard>
        <CardContent sx={{ '& .MuiDataGrid-root': { fontSize: '1rem' } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6" component="h2" sx={{ fontSize: '1rem' }}>Overall</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1rem' }}>
              {overallPercentage.toFixed(1)}%
            </Typography>
          </Stack>
          {isLoadingGrades ? (
            <Box sx={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadingSpinner label="Loading grades..." />
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              disableColumnMenu
              disableRowSelectionOnClick
              hideFooter
              slots={{ noRowsOverlay: NoRowsOverlay }}
              sx={{ border: 0 }}
            />
          )}
        </CardContent>
      </ThemedCard>
    </Box>
  )
}
