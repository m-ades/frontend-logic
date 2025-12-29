import { useState, useEffect } from 'react'
import SymbolicTranslation from './mui/SymbolicTranslation.jsx'
import MultipleChoice from './mui/MultipleChoice.jsx'
import TrueFalse from './mui/TrueFalse.jsx'
import EvaluateTruth from './mui/EvaluateTruth.jsx'
import ValidCorrectSound from './mui/ValidCorrectSound.jsx'

export default function LogicPenguinProblem({ 
  proof, 
  onProofComplete, 
  savedState, 
  onStateChange 
}) {
  const [localState, setLocalState] = useState(savedState || {})

  useEffect(() => {
    if (savedState) {
      setLocalState(savedState)
    }
  }, [savedState])

  const handleStateChange = (newState) => {
    setLocalState(newState)
    if (onStateChange) {
      onStateChange(newState)
    }
  }

  const handleComplete = () => {
    if (onProofComplete) {
      onProofComplete(proof.id)
    }
  }

  if (!proof || !proof.type) {
    return <div>Invalid problem</div>
  }

  // format problem data based on type
  let problemData = null
  
  if (proof.type === 'symbolic-translation') {
    problemData = proof.translation || proof.description || ''
    return (
      <SymbolicTranslation
        problem={problemData}
        answer={proof.answer}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
      />
    )
  } else if (proof.type === 'multiple-choice') {
    problemData = proof.multipleChoice || {
      prompt: proof.description || '',
      choices: []
    }
    return (
      <MultipleChoice
        problem={problemData}
        answer={proof.answer}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
      />
    )
  } else if (proof.type === 'true-false') {
    problemData = proof.trueFalse || {
      prompt: proof.description || ''
    }
    return (
      <TrueFalse
        problem={problemData}
        answer={proof.answer}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
      />
    )
  } else if (proof.type === 'evaluate-truth') {
    problemData = proof.evaluateTruth || proof.description || ''
    return (
      <EvaluateTruth
        problem={problemData}
        answer={proof.answer}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
      />
    )
  } else if (proof.type === 'valid-correct-sound') {
    const prems = Array.isArray(proof.premises) ? proof.premises : (proof.premises ? [proof.premises] : [])
    problemData = {
      prems: prems,
      conc: proof.conclusion || ''
    }
    return (
      <ValidCorrectSound
        problem={problemData}
        answer={proof.answer}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
      />
    )
  }

  return <div>Unknown problem type: {proof.type}</div>
}
