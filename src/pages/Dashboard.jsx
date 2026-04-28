import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Grid from '@mui/material/Grid'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
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
import { isInstructorRole } from '../utils/auth.js'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import { useAppRuntime } from '../hooks/useAppRuntime.js'

const formatPercent = (value) => (value === null || value === undefined ? '—' : `${value.toFixed(1)}%`)

const GRADE_THRESHOLDS = [
  { letter: 'A', min: 93 },
  { letter: 'A-', min: 90 },
  { letter: 'B+', min: 87 },
  { letter: 'B', min: 83 },
  { letter: 'B-', min: 80 },
  { letter: 'C+', min: 77 },
  { letter: 'C', min: 73 },
  { letter: 'C-', min: 70 },
  { letter: 'D+', min: 67 },
  { letter: 'D', min: 63 },
  { letter: 'D-', min: 60 },
]

const getLetterGrade = (percent) => {
  if (percent === null || percent === undefined) return null
  const match = GRADE_THRESHOLDS.find((threshold) => percent >= threshold.min)
  return match ? match.letter : 'F'
}

const shortAssignmentLabel = (title = '') => {
  const trimmed = String(title || '').trim()
  if (!trimmed) return 'Assignment'
  const parts = trimmed.split(':')
  return (parts[0] || trimmed).trim()
}

const emptyAnalytics = {
  assignments: { upcoming: 0, pending: 0, overdue: 0, upcomingList: [] },
  performance: { avg_score: null, avg_attempt: null, correct_rate: null, first_try_correct_rate: null },
  time: {
    avg_minutes_per_question: null,
    median_minutes_per_question: null,
    p75_minutes_per_question: null,
  },
  submissionCount: 0,
  submittedAssignmentIds: [],
}

const defaultGradeOverview = {
  percent: null,
  letter: null,
  classAverage: null,
  completed: 0,
  total: 0,
  lowestScore: null,
  lowestTitle: null,
  lowestScores: [],
}
const defaultReleaseOverview = { pastDuePercent: 0, remainingPercent: 0 }
const isSubmittedGrade = (grade) => grade?.graded_at != null || grade?.graded_by != null

export default function Dashboard() {
  const theme = useTheme()
  const {
    isSandbox: sandbox,
    sandbox: sandboxData,
    user: runtimeUser,
    assignmentPath,
    assignmentsPath,
    activeCourseId,
  } = useAppRuntime()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const courseIdForApi = sandbox ? null : (activeCourseId ?? null)
  const userId = sandbox ? runtimeUser.id : getActiveUserId()

  const analyticsQuery = useQuery({
    queryKey: ['analytics-student', userId, courseIdForApi],
    queryFn: () =>
      fetchJson(`/api/analytics/student-dashboard?userId=${userId}&courseId=${courseIdForApi}`),
    enabled: !sandbox && !!courseIdForApi && !!userId,
  })

  const gradebookQuery = useQuery({
    queryKey: ['gradebook-summary', courseIdForApi],
    queryFn: () =>
      fetchJson(`/api/analytics/gradebook-summary?courseId=${courseIdForApi}`).catch(() => null),
    enabled: !sandbox && !!courseIdForApi,
  })

  const analyticsData = sandbox ? sandboxData.dashboardAnalytics : analyticsQuery.data
  const gradebookResponse = sandbox ? sandboxData.dashboardGradebookSummary : gradebookQuery.data
  const isLoadingAnalytics = sandbox
    ? false
    : ((analyticsQuery.isPending && !!courseIdForApi) || (gradebookQuery.isPending && !!courseIdForApi))
  const analyticsError = sandbox ? false : analyticsQuery.isError
  const gradebookError = sandbox ? false : gradebookQuery.isError

  const { analytics, gradeTimeline, gradeOverview, releaseOverview } = useMemo(() => {
    if ((!sandbox && !courseIdForApi) || !analyticsData) {
      return {
        analytics: emptyAnalytics,
        gradeTimeline: [],
        gradeOverview: defaultGradeOverview,
        releaseOverview: defaultReleaseOverview,
      }
    }
    const gradebookSummary = Array.isArray(gradebookResponse)
      ? gradebookResponse
      : (gradebookResponse?.assignments ?? [])
    const classAvgWithDrop =
      !Array.isArray(gradebookResponse) && gradebookResponse != null
        ? gradebookResponse.class_avg_with_drop
        : null
    const grades = analyticsData?.assignmentGrades ?? []
    const gradeMap = new Map(
      (grades || []).map((g) => [g.assignment_id ?? g.Assignment?.id, g])
    )
    const unlockedSummary = gradebookSummary?.length
      ? gradebookSummary.filter((a) => a.is_locked === false)
      : []
    const timeline =
      unlockedSummary.length > 0
        ? unlockedSummary
            .slice()
            .sort((a, b) => {
              const aDate = (a.due_at ?? a.due_date) ? new Date(a.due_at ?? a.due_date) : null
              const bDate = (b.due_at ?? b.due_date) ? new Date(b.due_at ?? b.due_date) : null
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
                avgPercent:
                  assignment.avg_percent != null ? assignment.avg_percent * 100 : null,
                medianPercent:
                  assignment.median_percent != null ? assignment.median_percent * 100 : null,
                studentPercent: fallbackPercent != null ? fallbackPercent * 100 : null,
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
                id: grade.assignment_id,
                title: assignment.title || 'Assignment',
                studentPercent: percent,
                avgPercent: null,
                medianPercent: null,
                date,
              }
            })
            .filter((item) => item.studentPercent != null)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
    const assignmentPercents =
      unlockedSummary.length > 0
        ? unlockedSummary.map((assignment) => {
            const grade = gradeMap.get(assignment.id)
            const max = grade?.max_score ?? 0
            const score = grade?.final_score ?? grade?.raw_score ?? null
            const percent =
              max > 0 && score != null ? (score / max) * 100 : 0
            return { id: assignment.id, percent, title: assignment.title || 'Assignment' }
          })
        : (grades || [])
            .filter((g) => g?.Assignment?.is_locked === false)
            .reduce((list, grade) => {
              const max = grade?.max_score || 0
              const score = grade?.final_score ?? grade?.raw_score
              if (!max || score == null) return list
              list.push({
                id: grade.assignment_id,
                percent: (score / max) * 100,
                title: grade?.Assignment?.title || grade?.title || 'Assignment',
              })
              return list
            }, [])
    const submittedAssignmentPercents = assignmentPercents.filter((entry) => {
      const grade = entry.id != null
        ? gradeMap.get(entry.id) ?? grades.find((item) => item?.assignment_id === entry.id)
        : null
      return sandbox ? isSubmittedGrade(grade) : true
    })
    const totalAssignments =
      unlockedSummary.length > 0
        ? unlockedSummary.length
        : analyticsData?.assignments?.total ?? gradebookSummary?.length ?? grades?.length ?? 0
    const completedCount = sandbox
      ? submittedAssignmentPercents.length
      : assignmentPercents.filter((a) => a.percent > 0).length
    let overallPercent = null
    if (sandbox) {
      const totalPossiblePoints = (grades || []).reduce((sum, grade) => sum + (Number(grade?.max_score) || 0), 0)
      const totalEarnedPoints = (grades || []).reduce(
        (sum, grade) => sum + (Number(grade?.final_score ?? grade?.raw_score) || 0),
        0
      )
      overallPercent = totalPossiblePoints > 0 ? (totalEarnedPoints / totalPossiblePoints) * 100 : 0
    } else {
      let scoresForAverage = assignmentPercents.map((a) => a.percent)
      if (scoresForAverage.length > 0) {
        if (scoresForAverage.length >= 3) {
          scoresForAverage = [...scoresForAverage].sort((a, b) => a - b).slice(2)
        }
        overallPercent = scoresForAverage.reduce((s, p) => s + p, 0) / scoresForAverage.length
      }
    }
    const classAverage =
      classAvgWithDrop != null
        ? classAvgWithDrop
        : (() => {
            const forAvg =
              unlockedSummary.length > 0
                ? unlockedSummary
                : (gradebookSummary || []).filter((a) => a.is_locked === false)
            const vals = forAvg
              .map((a) => a.avg_percent)
              .filter((v) => v != null)
            return vals.length > 0
              ? (vals.reduce((sum, v) => sum + v, 0) / vals.length) * 100
              : null
          })()
    const lowestScores = [...(sandbox ? assignmentPercents : assignmentPercents)]
      .sort((a, b) => a.percent - b.percent)
      .slice(0, 2)
    const lowestGrade = lowestScores[0] ?? null
    const assignmentsData = analyticsData?.assignments ?? {}
    const pastDueDateCount = assignmentsData.pastDueDateCount ?? assignmentsData.overdue ?? 0
    const totalForWhatsLeft = assignmentsData.total ?? totalAssignments ?? 0
    const pastDuePercent =
      totalForWhatsLeft > 0 ? (pastDueDateCount / totalForWhatsLeft) * 100 : 0
    const remainingPercent = totalForWhatsLeft > 0 ? 100 - pastDuePercent : 0
    return {
      analytics: { ...emptyAnalytics, ...analyticsData },
      gradeTimeline: timeline,
      gradeOverview: {
        percent: overallPercent,
        letter: overallPercent != null ? getLetterGrade(overallPercent) : null,
        classAverage,
        completed: completedCount,
        total: totalAssignments,
        lowestScore: lowestGrade?.percent ?? null,
        lowestTitle: lowestGrade?.title ?? null,
        lowestScores,
      },
      releaseOverview: {
        pastDuePercent: Number(pastDuePercent.toFixed(1)),
        remainingPercent: Number(remainingPercent.toFixed(1)),
      },
    }
  }, [sandbox, courseIdForApi, analyticsData, gradebookResponse])

  const [instructorAnalytics, setInstructorAnalytics] = useState({
    gradeSummary: null,
    assignmentStats: [],
    timeByCategory: [],
  })
  const envDashboardMode = import.meta.env.VITE_DASHBOARD_MODE || 'student'
  const isInstructor = isInstructorRole(runtimeUser?.role)
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
    if (dashboardMode !== 'instructor') {
      return undefined
    }

    let isMounted = true

    const loadInstructorAnalytics = async () => {
      try {
        if (!courseIdForApi) {
          return
        }
        const data = await fetchJson(`/api/analytics/instructor-dashboard?courseId=${courseIdForApi}`)
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
  }, [courseIdForApi, dashboardMode])

  const randomData = useMemo(() => {
    const base = analytics.performance.avg_attempt || 1
    const count = analytics.submissionCount || 1
    return Array.from({ length: 10 }, (_, index) => ({
      value: Math.round(base * 100 + count * 2 + index * 5),
    }))
  }, [analytics.performance.avg_attempt, analytics.submissionCount])

  const assignmentStats = analytics.assignments || emptyAnalytics.assignments

  const [useFullScale, setUseFullScale] = useState(false)

  const mainChartData = useMemo(
    () =>
      gradeTimeline.map((item) => ({
        name: shortAssignmentLabel(item.title),
        studentPercent: item.studentPercent !== null ? Number(item.studentPercent.toFixed(1)) : null,
        avgPercent: item.avgPercent !== null ? Number(item.avgPercent.toFixed(1)) : null,
        medianPercent: item.medianPercent !== null ? Number(item.medianPercent.toFixed(1)) : null,
      })),
    [gradeTimeline]
  )

  const chartDomain = useMemo(() => {
    if (useFullScale) return [0, 100]
    const values = mainChartData
      .flatMap((item) => [item.studentPercent, item.avgPercent, item.medianPercent])
      .filter((value) => Number.isFinite(value))
    if (!values.length) return [0, 100]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = 5
    const low = Math.max(0, Math.floor(min - pad))
    const high = Math.min(100, Math.ceil(max + pad))
    if (high - low < 10) {
      const center = (high + low) / 2
      return [
        Math.max(0, Math.floor(center - 5)),
        Math.min(100, Math.ceil(center + 5)),
      ]
    }
    return [low, high]
  }, [mainChartData, useFullScale])

  const activityStats = useMemo(() => {
    const median = analytics.time.median_minutes_per_question ?? analytics.time.avg_minutes_per_question
    const p75 = analytics.time.p75_minutes_per_question
    const medianLabel = median != null ? `${Math.round(median)} mins` : '—'
    const rangeLabel =
      median != null && p75 != null
        ? `${Math.round(median)}–${Math.round(p75)} mins`
        : median != null
        ? `${Math.round(median)} mins`
        : '—'
    const cohortMedian = analytics.time.cohort_median_minutes_per_question
    const relativeToCohort =
      median != null && cohortMedian != null && cohortMedian > 0
        ? median / cohortMedian
        : null
    return [
      { label: 'Typical time per question', value: medianLabel, subtext: 'Median (recent)' },
      { label: 'Most questions fall in', value: rangeLabel, subtext: 'Median–75th percentile' },
      { label: 'Submissions', value: `${analytics.submissionCount}`, subtext: 'Total' },
    ]
  }, [
    analytics.submissionCount,
    analytics.time.cohort_median_minutes_per_question,
    analytics.time.median_minutes_per_question,
    analytics.time.p75_minutes_per_question,
  ])

  return (
    <Box sx={{ width: '100%' }}>
      {isLoadingAnalytics && (
        <LinearProgress sx={{ position: 'sticky', top: 0, zIndex: 10, mb: 0 }} />
      )}
      <Grid container spacing={3} alignItems="stretch" sx={{ minWidth: 0 }}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{ minWidth: 0 }}>
        <ThemedCard sx={statCardSx}>
          <CardContent sx={statCardContentSx}>
            <Box display="flex" alignItems="center" mb={1}>
              <LeaderboardIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                Your Grade
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {analyticsError || gradebookError ? (
                <Typography variant="body2" color="text.secondary">
                  Unable to load grade overview.
                </Typography>
              ) : null}
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
                <Typography component="div" variant="body2" sx={{ mb: 1 }}>
                  Grade = average of published assignments.
                  <br />
                  Unattempted work counts as 0%.
                  <br />
                  Lowest 2 scores dropped after 3+ assignments.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {gradeOverview.total
                    ? `${gradeOverview.completed}/${gradeOverview.total} assignments completed`
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

      <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{ minWidth: 0 }}>
        <ThemedCard sx={statCardSx}>
          <CardContent sx={statCardContentSx}>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUpIcon color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                What's Left
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {analyticsError ? (
                <Typography variant="body2" color="text.secondary">
                  Unable to load release summary.
                </Typography>
              ) : null}
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                <Box
                  sx={{
                    position: 'relative',
                    display: 'block',
                    p: 0.5,
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight="medium"
                    sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                  >
                    {releaseOverview.remainingPercent}%
                  </Typography>
                  <Box
                    role="img"
                    aria-label="Assignments remaining versus due"
                    sx={{
                      width: '100%',
                      height: 200,
                      minHeight: 200,
                      minWidth: 0,
                    }}
                  >
                    <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={[
                            { value: Number(releaseOverview.pastDuePercent) || 0 },
                            { value: Number(releaseOverview.remainingPercent) || 0 },
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

      <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{ minWidth: 0 }}>
        <ThemedCard sx={statCardSx}>
          <CardContent sx={statCardContentSx}>
            <Box display="flex" alignItems="center" mb={2}>
              <CalendarTodayIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                Upcoming Assignments
              </Typography>
            </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {analyticsError ? (
                <Typography variant="body2" color="text.secondary">
                  Unable to load upcoming assignments.
                </Typography>
              ) : !isLoadingAnalytics && assignmentStats.upcomingList.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming assignments
                </Typography>
              ) : isLoadingAnalytics ? (
                <LinearProgress sx={{ mt: 1 }} />
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
                        Due {formatDateTime(assignment.due_at ?? assignment.due_date) || '—'}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      component={Link}
                      to={assignmentPath(assignment.id)}
                      aria-label={`Open ${assignment.title}`}
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

      <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{ minWidth: 0 }}>
        <ThemedCard sx={statCardSx}>
          <CardContent sx={statCardContentSx}>
            <Box display="flex" alignItems="center" mb={2}>
              <BookIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">
                Activity
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {analyticsError ? (
                <Typography variant="body2" color="text.secondary">
                  Unable to load activity metrics.
                </Typography>
              ) : null}
              {!analyticsError &&
              analytics.time?.median_minutes_per_question != null &&
              analytics.time?.cohort_median_minutes_per_question != null && (
                <Typography variant="body2" color="text.secondary">
                  Your typical time per question is{' '}
                  {analytics.time.median_minutes_per_question != null &&
                  analytics.time.cohort_median_minutes_per_question
                    ? (() => {
                        const ratio =
                          analytics.time.median_minutes_per_question /
                          analytics.time.cohort_median_minutes_per_question
                        if (!Number.isFinite(ratio)) return 'similar to the class median.'
                        if (ratio < 0.8) return 'faster than most classmates.'
                        if (ratio > 1.25) return 'slightly slower than most classmates.'
                        return 'similar to the class median.'
                      })()
                    : 'similar to the class median.'}
                </Typography>
              )}
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
                  <Box role="img" aria-label={`${item.label} trend`}>
                    <ResponsiveContainer width="100%" height={30} minWidth={0} minHeight={0}>
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
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setUseFullScale((prev) => !prev)}
                  sx={{ textTransform: 'none' }}
                >
                  {useFullScale ? 'Zoomed scale' : 'Full scale (0–100)'}
                </Button>
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
            {analyticsError || gradebookError ? (
              <Typography variant="body2" color="text.secondary">
                Unable to load assignment score trends.
              </Typography>
            ) : null}
            <Box role="img" aria-label="Assignment scores over time">
              <ResponsiveContainer width="100%" height={270} minWidth={0} minHeight={0}>
                <LineChart data={mainChartData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    stroke={theme.palette.divider}
                  />
                  <YAxis
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    stroke={theme.palette.divider}
                    domain={chartDomain}
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
            </Box>
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
    </Box>
  )
}
