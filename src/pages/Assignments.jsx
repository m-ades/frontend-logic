import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Tabs, Tab, Typography, CardContent, Chip, Stack } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import ActivityAccordion from '../components/ui/ActivityAccordion.jsx'
import { ACTIVITY_TYPES } from '../placeholder/courseActivities.js'
import { formatDate } from '../utils/formatting.js'
import { getStoredBoolean } from '../placeholder/storage.js'
import { API_CONFIG, fetchJson } from '../utils/api.js'

const buildCourseStructure = (assignments, sectionTitle) => {
  const chapters = new Map()

  assignments.forEach((assignment) => {
    const chapterLabel = assignment.chapter ? `Chapter ${assignment.chapter}` : 'Other'
    const subLabel = assignment.subchapter || sectionTitle
    const chapterEntry = chapters.get(chapterLabel) || new Map()
    const items = chapterEntry.get(subLabel) || []
    items.push({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description || '',
      dueDate: assignment.due_date,
      points: assignment.total_points,
      type: ACTIVITY_TYPES.HOMEWORK,
      worksheet: { id: assignment.id, proofs: [] },
    })
    chapterEntry.set(subLabel, items)
    chapters.set(chapterLabel, chapterEntry)
  })

  return Array.from(chapters.entries()).map(([chapterLabel, subMap]) => ({
    id: chapterLabel,
    title: chapterLabel,
    subchapters: Array.from(subMap.entries()).map(([subLabel, items]) => ({
      id: `${chapterLabel}-${subLabel}`,
      title: subLabel,
      activities: items,
    })),
  }))
}

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

export default function Assignments() {
  const [tabValue, setTabValue] = useState(0)
  const [averagePercent, setAveragePercent] = useState(null)
  const [courseStructure, setCourseStructure] = useState([])
  const navigate = useNavigate()

  const getCompletionStatus = useCallback(
    (activityId) => getStoredBoolean(`completion-${activityId}`),
    []
  )

  useEffect(() => {
    let isMounted = true

    const loadAssignments = async () => {
      try {
        const assignments = await fetchJson(`/api/courses/${API_CONFIG.courseId}/assignments`)
        const gradedAssignments = assignments.filter((assignment) => assignment.kind !== 'practice')
        if (!isMounted) return

        setCourseStructure(buildCourseStructure(gradedAssignments, 'Assignments'))
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to load assignments', error)
          setCourseStructure([])
        }
      }
    }

    loadAssignments()

    return () => {
      isMounted = false
    }
  }, [])

  const filterStructure = useCallback((structure, predicate) => {
    return structure.map((chapter) => {
      const subchapters = (chapter.subchapters || [])
        .map((subchapter) => {
          const activities = (subchapter.activities || []).filter(predicate)
          return activities.length > 0 ? { ...subchapter, activities } : null
        })
        .filter(Boolean)
      return subchapters.length > 0 ? { ...chapter, subchapters } : null
    }).filter(Boolean)
  }, [])

  const filteredStructure = useMemo(() => {
    const now = new Date()
    const predicate = (activity) => {
      switch (tabValue) {
        case 1: {
          if (!activity.dueDate) return false
          const dueDate = new Date(activity.dueDate)
          return dueDate > now && !getCompletionStatus(activity.id)
        }
        case 2:
          return getCompletionStatus(activity.id)
        default:
          return true
      }
    }
    return filterStructure(courseStructure, predicate)
  }, [courseStructure, filterStructure, getCompletionStatus, tabValue])

  const handleTabChange = (e, newValue) => {
    setTabValue(newValue)
  }

  const handleActivityClick = (activity) => {
    if (activity.worksheet) {
      navigate(`/assignment/${activity.worksheet.id}`)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadSummary = async () => {
      try {
        const grades = await fetchJson(`/api/users/${API_CONFIG.userId}/grades`)

        if (!isMounted) return

        const totalPoints = grades.reduce(
          (sum, grade) => sum + (grade.max_score || grade.Assignment?.total_points || 0),
          0
        )
        const earnedPoints = grades.reduce((sum, grade) => sum + (grade.final_score || 0), 0)
        const percent = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : null
        setAveragePercent(percent)
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to load assignment summary', error)
          setAveragePercent(null)
        }
      }
    }

    loadSummary()

    return () => {
      isMounted = false
    }
  }, [])

  const renderActivity = (activity, { chapter, subchapter }, datePrefix, showCompletionChip) => (
    <ThemedCard      key={activity.id}
      sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
      onClick={() => handleActivityClick(activity)}
    >
      <CardContent sx={{ pl: 0, pr: 2, pt: 2, pb: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {activity.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {chapter.title} • {subchapter.title}
            </Typography>
            {activity.description && (
              <Typography variant="body2" color="text.secondary">
                {activity.description}
              </Typography>
            )}
          </Box>
          <Stack spacing={1} alignItems="flex-end">
            <Chip
              label={activity.type === ACTIVITY_TYPES.HOMEWORK ? 'Homework' : activity.type === ACTIVITY_TYPES.QUIZ ? 'Quiz' : 'Exam'}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              {datePrefix}{formatDate(activity.dueDate)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activity.points} points
            </Typography>
            {showCompletionChip && getCompletionStatus(activity.id) && (
              <Chip label="Completed" size="small" color="success" />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </ThemedCard>
  )

  const renderAssignmentsAccordion = (emptyText, datePrefix, showCompletionChip) => (
    <ActivityAccordion
      title="Assignments"
      courseStructure={filteredStructure}
      emptyText={emptyText}
      renderActivity={(activity, context) =>
        renderActivity(activity, context, datePrefix, showCompletionChip)
      }
    />
  )

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tab label="All Assignments" />
            <Tab label="Upcoming" />
            <Tab label="Submitted" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {renderAssignmentsAccordion('No assignments found', '', true)}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {renderAssignmentsAccordion('No upcoming assignments', 'Due: ', false)}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {renderAssignmentsAccordion('No submitted assignments', 'Submitted: ', true)}
          </TabPanel>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ThemedCard>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Your average
              </Typography>
              <Typography variant="h4" fontWeight={600} sx={{ mb: 3 }}>
                {averagePercent !== null ? `${averagePercent.toFixed(2)}%` : '—'}
              </Typography>
            </CardContent>
          </ThemedCard>
        </Grid>
      </Grid>
    </Box>
  )
}
