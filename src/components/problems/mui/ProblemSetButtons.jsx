import { Button, Stack, Typography } from '@mui/material'
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
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack
            direction="row"
            spacing={2}
            justifyContent={align}
            sx={{ flex: 1 }}
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
              disabled={isChecking}
            >
              Start Over
            </Button>
          </Stack>
          <Button
            variant="outlined"
            onClick={navigation?.onNext}
            disabled={isChecking || isNextDisabled}
          >
            Next
          </Button>
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
            disabled={isChecking}
          >
            Start Over
          </Button>
        </Stack>
      )}
      {showAttempts && hasAttempts && (
        <Typography
          variant="caption"
          sx={{ fontSize: '0.75rem', color: 'text.primary', textAlign }}
        >
          Attempts left: {attemptsLeft}/{attemptLimit} | Drafts save automatically.
        </Typography>
      )}
    </Stack>
  )
}
