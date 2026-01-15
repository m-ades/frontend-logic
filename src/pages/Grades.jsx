import { useEffect, useMemo, useState } from 'react'
import { Box, Typography, CardContent, Stack } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import { formatDateTime } from '../utils/formatting.js'
import { API_CONFIG, fetchJson, getActiveUserId } from '../utils/api.js'
import { useCoursesState } from '../context/CoursesContext.jsx'

function NoRowsOverlay() {
  return (
    <Box sx={{ p: 2, textAlign: 'center', width: '100%' }}>
      <Typography variant="body2" color="text.secondary">
        No grades yet.
      </Typography>
    </Box>
  )
}

export default function Grades() {
  const [gradeEntries, setGradeEntries] = useState([])
  const { activeCourseId } = useCoursesState()
  const courseId = activeCourseId ?? API_CONFIG.courseId

  useEffect(() => {
    let isMounted = true

    const loadGrades = async () => {
      try {
        if (!courseId) return
        const userId = getActiveUserId()
        const [assignments, grades] = await Promise.all([
          fetchJson(`/api/courses/${courseId}/assignments`),
          fetchJson(`/api/users/${userId}/grades`),
        ])
        const gradedAssignments = (assignments || []).filter((assignment) => assignment.kind !== 'practice')
        const gradeMap = new Map((grades || []).map((grade) => [grade.assignment_id, grade]))
        const assignmentIds = new Set(gradedAssignments.map((assignment) => assignment.id))
        const entries = gradedAssignments.map((assignment) => ({
          assignment,
          grade: gradeMap.get(assignment.id) || null,
        }))
        const sorted = entries.sort((a, b) => {
          const aDate = a.assignment?.due_date || a.grade?.graded_at
          const bDate = b.assignment?.due_date || b.grade?.graded_at
          if (!aDate && !bDate) return 0
          if (!aDate) return 1
          if (!bDate) return -1
          return new Date(aDate) - new Date(bDate)
        })
        if (isMounted) {
          setGradeEntries(sorted)
        }
      } catch (error) {
        console.warn('Failed to load grades', error)
        if (isMounted) {
          setGradeEntries([])
        }
      }
    }

    loadGrades()

    return () => {
      isMounted = false
    }
  }, [courseId])

  const gradedEntries = useMemo(
    () => gradeEntries.filter((entry) => entry.grade),
    [gradeEntries]
  )
  const totalMax = useMemo(
    () =>
      gradedEntries.reduce(
        (sum, entry) => sum + (entry.grade?.max_score || 0),
        0
      ),
    [gradedEntries]
  )
  const totalFinal = useMemo(
    () => gradedEntries.reduce((sum, entry) => sum + (entry.grade?.final_score || 0), 0),
    [gradedEntries]
  )
  const overallPercentage = totalMax > 0 ? (totalFinal / totalMax) * 100 : 0

  const rows = useMemo(
    () =>
      gradeEntries.map((entry, index) => {
        const assignment = entry.assignment || entry.grade?.Assignment || {}
        const grade = entry.grade
        const total = grade?.max_score || 0
        const score = grade?.final_score ?? grade?.raw_score ?? null
        const percentage = total > 0 && score !== null ? (score / total) * 100 : null

        const noSubmission = grade
          && (grade.final_score ?? 0) === 0
          && (grade.raw_score ?? 0) === 0
          && grade.graded_by == null
        const submittedLabel = noSubmission
          ? 'No submission'
          : grade?.graded_at
            ? formatDateTime(grade.graded_at)
            : '—'

        return {
          id: assignment.id ?? entry.grade?.id ?? `grade-${index}`,
          assignment: assignment.title || 'Assignment',
          due: assignment.due_date ? formatDateTime(assignment.due_date) : '—',
          submitted: submittedLabel,
          percent: percentage !== null ? `${percentage.toFixed(1)}%` : '—'
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
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Overall</Typography>
            <Typography variant="body2" color="text.secondary">
              {overallPercentage.toFixed(1)}%
            </Typography>
          </Stack>
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
        </CardContent>
      </ThemedCard>
    </Box>
  )
}
