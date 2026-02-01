import { useEffect, useState, useCallback } from 'react'
import { Alert, Box, IconButton, Stack, useMediaQuery, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DerivationTable from './mui/DerivationTable.jsx'

export default function ProofEditor({ proof, onProofComplete, savedState, onStateChange, isAssignmentLocked = true }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [fullScreenOpen, setFullScreenOpen] = useState(false)
  const [attemptCount, setAttemptCount] = useState(proof?.attemptCount ?? 0)
  const [attemptLimit, setAttemptLimit] = useState(proof?.attemptLimit ?? 10)
  const [isChecking, setIsChecking] = useState(false)
  const [statusBanner, setStatusBanner] = useState({ status: 'unanswered', message: '' })

  useEffect(() => {
    if (typeof proof?.attemptCount === 'number') {
      setAttemptCount(proof.attemptCount)
    }
    if (typeof proof?.attemptLimit === 'number') {
      setAttemptLimit(proof.attemptLimit)
    }
  }, [proof?.attemptCount, proof?.attemptLimit])

  const handleAttempt = useCallback((detail) => {
    // end check
    setIsChecking(false)
    setAttemptCount((prev) => {
      if (typeof detail?.attempt === 'number') {
        return detail.attempt
      }
      return prev + 1
    })
    if (typeof detail?.attemptLimit === 'number') {
      setAttemptLimit(detail.attemptLimit)
    }
  }, [])

  if (!proof) return null

  const bannerSeverity = (status) => {
    switch (status) {
      case 'correct': return 'success'
      case 'incorrect': return 'error'
      case 'malfunction': return 'warning'
      case 'checking': return 'info'
      default: return 'info'
    }
  }

  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box
        sx={{
          ...(fullScreenOpen && {
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            bgcolor: 'background.paper',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }),
        }}
      >
        {fullScreenOpen && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1, flexShrink: 0 }}>
            <IconButton
              onClick={() => setFullScreenOpen(false)}
              aria-label="Close full screen"
              size="large"
              sx={{ color: 'text.primary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        )}
        <DerivationTable
          proof={proof}
          savedState={savedState}
          onStateChange={onStateChange}
          onAttempt={handleAttempt}
          onProofComplete={onProofComplete}
          attemptCount={attemptCount}
          attemptLimit={attemptLimit}
          isChecking={isChecking}
          setAttemptCount={setAttemptCount}
          setAttemptLimit={setAttemptLimit}
          setStatusBanner={setStatusBanner}
          setIsChecking={setIsChecking}
          isAssignmentLocked={isAssignmentLocked}
          isMobile={isMobile}
          isFullScreen={fullScreenOpen}
          onOpenFullScreen={() => setFullScreenOpen(true)}
          onCloseFullScreen={() => setFullScreenOpen(false)}
        />
      </Box>

      {(statusBanner.status === 'correct' || statusBanner.status === 'incorrect' || statusBanner.status === 'malfunction') && (
        <Alert
          severity={bannerSeverity(statusBanner.status)}
          variant="filled"
          onClose={() => setStatusBanner({ status: 'unanswered', message: '' })}
          sx={{ mt: -1 }}
        >
          {statusBanner.message || (statusBanner.status === 'correct' ? 'Correct!' : 'Incorrect.')}
        </Alert>
      )}
    </Stack>
  )
}
