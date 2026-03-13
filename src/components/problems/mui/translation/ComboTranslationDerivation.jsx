import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Typography } from '@mui/material'
import InstructorQuestionEditor from '../../InstructorQuestionEditor.jsx'
import ProblemSetButtons from '../frame/ProblemSetButtons.jsx'
import ProblemFrame, { sectionLabelSx } from '../frame/ProblemFrame.jsx'
import FormulaField from '../inputs/FormulaField.jsx'
import SymbolToolbar from '../inputs/SymbolToolbar.jsx'
import DerivationTable from '../../derivation/DerivationTable.jsx'
import getFormulaClass from '../../../../lib/logicpenguin/symbolic/formula.js'
import { useProblemChecker } from '../../../../hooks/useProblemChecker.js'

const parseArgumentLine = (line) => {
  if (!line || typeof line !== 'string') {
    return { error: 'Enter the argument as a single line.' }
  }
  const parts = line.split('//')
  if (parts.length !== 2) {
    return { error: 'Use "//" to separate premises from the conclusion.' }
  }
  const premisesPart = parts[0].trim()
  const conclusion = parts[1].trim()
  if (!premisesPart) {
    return { error: 'Enter at least one premise before "//".' }
  }
  if (!conclusion) {
    return { error: 'Enter a conclusion after "//".' }
  }
  const premises = premisesPart
    .split('/')
    .map((premise) => premise.trim())
    .filter(Boolean)
  if (premises.length === 0) {
    return { error: 'Enter at least one premise before "//".' }
  }
  return { premises, conclusion }
}

const normalizeProof = (proofLike) => {
  if (!proofLike) return null
  if (proofLike.ans) return proofLike.ans
  return proofLike
}

export default function ComboTranslationDerivation({
  proof,
  onStateChange,
  onComplete,
  savedState,
  assignmentQuestionId,
  attemptLimit,
  isAssignmentLocked = false,
  isInstructorView = false,
  onQuestionSaved,
  problemLabel,
}) {
  const editorRef = useRef(null)
  const openEdit = () => editorRef.current?.open?.()
  const Formula = useMemo(() => getFormulaClass(), [])
  const snapshot = proof?.comboTranslationDerivation || proof?.snapshot || {}
  const promptText = snapshot?.prompt || proof?.description || ''
  const [argumentLine, setArgumentLine] = useState(savedState?.argumentLine ?? '')
  const [derivationState, setDerivationState] = useState(savedState?.derivationState ?? null)
  const inputRef = useRef(null)
  const [derivationAttemptCount, setDerivationAttemptCount] = useState(proof?.attemptCount ?? 0)
  const [derivationAttemptLimit, setDerivationAttemptLimit] = useState(proof?.attemptLimit ?? 10)
  const [derivationChecking, setDerivationChecking] = useState(false)
  const [, setDerivationStatusBanner] = useState({ status: 'unanswered', message: '' })

  useEffect(() => {
    if (savedState?.argumentLine !== undefined) {
      setArgumentLine(savedState.argumentLine)
    }
  }, [savedState?.argumentLine])

  useEffect(() => {
    if (savedState?.derivationState) {
      setDerivationState(savedState.derivationState)
    }
  }, [savedState?.derivationState])

  useEffect(() => {
    if (typeof proof?.attemptCount === 'number') {
      setDerivationAttemptCount(proof.attemptCount)
    }
    if (typeof proof?.attemptLimit === 'number') {
      setDerivationAttemptLimit(proof.attemptLimit)
    }
  }, [proof?.attemptCount, proof?.attemptLimit])

  const updateState = (updates) => {
    const state = { argumentLine, derivationState, ...updates }
    onStateChange?.(state)
  }

  const parseStatus = useMemo(() => {
    if (!argumentLine) {
      return { ok: false, reason: '', parsed: null }
    }
    const parsed = parseArgumentLine(argumentLine)
    if (parsed.error) {
      return { ok: false, reason: parsed.error, parsed: null }
    }
    try {
      parsed.premises.forEach((premise) => Formula.from(premise))
      Formula.from(parsed.conclusion)
      return { ok: true, reason: '', parsed }
    } catch {
      return { ok: false, reason: 'Fix the argument line before starting the derivation.', parsed: null }
    }
  }, [Formula, argumentLine])

  const derivationProblem = useMemo(() => {
    if (!parseStatus.ok || !parseStatus.parsed) return null
    return {
      premises: parseStatus.parsed.premises,
      conclusion: parseStatus.parsed.conclusion,
    }
  }, [parseStatus.ok, parseStatus.parsed])

  const hasStartedDerivationLine = useMemo(() => {
    const snapshot = derivationState?.ans ?? derivationState
    if (!snapshot || !Array.isArray(snapshot.parts)) return false
    const subderivations = snapshot.parts.filter((part) => part && Array.isArray(part.parts))
    const targets = subderivations.length ? subderivations : snapshot.parts
    const hasContent = (nodes) => nodes.some((node) => {
      if (!node) return false
      if (Array.isArray(node.parts)) return hasContent(node.parts)
      const formula = typeof node.s === 'string' ? node.s.trim() : ''
      const justification = typeof node.j === 'string' ? node.j.trim() : ''
      return formula !== '' || justification !== ''
    })
    return hasContent(targets)
  }, [derivationState])

  const getProofAnswer = () => {
    return normalizeProof(derivationState)
  }

  const resetInputs = () => {
    setArgumentLine('')
    setDerivationState(null)
    setDerivationStatusBanner({ status: 'unanswered', message: '' })
    updateState({ argumentLine: '', derivationState: null })
  }

  const { status, message, isChecking, handleCheck, handleStartOver, setMessage, attemptCount, maxAttempts, isLocked } =
    useProblemChecker({
      answer: proof?.answer ?? snapshot?.answer,
      problemType: 'combo-translation-derivation',
      question: snapshot,
      options: proof?.options ?? snapshot?.options,
      getAnswer: () => ({
        argumentLine,
        proof: normalizeProof(getProofAnswer()),
        derivationState: derivationState ?? undefined,
      }),
      onComplete,
      isDisabled: () => !parseStatus.ok,
      resetInput: resetInputs,
      onStateChange: updateState,
      assignmentQuestionId,
      attemptLimit,
      initialAttemptCount: savedState?.attemptCount ?? 0,
    })

  const handleArgumentChange = (value) => {
    setArgumentLine(value)
    setDerivationState(null)
    updateState({ argumentLine: value, derivationState: null })
  }

  return (
    <ProblemFrame
      problemLabel={problemLabel}
      prompt={promptText}
      promptSx={{ whiteSpace: 'pre-line' }}
      isInstructorView={isInstructorView && !!proof}
      onEditQuestion={proof ? openEdit : undefined}
      status={status}
      message={message}
      onCloseStatus={() => setMessage('')}
      actionNode={(
        <ProblemSetButtons
          onCheck={handleCheck}
          onStartOver={handleStartOver}
          isChecking={isChecking}
          isDisabled={!parseStatus.ok || isLocked || isAssignmentLocked || !hasStartedDerivationLine}
          align="flex-start"
          attemptCount={attemptCount}
          attemptLimit={maxAttempts}
          isInstructorView={isInstructorView}
        />
      )}
      editorNode={isInstructorView && proof ? (
        <InstructorQuestionEditor ref={editorRef} proof={proof} isInstructorView onSaved={onQuestionSaved} trigger="none" />
      ) : null}
    >
      <Typography variant="body2" sx={sectionLabelSx}>
        Enter the argument as a single line, then build a derivation for it.
      </Typography>
      <Box>
        <Typography variant="body2" sx={{ ...sectionLabelSx, mb: 1, fontWeight: 600, color: 'text.primary' }}>
          Argument line
        </Typography>
        <Typography variant="body2" sx={{ ...sectionLabelSx, fontSize: '0.875rem' }}>
          Use "/" for separate premises and "//" for the conclusion. Example: A ⊃ B / A // B.
        </Typography>
        <FormulaField
          value={argumentLine}
          onValueChange={handleArgumentChange}
          readOnly={false}
          ref={inputRef}
        />
        <Box sx={{ mt: 1 }}>
          <SymbolToolbar
            inputRef={inputRef}
            onValueChange={handleArgumentChange}
          />
        </Box>
      </Box>

      {!parseStatus.ok && parseStatus.reason && (
        <Alert severity="info">{parseStatus.reason}</Alert>
      )}

      {parseStatus.ok && derivationProblem && (
        <Box sx={{ width: '100%' }}>
          <DerivationTable
            key={argumentLine}
            proof={{
              ...proof,
              premises: derivationProblem.premises,
              conclusion: derivationProblem.conclusion,
            }}
            savedState={derivationState}
            onStateChange={(state) => {
              setDerivationState(state)
              updateState({ derivationState: state })
            }}
            onAttempt={() => {}}
            onProofComplete={() => {}}
            attemptCount={derivationAttemptCount}
            attemptLimit={derivationAttemptLimit}
            isChecking={derivationChecking}
            setAttemptCount={setDerivationAttemptCount}
            setAttemptLimit={setDerivationAttemptLimit}
            setStatusBanner={setDerivationStatusBanner}
            setIsChecking={setDerivationChecking}
            isAssignmentLocked={isAssignmentLocked}
            hideActions
          />
        </Box>
      )}
    </ProblemFrame>
  )
}
