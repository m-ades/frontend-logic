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
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import BookIcon from '@mui/icons-material/Book'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import { formatDateTime } from '../utils/formatting.js'
import { API_CONFIG, fetchJson, getActiveUserId } from '../utils/api.js'
import { useCoursesState } from '../context/CoursesContext.jsx'
import { useAuthState } from '../context/AuthContext.jsx'
import { isInstructorRole } from '../utils/auth.js'
import ThemedCard from '../components/ui/ThemedCard.jsx'

const formatPercent = (value) => (value === null || value === undefined ? '—' : `${value.toFixed(1)}%`)

const getLetterGrade = (percent) => {
  if (percent === null || percent === undefined) return null
  if (percent >= 93) return 'A'
  if (percent >= 90) return 'A-'
  if (percent >= 87) return 'B+'
  if (percent >= 83) return 'B'
  if (percent >= 80) return 'B-'
  if (percent >= 77) return 'C+'
  if (percent >= 73) return 'C'
  if (percent >= 70) return 'C-'
  if (percent >= 67) return 'D+'
  if (percent >= 63) return 'D'
  if (percent >= 60) return 'D-'
  return 'F'
}

const emptyAnalytics = {
  assignments: { upcoming: 0, pending: 0, overdue: 0, upcomingList: [] },
  performance: { avg_score: null, avg_attempt: null, correct_rate: null, first_try_correct_rate: null },
  time: { avg_minutes_per_question: null },
  submissionCount: 0,
  submittedAssignmentIds: [],
}

export default function Dashboard() {
  const theme = useTheme()
  const { user } = useAuthState()
  const { activeCourseId } = useCoursesState()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const courseIdForApi = activeCourseId ?? null
  const [analytics, setAnalytics] = useState(emptyAnalytics)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
  const [gradeTimeline, setGradeTimeline] = useState([])
  const [gradeOverview, setGradeOverview] = useState({
    percent: null,
    letter: null,
    classAverage: null,
    completed: 0,
    total: 0,
    lowestScore: null,
    lowestTitle: null,
    lowestScores: [],
  })
  const [releaseOverview, setReleaseOverview] = useState({
    pastDuePercent: 0,
    remainingPercent: 0,
  })
  const [instructorAnalytics, setInstructorAnalytics] = useState({
    gradeSummary: null,
    assignmentStats: [],
    timeByCategory: [],
  })
  const envDashboardMode = import.meta.env.VITE_DASHBOARD_MODE || 'student'
  const isInstructor = isInstructorRole(user?.role)
  const dashboardMode = isInstructor && envDashboardMode === 'instructor'
    ? 'instructor'
    : 'student'

  const statCardSx = { height: '100%' }
  const statCardContentSx = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 2,
  }

  useEffect(() => {
    let isMounted = true

    const loadAnalytics = async () => {
      if (!courseIdForApi) {
        if (isMounted) {
          setAnalytics(emptyAnalytics)
          setGradeTimeline([])
          setReleaseOverview({
            pastDuePercent: 0,
            remainingPercent: 0,
          })
          setIsLoadingAnalytics(false)
        }
        return
      }
      try {
          if (isMounted) {
            setIsLoadingAnalytics(true)
          }
          const [analyticsData, grades, gradebookSummary] = await Promise.all([
            fetchJson(`/api/analytics/student?userId=${getActiveUserId()}&courseId=${courseIdForApi}`),
            fetchJson(`/api/users/${getActiveUserId()}/grades`),
            fetchJson(`/api/analytics/gradebook-summary?courseId=${courseIdForApi}`).catch(() => null),
          ])
        if (isMounted) {
          setAnalytics({ ...emptyAnalytics, ...analyticsData })
          const userId = getActiveUserId()
          const gradeMap = new Map(
            (grades || []).map((grade) => [
              grade.assignment_id ?? grade.Assignment?.id,
              grade,
            ])
          )
          const unlockedSummary = gradebookSummary?.length
            ? gradebookSummary.filter((assignment) => !assignment.is_locked)
            : []
          const timeline = unlockedSummary.length
            ? unlockedSummary
                .slice()
                .sort((a, b) => {
                  const aDateValue = a.due_at ?? a.due_date ?? null
                  const bDateValue = b.due_at ?? b.due_date ?? null
                  const aDate = aDateValue ? new Date(aDateValue) : null
                  const bDate = bDateValue ? new Date(bDateValue) : null
                  if (aDate && bDate) return aDate - bDate
                  if (aDate) return -1
                  if (bDate) return 1
                  return (a.id ?? 0) - (b.id ?? 0)
                })
                .map((assignment) => {
                  const grade = gradeMap.get(assignment.id)
                  const total = grade?.max_score || 0
                  const score = grade?.final_score ?? grade?.raw_score ?? null
                  const fallbackPercent = total > 0 && score !== null ? score / total : null
                  return {
                    id: assignment.id,
                    title: assignment.title || 'Assignment',
                    avgPercent: assignment.avg_percent !== null && assignment.avg_percent !== undefined
                      ? assignment.avg_percent * 100
                      : null,
                    medianPercent: assignment.median_percent !== null && assignment.median_percent !== undefined
                      ? assignment.median_percent * 100
                      : null,
                    studentPercent:
                      fallbackPercent !== null
                          ? fallbackPercent * 100
                          : null,
                  }
                })
            : (grades || [])
                .map((grade) => {
                  const assignment = grade.Assignment || {}
                  const total = grade.max_score || 0
                  const score = grade.final_score ?? grade.raw_score ?? null
                  const percent = total > 0 && score !== null ? (score / total) * 100 : null
                  const date = assignment.due_at ?? assignment.due_date ?? grade.graded_at
                  return {
                    id: grade.id,
                    title: assignment.title || 'Assignment',
                    studentPercent: percent,
                    avgPercent: null,
                    medianPercent: null,
                    date,
                  }
                })
                .filter((item) => item.studentPercent !== null)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
          setGradeTimeline(timeline)

          const gradedPercents = (grades || []).reduce((list, grade) => {
            const max = grade?.max_score || 0
            const score = grade?.final_score ?? grade?.raw_score
            if (!max || score === null || score === undefined) return list
            list.push({
              percent: (score / max) * 100,
              title: grade?.Assignment?.title || grade?.title || 'Assignment',
            })
            return list
          }, [])

          const totalMax = (grades || []).reduce((sum, grade) => sum + (grade.max_score || 0), 0)
          const totalFinal = (grades || []).reduce(
            (sum, grade) => sum + (grade.final_score ?? grade.raw_score ?? 0),
            0
          )
          const overallPercent = totalMax > 0 ? (totalFinal / totalMax) * 100 : null
          const completedAssignments = gradedPercents.length
          const totalAssignments =
            analyticsData?.assignments?.total ?? gradebookSummary?.length ?? grades?.length ?? 0
          const classAverageValues = (gradebookSummary || [])
            .map((assignment) => assignment.avg_percent)
            .filter((value) => value !== null && value !== undefined)
          const classAverage =
            classAverageValues.length > 0
              ? (classAverageValues.reduce((sum, value) => sum + value, 0) / classAverageValues.length) * 100
              : null
          const lowestScores = gradedPercents
            .slice()
            .sort((a, b) => a.percent - b.percent)
            .slice(0, 2)
          const lowestGrade = lowestScores[0] ?? null

          setGradeOverview({
            percent: overallPercent,
            letter: overallPercent !== null ? getLetterGrade(overallPercent) : null,
            classAverage,
            completed: completedAssignments,
            total: totalAssignments,
            lowestScore: lowestGrade?.percent ?? null,
            lowestTitle: lowestGrade?.title ?? null,
            lowestScores,
          })

          // What's Left: use student analytics (pastDueDateCount, total) so denominator matches; remaining = 100 - pastDue
          const assignmentsData = analyticsData?.assignments ?? {}
          const pastDueDateCount = assignmentsData.pastDueDateCount ?? assignmentsData.overdue ?? 0
          const totalForWhatsLeft = assignmentsData.total ?? totalAssignments ?? 0
          const pastDuePercent = totalForWhatsLeft > 0 ? (pastDueDateCount / totalForWhatsLeft) * 100 : 0
          const remainingPercent = totalForWhatsLeft > 0 ? 100 - pastDuePercent : 0

          setReleaseOverview({
            pastDuePercent: Number(pastDuePercent.toFixed(1)),
            remainingPercent: Number(remainingPercent.toFixed(1)),
          })
        }
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to load analytics', error)
          setAnalytics(emptyAnalytics)
          setGradeTimeline([])
          setReleaseOverview({
            pastDuePercent: 0,
            remainingPercent: 0,
          })
        }
      } finally {
        if (isMounted) {
          setIsLoadingAnalytics(false)
        }
      }
    }

    loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [courseIdForApi])

  useEffect(() => {
    if (dashboardMode !== 'instructor') {
      return undefined
    }

    let isMounted = true

    const loadInstructorAnalytics = async () => {
      try {
        if (!courseId) {
          return
        }
        const data = await fetchJson(`/api/analytics/instructor?courseId=${courseId}`)
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

  const mainChartData = useMemo(
    () =>
      gradeTimeline.map((item) => ({
        name: item.title,
        studentPercent: item.studentPercent !== null ? Number(item.studentPercent.toFixed(1)) : null,
        avgPercent: item.avgPercent !== null ? Number(item.avgPercent.toFixed(1)) : null,
        medianPercent: item.medianPercent !== null ? Number(item.medianPercent.toFixed(1)) : null,
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
            <Box display="flex" alignItems="center" mb={1}>
              <LeaderboardIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                Your Grade
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="h3" fontWeight="medium">
                  {formatPercent(gradeOverview.percent)}
                  {gradeOverview.letter ? ` (${gradeOverview.letter})` : ''}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Class avg: {formatPercent(gradeOverview.classAverage)}
                </Typography>
              </Box>
              <Box
                sx={(theme) => ({
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  border: `1px dashed ${theme.palette.divider}`,
                  background:
                    theme.palette.mode === 'light'
                      ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.06), rgba(0, 0, 0, 0.02))'
                      : 'linear-gradient(135deg, rgba(144, 202, 249, 0.1), rgba(255, 255, 255, 0.04))',
                })}
              >
                <Typography variant="body2">
                  {gradeOverview.total
                    ? `${gradeOverview.completed}/${gradeOverview.total} assignments attempted`
                    : 'No assignments graded yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lowest score:{' '}
                  {gradeOverview.lowestScore !== null
                    ? `${gradeOverview.lowestScore.toFixed(1)}%${gradeOverview.lowestTitle ? ` (${gradeOverview.lowestTitle})` : ''}`
                    : '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Second lowest:{' '}
                  {gradeOverview.lowestScores?.[1]
                    ? `${gradeOverview.lowestScores[1].percent.toFixed(1)}%${gradeOverview.lowestScores[1].title ? ` (${gradeOverview.lowestScores[1].title})` : ''}`
                    : '—'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </ThemedCard>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <ThemedCard sx={statCardSx}>
          <CardContent sx={statCardContentSx}>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUpIcon color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                What's Left
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-flex',
                    p: 0.5,
                    width: '100%',
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight="medium"
                    sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                  >
                    {releaseOverview.pastDuePercent}%
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { value: releaseOverview.pastDuePercent },
                          { value: releaseOverview.remainingPercent },
                        ]}
                        innerRadius="62%"
                        outerRadius="78%"
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                      >
                        <Cell fill={theme.palette.warning.main} />
                        <Cell fill={theme.palette.primary.main} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                {[
                  {
                    label: 'Assignments that were due',
                    value: releaseOverview.pastDuePercent,
                    color: 'warning',
                  },
                  {
                    label: 'Remaining assignments in the course',
                    value: releaseOverview.remainingPercent,
                    color: 'primary',
                  },
                ].map((item) => (
                  <Box key={item.label}>
                    <Box display="flex" alignItems="center" gap={1} justifyContent="flex-start">
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
                      <Typography variant="caption" fontWeight="medium" sx={{ ml: 1 }}>
                        {item.value}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
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
              {!isLoadingAnalytics && assignmentStats.upcomingList.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming assignments
                </Typography>
              ) : isLoadingAnalytics ? null : (
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
                        Due {formatDateTime(assignment.due_at ?? assignment.due_date) || '—'}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      component={Link}
                      to={`/student/assignment/${assignment.id}`}
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
                  Assignment Scores Over Time
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main' }} />
                  <Typography variant="body2">Your score %</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'secondary.main' }} />
                  <Typography variant="body2">Class average %</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Typography variant="body2">Class median %</Typography>
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
                <Tooltip
                  formatter={(value) =>
                    value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}%`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="studentPercent"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgPercent"
                  stroke={theme.palette.secondary.main}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="medianPercent"
                  stroke={theme.palette.success.main}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
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
            <Button variant="contained" onClick={() => navigate('/student/assignments')}>
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
            <Button variant="contained" onClick={() => navigate('/student/practice')}>
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
            <Button variant="contained" onClick={() => navigate('/student/grades')}>
              View grades
            </Button>
          </CardContent>
        </ThemedCard>
      </Stack>
    </Box>
  )
}

*/
