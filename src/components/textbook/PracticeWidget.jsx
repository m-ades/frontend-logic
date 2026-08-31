import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { Psychology as PracticeIcon } from '@mui/icons-material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'

/**
 * Linked practice CTA embedded in the textbook reader.
 * Only rendered when a resolved textbook↔practice link exists.
 */
export default function PracticeWidget({
  practiceId,
  practiceTitle,
  sectionId = null,
  textbookSlug = null,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { assignmentPath, isInstructor, practicePath, textbookPath, textbookChapterPath } =
    useAppRuntime()

  if (practiceId == null) return null

  const title = practiceTitle || `Practice ${practiceId}`

  const openPractice = () => {
    const path = assignmentPath?.(practiceId) || `/student/assignment/${practiceId}`
    const returnTo = isInstructor
      ? `${location.pathname}${location.search}${location.hash}`
      : (textbookSlug && textbookChapterPath?.(textbookSlug)) ||
        textbookPath ||
        practicePath ||
        '/student/textbook'
    navigate(path, {
      state: {
        returnTo,
        textbookSlug: textbookSlug || undefined,
        textbookSectionId: sectionId || undefined,
      },
    })
  }

  return (
    <Box
      component="aside"
      role="region"
      aria-label={`Linked practice: ${title}`}
      sx={{
        my: '1.5em',
        p: '1.25em',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: '0.75em', flexWrap: 'wrap' }}>
        <PracticeIcon color="primary" fontSize="small" aria-hidden />
        <Typography
          component="h3"
          sx={{ fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3, m: 0 }}
        >
          Related practice
        </Typography>
        {textbookSlug && <Chip size="small" label={textbookSlug} variant="outlined" />}
        {sectionId && <Chip size="small" label={`§ ${sectionId}`} variant="outlined" />}
      </Stack>
      <Typography sx={{ fontSize: '1rem', lineHeight: 1.6, mb: '1em', color: 'text.secondary' }}>
        {title}
      </Typography>
      <Button variant="contained" size="small" onClick={openPractice}>
        Open practice
      </Button>
    </Box>
  )
}
