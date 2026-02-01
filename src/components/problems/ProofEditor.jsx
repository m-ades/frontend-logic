import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Box, IconButton, Stack, useMediaQuery, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DerivationTable from './mui/DerivationTable.jsx'

export default function ProofEditor({
  proof,
  onProofComplete,
  savedState,
  onStateChange,
  isAssignmentLocked = true,
  // optional: when provided (e.g. from ProofTabs), fullscreen state is controlled so Next keeps fullscreen
  fullScreenOpen: fullScreenOpenProp,
  fullScreenFocusTarget: fullScreenFocusTargetProp,
  onOpenFullScreen: onOpenFullScreenProp,
  onCloseFullScreen: onCloseFullScreenProp,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md')) // mobile breakpoint
  const [internalOpen, setInternalOpen] = useState(false)
  const [internalFocus, setInternalFocus] = useState(null)
  const isControlled = typeof onOpenFullScreenProp === 'function'
  const fullScreenOpen = isControlled ? (fullScreenOpenProp ?? false) : internalOpen
  const fullScreenFocusTarget = isControlled ? (fullScreenFocusTargetProp ?? null) : internalFocus
  const openFullScreen = useCallback(
    (focusTarget) => {
      if (isControlled) onOpenFullScreenProp(focusTarget ?? null)
      else {
        setInternalFocus(focusTarget ?? null)
        setInternalOpen(true)
      }
    },
    [isControlled, onOpenFullScreenProp]
  )
  const closeFullScreen = useCallback(
    () => {
      if (isControlled) onCloseFullScreenProp?.()
      else {
        setInternalOpen(false)
        setInternalFocus(null)
      }
    },
    [isControlled, onCloseFullScreenProp]
  )
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

  // portal to body so overlay escapes main padding. no right margin.
  const fullScreenOverlay = fullScreenOpen && typeof document !== 'undefined' && createPortal(
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
        zIndex: 1300,
        bgcolor: 'background.paper',
        overflowX: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* close bar flush right */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1, pb: 1, pl: 1, pr: 0, flexShrink: 0 }}>
        <IconButton
          onClick={closeFullScreen}
          aria-label="Close full screen"
          size="large"
          sx={{ color: 'text.primary' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
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
        isFullScreen={true}
        initialFocusLineIndex={fullScreenFocusTarget?.lineIndex}
        initialFocusField={fullScreenFocusTarget?.field}
        onOpenFullScreen={openFullScreen}
        onCloseFullScreen={closeFullScreen}
      />
    </Box>,
    document.body
  )

  return (
    <>
      {fullScreenOverlay}
      <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
        {/* table only here when not fullscreen. one instance. */}
        {!fullScreenOpen && (
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
            isFullScreen={false}
            onOpenFullScreen={openFullScreen}
            onCloseFullScreen={closeFullScreen}
          />
        )}

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
    </>
  )
}
