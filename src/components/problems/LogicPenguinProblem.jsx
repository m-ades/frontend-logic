import { useState, useEffect } from 'react'
import SymbolicTranslation from './mui/SymbolicTranslation.jsx'
import MultipleChoice from './mui/MultipleChoice.jsx'
import TrueFalse from './mui/TrueFalse.jsx'
import EvaluateTruth from './mui/EvaluateTruth.jsx'
// import ValidCorrectSound from './mui/ValidCorrectSound.jsx'
import SingleRowTruthTable from './mui/SingleRowTruthTable.jsx'
import ComboTranslationTruthTable from './mui/ComboTranslationTruthTable.jsx'
import ComboTranslationDerivation from './mui/ComboTranslationDerivation.jsx'
import IndirectTruthTable from './mui/IndirectTruthTable.jsx'
import PartialTruthTable from './mui/PartialTruthTable.jsx'
import NonClassicalTruthTable from './mui/NonClassicalTruthTable.jsx'

export default function LogicPenguinProblem({ 
  proof, 
  onProofComplete, 
  savedState, 
  onStateChange,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
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
    if (typeof problemData === 'string') {
      problemData = { prompt: problemData, legend: proof.legend || '' }
    } else {
      problemData = {
        ...problemData,
        legend: proof.legend ?? problemData.legend ?? '',
        prompt: problemData.prompt || proof.description || '',
        question_snapshot: proof.snapshot || {},
      }
    }
    return (
      <SymbolicTranslation
        problem={problemData}
        proof={proof}
        answer={proof.answer}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
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
        proof={proof}
        answer={proof.answer}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
      />
    )
  } else if (proof.type === 'true-false') {
    problemData = proof.trueFalse || {
      prompt: proof.description || ''
    }
    return (
      <TrueFalse
        problem={problemData}
        proof={proof}
        answer={proof.answer}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
      />
    )
  } else if (proof.type === 'evaluate-truth') {
    problemData = proof.evaluateTruth || proof.description || ''
    return (
      <EvaluateTruth
        problem={problemData}
        proof={proof}
        answer={proof.answer}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
      />
    )
  /* } else if (proof.type === 'valid-correct-sound') {
    const prems = Array.isArray(proof.premises) ? proof.premises : (proof.premises ? [proof.premises] : [])
    problemData = {
      prems: prems,
      conc: proof.conclusion || ''
    }
    return (
      <ValidCorrectSound
        problem={problemData}
        answer={proof.answer}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
      />
    )
  } else if (proof.type === 'single-row-truth-table') { */
  } else if (proof.type === 'single-row-truth-table') {
    problemData = proof.singleRowTruthTable || {
      statement: proof.description || '',
      interpretation: {},
      prompt: proof.description || '',
    }
    return (
      <SingleRowTruthTable
        problem={problemData}
        proof={proof}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
      />
    )
  } else if (proof.type === 'combo-translation-truth-table') {
    return (
      <ComboTranslationTruthTable
        proof={proof}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
      />
    )
  } else if (proof.type === 'combo-translation-derivation') {
    return (
      <ComboTranslationDerivation
        proof={proof}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
      />
    )
  } else if (proof.type === 'indirect-truth-table') {
    const problemData = proof.indirectTruthTable || {
      prompt: proof.description || '',
      choices: proof.choices || [],
    }
    const questions = Array.isArray(problemData?.questions) && problemData.questions.length > 0
      ? problemData.questions
      : (Array.isArray(problemData?.choices) && problemData.choices.length > 0
        ? [{
            prompt: problemData?.choicePrompt || '',
            choices: problemData.choices,
            answerIndex: proof.answerIndex ?? proof.answer ?? (Array.isArray(proof.answerIndices) ? proof.answerIndices[0] : undefined),
          }]
        : [])
    const derivedAnswer = questions.length
      ? questions.map((q) => q.answerIndex ?? q.answer ?? q.correctIndex)
      : proof.answer
    const normalizedProblem = { ...problemData, questions, subquestions: questions }
    return (
      <IndirectTruthTable
        problem={normalizedProblem}
        proof={proof}
        answer={derivedAnswer}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
      />
    )
  } else if (proof.type === 'nonclassical-truth-table') {
    const problemData = proof.nonclassicalTruthTable || {
      prompt: proof.description || '',
      choices: proof.choices || [],
    }
    const questions = Array.isArray(problemData?.questions) && problemData.questions.length > 0
      ? problemData.questions
      : (Array.isArray(problemData?.choices) && problemData.choices.length > 0
        ? [{
            prompt: problemData?.choicePrompt || '',
            choices: problemData.choices,
            answerIndex: proof.answerIndex ?? proof.answer ?? (Array.isArray(proof.answerIndices) ? proof.answerIndices[0] : undefined),
          }]
        : [])
    const derivedAnswer = questions.length
      ? questions.map((q) => q.answerIndex ?? q.answer ?? q.correctIndex)
      : proof.answer
    const normalizedProblem = { ...problemData, questions, subquestions: questions }
    return (
      <NonClassicalTruthTable
        problem={normalizedProblem}
        proof={proof}
        answer={derivedAnswer}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
      />
    )
  } else if (proof.type === 'partial-truth-table') {
    const problemData = proof.partialTruthTable || proof.description || {}
    return (
      <PartialTruthTable
        problem={problemData}
        proof={proof}
        attemptLimit={proof.attemptLimit}
        assignmentQuestionId={proof.questionId}
        onStateChange={handleStateChange}
        onComplete={handleComplete}
        savedState={localState}
        isAssignmentLocked={isAssignmentLocked}
        isInstructorView={isInstructorView}
        onQuestionSaved={onQuestionSaved}
      />
    )
  }

  return <div>Unknown problem type: {proof.type}</div>
}
