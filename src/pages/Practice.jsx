import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, Typography } from '@mui/material'
import ActivityAccordion from '../components/ui/ActivityAccordion.jsx'
import ActivityRow from '../components/ui/ActivityRow.jsx'
import { ACTIVITY_TYPES } from '../placeholder/courseActivities.js'
import { fetchJson } from '../utils/api.js'
import { compareSubchapterLabels, sortAssignmentsBySubchapter } from '../utils/assignmentSort.js'
import { useAppRuntime } from '../hooks/useAppRuntime.js'

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
      type: ACTIVITY_TYPES.PRACTICE,
      worksheet: { id: assignment.id, proofs: [] },
      questionCount: Number(assignment.question_count) || Number(assignment.proofs?.length) || 0,
      answeredCount: Number(assignment.answered_count) || 0,
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

export default function Practice() {
  const navigate = useNavigate()
  const {
    isSandbox,
    assignmentPath,
    practicePath,
    sandbox: sandboxData,
    activeCourseId,
  } = useAppRuntime()
  const courseIdForApi = isSandbox ? null : (activeCourseId ?? null)

  const practiceQuery = useQuery({
    queryKey: ['course-practice', courseIdForApi],
    queryFn: async () => {
      const assignments = await fetchJson(`/api/courses/${courseIdForApi}/assignments`)
      return assignments.filter((assignment) => assignment.kind === 'practice')
    },
    enabled: !isSandbox && !!courseIdForApi,
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
      'Practice'
    ),
    [isSandbox, practiceAssignments, sandboxData]
  )
  const isLoadingPractice = isSandbox ? false : practiceQuery.isPending

  const handleActivityClick = (activity) => {
    if (activity.worksheet) {
      navigate(assignmentPath(activity.worksheet.id), {
        state: { returnTo: practicePath }
      })
    }
  }

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
        chips={[{ label: 'Practice', color: 'primary', variant: 'outlined' }]}
        onClick={() => handleActivityClick(activity)}
      />
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
        Practice
      </Typography>
      <ActivityAccordion
        courseStructure={courseStructure}
        isLoading={isLoadingPractice}
        emptyText="No practice problems available"
        defaultSubchapterExpanded
        renderActivity={renderActivity}
      />
    </Box>
  )
}
