import { Button, IconButton, Stack, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useProblemNavigation } from '../ProblemNavigationContext.jsx'

// shared button component is 'submit answer' and 'start over' for now
export default function ProblemSetButtons({ 
  onCheck, 
  onStartOver, 
  isChecking = false, 
  isDisabled = false,
  align = 'center',
  attemptCount,
  attemptLimit,
  showAttempts = true,
  sx = {} 
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
        <Typography
          variant="caption"
          sx={{ fontSize: '0.75rem', color: 'text.primary', textAlign }}
        >
          Attempts left: {attemptsLeft}/{attemptLimit} | Assignment grade updates with each submitted answer.
        </Typography>
      )}
    </Stack>
  )
}
