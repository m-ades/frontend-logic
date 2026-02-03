import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, Tabs, Tab, Typography, CardContent, Chip, Stack } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import ActivityAccordion from '../components/ui/ActivityAccordion.jsx'
import { ACTIVITY_TYPES } from '../placeholder/courseActivities.js'
import { formatDateTime } from '../utils/formatting.js'
import { parseDueDateAsEastern } from '../utils/easternTime.js'
import { compareSubchapterLabels, sortAssignmentsBySubchapter } from '../utils/assignmentSort.js'
import { API_CONFIG, fetchJson, getActiveUserId } from '../utils/api.js'
import { useCoursesState } from '../context/CoursesContext.jsx'

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
      dueDate: assignment.due_at ?? assignment.due_date,
      type: ACTIVITY_TYPES.HOMEWORK,
      worksheet: { id: assignment.id, proofs: [] },
      isLocked: assignment.is_locked ?? assignment.isLocked ?? false,
    })
    chapterEntry.set(subLabel, items)
    chapters.set(chapterLabel, chapterEntry)
  })

  const compareLabels = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  const chapterValue = (label) => {
    const match = /^Chapter\s+(\d+)/i.exec(label)
    return match ? Number(match[1]) : null
  }

  return Array.from(chapters.entries())
    .sort(([labelA], [labelB]) => {
      const aNum = chapterValue(labelA)
      const bNum = chapterValue(labelB)
      if (aNum !== null && bNum !== null) return aNum - bNum
      if (aNum !== null) return -1
      if (bNum !== null) return 1
      return compareLabels(labelA, labelB)
    })
    .map(([chapterLabel, subMap]) => ({
      id: chapterLabel,
      title: chapterLabel,
      subchapters: Array.from(subMap.entries())
        .sort(([a], [b]) => compareSubchapterLabels(a, b))
        .map(([subLabel, items]) => ({
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
  const { activeCourseId } = useCoursesState()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const navigate = useNavigate()
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
  const isLoadingAssignments = assignmentsQuery.isPending || gradesQuery.isPending

  const gradedAssignments = useMemo(
    () =>
      sortAssignmentsBySubchapter(
        (assignments || []).filter((a) => a.kind !== 'practice')
      ),
    [assignments]
  )

  const courseStructure = useMemo(
    () => (courseIdForApi ? buildCourseStructure(gradedAssignments, 'Assignments') : []),
    [courseIdForApi, gradedAssignments]
  )

  const completedAssignments = useMemo(() => {
    const ids = gradedAssignments
      .map((assignment) => {
        const completedFlag =
          assignment.completed === true ||
          assignment.completed === 'true' ||
          assignment.completed === 1 ||
          assignment.completed === 't'
        if (completedFlag) return assignment.id
        const questionCount = Number(assignment.question_count) || 0
        const answeredCount = Number(assignment.answered_count) || 0
        if (questionCount === 0) return null
        return answeredCount === questionCount ? assignment.id : null
      })
      .filter(Boolean)
    return new Set(ids)
  }, [gradedAssignments])

  const averagePercent = useMemo(() => {
    const totalPoints = (grades || []).reduce((sum, g) => sum + (g.max_score || 0), 0)
    const earnedPoints = (grades || []).reduce((sum, g) => sum + (g.final_score || 0), 0)
    return totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : null
  }, [grades])

  const getCompletionStatus = useCallback(
    (activityId) => completedAssignments.has(activityId),
    [completedAssignments]
  )

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
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const twoWeeksOut = new Date(startOfDay)
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)
    const predicate = (activity) => {
      switch (tabValue) {
        case 0: {
          if (activity.isLocked) return false
          if (!activity.dueDate) return false
          const deadline = parseDueDateAsEastern(activity.dueDate, activity.dueTime)
          if (!deadline) return false
          return (
            deadline >= startOfDay &&
            deadline <= twoWeeksOut &&
            !getCompletionStatus(activity.id)
          )
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
      navigate(`/student/assignment/${activity.worksheet.id}`, {
        state: { returnTo: '/student/assignments' }
      })
    }
  }

  const renderActivity = (activity, { chapter, subchapter }, datePrefix, showCompletionChip) => (
    <ThemedCard
      key={activity.id}
      sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
      onClick={() => handleActivityClick(activity)}
    >
      <CardContent sx={{ pl: 0, pr: 2, pt: 2, pb: 2, '&:last-child': { pb: 2 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
          spacing={2}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
                {activity.title}
              </Typography>
              {activity.isLocked && (
                <LockIcon sx={{ fontSize: '1.25rem', color: 'text.secondary', flexShrink: 0 }} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {chapter.title} • {subchapter.title}
            </Typography>
            {activity.description && (
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {activity.description}
              </Typography>
            )}
          </Box>
          <Stack spacing={1} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} width={{ xs: '100%', sm: 'auto' }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                label={activity.type === ACTIVITY_TYPES.HOMEWORK ? 'Homework' : activity.type === ACTIVITY_TYPES.QUIZ ? 'Quiz' : 'Exam'}
                size="small"
                color="primary"
                variant="outlined"
              />
              {activity.dueDate && parseDueDateAsEastern(activity.dueDate, activity.dueTime) < new Date() && (
                <Chip label="Past due" size="small" color="error" />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {datePrefix}{formatDateTime(activity.dueDate) || 'No due date'}
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
      isLoading={isLoadingAssignments}
      emptyText={emptyText}
      renderActivity={(activity, context) =>
        renderActivity(activity, context, datePrefix, showCompletionChip)
      }
    />
  )

  return (
    <Box>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, maxWidth: '100%' }}
      >
        <Tab label="Upcoming" />
        <Tab label="All Assignments" />
        <Tab label="Completed" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        {renderAssignmentsAccordion('No upcoming assignments', 'Due: ', false)}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {renderAssignmentsAccordion('No assignments found', '', true)}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {renderAssignmentsAccordion('No submitted assignments', 'Submitted: ', true)}
      </TabPanel>
    </Box>
  )
}
