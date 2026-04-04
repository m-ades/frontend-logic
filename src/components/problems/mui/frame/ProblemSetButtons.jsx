import { Button, IconButton, Stack, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LockIcon from '@mui/icons-material/Lock'
import { useProblemNavigation } from '../../ProblemNavigationContext.jsx'

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
  const showPrev = Boolean(navigation?.onPrev)
  const showNext = Boolean(navigation?.onNext)
  const isPrevDisabled = Boolean(navigation?.isPrevDisabled)
  const isNextDisabled = Boolean(navigation?.isNextDisabled)
  const hasAttempts = Number.isFinite(attemptCount) && Number.isFinite(attemptLimit)
  const attemptsLeft = hasAttempts ? Math.max(0, attemptLimit - attemptCount) : null
  const textAlign = align === 'center' ? 'center' : align === 'flex-end' ? 'right' : 'left'
  const actionButtonBaseSx = {
    minWidth: { xs: 0, sm: 120 },
    minHeight: { xs: 28, sm: 32 },
    px: { xs: 0.25, sm: 0.75 },
    py: { xs: 0.125, sm: 0.375 },
    borderRadius: 1,
    fontSize: { xs: '0.875rem', sm: '0.875rem' },
    lineHeight: 1.25,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flex: { xs: '1 1 0', sm: '0 0 auto' },
  }
  const submitButtonSx = {
    ...actionButtonBaseSx,
    boxShadow: 2,
  }
  const clearButtonSx = {
    ...actionButtonBaseSx,
  }
  return (
    <Stack spacing={0.75} sx={{ mt: 3, ...sx }}>
      {showNext ? (
        <Stack
          direction="row"
          spacing={{ xs: 1.25, sm: 2 }}
          justifyContent={align}
          alignItems="center"
          sx={{ width: '100%', flexWrap: 'nowrap', minWidth: 0 }}
        >
          {showPrev && (
            <IconButton
              onClick={navigation?.onPrev}
              disabled={isChecking || isPrevDisabled}
              size="small"
              sx={{ color: 'primary.main', flex: '0 0 auto', p: { xs: 0.5, sm: 1 } }}
              aria-label="Previous problem"
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Button
            variant="contained"
            onClick={onCheck}
            disabled={isChecking || isDisabled}
            sx={submitButtonSx}
          >
            {isChecking ? 'Submitting...' : 'Submit Answer'}
          </Button>
          <Button
            variant="outlined"
            onClick={onStartOver}
            disabled={isChecking || (hasAttempts && attemptsLeft === 0)}
            sx={clearButtonSx}
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
            sx={{ color: 'primary.main', flex: '0 0 auto', p: { xs: 0.5, sm: 1 } }}
            aria-label="Next problem"
          >
            <ArrowForwardIcon />
          </IconButton>
        </Stack>
      ) : (
        <Stack 
          direction="row" 
          spacing={{ xs: 1.25, sm: 2 }} 
          justifyContent={align}
          alignItems="center"
          sx={{ width: '100%', flexWrap: 'nowrap', minWidth: 0 }}
        >
          {showPrev && (
            <IconButton
              onClick={navigation?.onPrev}
              disabled={isChecking || isPrevDisabled}
              size="small"
              sx={{ color: 'primary.main', flex: '0 0 auto', p: { xs: 0.5, sm: 1 } }}
              aria-label="Previous problem"
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Button
            variant="contained"
            onClick={onCheck}
            disabled={isChecking || isDisabled}
            sx={submitButtonSx}
          >
            {isChecking ? 'Submitting...' : 'Submit Answer'}
          </Button>
          <Button
            variant="outlined"
            onClick={onStartOver}
            disabled={isChecking || (hasAttempts && attemptsLeft === 0)}
            sx={clearButtonSx}
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
