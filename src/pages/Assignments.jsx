import { useEffect, useMemo, useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Tabs, Tab, Typography } from '@mui/material'
import ActivityAccordion from '../components/ui/ActivityAccordion.jsx'
import ActivityRow from '../components/ui/ActivityRow.jsx'
import { ACTIVITY_TYPES } from '../placeholder/courseActivities.js'
import { formatDateTime } from '../utils/formatting.js'
import { parseDueDateAsEastern } from '../utils/easternTime.js'
import { compareSubchapterLabels, sortAssignmentsBySubchapter } from '../utils/assignmentSort.js'
import { formatChapterLabel } from '../utils/chapterLabels.js'
import { toRomanNumeral } from '../utils/romanNumerals.js'
import { fetchJson, getActiveUserId } from '../utils/api.js'
import { useAppRuntime } from '../hooks/useAppRuntime.js'

const buildCourseStructure = (assignments, sectionTitle) => {
  const chapters = new Map()
  const chapterSortValues = new Map()

  assignments.forEach((assignment) => {
    const chapterNum = Number(assignment.chapter) || null
    const chapterLabel = chapterNum ? `Part ${toRomanNumeral(chapterNum)}` : 'Other'
    const subLabel = formatChapterLabel(assignment.subchapter, sectionTitle)
    const chapterEntry = chapters.get(chapterLabel) || new Map()
    const items = chapterEntry.get(subLabel) || []
    items.push({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description || '',
      dueDate: assignment.due_at ?? assignment.due_date,
      policy: assignment.policy ?? null,
      type: ACTIVITY_TYPES.HOMEWORK,
      worksheet: { id: assignment.id, proofs: [] },
      isLocked: assignment.is_locked ?? assignment.isLocked ?? false,
      questionCount: Number(assignment.question_count) || 0,
      answeredCount: Number(assignment.answered_count) || 0,
    })
    chapterEntry.set(subLabel, items)
    chapters.set(chapterLabel, chapterEntry)
    chapterSortValues.set(chapterLabel, chapterNum)
  })

  const compareLabels = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

  return Array.from(chapters.entries())
    .sort(([labelA], [labelB]) => {
      const aNum = chapterSortValues.get(labelA)
      const bNum = chapterSortValues.get(labelB)
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
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  )
}

export default function Assignments() {
  const {
    isSandbox: sandbox,
    assignmentsPath,
    assignmentPath,
    storageScope,
    sandbox: sandboxData,
    user,
    activeCourseId,
  } = useAppRuntime()
  const courseIdForApi = sandbox ? null : (activeCourseId ?? null)
  const userId = sandbox ? user.id : getActiveUserId()
  const tabStorageKey = useMemo(() => {
    const suffix = courseIdForApi ? `course-${courseIdForApi}` : 'default'
    return `assignments:last-tab:${suffix}`
  }, [courseIdForApi])
  const accordionStorageKey = useMemo(() => {
    const parts = ['assignments', 'accordion']
    if (courseIdForApi) parts.push(`course-${courseIdForApi}`)
    if (userId) parts.push(`user-${userId}`)
    return parts.join(':')
  }, [courseIdForApi, userId])

  const getRouteStorage = useCallback(() => {
    if (typeof window === 'undefined') return null
    return storageScope === 'session' ? window.sessionStorage : window.localStorage
  }, [storageScope])

  const readStoredTab = useCallback(() => {
    const storage = getRouteStorage()
    if (!storage) return null
    const raw = storage.getItem(tabStorageKey)
    const parsed = raw === null ? null : Number(raw)
    if (!Number.isFinite(parsed)) return null
    if (parsed < 0 || parsed > 2) return null
    return parsed
  }, [getRouteStorage, tabStorageKey])

  const [tabValue, setTabValue] = useState(() => readStoredTab() ?? 0)

  useEffect(() => {
    const stored = readStoredTab()
    setTabValue(stored ?? 0)
  }, [readStoredTab])

  const assignmentsQuery = useQuery({
    queryKey: ['course-assignments', courseIdForApi],
    queryFn: () => fetchJson(`/api/courses/${courseIdForApi}/assignments`),
    enabled: !sandbox && !!courseIdForApi,
    refetchOnMount: 'always',
  })

  const assignments = sandbox ? sandboxData.assignments : (assignmentsQuery.data ?? [])
  const isLoadingAssignments = sandbox ? false : assignmentsQuery.isPending

  const gradedAssignments = useMemo(
    () =>
      sortAssignmentsBySubchapter(
        (assignments || []).filter((a) => a.kind !== 'practice')
      ),
    [assignments]
  )

  const courseStructure = useMemo(
    () => ((sandbox || courseIdForApi) ? buildCourseStructure(gradedAssignments, 'Assignments') : []),
    [sandbox, courseIdForApi, gradedAssignments]
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
    const storage = getRouteStorage()
    if (storage) {
      storage.setItem(tabStorageKey, String(newValue))
    }
  }

  const renderActivity = (activity) => {
    const policy = activity.policy
    const extensionDueLabel = policy?.extension_due_at
      ? formatDateTime(policy.extension_due_at)
      : null
    const accommodationDueLabel = policy?.accommodation_due_at
      ? formatDateTime(policy.accommodation_due_at)
      : null
    const totalQuestions = Number(activity.questionCount) || 0
    const completedQuestions = Math.min(Number(activity.answeredCount) || 0, totalQuestions)
    const isCompleted = getCompletionStatus(activity.id)
    const isPastDue = Boolean(
      activity.dueDate && !isCompleted && parseDueDateAsEastern(activity.dueDate, activity.dueTime) < new Date()
    )
    const noteLines = [
      extensionDueLabel && `Extension: ${extensionDueLabel}`,
      accommodationDueLabel && `Accommodation: ${accommodationDueLabel}`,
      policy?.late_penalty_waived && 'Late penalty waived',
    ].filter(Boolean)
    const chips = [
      isPastDue && { label: 'Past due', color: 'error' },
      isCompleted && { label: 'Completed', color: 'success' },
    ].filter(Boolean)

    return (
      <ActivityRow
        key={activity.id}
        title={activity.title}
        description={activity.description}
        isLocked={activity.isLocked}
        totalQuestions={totalQuestions}
        completedQuestions={completedQuestions}
        progressAriaLabel={`Assignment completion: ${completedQuestions} of ${totalQuestions} complete`}
        chips={chips}
        dateLabel={activity.dueDate ? `Due ${formatDateTime(activity.dueDate)}` : 'No due date'}
        noteLines={noteLines}
        to={activity.worksheet ? assignmentPath(activity.worksheet.id) : undefined}
        state={{ returnTo: assignmentsPath }}
      />
    )
  }

  const renderAssignmentsAccordion = (emptyText, defaultExpanded = true) => (
    <ActivityAccordion
      courseStructure={filteredStructure}
      isLoading={isLoadingAssignments}
      emptyText={emptyText}
      defaultExpanded={defaultExpanded}
      showExpandCollapseToggle
      defaultSubchapterExpanded
      persistKey={accordionStorageKey}
      storage={storageScope}
      renderActivity={renderActivity}
    />
  )

  return (
    <Box sx={{ width: '100%', maxWidth: 1280 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
        Assignments
      </Typography>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 1,
          maxWidth: '100%',
          minHeight: 44,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            minHeight: 44,
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        <Tab label="Upcoming" />
        <Tab label="All Assignments" />
        <Tab label="Completed" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        {renderAssignmentsAccordion('No upcoming assignments')}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {renderAssignmentsAccordion('No assignments found', false)}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {renderAssignmentsAccordion('No completed assignments')}
      </TabPanel>
    </Box>
  )
}
