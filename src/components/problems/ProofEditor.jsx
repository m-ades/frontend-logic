import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Box, IconButton, Stack, useMediaQuery, useTheme } from '@mui/material'
import StatusBanner from '../ui/StatusBanner.jsx'
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
  totalQuestions,
  isCurrentCorrect,
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md')) // compact layout: phone + tablet
  const isPhone = useMediaQuery(theme.breakpoints.down('sm')) // fullscreen only on phones
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

  // fullscreen overlay: mobile only (non-mobile has no fullscreen option)
  const fullScreenOverlay = isMobile && fullScreenOpen && typeof document !== 'undefined' && createPortal(
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
      {/* close bar: left padding only (table below stays edge-to-edge) */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1, pb: 1, pl: 2, pr: 0, flexShrink: 0 }}>
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
        isPhone={isPhone}
        isFullScreen={true}
        initialFocusLineIndex={fullScreenFocusTarget?.lineIndex}
        initialFocusField={fullScreenFocusTarget?.field}
        onOpenFullScreen={openFullScreen}
        onCloseFullScreen={closeFullScreen}
        totalQuestions={totalQuestions}
        isCurrentCorrect={isCurrentCorrect}
      />
    </Box>,
    document.body
  )

  return (
    <>
      {fullScreenOverlay}
      <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
        {/* table: show when not fullscreen, or when desktop (fullscreen is mobile-only) */}
        {(!fullScreenOpen || !isPhone) && (
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
        isPhone={isPhone}
            isFullScreen={false}
            onOpenFullScreen={openFullScreen}
            onCloseFullScreen={closeFullScreen}
            totalQuestions={totalQuestions}
            isCurrentCorrect={isCurrentCorrect}
          />
        )}

      {(statusBanner.status === 'correct' || statusBanner.status === 'incorrect' || statusBanner.status === 'malfunction') && (
        <StatusBanner
          status={statusBanner.status}
          message={statusBanner.message}
          onClose={() => setStatusBanner({ status: 'unanswered', message: '' })}
          sx={{ mt: -1 }}
        />
      )}
      </Stack>
    </>
  )
}
