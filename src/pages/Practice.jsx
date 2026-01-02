import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, CardContent, Chip, Stack } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import ActivityAccordion from '../components/ui/ActivityAccordion.jsx'
import { ACTIVITY_TYPES } from '../placeholder/courseActivities.js'
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
      type: ACTIVITY_TYPES.PRACTICE,
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

export default function Practice() {
  const navigate = useNavigate()
  const [courseStructure, setCourseStructure] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadPractice = async () => {
      try {
        const assignments = await fetchJson(`/api/courses/${API_CONFIG.courseId}/assignments`)
        if (!isMounted) return

        const practiceAssignments = assignments.filter((assignment) => assignment.kind === 'practice')
        setCourseStructure(buildCourseStructure(practiceAssignments, 'Practice'))
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to load practice assignments', error)
          setCourseStructure([])
        }
      }
    }

    loadPractice()

    return () => {
      isMounted = false
    }
  }, [])

  const handleActivityClick = (activity) => {
    if (activity.worksheet) {
      navigate(`/assignment/${activity.worksheet.id}`)
    }
  }

  return (
    <Box>
      <ActivityAccordion
        title="Practice Problems"
        courseStructure={courseStructure}
        emptyText="No practice problems available"
        renderActivity={(activity, { chapter, subchapter }) => (
          <ThemedCard            key={activity.id}
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            onClick={() => handleActivityClick(activity)}
          >
            <CardContent>
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
                  {activity.estimatedTime && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Estimated time: {activity.estimatedTime}
                    </Typography>
                  )}
                </Box>
                <Chip label="Practice" size="small" color="primary" variant="outlined" />
              </Stack>
            </CardContent>
          </ThemedCard>
        )}
      />
    </Box>
  )
}
