import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import Grid from '@mui/material/Grid'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { useTheme } from '@mui/material/styles'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  YAxis,
  XAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AssignmentIcon from '@mui/icons-material/Assignment'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import BookIcon from '@mui/icons-material/Book'
import { formatDate } from '../utils/formatting.js'
import { API_CONFIG, fetchJson } from '../utils/api.js'
import ThemedCard from '../components/ui/ThemedCard.jsx'

const emptyAnalytics = {
  assignments: { upcoming: 0, pending: 0, overdue: 0, upcomingList: [] },
  performance: { avg_score: null, avg_attempt: null, correct_rate: null, first_try_correct_rate: null },
  time: { avg_minutes_per_question: null },
  submissionCount: 0,
}

export default function Dashboard() {
  const theme = useTheme()
  const [analytics, setAnalytics] = useState(emptyAnalytics)
  const [gradeTimeline, setGradeTimeline] = useState([])
  const [instructorAnalytics, setInstructorAnalytics] = useState({
    gradeSummary: null,
    assignmentStats: [],
    timeByCategory: [],
  })
  const dashboardMode = import.meta.env.VITE_DASHBOARD_MODE || 'student'

  const statCardSx = { height: '100%' }
  const statCardContentSx = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 2,
  }
  const miniChartSize = 84

  useEffect(() => {
    let isMounted = true

    const loadAnalytics = async () => {
      try {
        const [analyticsData, grades] = await Promise.all([
          fetchJson(`/api/analytics/student?userId=${API_CONFIG.userId}&courseId=${API_CONFIG.courseId}`),
          fetchJson(`/api/users/${API_CONFIG.userId}/grades`),
        ])
        if (isMounted) {
          setAnalytics({ ...emptyAnalytics, ...analyticsData })
          const timeline = (grades || [])
            .map((grade) => {
              const assignment = grade.Assignment || {}
              const total = grade.max_score || assignment.total_points || 0
              const score = grade.final_score ?? grade.raw_score ?? null
              const percent = total > 0 && score !== null ? (score / total) * 100 : null
              const date = assignment.due_date || grade.graded_at
              return {
                id: grade.id,
                title: assignment.title || 'Assignment',
                date,
                percent,
              }
            })
            .filter((item) => item.percent !== null)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
          setGradeTimeline(timeline)
        }
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to load analytics', error)
          setAnalytics(emptyAnalytics)
          setGradeTimeline([])
        }
      }
    }

    loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (dashboardMode !== 'instructor') {
      return undefined
    }

    let isMounted = true

    const loadInstructorAnalytics = async () => {
      try {
        const data = await fetchJson(`/api/analytics/instructor?courseId=${API_CONFIG.courseId}`)
        if (isMounted) {
          setInstructorAnalytics(data)
        }
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to load instructor analytics', error)
          setInstructorAnalytics({ gradeSummary: null, assignmentStats: [], timeByCategory: [] })
        }
      }
    }

    loadInstructorAnalytics()

    return () => {
      isMounted = false
    }
  }, [dashboardMode])

  const randomData = useMemo(() => {
    const base = analytics.performance.avg_attempt || 1
    const count = analytics.submissionCount || 1
    return Array.from({ length: 10 }, (_, index) => ({
      value: Math.round(base * 100 + count * 2 + index * 5),
    }))
  }, [analytics.performance.avg_attempt, analytics.submissionCount])

  const assignmentStats = analytics.assignments || emptyAnalytics.assignments

  const practiceAccuracy = useMemo(() => {
    const firstTryRate = analytics.performance.first_try_correct_rate || 0
    const correctFirstTry = Math.round(firstTryRate * 100)
    const incorrectFirstTry = Math.max(0, 100 - correctFirstTry)
    const averageAttempts = analytics.performance.avg_attempt
      ? Number(analytics.performance.avg_attempt.toFixed(1))
      : 0
    return { correctFirstTry, incorrectFirstTry, averageAttempts }
  }, [analytics.performance])

  const mainChartData = useMemo(
    () =>
      gradeTimeline.map((item) => ({
        name: item.title,
        percent: Number(item.percent.toFixed(1)),
      })),
    [gradeTimeline]
  )

  const activityStats = useMemo(() => {
    const avgMinutes = analytics.time.avg_minutes_per_question
    const timeLabel = avgMinutes ? `${Math.round(avgMinutes)} mins` : '—'
    return [
      { label: 'Avg time per question', value: timeLabel, subtext: 'Recent' },
      { label: 'Submissions', value: `${analytics.submissionCount}`, subtext: 'Total' },
    ]
  }, [analytics.submissionCount, analytics.time.avg_minutes_per_question])

  return (
    <Grid container spacing={3} alignItems="stretch">
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <ThemedCard sx={statCardSx}>
          <CardContent sx={statCardContentSx}>
            <Box display="flex" alignItems="center" mb={2}>
              <AssignmentIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                Upcoming Assignments
              </Typography>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 6 }}>
                <Box display="flex" alignItems="baseline">
                  <Typography variant="h3" fontWeight="medium">
                    {assignmentStats.upcoming}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    Upcoming
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <Typography
                    variant="caption"
                    fontWeight="medium"
                    sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                  >
                    {practiceAccuracy.correctFirstTry}%
                  </Typography>
                  <PieChart width={miniChartSize} height={miniChartSize}>
                      <Pie
                        data={[
                          { name: 'Upcoming', value: assignmentStats.upcoming, color: 'primary' },
                          { name: 'Pending', value: assignmentStats.pending, color: 'warning' },
                          { name: 'Overdue', value: assignmentStats.overdue, color: 'error' },
                        ]}
                        startAngle={90}
                        endAngle={-270}
                        innerRadius={25}
                        outerRadius={35}
                        dataKey="value"
                      >
                        {[
                          { name: 'Upcoming', value: assignmentStats.upcoming, color: 'primary' },
                          { name: 'Pending', value: assignmentStats.pending, color: 'warning' },
                          { name: 'Overdue', value: assignmentStats.overdue, color: 'error' },
                        ].map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={theme.palette[entry.color].main}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                </Box>
              </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Upcoming
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography variant="body2" fontWeight="medium">
                    {assignmentStats.upcoming}
                  </Typography>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      ml: 1,
                    }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Pending
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography variant="body2" fontWeight="medium">
                    {assignmentStats.pending}
                  </Typography>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'warning.main',
                      ml: 1,
                    }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Overdue
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography variant="body2" fontWeight="medium">
                    {assignmentStats.overdue}
                  </Typography>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                      ml: 1,
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </ThemedCard>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <ThemedCard sx={statCardSx}>
          <CardContent sx={statCardContentSx}>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUpIcon color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                Practice Accuracy
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <Typography
                    variant="caption"
                    fontWeight="medium"
                    sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                  >
                    {practiceAccuracy.correctFirstTry}%
                  </Typography>
                  <PieChart width={miniChartSize} height={miniChartSize}>
                      <Pie
                        data={[
                          { value: practiceAccuracy.correctFirstTry, color: 'primary' },
                          { value: practiceAccuracy.incorrectFirstTry, color: 'grey' },
                        ]}
                        innerRadius={35}
                        outerRadius={45}
                        dataKey="value"
                      >
                        <Cell fill={theme.palette.primary.main} />
                        <Cell fill={theme.palette.grey[200]} />
                      </Pie>
                    </PieChart>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { label: 'Correct on first try', value: practiceAccuracy.correctFirstTry, color: 'success' },
                    { label: 'Incorrect on first try', value: practiceAccuracy.incorrectFirstTry, color: 'error' },
                    { label: 'Avg attempts', value: practiceAccuracy.averageAttempts, color: 'warning' },
                  ].map((item) => (
                    <Box key={item.label}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: `${item.color}.main`,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Typography variant="caption" fontWeight="medium">
                          {item.label === 'Avg attempts' ? item.value : `${item.value}%`}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </ThemedCard>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <ThemedCard sx={statCardSx}>
          <CardContent sx={statCardContentSx}>
            <Box display="flex" alignItems="center" mb={2}>
              <CalendarTodayIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                Upcoming Assignments
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {assignmentStats.upcomingList.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming assignments
                </Typography>
              ) : (
                assignmentStats.upcomingList.map((assignment) => (
                  <Box
                    key={assignment.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {assignment.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Due {formatDate(assignment.due_date)}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      component={Link}
                      to={`/assignment/${assignment.id}`}
                    >
                      Open
                    </Button>
                  </Box>
                ))
              )}
            </Box>
          </CardContent>
        </ThemedCard>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <ThemedCard sx={statCardSx}>
          <CardContent sx={statCardContentSx}>
            <Box display="flex" alignItems="center" mb={2}>
              <BookIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                Activity
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activityStats.map((item) => (
                <Box key={item.label}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.label}
                  </Typography>
                  <Box display="flex" alignItems="baseline" gap={1}>
                    <Typography variant="h6" fontWeight="medium">
                      {item.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.subtext}
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height={30}>
                    <AreaChart data={randomData}>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={theme.palette.secondary.main}
                        fill={theme.palette.secondary.light}
                        strokeWidth={2}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              ))}
            </Box>
          </CardContent>
        </ThemedCard>
      </Grid>

      <Grid size={12}>
        <ThemedCard          sx={(theme) => ({
            height: '100%',
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
          })}
          variant="outlined"
        >
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight="medium">
                  Assignment Progress Over Time
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main' }} />
                  <Typography variant="body2">Score %</Typography>
                </Box>
              </Box>
            </Box>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={mainChartData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  stroke={theme.palette.divider}
                />
                <YAxis
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  stroke={theme.palette.divider}
                  domain={[0, 100]}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="percent"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </ThemedCard>
      </Grid>

      {dashboardMode === 'instructor' && (
        <Grid size={12}>
          <ThemedCard sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="medium">
                    Instructor Insights
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Course performance overview
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Avg final score
                  </Typography>
                  <Typography variant="h5" fontWeight="medium">
                    {instructorAnalytics.gradeSummary?.avg_final_score?.toFixed(1) ?? '—'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Avg raw score
                  </Typography>
                  <Typography variant="h5" fontWeight="medium">
                    {instructorAnalytics.gradeSummary?.avg_raw_score?.toFixed(1) ?? '—'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Students graded
                  </Typography>
                  <Typography variant="h5" fontWeight="medium">
                    {instructorAnalytics.gradeSummary?.students_graded ?? '—'}
                  </Typography>
                </Grid>
              </Grid>
              <TableContainer
                sx={(theme) => ({
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                })}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Assignment</TableCell>
                      <TableCell align="right">Avg score</TableCell>
                      <TableCell align="right">Avg attempts</TableCell>
                      <TableCell align="right">Submissions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {instructorAnalytics.assignmentStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="body2" color="text.secondary">
                            No assignment analytics yet
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      instructorAnalytics.assignmentStats.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {assignment.title}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{assignment.avg_score?.toFixed(1) ?? '—'}</TableCell>
                          <TableCell align="right">{assignment.avg_attempt?.toFixed(2) ?? '—'}</TableCell>
                          <TableCell align="right">{assignment.students_submitted ?? 0}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </ThemedCard>
        </Grid>
      )}
    </Grid>
  )
}



/* old dashboard

import { useNavigate } from 'react-router-dom'
import { Box, Typography, CardContent, Stack, Button } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        Welcome back
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        ............................
      </Typography>

      <Stack spacing={2}>
        <ThemedCard>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h6">Assignments</Typography>
              <Typography variant="body2" color="text.secondary">
                View upcoming and submitted assigments
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate('/assignments')}>
              View assignments
            </Button>
          </CardContent>
        </ThemedCard>

        <ThemedCard>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h6">Practice</Typography>
              <Typography variant="body2" color="text.secondary">
                Sharpen your skills with supplementary problem sets.
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate('/practice')}>
              Start practice
            </Button>
          </CardContent>
        </ThemedCard>

        <ThemedCard>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h6">Grades</Typography>
              <Typography variant="body2" color="text.secondary">
                Track your progress.
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate('/grades')}>
              View grades
            </Button>
          </CardContent>
        </ThemedCard>
      </Stack>
    </Box>
  )
}

*/
