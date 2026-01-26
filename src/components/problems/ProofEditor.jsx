import { useEffect, useRef, useState, useCallback } from 'react'
import { Box, Stack } from '@mui/material'
import LogicPenguinProof from './LogicPenguinProof.jsx'
import ProblemSetButtons from './mui/ProblemSetButtons.jsx'
import SolutionReveal from './SolutionReveal.jsx'
import RichText from '../ui/RichText.jsx'

export default function ProofEditor({ proof, onProofComplete, savedState, onStateChange }) {
  const completionRef = useRef(false)
  const proofRef = useRef(null)
  const [attemptCount, setAttemptCount] = useState(proof?.attemptCount ?? 0)
  const [attemptLimit, setAttemptLimit] = useState(proof?.attemptLimit ?? 10)
  const [isChecking, setIsChecking] = useState(false)
  const hasAttempts = Number.isFinite(attemptCount) && Number.isFinite(attemptLimit)
  const isLocked = hasAttempts && attemptCount >= attemptLimit

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

  const getDerivElement = useCallback(
    () => proofRef.current?.querySelector('derivation-hurley') || null,
    []
  )

  useEffect(() => {
    if (!proof || !onProofComplete) return
    
    const checkCompletion = () => {
      const derivElement = getDerivElement()
      if (!derivElement) return
      
      const hasCorrectClass = derivElement.classList.contains('correct')
      const isNowChecking = derivElement.classList.contains('checking')
      setIsChecking((prev) => (prev === isNowChecking ? prev : isNowChecking))
      
      if (hasCorrectClass && !completionRef.current) {
        completionRef.current = true
        onProofComplete(proof.id)
      } else if (!hasCorrectClass && completionRef.current) {
        completionRef.current = false
      }
    }

    const immediateCheck = setTimeout(checkCompletion, 100)
    const interval = setInterval(checkCompletion, 500)
    
    const setupObserver = () => {
      const derivElement = getDerivElement()
      if (derivElement) {
        const observer = new MutationObserver(checkCompletion)
        observer.observe(derivElement, {
          attributes: true,
          attributeFilter: ['class'],
          subtree: true
        })
        return observer
      }
      return null
    }
    
    let observer = setupObserver()
    const observerTimeout = setTimeout(() => {
      if (!observer) observer = setupObserver()
      checkCompletion()
    }, 200)
    
    return () => {
      clearTimeout(immediateCheck)
      clearInterval(interval)
      clearTimeout(observerTimeout)
      observer?.disconnect()
    }
  }, [getDerivElement, onProofComplete, proof])

  useEffect(() => {
    const derivElement = getDerivElement()
    if (!derivElement) return
    // hide old buttons
    const hideButtons = () => {
      const buttonDiv = derivElement.querySelector('.buttondiv')
      if (buttonDiv) {
        buttonDiv.style.display = 'none'
      }
    }
    hideButtons()
    derivElement.addEventListener('LP-ready', hideButtons)
    return () => {
      derivElement.removeEventListener('LP-ready', hideButtons)
    }
  }, [getDerivElement])

  const handleCheck = () => {
    if (isLocked) return
    const derivElement = getDerivElement()
    if (!derivElement?.processAnswer) return
    // run check
    setIsChecking(true)
    derivElement.processAnswer()
  }

  const handleStartOver = () => {
    const derivElement = getDerivElement()
    if (!derivElement?.startOver) return
    // clear state
    derivElement.startOver()
    setIsChecking(false)
    if (derivElement?.getState && onStateChange) {
      setTimeout(() => {
        const nextState = derivElement.getState()
        if (nextState) {
          onStateChange(nextState)
        }
      }, 0)
    }
  }

  if (!proof) return null

  return (
    <Stack spacing={3} sx={{ px: 0, width: '100%', alignItems: 'stretch', flexGrow: 1 }}>
      <Box className="logicpenguin" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            overflow: 'visible',
            minHeight: '200px',
            flexGrow: 1,
            alignSelf: { xs: 'stretch', md: 'flex-start' },
          }}
          className="lp-problem-card"
        >
          <Stack spacing={3} sx={{ p: { xs: 2, md: 2 } }}>
            {proof.description && (
              <RichText content={proof.description} variant="body1" sx={{ fontSize: '1rem' }} />
            )}
            <div ref={proofRef}>
              <LogicPenguinProof 
                premises={proof.premises} 
                conclusion={proof.conclusion}
                questionId={proof.questionId}
                savedState={savedState}
                onStateChange={onStateChange}
                onAttempt={handleAttempt}
                attemptCount={attemptCount}
                attemptLimit={attemptLimit}
              />
            </div>
            {/* show answer in card */}
            <SolutionReveal
              solution={proof.solution}
              show={hasAttempts && attemptCount >= attemptLimit}
            />
          </Stack>
        </Box>
      </Box>

      <ProblemSetButtons
        onCheck={handleCheck}
        onStartOver={handleStartOver}
        isChecking={isChecking}
        isDisabled={isLocked}
        align="flex-start"
        attemptCount={attemptCount}
        attemptLimit={attemptLimit}
      />
    </Stack>
  )
}
