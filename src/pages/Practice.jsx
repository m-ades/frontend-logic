import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Typography } from '@mui/material'
import ActivityAccordion from '../components/ui/ActivityAccordion.jsx'
import ActivityRow from '../components/ui/ActivityRow.jsx'
import { ACTIVITY_TYPES } from '../placeholder/courseActivities.js'
import { courseAssignmentsQuery } from '../context/CoursesContext.jsx'
import { compareSubchapterLabels, sortAssignmentsBySubchapter } from '../utils/assignmentSort.js'
import { formatChapterLabel, formatSubchapterLabel } from '../utils/chapterLabels.js'
import { useAppRuntime } from '../hooks/useAppRuntime.js'
import { useActiveLogicSystem } from '../hooks/useActiveLogicSystem.js'

const buildCourseStructure = (assignments, sectionTitle, logicSystem) => {
  const chapters = new Map()
  const chapterSortValues = new Map()

  assignments.forEach((assignment) => {
    const chapterNum = Number(assignment.chapter) || null
    const chapterLabel = formatChapterLabel(chapterNum, logicSystem)
    const subLabel = formatSubchapterLabel(assignment.subchapter, sectionTitle, logicSystem)
    const chapterEntry = chapters.get(chapterLabel) || new Map()
    const items = chapterEntry.get(subLabel) || []
    items.push({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description || '',
      type: ACTIVITY_TYPES.PRACTICE,
      worksheet: { id: assignment.id, proofs: [] },
      questionCount: Number(assignment.question_count) || Number(assignment.proofs?.length) || 0,
      answeredCount: Number(assignment.answered_count) || 0,
      isLocked: assignment.is_locked ?? assignment.isLocked ?? false,
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

const selectPractices = (assignments) => assignments.filter((assignment) => assignment.kind === 'practice')

export default function Practice() {
  const {
    isSandbox,
    assignmentPath,
    practicePath,
    sandbox: sandboxData,
    activeCourseId,
  } = useAppRuntime()
  const logicSystem = useActiveLogicSystem()
  const courseIdForApi = isSandbox ? null : (activeCourseId ?? null)

  const practiceQuery = useQuery({
    ...courseAssignmentsQuery(courseIdForApi),
    select: selectPractices,
    enabled: !isSandbox && !!courseIdForApi,
    refetchOnMount: 'always',
  })

  const practiceAssignments = useMemo(
    () =>
      sortAssignmentsBySubchapter(
        isSandbox ? (sandboxData?.practices ?? []) : (practiceQuery.data ?? [])
      ),
    [isSandbox, practiceQuery.data, sandboxData?.practices]
  )
  const courseStructure = useMemo(
    () => buildCourseStructure(
      practiceAssignments.map((assignment) => {
        if (!isSandbox || !sandboxData?.isQuestionComplete) return assignment
        const proofs = assignment.proofs || []
        const answeredCount = proofs.filter((proof) => sandboxData.isQuestionComplete(proof.id)).length
        return {
          ...assignment,
          question_count: Number(assignment.question_count) || proofs.length,
          answered_count: answeredCount,
        }
      }),
      'Practice',
      logicSystem
    ),
    [isSandbox, practiceAssignments, sandboxData, logicSystem]
  )
  const isLoadingPractice = isSandbox ? false : practiceQuery.isPending

  const renderActivity = (activity) => {
    const totalQuestions = Number(activity.questionCount) || 0
    const completedQuestions = Math.min(Number(activity.answeredCount) || 0, totalQuestions)
    return (
      <ActivityRow
        key={activity.id}
        title={activity.title}
        description={activity.description}
        totalQuestions={totalQuestions}
        completedQuestions={completedQuestions}
        progressAriaLabel={`Practice completion: ${completedQuestions} of ${totalQuestions} complete`}
        isLocked={activity.isLocked}
        chips={totalQuestions > 0 && completedQuestions === totalQuestions
          ? [{ label: 'Completed', color: 'success' }]
          : []}
        to={activity.worksheet ? assignmentPath(activity.worksheet.id) : undefined}
        state={{ returnTo: practicePath }}
      />
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1280 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
        Practice
      </Typography>
      <ActivityAccordion
        courseStructure={courseStructure}
        isLoading={isLoadingPractice}
        emptyText="No practice problems available"
        showExpandCollapseToggle
        defaultSubchapterExpanded
        renderActivity={renderActivity}
      />
    </Box>
  )
}
