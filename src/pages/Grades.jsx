import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import { formatDate } from '../utils/formatting.js'
import { API_CONFIG, fetchJson } from '../utils/api.js'

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
          <TableContainer>
            <Table size="small" aria-label="grades table">
              <TableHead>
                <TableRow>
                  <TableCell>Assignment</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell align="right">Percent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">
                        implement
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.map((grade) => {
                    const assignment = grade.Assignment || {}
                    const total = grade.max_score || assignment.total_points || 0
                    const score = grade.final_score ?? grade.raw_score ?? null
                    const percentage = total > 0 && score !== null ? (score / total) * 100 : 0
                    const submittedDate = grade.graded_at ? formatDate(grade.graded_at) : '—'

                    return (
                      <TableRow key={grade.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {assignment.title || 'Assignment'}
                          </Typography>
                        </TableCell>
                        <TableCell>{assignment.due_date ? formatDate(assignment.due_date) : '—'}</TableCell>
                        <TableCell>{submittedDate}</TableCell>
                        <TableCell align="right">
                          {score !== null ? `${score.toFixed(1)} / ${total.toFixed(1)}` : '—'}
                        </TableCell>
                        <TableCell align="right">
                          {score !== null ? `${percentage.toFixed(1)}%` : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </ThemedCard>
    </Box>
  )
}
