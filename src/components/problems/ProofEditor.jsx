import { useEffect, useRef, useState, useCallback } from 'react'
import LogicPenguinProof from './LogicPenguinProof.jsx'
import SolutionReveal from './SolutionReveal.jsx'

export default function ProofEditor({ proof, onProofComplete, savedState, onStateChange }) {
  const completionRef = useRef(false)
  const proofRef = useRef(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [attemptLimit, setAttemptLimit] = useState(proof?.attemptLimit ?? 3)

  const handleAttempt = useCallback((detail) => {
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

  useEffect(() => {
    if (!proof || !onProofComplete) return
    
    const getDerivElement = () => proofRef.current?.querySelector('derivation-hurley') || null
    
    const checkCompletion = () => {
      const derivElement = getDerivElement()
      if (!derivElement) return
      
      const hasCorrectClass = derivElement.classList.contains('correct')
      
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
  }, [proof, onProofComplete])

  if (!proof) return null

  return (
    <div ref={proofRef}>
      <LogicPenguinProof 
        premises={proof.premises} 
        conclusion={proof.conclusion}
        questionId={proof.questionId}
        savedState={savedState}
        onStateChange={onStateChange}
        onAttempt={handleAttempt}
      />
      <SolutionReveal
        type={proof.type}
        solution={proof.solution}
        show={attemptCount >= attemptLimit}
      />
    </div>
  )
}
