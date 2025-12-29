import { Box, Typography, Chip, CardActionArea, CardContent, Stack } from '@mui/material'
import ThemedCard from './ThemedCard.jsx'
import DescriptionIcon from '@mui/icons-material/Description'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AssignmentIcon from '@mui/icons-material/Assignment'
import { HelpOutline as QuizIcon } from '@mui/icons-material'
import SchoolIcon from '@mui/icons-material/School'
import { ACTIVITY_TYPES } from '../../placeholder/courseActivities.js'
import { formatDateTime } from '../../utils/formatting.js'

export default function ActivityCard({ activity, onClick, completedProofs }) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case ACTIVITY_TYPES.READING:
        return <MenuBookIcon sx={{ fontSize: 22, color: 'primary.main' }} />
      case ACTIVITY_TYPES.HOMEWORK:
        return <AssignmentIcon sx={{ fontSize: 22, color: 'warning.main' }} />
      case ACTIVITY_TYPES.QUIZ:
        return <QuizIcon sx={{ fontSize: 22, color: 'info.main' }} />
      case ACTIVITY_TYPES.EXAM:
        return <SchoolIcon sx={{ fontSize: 22, color: 'error.main' }} />
      default:
        return <DescriptionIcon sx={{ fontSize: 22, color: 'primary.main' }} />
    }
  }

  const getActivityLabel = () => {
    switch (activity.type) {
      case ACTIVITY_TYPES.PRACTICE:
        return 'PRACTICE'
      case ACTIVITY_TYPES.HOMEWORK:
        return 'HOMEWORK'
      case ACTIVITY_TYPES.QUIZ:
        return 'QUIZ'
      case ACTIVITY_TYPES.EXAM:
        return 'EXAM'
      case ACTIVITY_TYPES.READING:
        return 'READING'
      default:
        return ''
    }
  }

  const getLabelColor = () => {
    switch (activity.type) {
      case ACTIVITY_TYPES.PRACTICE:
        return { palette: 'primary' }
      case ACTIVITY_TYPES.HOMEWORK:
        return { palette: 'warning' }
      case ACTIVITY_TYPES.QUIZ:
        return { palette: 'info' }
      case ACTIVITY_TYPES.EXAM:
        return { palette: 'error' }
      default:
        return { palette: 'primary' }
    }
  }

  const isCompleted = activity.worksheet && activity.worksheet.proofs && activity.worksheet.proofs.length > 0 && activity.worksheet.proofs.every(
    p => completedProofs.has(p.id)
  )

  const getCompletionStats = () => {
    if (!activity.worksheet || !activity.worksheet.proofs) return null
    const total = activity.worksheet.proofs.length
    if (total === 0) return null
    const completed = activity.worksheet.proofs.filter(p => completedProofs.has(p.id)).length
    const percentage = Math.round((completed / total) * 100)
    return { completed, total, percentage }
  }

  const stats = getCompletionStats()
  const isReleased = activity.released !== false
  const hasWorksheet = activity.worksheet !== null && activity.worksheet !== undefined
  const labelColors = getLabelColor()

  return (
    <ThemedCard      elevation={0}
      onClick={isReleased && hasWorksheet ? onClick : undefined}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        cursor: isReleased && hasWorksheet ? 'pointer' : 'default',
        opacity: isReleased ? 1 : 0.6,
        backgroundColor: 'background.paper',
        transition: 'all 0.2s ease-in-out',
        '&:hover': isReleased && hasWorksheet ? {
          borderColor: 'primary.main',
          boxShadow: 2,
          transform: 'translateY(-2px)'
        } : {},
        position: 'relative',
        overflow: 'visible'
      }}
    >
      <CardActionArea
        disabled={!isReleased || !hasWorksheet}
        sx={{
          '&.Mui-disabled': {
            cursor: 'default'
          }
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  backgroundColor: (theme) => `${theme.palette[labelColors.palette].main}20`,
                  flexShrink: 0
                }}
              >
                {getActivityIcon()}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      flex: 1
                    }}
                  >
                    {activity.title}
                  </Typography>
                  {activity.type !== ACTIVITY_TYPES.READING && (
                    <Chip
                      label={getActivityLabel()}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: `${labelColors.palette}.light`,
                        color: `${labelColors.palette}.main`,
                        border: 'none'
                      }}
                    />
                  )}
                  {isCompleted && (
                    <CheckCircleIcon
                      sx={{
                        color: 'secondary.main',
                        fontSize: 20
                      }}
                    />
                  )}
                </Box>

                {activity.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      mb: 1
                    }}
                  >
                    {activity.description}
                  </Typography>
                )}

                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    mt: 0.5
                  }}
                >
                  {stats && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 500
                      }}
                    >
                      {stats.percentage}% submitted
                    </Typography>
                  )}
                  {activity.points && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 500
                      }}
                    >
                      {activity.points} points
                    </Typography>
                  )}
                  {activity.dueDate && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: activity.dueDate < new Date() ? 'error.main' : 'text.secondary',
                        fontWeight: 500
                      }}
                    >
                      {`Due ${formatDateTime(activity.dueDate)}`}
                    </Typography>
                  )}
                  {activity.countsTowardsGrade && (
                    <Chip
                      label="COUNTS TOWARDS GRADE"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        backgroundColor: 'primary.light',
                        color: 'primary.main',
                        border: 'none'
                      }}
                    />
                  )}
                  {activity.problemCount && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 500
                      }}
                    >
                      {activity.problemCount} Problems
                    </Typography>
                  )}
                  {activity.estimatedTime && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 500
                        }}
                      >
                        {activity.estimatedTime}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </ThemedCard>
  )
}
