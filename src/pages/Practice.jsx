import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, CardContent, Chip, Stack } from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import ActivityAccordion from '../components/ui/ActivityAccordion.jsx'
import { getCourseStructureByTypes, ACTIVITY_TYPES } from '../placeholder/courseActivities.js'

export default function Practice() {
  const navigate = useNavigate()

  const practiceStructure = useMemo(
    () => getCourseStructureByTypes([ACTIVITY_TYPES.PRACTICE]),
    []
  )

  const handleActivityClick = (activity) => {
    if (activity.worksheet) {
      navigate(`/assignment/${activity.worksheet.id}`)
    }
  }

  return (
    <Box>
      <ActivityAccordion
        title="Practice Problems"
        courseStructure={practiceStructure}
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
