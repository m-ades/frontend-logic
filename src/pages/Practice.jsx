import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, Typography, CardContent, Chip, Stack } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import ActivityAccordion from '../components/ui/ActivityAccordion.jsx'
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
    () => buildCourseStructure(practiceAssignments, 'Practice'),
    [practiceAssignments]
  )
  const isLoadingPractice = isSandbox ? false : practiceQuery.isPending

  const handleActivityClick = (activity) => {
    if (activity.worksheet) {
      navigate(assignmentPath(activity.worksheet.id), {
        state: { returnTo: practicePath }
      })
    }
  }

  return (
    <Box>
      <ActivityAccordion
      title="Practice Problems"
      courseStructure={courseStructure}
      isLoading={isLoadingPractice}
      emptyText="No practice problems available"
      defaultSubchapterExpanded
      renderActivity={(activity, { chapter, subchapter }) => (
        <ThemedCard
          key={activity.id}
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            onClick={() => handleActivityClick(activity)}
          >
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                spacing={2}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ mb: 1, wordBreak: 'break-word' }}>
                    {activity.title}
                  </Typography>
                  {activity.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                      {activity.description}
                    </Typography>
                  )}
                  {activity.estimatedTime && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Estimated time: {activity.estimatedTime}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label="Practice"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                />
              </Stack>
            </CardContent>
          </ThemedCard>
        )}
      />
    </Box>
  )
}
