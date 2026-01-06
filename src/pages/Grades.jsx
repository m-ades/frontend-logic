import { useEffect, useMemo, useState } from 'react'
import { Box, Typography, CardContent, Stack } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import { formatDate } from '../utils/formatting.js'
import { API_CONFIG, fetchJson } from '../utils/api.js'

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
  const [grades, setGrades] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadGrades = async () => {
      try {
        const data = await fetchJson(`/api/users/${API_CONFIG.userId}/grades`)
        if (isMounted) {
          setGrades(data)
        }
      } catch (error) {
        console.warn('Failed to load grades', error)
        if (isMounted) {
          setGrades([])
        }
      }
    }

    loadGrades()

    return () => {
      isMounted = false
    }
  }, [])

  const totalPoints = useMemo(
    () => grades.reduce((sum, grade) => sum + (grade.max_score || grade.Assignment?.total_points || 0), 0),
    [grades]
  )
  const earnedPoints = useMemo(
    () => grades.reduce((sum, grade) => sum + (grade.final_score || 0), 0),
    [grades]
  )
  const overallPercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

  const rows = useMemo(
    () =>
      grades.map((grade, index) => {
        const assignment = grade.Assignment || {}
        const total = grade.max_score || assignment.total_points || 0
        const score = grade.final_score ?? grade.raw_score ?? null
        const percentage = total > 0 && score !== null ? (score / total) * 100 : null

        return {
          id: grade.id ?? `${assignment.id ?? 'grade'}-${index}`,
          assignment: assignment.title || 'Assignment',
          due: assignment.due_date ? formatDate(assignment.due_date) : '—',
          submitted: grade.graded_at ? formatDate(grade.graded_at) : '—',
          score: score !== null ? `${score.toFixed(1)} / ${total.toFixed(1)}` : '—',
          percent: percentage !== null ? `${percentage.toFixed(1)}%` : '—'
        }
      }),
    [grades]
  )

  const columns = useMemo(
    () => [
      { field: 'assignment', headerName: 'Assignment', flex: 1, minWidth: 200 },
      { field: 'due', headerName: 'Due', minWidth: 140 },
      { field: 'submitted', headerName: 'Submitted', minWidth: 140 },
      { field: 'score', headerName: 'Score', minWidth: 140, align: 'right', headerAlign: 'right' },
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
              {earnedPoints.toFixed(1)} / {totalPoints.toFixed(1)} • {overallPercentage.toFixed(1)}%
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
