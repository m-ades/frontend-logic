import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Typography, CardContent, Stack } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx'
import { formatDateTime } from '../utils/formatting.js'
import { API_CONFIG, fetchJson, getActiveUserId } from '../utils/api.js'
import { useCoursesState } from '../context/CoursesContext.jsx'
import { sortAssignmentsBySubchapter } from '../utils/assignmentSort.js'
import { getAssignmentDeadlineInstant } from '../utils/studentGradeAverage.js'

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
  const { activeCourseId } = useCoursesState()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const courseIdForApi = activeCourseId ?? null
  const userId = getActiveUserId()

  const assignmentsQuery = useQuery({
    queryKey: ['course-assignments', courseIdForApi],
    queryFn: () => fetchJson(`/api/courses/${courseIdForApi}/assignments`),
    enabled: !!courseIdForApi,
  })

  const gradesQuery = useQuery({
    queryKey: ['user-grades', userId],
    queryFn: () => fetchJson(`/api/users/${userId}/grades`),
    enabled: !!userId,
  })

  const assignments = assignmentsQuery.data ?? []
  const grades = gradesQuery.data ?? []
  const isLoadingGrades = assignmentsQuery.isPending || gradesQuery.isPending

  const gradeEntries = useMemo(() => {
    if (!courseIdForApi) return []
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
  }, [courseIdForApi, assignments, grades])

  const pastDuePercents = useMemo(() => {
    const nowMs = Date.now()
    return gradeEntries
      .filter((entry) => {
        const d = getAssignmentDeadlineInstant(entry.assignment)
        return d && d.getTime() <= nowMs
      })
      .map((entry) => {
        const grade = entry.grade
        const max = grade?.max_score ?? entry.assignment?.total_points ?? 0
        const score = grade?.final_score ?? grade?.raw_score ?? null
        return max > 0 && score !== null && score !== undefined ? (score / max) * 100 : 0
      })
  }, [gradeEntries])

  const overallPercentage = useMemo(() => {
    if (pastDuePercents.length === 0) return 0
    let forAverage =
      pastDuePercents.length >= 3
        ? [...pastDuePercents].sort((a, b) => a - b).slice(2)
        : pastDuePercents
    return forAverage.reduce((s, p) => s + p, 0) / forAverage.length
  }, [pastDuePercents])

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
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Grades
      </Typography>

      <ThemedCard>
        <CardContent sx={{ '& .MuiDataGrid-root': { fontSize: '1rem' } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>Overall</Typography>
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
