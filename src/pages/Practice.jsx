import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, CardContent, Chip, Stack, LinearProgress } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import ActivityAccordion from '../components/ui/ActivityAccordion.jsx'
import { ACTIVITY_TYPES } from '../placeholder/courseActivities.js'
import { API_CONFIG, fetchJson } from '../utils/api.js'
import { compareSubchapterLabels, sortAssignmentsBySubchapter } from '../utils/assignmentSort.js'
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
      type: ACTIVITY_TYPES.PRACTICE,
      worksheet: { id: assignment.id, proofs: [] },
      questionCount: Number(assignment.question_count) || 0,
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
  const [courseStructure, setCourseStructure] = useState([])
  const [isLoadingPractice, setIsLoadingPractice] = useState(true)
  const { activeCourseId } = useCoursesState()
  const courseId = activeCourseId ?? API_CONFIG.courseId
  const courseIdForApi = activeCourseId ?? null

  useEffect(() => {
    let isMounted = true

    const loadPractice = async () => {
      try {
        if (!courseIdForApi) {
          if (isMounted) {
            setCourseStructure([])
            setIsLoadingPractice(false)
          }
          return
        }
        if (isMounted) {
          setIsLoadingPractice(true)
        }
        const assignments = await fetchJson(`/api/courses/${courseIdForApi}/assignments`)
        if (!isMounted) return

        const practiceAssignments = sortAssignmentsBySubchapter(
          assignments.filter((assignment) => assignment.kind === 'practice')
        )
        setCourseStructure(buildCourseStructure(practiceAssignments, 'Practice'))
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to load practice assignments', error)
          setCourseStructure([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingPractice(false)
        }
      }
    }

    loadPractice()

    return () => {
      isMounted = false
    }
  }, [courseIdForApi])

  const handleActivityClick = (activity) => {
    if (activity.worksheet) {
      navigate(`/student/assignment/${activity.worksheet.id}`, {
        state: { returnTo: '/student/practice' }
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
          (() => {
            const totalQuestions = Number(activity.questionCount) || 0
            const completedQuestions = Math.min(Number(activity.answeredCount) || 0, totalQuestions)
            const completionValue = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0
            return (
          <ThemedCard
            key={activity.id}
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            onClick={() => handleActivityClick(activity)}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(0, 1fr) clamp(240px, 28vw, 360px)',
                  },
                  columnGap: { xs: 0, md: 4 },
                  rowGap: 2,
                  alignItems: 'start',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ mb: 1, wordBreak: 'break-word' }}>
                    {activity.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {subchapter.title || chapter.title}
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
                <Stack spacing={0.75} alignItems={{ xs: 'flex-start', md: 'flex-end' }} width="100%">
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap={{ xs: 'wrap', md: 'nowrap' }}
                    justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
                    sx={{ width: '100%' }}
                  >
                    {totalQuestions > 0 && (
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{
                          minWidth: { xs: '100%', md: 'auto' },
                          flex: { xs: '1 1 100%', md: '0 0 auto' },
                          flexShrink: 0,
                        }}
                      >
                        <Box sx={{ width: { xs: '100%', md: 140 } }}>
                          <LinearProgress
                            variant="determinate"
                            value={completionValue}
                            aria-label={`Practice completion: ${completedQuestions} of ${totalQuestions} complete`}
                            sx={{
                              height: 8,
                              borderRadius: 999,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': { borderRadius: 999 },
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {completedQuestions}/{totalQuestions}
                        </Typography>
                      </Stack>
                    )}
                    <Chip
                      label="Practice"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ alignSelf: { xs: 'flex-start', md: 'flex-end' } }}
                    />
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </ThemedCard>
            )
          })()
        )}
      />
    </Box>
  )
}
