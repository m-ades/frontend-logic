import { Button, IconButton, Stack, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LockIcon from '@mui/icons-material/Lock'
import { useProblemNavigation } from '../ProblemNavigationContext.jsx'

// shared button component is 'submit answer' and 'start over' for now
export default function ProblemSetButtons({ 
  onCheck, 
  onStartOver, 
  isChecking = false, 
  isDisabled = false,
  isAssignmentLocked = false,
  align = 'center',
  attemptCount,
  attemptLimit,
  showAttempts = true,
  sx = {},
  scoreLabel,
  isInstructorView = false,
}) {
  const navigation = useProblemNavigation()
  const showNext = Boolean(navigation?.onNext)
  const isNextDisabled = Boolean(navigation?.isNextDisabled)
  const hasAttempts = Number.isFinite(attemptCount) && Number.isFinite(attemptLimit)
  const attemptsLeft = hasAttempts ? Math.max(0, attemptLimit - attemptCount) : null
  const textAlign = align === 'center' ? 'center' : align === 'flex-end' ? 'right' : 'left'
  return (
    <Stack spacing={0.75} sx={{ mt: 3, ...sx }}>
      {showNext ? (
        <Stack
          direction="row"
          spacing={2}
          justifyContent={align}
          alignItems="center"
        >
          <Button
            variant="contained"
            onClick={onCheck}
            disabled={isChecking || isDisabled}
            sx={{ minWidth: 120 }}
          >
            {isChecking ? 'Submitting...' : 'Submit Answer'}
          </Button>
          <Button
            variant="outlined"
            onClick={onStartOver}
            disabled={isChecking || (hasAttempts && attemptsLeft === 0)}
          >
            Clear Answer
          </Button>
          {scoreLabel?.text != null && (
            <Typography
              component="span"
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: scoreLabel.color ?? 'success.main',
              }}
            >
              {scoreLabel.text}
            </Typography>
          )}
          <IconButton
            onClick={navigation?.onNext}
            disabled={isChecking || isNextDisabled}
            size="small"
            sx={{ color: 'primary.main' }}
            aria-label="Next problem"
          >
            <ArrowForwardIcon />
          </IconButton>
        </Stack>
      ) : (
        <Stack 
          direction="row" 
          spacing={2} 
          justifyContent={align}
        >
          <Button
            variant="contained"
            onClick={onCheck}
            disabled={isChecking || isDisabled}
            sx={{ minWidth: 120 }}
          >
            {isChecking ? 'Submitting...' : 'Submit Answer'}
          </Button>
          <Button
            variant="outlined"
            onClick={onStartOver}
            disabled={isChecking || (hasAttempts && attemptsLeft === 0)}
          >
            Clear Answer
          </Button>
        </Stack>
      )}
      {showAttempts && hasAttempts && (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          <Typography
            variant="caption"
            sx={{ fontSize: '0.75rem', color: 'text.primary', textAlign }}
          >
            Attempts left: {attemptsLeft}/{attemptLimit} | Assignment grade updates with each submitted answer.
          </Typography>
        </Stack>
      )}
    </Stack>
  )
}
